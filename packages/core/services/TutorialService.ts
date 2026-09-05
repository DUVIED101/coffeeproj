import { supabase } from '../config/supabase';
import { TUTORIAL_VERSION } from '../tutorial/steps';
import type { UserId } from '../types/ids';
import type {
  TutorialFacts,
  TutorialProgress,
  TutorialProgressPatch,
  TutorialRole,
  TutorialStepsMap,
} from '../types/tutorial';

type ProgressRow = {
  user_id: string;
  account_type: TutorialRole;
  version: number;
  steps: TutorialStepsMap | null;
  completed_at: string | null;
  skipped_all_at: string | null;
  replay_hint_shown_at: string | null;
};

const PATCH_TO_COLUMN: Readonly<Record<keyof TutorialProgressPatch, keyof ProgressRow>> = {
  steps: 'steps',
  completedAt: 'completed_at',
  skippedAllAt: 'skipped_all_at',
  replayHintShownAt: 'replay_hint_shown_at',
  version: 'version',
};

const FACT_KEYS: readonly (keyof TutorialFacts)[] = [
  'hasBaristaProfile',
  'hasApplication',
  'hasBusiness',
  'hasBranch',
  'hasJob',
  'hasOffer',
  'hasConversation',
];

export class TutorialService {
  private static mapRow(row: ProgressRow): TutorialProgress {
    return {
      userId: row.user_id as UserId,
      accountType: row.account_type,
      version: row.version,
      steps: row.steps ?? {},
      completedAt: row.completed_at,
      skippedAllAt: row.skipped_all_at,
      replayHintShownAt: row.replay_hint_shown_at,
    };
  }

  static async isEnabled(): Promise<boolean> {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('value')
      .eq('key', 'tutorial')
      .maybeSingle();
    if (error) throw error;
    const value = (data as { value?: { enabled?: unknown } } | null)?.value;
    return value?.enabled !== false;
  }

  static async getProgress(userId: UserId): Promise<TutorialProgress | null> {
    const { data, error } = await supabase
      .from('tutorial_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapRow(data as ProgressRow) : null;
  }

  static async saveProgress(
    userId: UserId,
    accountType: TutorialRole,
    patch: TutorialProgressPatch
  ): Promise<TutorialProgress> {
    const row: Record<string, unknown> = {
      user_id: userId,
      account_type: accountType,
      version: TUTORIAL_VERSION,
    };
    for (const key of Object.keys(patch) as Array<keyof TutorialProgressPatch>) {
      const value = patch[key];
      if (value !== undefined) row[PATCH_TO_COLUMN[key]] = value;
    }

    const { data, error } = await supabase
      .from('tutorial_progress')
      .upsert(row, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error('Failed to save tutorial progress');
    return this.mapRow(data as ProgressRow);
  }

  static async reset(userId: UserId, accountType: TutorialRole): Promise<TutorialProgress> {
    return this.saveProgress(userId, accountType, {
      steps: {},
      completedAt: null,
      skippedAllAt: null,
      version: TUTORIAL_VERSION,
    });
  }

  static async getFacts(): Promise<TutorialFacts> {
    const { data, error } = await supabase.rpc('get_tutorial_facts');
    if (error) throw error;
    const raw = (data ?? {}) as Partial<Record<keyof TutorialFacts, unknown>>;
    const facts = {
      profileCompleteness:
        typeof raw.profileCompleteness === 'number' ? raw.profileCompleteness : 0,
    } as TutorialFacts;
    for (const key of FACT_KEYS) {
      (facts as Record<string, unknown>)[key] = raw[key] === true;
    }
    return facts;
  }
}
