import { supabase } from '../config/supabase';

export class FeatureFlagService {
  // A missing row means "on": flags only exist to switch something off.
  static async isEnabled(key: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    const value = (data as { value?: { enabled?: unknown } } | null)?.value;
    return value?.enabled !== false;
  }
}
