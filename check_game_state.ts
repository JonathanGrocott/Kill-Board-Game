import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestGame() {
  console.log('Fetching latest game session...');

  // Get the most recent game session
  const { data: games, error: gameError } = await supabase
    .from('game_sessions')
    .select('id, created_at, status')
    .order('created_at', { ascending: false })
    .limit(1);

  if (gameError || !games || games.length === 0) {
    console.error('Error fetching game:', gameError);
    return;
  }

  const gameId = games[0].id;
  console.log(`Latest Game ID: ${gameId}`);
  console.log(`Created At: ${games[0].created_at}`);
  console.log(`Status: ${games[0].status}`);

  // Fetch game state using the RPC
  const { data: gameState, error: stateError } = await supabase
    .rpc('get_game_state', { p_game_id: gameId });

  if (stateError) {
    console.error('Error fetching game state:', stateError);
    return;
  }

  console.log('--- Game State ---');
  console.log(`Players: ${gameState.players.length}`);
  
  gameState.players.forEach((p: any) => {
    console.log(`Player: ${p.display_name} (${p.color})`);
    const playerMarbles = gameState.marbles.filter((m: any) => m.player_id === p.id);
    console.log(`  Marbles: ${playerMarbles.length}`);
    playerMarbles.forEach((m: any) => {
      console.log(`    Marble ${m.marble_number}: ${m.position_type} (Color: ${p.color})`);
    });
  });
}

checkLatestGame();
