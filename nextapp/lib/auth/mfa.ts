import { createClient } from '@/lib/supabase/client';

/**
 * Check if user has MFA enabled
 */
export async function isUserMFAEnabled(userId: string): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_mfa_settings')
    .select('is_enabled')
    .eq('user_id', userId)
    .single();

  if (error) return false;
  return data?.is_enabled ?? false;
}

/**
 * Enable MFA for user (TOTP)
 */
export async function setupMFAWithTOTP(userId: string) {
  const supabase = createClient();

  // Generate TOTP secret and QR code
  // In production, use a library like speakeasy or otplib
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Mark MFA as setup (note: actual implementation would integrate TOTP library)
  const { error } = await supabase
    .from('user_mfa_settings')
    .upsert({
      user_id: userId,
      is_enabled: false, // Not fully enabled until verified
      mfa_type: 'totp',
      verified_at: null,
    })
    .eq('user_id', userId);

  if (error) throw error;

  return {
    setupRequired: true,
    message: 'TOTP setup initiated. Please verify with the authenticator app.',
  };
}

/**
 * Verify MFA code
 */
export async function verifyMFACode(
  userId: string,
  code: string
): Promise<boolean> {
  // In production, verify the TOTP code here using speakeasy or similar
  // For now, return true if code is 6 digits (demo)
  return /^\d{6}$/.test(code);
}

/**
 * Enforce MFA for sensitive operations
 */
export async function requireMFA(userId: string) {
  const mfaEnabled = await isUserMFAEnabled(userId);

  if (!mfaEnabled) {
    throw new Error(
      'MFA is required. Please enable it in your profile settings.'
    );
  }

  return true;
}
