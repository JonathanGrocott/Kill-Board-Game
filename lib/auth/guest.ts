// Guest Authentication Helper
// Purpose: Handle guest/anonymous authentication with Supabase

import { supabase } from '../supabase/client';

export interface GuestSignInOptions {
  displayName: string;
}

export async function signInAsGuest({ displayName }: GuestSignInOptions) {
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function getGuestDisplayName(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (user.user_metadata?.display_name as string) || null;
}
