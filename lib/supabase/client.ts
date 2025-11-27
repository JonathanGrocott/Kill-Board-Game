// Supabase Browser Client
// Purpose: Client-side Supabase client for use in React components

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';
import { isRetryableError } from '@/lib/utils/errors';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Export a singleton instance for convenience
export const supabase = createClient();

/**
 * Execute an async operation with retry logic
 * @param operation - The async operation to execute
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param delayMs - Base delay between retries in ms (default: 1000)
 * @returns The result of the operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Only retry if the error is retryable and we have attempts left
      if (!isRetryableError(error) || attempt >= maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s...
      const delay = delayMs * Math.pow(2, attempt - 1);
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
