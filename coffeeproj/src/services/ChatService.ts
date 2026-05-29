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
              businesses!inner(name, logo_url)
            )
          ),
          users!barista_id(
            barista_profiles(first_name, last_name, avatar_url)
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
      const joinedBusiness = data.applications?.jobs?.businesses;
      const businessName =
        joinedBusiness?.name ?? (await this.fetchBusinessByOwnerId(data.business_id))?.name;
      const businessLogoUrl =
        joinedBusiness?.logo_url ??
        (joinedBusiness
          ? undefined
          : (await this.fetchBusinessByOwnerId(data.business_id))?.logoUrl);

      return {
        ...this.mapConversation(data),
        jobTitle: data.applications?.jobs?.title,
        businessName,
        businessLogoUrl: businessLogoUrl ?? undefined,
        baristaName: baristaProfile
          ? `${baristaProfile.first_name} ${baristaProfile.last_name}`
          : undefined,
        baristaAvatarUrl: baristaProfile?.avatar_url ?? undefined,
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
              businesses!inner(name, logo_url)
            )
          ),
          users!barista_id(
            barista_profiles(first_name, last_name, avatar_url)
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
      const joinedBusiness = data.applications?.jobs?.businesses;
      const fallbackBusiness = joinedBusiness
        ? null
        : await this.fetchBusinessByOwnerId(data.business_id);
      const businessName = joinedBusiness?.name ?? fallbackBusiness?.name;
      const businessLogoUrl = joinedBusiness?.logo_url ?? fallbackBusiness?.logoUrl;

      return {
        ...this.mapConversation(data),
        jobTitle: data.applications?.jobs?.title,
        businessName,
        businessLogoUrl: businessLogoUrl ?? undefined,
        baristaName: baristaProfile
          ? `${baristaProfile.first_name} ${baristaProfile.last_name}`
          : undefined,
        baristaAvatarUrl: baristaProfile?.avatar_url ?? undefined,
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

        const baristaSummary = await this.fetchBaristaProfileSummary(baristaUserId);
        const businessSummary = await this.fetchBusinessByOwnerId(businessUserId);

        return {
          ...this.mapConversation(conversation),
          baristaName: baristaSummary?.name,
          baristaAvatarUrl: baristaSummary?.avatarUrl,
          businessName: businessSummary?.name,
          businessLogoUrl: businessSummary?.logoUrl,
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
            barista_profiles(first_name, last_name, avatar_url)
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
    const business = await this.fetchBusinessByOwnerId(businessUserId);
    return {
      ...this.mapConversation(data),
      baristaName: baristaProfile
        ? `${baristaProfile.first_name} ${baristaProfile.last_name}`
        : undefined,
      baristaAvatarUrl: baristaProfile?.avatar_url ?? undefined,
      businessName: business?.name,
      businessLogoUrl: business?.logoUrl,
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
   * Fetch business name + logo for a single owner user id. Returns null if none.
   */
  private static async fetchBusinessByOwnerId(
    ownerUserId: string
  ): Promise<{ name?: string; logoUrl?: string } | null> {
    const { data, error } = await supabase
      .from('businesses')
      .select('name, logo_url')
      .eq('owner_id', ownerUserId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error in fetchBusinessByOwnerId:', error);
      return null;
    }
    if (!data) return null;
    return { name: data.name ?? undefined, logoUrl: data.logo_url ?? undefined };
  }

  /**
   * Batch-fetch business names + logos for multiple owner user ids.
   * Returns a map of ownerUserId → { name, logoUrl }.
   */
  private static async fetchBusinessesByOwnerIds(
    ownerUserIds: string[]
  ): Promise<Record<string, { name?: string; logoUrl?: string }>> {
    if (ownerUserIds.length === 0) return {};

    const { data, error } = await supabase
      .from('businesses')
      .select('owner_id, name, logo_url')
      .in('owner_id', ownerUserIds);

    if (error) {
      console.error('Error in fetchBusinessesByOwnerIds:', error);
      return {};
    }

    const map: Record<string, { name?: string; logoUrl?: string }> = {};
    for (const row of data ?? []) {
      if (row.owner_id && !(row.owner_id in map)) {
        map[row.owner_id] = {
          name: row.name ?? undefined,
          logoUrl: row.logo_url ?? undefined,
        };
      }
    }
    return map;
  }

  /**
   * Sum unread messages across all conversations for a given user role.
   * Used to drive the Chats tab badge in the bottom nav.
   */
  static async getTotalUnreadMessageCount(
    userId: string,
    accountType: 'barista' | 'business'
  ): Promise<number> {
    const idField = accountType === 'barista' ? 'barista_id' : 'business_id';
    const countField = accountType === 'barista' ? 'unread_count_barista' : 'unread_count_business';
    const { data, error } = await supabase
      .from('conversations')
      .select(countField)
      .eq(idField, userId);
    if (error) {
      console.error('Error in getTotalUnreadMessageCount:', error);
      return 0;
    }
    return (data ?? []).reduce(
      (sum: number, row: Record<string, number | null>) => sum + (row[countField] ?? 0),
      0
    );
  }

  /**
   * For each conversation id, fetch the most recent message text + sender.
   * Uses a single query with client-side bucketing — fine for typical inbox sizes.
   */
  private static async fetchLastMessagePerConversation(
    conversationIds: string[]
  ): Promise<Record<string, { message_text: string; sender_id: string }>> {
    if (conversationIds.length === 0) return {};

    const { data, error } = await supabase
      .from('messages')
      .select('conversation_id, message_text, sender_id, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error in fetchLastMessagePerConversation:', error);
      return {};
    }

    const map: Record<string, { message_text: string; sender_id: string }> = {};
    for (const row of data ?? []) {
      if (!(row.conversation_id in map)) {
        map[row.conversation_id] = {
          message_text: row.message_text,
          sender_id: row.sender_id,
        };
      }
    }
    return map;
  }

  /**
   * Fetch display name + avatar for a barista user from barista_profiles.
   * Returns null if no profile exists.
   */
  private static async fetchBaristaProfileSummary(
    baristaUserId: string
  ): Promise<{ name: string; avatarUrl?: string } | null> {
    const { data, error } = await supabase
      .from('barista_profiles')
      .select('first_name, last_name, avatar_url')
      .eq('user_id', baristaUserId)
      .maybeSingle();

    if (error) {
      console.error('Error in fetchBaristaProfileSummary:', error);
      return null;
    }
    if (!data) return null;
    return {
      name: `${data.first_name} ${data.last_name}`,
      avatarUrl: data.avatar_url ?? undefined,
    };
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
              businesses!inner(name, logo_url)
            )
          ),
          users!barista_id(
            barista_profiles(first_name, last_name, avatar_url)
          )
        `
        )
        .eq(userIdField, userId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const mapped = (data || []).map(conv => {
        const baristaProfile = conv.users?.barista_profiles;
        const joinedBusiness = conv.applications?.jobs?.businesses;
        return {
          ...this.mapConversation(conv),
          jobTitle: conv.applications?.jobs?.title,
          businessName: joinedBusiness?.name,
          businessLogoUrl: joinedBusiness?.logo_url ?? undefined,
          baristaName: baristaProfile
            ? `${baristaProfile.first_name} ${baristaProfile.last_name}`
            : undefined,
          baristaAvatarUrl: baristaProfile?.avatar_url ?? undefined,
          applicationStatus: conv.applications?.status,
        };
      });

      const ownerIdsNeedingName = Array.from(
        new Set(mapped.filter(c => !c.businessName).map(c => c.businessId))
      );
      if (ownerIdsNeedingName.length > 0) {
        const businessMap = await this.fetchBusinessesByOwnerIds(ownerIdsNeedingName);
        for (const conv of mapped) {
          if (!conv.businessName) {
            const fallback = businessMap[conv.businessId];
            conv.businessName = fallback?.name;
            if (!conv.businessLogoUrl) {
              conv.businessLogoUrl = fallback?.logoUrl;
            }
          }
        }
      }

      const idsWithMessages = mapped.filter(c => c.lastMessageAt).map(c => c.id);
      if (idsWithMessages.length > 0) {
        const lastByConvId = await this.fetchLastMessagePerConversation(idsWithMessages);
        for (const conv of mapped) {
          const last = lastByConvId[conv.id];
          if (last) {
            conv.lastMessageText = last.message_text;
            conv.lastMessageSenderId = last.sender_id;
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
