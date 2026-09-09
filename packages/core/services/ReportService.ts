import { supabase } from '../config/supabase';
import type { SubmitReportInput, UserReport, UserReportId } from '@bystrobarista/core/types';

export class ReportService {
  private static mapDatabaseReport(row: any): UserReport {
    return {
      id: row.id as UserReportId,
      reporterId: row.reporter_id,
      targetType: row.target_type,
      targetId: row.target_id,
      reasonCode: row.reason_code,
      details: row.details ?? null,
      status: row.status,
      outcome: row.outcome ?? null,
      resolutionNote: row.resolution_note ?? null,
      resolvedAt: row.resolved_at ?? null,
      createdAt: row.created_at,
    };
  }

  /** The caller's own reports, newest first (RLS scopes the select). */
  static async listMyReports(): Promise<UserReport[]> {
    const { data, error } = await supabase
      .from('user_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(row => this.mapDatabaseReport(row));
  }

  /**
   * Submit an abuse report. RLS enforces `reporter_id = auth.uid()`, so the
   * caller must be signed in. Throws on any service-layer failure.
   */
  static async submitReport(input: SubmitReportInput): Promise<UserReport> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Sign-in required to submit a report');
    }

    const payload = {
      reporter_id: user.id,
      target_type: input.targetType,
      target_id: input.targetId,
      reason_code: input.reasonCode,
      details: input.details?.trim() || null,
    };

    const { data, error } = await supabase
      .from('user_reports')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw error;
    }
    return this.mapDatabaseReport(data);
  }
}
