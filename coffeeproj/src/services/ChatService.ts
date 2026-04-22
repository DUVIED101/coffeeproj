import { supabase } from '../config/supabase';
import type { Conversation, Message, SendMessageData, ConversationId } from '../types/chat';
import type { RealtimeChannel } from '@supabase/supabase-js';

export class ChatService {
  /**
   * Map database conversation object to Conversation type
   */
  private static mapConversation(db: any): Conversation {
    return {
      id: db.id,
      applicationId: db.application_id,
      baristaId: db.barista_id,
      businessId: db.business_id,
      lastMessageAt: db.last_message_at,
      unreadCountBarista: db.unread_count_barista,
      unreadCountBusiness: db.unread_count_business,
      createdAt: db.created_at,
      jobTitle: db.job_title,
      businessName: db.business_name,
      baristaName: db.barista_name,
      applicationStatus: db.application_status,
    };
  }

  /**
   * Map database message object to Message type
   */
  private static mapMessage(db: any): Message {
    return {
      id: db.id,
      conversationId: db.conversation_id,
      senderId: db.sender_id,
      messageText: db.message_text,
      readByBarista: db.read_by_barista,
      readByBusiness: db.read_by_business,
      createdAt: db.created_at,
    };
  }

  /**
   * Get conversation by application ID
   */
  static async getConversationByApplication(applicationId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
          *,
          applications!inner(
            status,
            jobs!inner(
              title,
              businesses!inner(name)
            )
          ),
          users!barista_id(
            barista_profiles(first_name, last_name)
          )
        `
        )
        .eq('application_id', applicationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      if (!data) return null;

      const baristaProfile = data.users?.barista_profiles;

      return {
        ...this.mapConversation(data),
        jobTitle: data.applications?.jobs?.title,
        businessName: data.applications?.jobs?.businesses?.name,
        baristaName: baristaProfile
          ? `${baristaProfile.first_name} ${baristaProfile.last_name}`
          : undefined,
        applicationStatus: data.applications?.status,
      };
    } catch (error) {
      console.error('Error in getConversationByApplication:', error);
      throw error;
    }
  }

  /**
   * Create a conversation for an application (for old applications without conversations)
   */
  static async createConversation(applicationId: string): Promise<Conversation> {
    try {
      // First, get the application to find barista_id and business_id
      const { data: application, error: appError } = await supabase
        .from('applications')
        .select(
          `
          *,
          jobs!inner(
            business_owner_id,
            title,
            businesses!inner(name)
          )
        `
        )
        .eq('id', applicationId)
        .single();

      if (appError) throw appError;
      if (!application) throw new Error('Application not found');

      const baristaId = application.barista_id;
      const businessId = application.jobs.business_owner_id;

      // Create the conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          application_id: applicationId,
          barista_id: baristaId,
          business_id: businessId,
        })
        .select()
        .single();

      if (convError) throw convError;
      if (!conversation) throw new Error('Failed to create conversation');

      // Fetch the full conversation with joined data
      const fullConversation = await this.getConversationByApplication(applicationId);
      if (!fullConversation) throw new Error('Failed to fetch created conversation');

      return fullConversation;
    } catch (error) {
      console.error('Error in createConversation:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user (barista or business)
   */
  static async getConversations(
    userId: string,
    accountType: 'barista' | 'business'
  ): Promise<Conversation[]> {
    try {
      const userIdField = accountType === 'barista' ? 'barista_id' : 'business_id';

      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
          *,
          applications!inner(
            status,
            jobs!inner(
              title,
              businesses!inner(name)
            )
          ),
          users!barista_id(
            barista_profiles(first_name, last_name)
          )
        `
        )
        .eq(userIdField, userId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      return (data || []).map(conv => {
        const baristaProfile = conv.users?.barista_profiles;
        return {
          ...this.mapConversation(conv),
          jobTitle: conv.applications?.jobs?.title,
          businessName: conv.applications?.jobs?.businesses?.name,
          baristaName: baristaProfile
            ? `${baristaProfile.first_name} ${baristaProfile.last_name}`
            : undefined,
          applicationStatus: conv.applications?.status,
        };
      });
    } catch (error) {
      console.error('Error in getConversations:', error);
      throw error;
    }
  }

  /**
   * Send a message in a conversation
   */
  static async sendMessage(data: SendMessageData): Promise<Message> {
    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: data.conversationId,
          sender_id: data.senderId,
          message_text: data.messageText,
        })
        .select()
        .single();

      if (error) throw error;
      if (!message) throw new Error('Failed to send message');

      return this.mapMessage(message);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation with pagination
   */
  static async getMessages(
    conversationId: ConversationId,
    limit = 50,
    offset = 0
  ): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return (data || []).map(msg => this.mapMessage(msg));
    } catch (error) {
      console.error('Error in getMessages:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read and reset unread count
   */
  static async markAsRead(conversationId: ConversationId, userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('reset_unread_count', {
        p_conversation_id: conversationId,
        p_user_id: userId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      throw error;
    }
  }

  /**
   * Subscribe to new messages in a conversation (Realtime)
   */
  static subscribeToMessages(
    conversationId: ConversationId,
    callback: (message: Message) => void
  ): RealtimeChannel {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          const message = this.mapMessage(payload.new);
          callback(message);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Unsubscribe from messages
   */
  static unsubscribeFromMessages(channel: RealtimeChannel): void {
    channel.unsubscribe();
  }
}
