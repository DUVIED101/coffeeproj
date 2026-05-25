import { supabase } from '../config/supabase';
import type { AccountType, LegalForm, SocialPlatform } from '../types';

export interface BusinessSignupData {
  legalForm: LegalForm;
  businessName: string;
  website?: string;
  socialLink?: {
    platform: SocialPlatform;
    value: string;
  };
}

export class AuthService {
  /**
   * Sign up with email and password. Email confirmation is required: signUp()
   * emails the user a 6-digit code and does NOT return a session. The caller
   * must navigate to EmailVerificationScreen and verify the code there.
   *
   * For business accounts, pass `businessSignupData` so the trigger can create
   * the `businesses` row atomically with `public.users` once email is confirmed.
   */
  static async signUpWithEmail(
    email: string,
    password: string,
    accountType: AccountType,
    phoneNumber?: string,
    businessSignupData?: BusinessSignupData
  ): Promise<{ user: any }> {
    try {
      const metadata: Record<string, string> = {
        account_type: accountType,
      };
      if (phoneNumber !== undefined) {
        metadata.phone_number = phoneNumber;
      }
      if (businessSignupData) {
        metadata.legal_form = businessSignupData.legalForm;
        metadata.business_name = businessSignupData.businessName;
        if (businessSignupData.website) {
          metadata.website = businessSignupData.website;
        }
        if (businessSignupData.socialLink) {
          metadata.social_platform = businessSignupData.socialLink.platform;
          metadata.social_value = businessSignupData.socialLink.value;
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });

      if (authError) {
        if (authError.message.includes('invalid')) {
          throw new Error(
            'This email address cannot be used. Please try a different email address or contact support.'
          );
        }
        if (authError.message.includes('rate limit')) {
          throw new Error(
            'Too many registration attempts. Please wait a few minutes and try again.'
          );
        }
        throw authError;
      }
      if (!authData.user) throw new Error('No user returned from signup');

      return { user: authData.user };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  /**
   * Exchange the 6-digit code from the signup confirmation email for an
   * authenticated session. On success the auth listener emits SIGNED_IN.
   */
  static async verifySignupOtp(email: string, token: string): Promise<void> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error in verifySignupOtp:', error);
      throw error;
    }
  }

  /**
   * Re-send the 6-digit signup confirmation code.
   */
  static async resendSignupOtp(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error in resendSignupOtp:', error);
      throw error;
    }
  }

  /**
   * Sign in with Apple. `nonce` must match the one passed to
   * appleAuth.performRequest so Supabase can verify the id_token.
   */
  static async signInWithApple(idToken: string, nonce: string): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: idToken,
        nonce,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error in signInWithApple:', error);
      throw error;
    }
  }

  /**
   * Sign in with Google. `idToken` comes from @react-native-google-signin/google-signin.
   */
  static async signInWithGoogle(idToken: string): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      throw error;
    }
  }

  /**
   * Sign in with Yandex ID. Yandex isn't a built-in Supabase provider, so the
   * access token is exchanged via the `yandex-oauth-exchange` Edge Function,
   * which verifies the token, finds-or-creates the auth user, and returns a
   * one-shot magic-link token_hash. We verify it locally to get a session.
   */
  static async signInWithYandex(yandexAccessToken: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke<{
        token_hash: string;
        email: string;
      }>('yandex-oauth-exchange', {
        body: { accessToken: yandexAccessToken },
      });
      if (error) throw error;
      if (!data?.token_hash || !data?.email) {
        throw new Error('yandex_exchange_invalid_response');
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      });
      if (verifyError) throw verifyError;
    } catch (error) {
      console.error('Error in signInWithYandex:', error);
      throw error;
    }
  }

  /**
   * Sign in with email and password
   */
  static async signInWithEmail(
    email: string,
    password: string
  ): Promise<{ session: any; user: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        // Provide more helpful error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error(
            'Please confirm your email address before signing in. Check your inbox for the confirmation link.'
          );
        }
        throw error;
      }

      if (!data.session || !data.user) {
        throw new Error('No session returned from sign in');
      }

      return { session: data.session, user: data.user };
    } catch (error) {
      console.error('Error in signInWithEmail:', error);
      throw error;
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error in signOut:', error);
      throw error;
    }
  }

  /**
   * Send a password-reset email. With OTP flow the email contains a 6-digit
   * code that the user enters in PasswordResetScreen — no deep link required.
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error) {
      console.error('Error in resetPassword:', error);
      throw error;
    }
  }

  /**
   * Exchange the 6-digit code from the recovery email for an authenticated
   * session. After this returns, the caller can immediately call
   * `updatePassword` because the user is signed in.
   */
  static async verifyPasswordResetOtp(email: string, token: string): Promise<void> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error in verifyPasswordResetOtp:', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error in updatePassword:', error);
      throw error;
    }
  }

  /**
   * Get current session
   */
  static async getSession(): Promise<any> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Error in getSession:', error);
      throw error;
    }
  }

  /**
   * Refresh current session
   */
  static async refreshSession(): Promise<any> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Error in refreshSession:', error);
      throw error;
    }
  }

  /**
   * Change password by re-authenticating with current password first.
   * Does NOT sign the user out on success.
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.user?.email) {
        throw new Error('No active session');
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });

      if (reauthError) {
        throw new Error('invalid_current_password');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error in changePassword:', error);
      throw error;
    }
  }

  /**
   * Delete the current user's account via the `delete-user` Edge Function.
   * On success, clears the local session.
   */
  static async deleteAccount(params: { password: string; force?: boolean }): Promise<void> {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: {
          password: params.password,
          force: params.force ?? false,
        },
      });

      if (error) {
        const ctx = (error as { context?: Response }).context;
        const status = ctx?.status;
        let rawBody = '';
        let payload: { error?: string; count?: number } = {};
        if (ctx && typeof ctx.text === 'function') {
          try {
            rawBody = await ctx.text();
            try {
              payload = JSON.parse(rawBody) as typeof payload;
            } catch {
              payload = {};
            }
          } catch {
            rawBody = '';
          }
        }
        console.error('[deleteAccount] edge function error', {
          status,
          rawBody,
          errorName: (error as Error).name,
          errorMessage: error.message,
        });
        if (status === 403) {
          throw new Error('invalid_password');
        }
        if (status === 409) {
          throw new Error(`active_jobs:${payload.count ?? 0}`);
        }
        throw new Error(payload.error ?? error.message ?? 'delete_account_failed');
      }
      void data;

      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      throw error;
    }
  }
}
