// Error Handling Utilities
// Purpose: User-friendly error messages for Supabase errors

export class GameError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export function handleSupabaseError(error: unknown): GameError {
  if (error instanceof Error) {
    const message = error.message;

    // Map Supabase/Postgres errors to user-friendly messages
    if (message.includes('GAME_NOT_FOUND')) {
      return new GameError('Game not found. Please check the game ID.', 'GAME_NOT_FOUND');
    }

    if (message.includes('GAME_FULL')) {
      return new GameError('This game is already full.', 'GAME_FULL');
    }

    if (message.includes('GAME_STARTED')) {
      return new GameError('This game has already started.', 'GAME_STARTED');
    }

    if (message.includes('GAME_NOT_ACTIVE')) {
      return new GameError('This game is not active.', 'GAME_NOT_ACTIVE');
    }

    if (message.includes('NOT_YOUR_TURN')) {
      return new GameError("It's not your turn yet.", 'NOT_YOUR_TURN');
    }

    if (message.includes('ALREADY_ROLLED')) {
      return new GameError('You have already rolled the dice this turn.', 'ALREADY_ROLLED');
    }

    if (message.includes('NO_DICE_ROLL')) {
      return new GameError('Please roll the dice first.', 'NO_DICE_ROLL');
    }

    if (message.includes('INVALID_MARBLE')) {
      return new GameError('Invalid marble selection.', 'INVALID_MARBLE');
    }

    if (message.includes('INVALID_MOVE')) {
      return new GameError(
        'Invalid move. Check the game rules and try again.',
        'INVALID_MOVE'
      );
    }

    if (message.includes('INVALID_NAME')) {
      return new GameError(
        'Display name must be between 1 and 50 characters.',
        'INVALID_NAME'
      );
    }

    if (message.includes('INVALID_PLAYER_COUNT')) {
      return new GameError('Number of players must be 2, 3, or 4.', 'INVALID_PLAYER_COUNT');
    }

    // Generic error
    return new GameError(message, 'UNKNOWN_ERROR', error);
  }

  return new GameError('An unexpected error occurred.', 'UNKNOWN_ERROR', error);
}

export function getErrorMessage(error: unknown): string {
  const gameError = handleSupabaseError(error);
  return gameError.message;
}
