/**
 * Authentication Hook
 * 
 * Manages authentication state and provides sign-in/sign-out functions
 */

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { signInAsGuest, GuestSignInOptions } from '@/lib/auth/guest';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignInAsGuest = async (options: GuestSignInOptions) => {
    const data = await signInAsGuest(options);
    return data;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    displayName: user?.user_metadata?.display_name as string | undefined,
    signInAsGuest: handleSignInAsGuest,
    signOut: handleSignOut,
  };
}
