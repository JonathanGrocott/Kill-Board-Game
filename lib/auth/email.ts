// Email/Password Authentication Helper
// Purpose: Handle email/password sign-up and sign-in with Supabase

import { supabase } from '../supabase/client';

export interface EmailSignUpOptions {
  email: string;
  password: string;
  displayName: string;
}

export interface EmailSignInOptions {
  email: string;
  password: string;
}

/**
 * Sign up a new user with email and password
 */
export async function signUpWithEmail({
  email,
  password,
  displayName,
}: EmailSignUpOptions) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
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

/**
 * Sign in an existing user with email and password
 */
export async function signInWithEmail({
  email,
  password,
}: EmailSignInOptions) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    throw error;
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }
}
