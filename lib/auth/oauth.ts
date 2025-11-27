// OAuth Authentication Helper
// Purpose: Handle OAuth authentication (Google, GitHub) with Supabase

import { supabase } from '../supabase/client';
import { Provider } from '@supabase/supabase-js';

export interface OAuthSignInOptions {
  provider: 'google' | 'github';
  redirectTo?: string;
}

/**
 * Sign in with OAuth provider (Google or GitHub)
 */
export async function signInWithOAuth({
  provider,
  redirectTo,
}: OAuthSignInOptions) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(redirectTo?: string) {
  return signInWithOAuth({ provider: 'google', redirectTo });
}

/**
 * Sign in with GitHub
 */
export async function signInWithGitHub(redirectTo?: string) {
  return signInWithOAuth({ provider: 'github', redirectTo });
}
