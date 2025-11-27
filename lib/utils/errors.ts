// Error Handling Utilities
// Purpose: User-friendly error messages for Supabase errors

export class GameError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'GameError';
  }
}

/**
 * Map Supabase/Postgres error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, { message: string; retryable: boolean }> = {
  GAME_NOT_FOUND: { message: 'Game not found. Please check the game ID.', retryable: false },
  GAME_FULL: { message: 'This game is already full.', retryable: false },
  GAME_STARTED: { message: 'This game has already started.', retryable: false },
  GAME_NOT_ACTIVE: { message: 'This game is not active.', retryable: false },
  NOT_YOUR_TURN: { message: "It's not your turn yet.", retryable: false },
  NOT_A_BOT: { message: 'This action is only available for bot players.', retryable: false },
  ALREADY_ROLLED: { message: 'You have already rolled the dice this turn.', retryable: false },
  NO_DICE_ROLL: { message: 'Please roll the dice first.', retryable: false },
  INVALID_MARBLE: { message: 'Invalid marble selection.', retryable: false },
  INVALID_MOVE: { message: 'Invalid move. Check the game rules and try again.', retryable: false },
  INVALID_NAME: { message: 'Display name must be between 1 and 50 characters.', retryable: false },
  INVALID_PLAYER_COUNT: { message: 'Number of players must be 2, 3, or 4.', retryable: false },
  INVALID_COLOR: { message: 'Invalid player color.', retryable: false },
  // Network/connection errors are retryable
  PGRST301: { message: 'Connection error. Please check your internet connection.', retryable: true },
  PGRST502: { message: 'Server is temporarily unavailable. Please try again.', retryable: true },
  NETWORK_ERROR: { message: 'Network error. Please check your connection and try again.', retryable: true },
  TIMEOUT: { message: 'Request timed out. Please try again.', retryable: true },
};

export function handleSupabaseError(error: unknown): GameError {
  // Handle Supabase RPC error object format
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    
    // Supabase error objects have message, code, details, hint properties
    const message = (err.message as string) || '';
    const code = (err.code as string) || '';
    const details = (err.details as string) || '';
    const hint = (err.hint as string) || '';
    
    // Check for known error codes in message or details
    const errorText = `${message} ${details} ${hint} ${code}`;
    
    for (const [errorCode, config] of Object.entries(ERROR_MESSAGES)) {
      if (errorText.includes(errorCode)) {
        return new GameError(config.message, errorCode, error, config.retryable);
      }
    }
    
    // Return the message if available, otherwise a generic message
    if (message) {
      return new GameError(message, code || 'UNKNOWN_ERROR', error, false);
    }
  }
  
  if (error instanceof Error) {
    const message = error.message;

    // Check for known error codes
    for (const [code, config] of Object.entries(ERROR_MESSAGES)) {
      if (message.includes(code)) {
        return new GameError(config.message, code, error, config.retryable);
      }
    }

    // Check for network errors
    if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
      return new GameError(
        ERROR_MESSAGES.NETWORK_ERROR.message,
        'NETWORK_ERROR',
        error,
        true
      );
    }

    // Check for timeout errors
    if (message.includes('timeout') || message.includes('Timeout')) {
      return new GameError(
        ERROR_MESSAGES.TIMEOUT.message,
        'TIMEOUT',
        error,
        true
      );
    }

    // Generic error - extract clean message if possible
    const cleanMessage = message.replace(/^(Error: |Exception: )/, '');
    return new GameError(cleanMessage, 'UNKNOWN_ERROR', error, false);
  }

  return new GameError('An unexpected error occurred.', 'UNKNOWN_ERROR', error, false);
}

export function getErrorMessage(error: unknown): string {
  const gameError = handleSupabaseError(error);
  return gameError.message;
}

export function isRetryableError(error: unknown): boolean {
  const gameError = handleSupabaseError(error);
  return gameError.isRetryable;
}
