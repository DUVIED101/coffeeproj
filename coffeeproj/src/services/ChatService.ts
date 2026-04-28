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
          applications(
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
      const joinedBusinessName = data.applications?.jobs?.businesses?.name;
      const businessName =
        joinedBusinessName ?? (await this.fetchBusinessNameByOwnerId(data.business_id));

      return {
        ...this.mapConversation(data),
        jobTitle: data.applications?.jobs?.title,
        businessName,
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
   * Get conversation by its own id. Uses outer joins so manual (application_id IS NULL)
   * conversations still resolve. Returns null when no row matches.
   */
  static async getConversationById(id: ConversationId): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
          *,
          applications(
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
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      if (!data) return null;

      const baristaProfile = data.users?.barista_profiles;
      const joinedBusinessName = data.applications?.jobs?.businesses?.name;
      const businessName =
        joinedBusinessName ?? (await this.fetchBusinessNameByOwnerId(data.business_id));

      return {
        ...this.mapConversation(data),
        jobTitle: data.applications?.jobs?.title,
        businessName,
        baristaName: baristaProfile
          ? `${baristaProfile.first_name} ${baristaProfile.last_name}`
          : undefined,
        applicationStatus: data.applications?.status,
      };
    } catch (error) {
      console.error('Error in getConversationById:', error);
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
   * Get or create a conversation between a business and a barista.
   * When jobId is null, reuses or creates a manual (application-less) conversation.
   * When jobId is provided, delegates to application-linked helpers.
   */
  static async getOrCreateConversation(
    businessUserId: string,
    baristaUserId: string,
    jobId: string | null
  ): Promise<Conversation> {
    try {
      if (jobId !== null) {
        const { data: application, error: appError } = await supabase
          .from('applications')
          .select('id')
          .eq('job_id', jobId)
          .eq('barista_id', baristaUserId)
          .maybeSingle();

        if (appError) throw appError;
        if (!application) throw new Error('Application not found for job and barista');

        const existing = await this.getConversationByApplication(application.id);
        if (existing) return existing;
        return await this.createConversation(application.id);
      }

      const existing = await this.findManualConversation(businessUserId, baristaUserId);
      if (existing) return existing;

      await this.enforceManualConversationRateLimit(businessUserId);

      try {
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            application_id: null,
            business_id: businessUserId,
            barista_id: baristaUserId,
          })
          .select()
          .single();

        if (convError) throw convError;
        if (!conversation) throw new Error('Failed to create manual conversation');

        const baristaName = await this.fetchBaristaDisplayName(baristaUserId);

        return {
          ...this.mapConversation(conversation),
          baristaName,
        };
      } catch (err: any) {
        if (err?.code === '23505') {
          const raced = await this.findManualConversation(businessUserId, baristaUserId);
          if (raced) return raced;
        }
        throw err;
      }
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      throw error;
    }
  }

  /**
   * Look up an existing manual (application-less) conversation between
   * a business and a barista. Returns null when none exists.
   */
  private static async findManualConversation(
    businessUserId: string,
    baristaUserId: string
  ): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `
          *,
          users!barista_id(
            barista_profiles(first_name, last_name)
          )
`
      )
      .eq('business_id', businessUserId)
      .eq('barista_id', baristaUserId)
      .is('application_id', null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const baristaProfile = data.users?.barista_profiles;
    const businessName = await this.fetchBusinessNameByOwnerId(businessUserId);
    return {
      ...this.mapConversation(data),
      baristaName: baristaProfile
        ? `${baristaProfile.first_name} ${baristaProfile.last_name}`
        : undefined,
      businessName,
    };
  }

  /**
   * Throws when a business has started 10+ manual conversations in the last hour.
   * Only counts manual (application_id IS NULL) conversations.
   */
  private static async enforceManualConversationRateLimit(businessUserId: string): Promise<void> {
    const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessUserId)
      .is('application_id', null)
      .gte('created_at', oneHourAgoIso);

    if (error) throw error;

    if ((count ?? 0) >= 10) {
      throw new Error(
        'Rate limit exceeded: too many manual conversations started in the last hour'
      );
    }
  }

  /**
   * Fetch business name for a single owner user id. Returns undefined if none.
   */
  private static async fetchBusinessNameByOwnerId(
    ownerUserId: string
  ): Promise<string | undefined> {
    const { data, error } = await supabase
      .from('businesses')
      .select('name')
      .eq('owner_id', ownerUserId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error in fetchBusinessNameByOwnerId:', error);
      return undefined;
    }
    return data?.name ?? undefined;
  }

  /**
   * Batch-fetch business names for multiple owner user ids.
   * Returns a map of ownerUserId → business name.
   */
  private static async fetchBusinessNamesByOwnerIds(
    ownerUserIds: string[]
  ): Promise<Record<string, string>> {
    if (ownerUserIds.length === 0) return {};

    const { data, error } = await supabase
      .from('businesses')
      .select('owner_id, name')
      .in('owner_id', ownerUserIds);

    if (error) {
      console.error('Error in fetchBusinessNamesByOwnerIds:', error);
      return {};
    }

    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.owner_id && row.name && !(row.owner_id in map)) {
        map[row.owner_id] = row.name;
      }
    }
    return map;
  }

  /**
   * Fetch "First Last" display name for a barista user from barista_profiles.
   * Returns undefined if no profile exists.
   */
  private static async fetchBaristaDisplayName(baristaUserId: string): Promise<string | undefined> {
    const { data, error } = await supabase
      .from('barista_profiles')
      .select('first_name, last_name')
      .eq('user_id', baristaUserId)
      .maybeSingle();

    if (error) {
      console.error('Error in fetchBaristaDisplayName:', error);
      return undefined;
    }
    if (!data) return undefined;
    return `${data.first_name} ${data.last_name}`;
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
          applications(
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

      const mapped = (data || []).map(conv => {
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

      const ownerIdsNeedingName = Array.from(
        new Set(mapped.filter(c => !c.businessName).map(c => c.businessId))
      );
      if (ownerIdsNeedingName.length > 0) {
        const nameMap = await this.fetchBusinessNamesByOwnerIds(ownerIdsNeedingName);
        for (const conv of mapped) {
          if (!conv.businessName) {
            conv.businessName = nameMap[conv.businessId];
          }
        }
      }

      return mapped;
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
      const trimmed = data.messageText.trim();
      if (trimmed.length === 0) {
        throw new Error('Message cannot be empty');
      }

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: data.conversationId,
          sender_id: data.senderId,
          message_text: trimmed,
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
   * Batch fetch unread counts for a business user across many applications.
   * Returns a map keyed by applicationId; missing entries default to 0 on the client.
   */
  static async getUnreadCountsByApplicationIds(
    applicationIds: string[],
    side: 'business' | 'barista'
  ): Promise<Record<string, number>> {
    if (applicationIds.length === 0) return {};
    try {
      const column = side === 'business' ? 'unread_count_business' : 'unread_count_barista';
      const { data, error } = await supabase
        .from('conversations')
        .select(`application_id, ${column}`)
        .in('application_id', applicationIds);

      if (error) throw error;
      const result: Record<string, number> = {};
      for (const row of data || []) {
        const appId = (row as any).application_id as string | null;
        if (!appId) continue;
        result[appId] = (row as any)[column] ?? 0;
      }
      return result;
    } catch (error) {
      console.error('Error in getUnreadCountsByApplicationIds:', error);
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
