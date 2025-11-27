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

/**
 * Upgrade guest user to full authenticated user
 * Preserves display_name and updates user_id in players table
 */
export async function upgradeGuestToUser(newUserId: string): Promise<void> {
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser || !currentUser.is_anonymous) {
    throw new Error('No guest session to upgrade');
  }

  const oldUserId = currentUser.id;
  const displayName = currentUser.user_metadata?.display_name;

  // Update all player records with the new user_id
  const { error: updateError } = await supabase
    .from('players')
    .update({ user_id: newUserId })
    .eq('user_id', oldUserId);

  if (updateError) {
    throw new Error(`Failed to migrate player data: ${updateError.message}`);
  }

  // Preserve display name in new account if not set
  if (displayName) {
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { display_name: displayName },
    });

    if (metadataError) {
      console.warn('Failed to preserve display name:', metadataError);
    }
  }
}
