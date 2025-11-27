-- Cleanup old games and associated data
-- Run this to clear test data if needed

-- Delete all games older than 24 hours or in non-active states
DELETE FROM game_sessions WHERE 
  created_at < NOW() - INTERVAL '24 hours'
  OR status IN ('completed', 'abandoned');

-- Alternatively, to clear ALL test data:
-- TRUNCATE game_sessions CASCADE;
