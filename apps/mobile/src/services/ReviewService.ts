import { supabase } from '../config/supabase';
import type { ApplicationId, UserId } from '../types/ids';
import type {
  ApplicationReview,
  CreateReviewData,
  RaterRole,
  StarRating,
  UserReviewAggregate,
} from '../types/review';

const REVIEW_COLUMNS = 'id, application_id, rater_role, ratee_id, rating, comment, created_at';

export class ReviewService {
  private static mapReview(db: {
    id: string;
    application_id: string;
    rater_role: RaterRole;
    ratee_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
  }): ApplicationReview {
    return {
      id: db.id as ApplicationReview['id'],
      applicationId: db.application_id as ApplicationId,
      raterRole: db.rater_role,
      rateeId: db.ratee_id as UserId,
      rating: db.rating as StarRating,
      comment: db.comment ?? undefined,
      createdAt: db.created_at,
    };
  }

  static async createReview(data: CreateReviewData): Promise<ApplicationReview> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      const { data: inserted, error } = await supabase
        .from('application_reviews')
        .insert({
          application_id: data.applicationId,
          rater_role: data.raterRole,
          rater_id: user.id,
          ratee_id: data.rateeId,
          rating: data.rating,
          comment: data.comment ?? null,
        })
        .select(REVIEW_COLUMNS)
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Review already submitted for this application');
        }
        throw error;
      }
      if (!inserted) throw new Error('Failed to create review');

      return this.mapReview(inserted);
    } catch (error) {
      console.error('Error in createReview:', error);
      throw error;
    }
  }

  static async getReviewByApplication(
    applicationId: ApplicationId,
    raterRole: RaterRole
  ): Promise<ApplicationReview | null> {
    try {
      const { data, error } = await supabase
        .from('application_reviews')
        .select(REVIEW_COLUMNS)
        .eq('application_id', applicationId)
        .eq('rater_role', raterRole)
        .maybeSingle();

      if (error) throw error;
      return data ? this.mapReview(data) : null;
    } catch (error) {
      console.error('Error in getReviewByApplication:', error);
      throw error;
    }
  }

  static async getReviewsForUser(userId: UserId): Promise<ApplicationReview[]> {
    try {
      const { data, error } = await supabase
        .from('application_reviews')
        .select(REVIEW_COLUMNS)
        .eq('ratee_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(row => this.mapReview(row));
    } catch (error) {
      console.error('Error in getReviewsForUser:', error);
      throw error;
    }
  }

  static async getAggregateForUser(userId: UserId): Promise<UserReviewAggregate> {
    try {
      const { data, error } = await supabase
        .from('user_review_aggregates')
        .select('user_id, average_rating, review_count')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { userId, averageRating: 0, reviewCount: 0 };
      }

      return {
        userId: data.user_id as UserId,
        averageRating: Number(data.average_rating) || 0,
        reviewCount: Number(data.review_count) || 0,
      };
    } catch (error) {
      console.error('Error in getAggregateForUser:', error);
      throw error;
    }
  }

  static async getAggregatesForUsers(userIds: UserId[]): Promise<Map<UserId, UserReviewAggregate>> {
    const map = new Map<UserId, UserReviewAggregate>();
    if (userIds.length === 0) return map;

    try {
      const uniqueIds = Array.from(new Set(userIds));

      const { data, error } = await supabase
        .from('user_review_aggregates')
        .select('user_id, average_rating, review_count')
        .in('user_id', uniqueIds);

      if (error) throw error;

      for (const id of uniqueIds) {
        map.set(id, { userId: id, averageRating: 0, reviewCount: 0 });
      }
      for (const row of data || []) {
        const id = row.user_id as UserId;
        map.set(id, {
          userId: id,
          averageRating: Number(row.average_rating) || 0,
          reviewCount: Number(row.review_count) || 0,
        });
      }
      return map;
    } catch (error) {
      console.error('Error in getAggregatesForUsers:', error);
      throw error;
    }
  }
}
