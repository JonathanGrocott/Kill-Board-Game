# Quickstart Guide: Aggravation Board Game

**Purpose**: Get the development environment running in under 10 minutes

---

## Prerequisites

- **Node.js**: 18.17 or higher ([download](https://nodejs.org/))
- **Git**: For version control ([download](https://git-scm.com/))
- **Supabase CLI**: For local database ([install](https://supabase.com/docs/guides/cli))
- **Code Editor**: VS Code recommended ([download](https://code.visualstudio.com/))

**Optional**:
- **Docker**: Required for local Supabase stack ([download](https://www.docker.com/))

---

## Step 1: Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/Kill-Board-Game.git
cd Kill-Board-Game
```

---

## Step 2: Install Dependencies

```bash
npm install
```

**Expected output**:
```
added 347 packages in 12s
```

**Installed packages**:
- Next.js 15, React 19, TypeScript
- Tailwind CSS 3.4, shadcn/ui components
- Supabase client library
- Framer Motion for animations
- Vitest, Playwright, React Testing Library

---

## Step 3: Start Local Supabase

```bash
npx supabase start
```

**First-time setup** (downloads Docker images, ~2 minutes):
```
Applying migration 001_initial_schema.sql...
Starting Supabase local development setup.

Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Copy the `anon key` and `API URL`** - you'll need these next.

---

## Step 4: Configure Environment Variables

```bash
cp .env.example .env.local
```

**Edit `.env.local`**:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Note**: Never commit `.env.local` - it's already in `.gitignore`.

---

## Step 5: Apply Database Migrations

```bash
npx supabase db reset
```

**Output**:
```
Resetting local database...
Applying migration 001_initial_schema.sql...
Seeding data from supabase/seed.sql...
Database reset complete.
```

**What this does**:
- Creates `game_sessions`, `players`, `marbles`, `move_history` tables
- Sets up Row Level Security policies
- Creates RPC functions (`create_game_session`, `roll_dice`, etc.)
- Seeds test data (2 sample games with bots)

---

## Step 6: Generate TypeScript Types

```bash
npx supabase gen types typescript --local > lib/database.types.ts
```

**Output**: `lib/database.types.ts` created with:
```typescript
export type Database = {
  public: {
    Tables: {
      game_sessions: {
        Row: { /* ... */ };
        Insert: { /* ... */ };
        Update: { /* ... */ };
      };
      // ... other tables
    };
  };
};
```

**Usage**: Import in your components for full type safety.

---

## Step 7: Start Development Server

```bash
npm run dev
```

**Output**:
```
▲ Next.js 15.0.0
- Local:        http://localhost:3000
- Network:      http://192.168.1.100:3000

✓ Ready in 1.8s
```

**Open browser**: Navigate to [http://localhost:3000](http://localhost:3000)

---

## Step 8: Verify Setup

### Check 1: Home Page Loads

- Should see "Create Game" and "Join Game" buttons
- No console errors

### Check 2: Create a Test Game

1. Click **"Create Game"**
2. Enter display name: `Test Player`
3. Click **"Start"**
4. Should navigate to `/game/[uuid]` lobby

### Check 3: Supabase Studio

1. Open [http://localhost:54323](http://localhost:54323)
2. Navigate to **Table Editor** → `game_sessions`
3. Should see 1 row with `status = 'waiting'`

### Check 4: Add a Bot

1. In game lobby, click **"Add Bot"**
2. Bot should appear with random color
3. Check `players` table - should see bot with `is_bot = true`

### Check 5: Start Game

1. Add bots until 4 players
2. Game should auto-start (status → 'active')
3. Board should render with 4 colored home bases
4. Dice roll button should be enabled for current player

---

## Common Issues

### Issue: `npx supabase start` fails

**Error**: `Docker is not running`

**Fix**:
1. Install Docker Desktop
2. Start Docker
3. Retry `npx supabase start`

---

### Issue: Port 3000 already in use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Fix**:
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

---

### Issue: Database types not generating

**Error**: `supabase/config.toml not found`

**Fix**:
```bash
# Initialize Supabase project
npx supabase init

# Link to local instance
npx supabase link --project-ref local

# Generate types
npx supabase gen types typescript --local > lib/database.types.ts
```

---

### Issue: Environment variables not loading

**Error**: `ReferenceError: process is not defined`

**Fix**:
1. Ensure `.env.local` exists (not `.env`)
2. Restart dev server (`npm run dev`)
3. Verify variables start with `NEXT_PUBLIC_` for client-side access

---

## Project Structure

```
Kill-Board-Game/
├── app/                        # Next.js App Router
│   ├── page.tsx               # Home page (create/join)
│   ├── game/
│   │   └── [id]/
│   │       ├── page.tsx       # Game lobby
│   │       └── play/
│   │           └── page.tsx   # Active game board
│   └── layout.tsx             # Root layout (Tailwind setup)
├── components/                 # React components
│   ├── Board.tsx              # Game board grid
│   ├── Marble.tsx             # Animated marble
│   ├── Dice.tsx               # Dice roller
│   ├── PlayerList.tsx         # Lobby player list
│   └── ui/                    # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       └── ...
├── lib/                        # Utilities
│   ├── supabase.ts            # Supabase client
│   ├── database.types.ts      # Generated types
│   ├── game-logic.ts          # Move validation
│   ├── bot-ai.ts              # Bot move selection
│   └── board-positions.ts     # Position calculations
├── hooks/                      # React hooks
│   ├── useGameState.ts        # Subscribe to game updates
│   ├── useRealtimeSync.ts     # Realtime channel management
│   └── useTurnTimer.ts        # 60-second countdown
├── supabase/
│   ├── migrations/            # SQL schema migrations
│   │   └── 001_initial_schema.sql
│   ├── config.toml            # Supabase local config
│   └── seed.sql               # Test data
├── tests/
│   ├── unit/                  # Vitest unit tests
│   ├── integration/           # Supabase integration tests
│   └── e2e/                   # Playwright E2E tests
├── .env.local                 # Local environment variables (gitignored)
├── .env.example               # Example env vars (committed)
├── next.config.js             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS config
├── tsconfig.json              # TypeScript config
└── package.json               # Dependencies
```

---

## Development Workflow

### 1. Start Everything

```bash
# Terminal 1: Start Supabase
npx supabase start

# Terminal 2: Start Next.js
npm run dev

# Terminal 3: Run tests in watch mode
npm run test:watch
```

### 2. Make Changes

- **Frontend**: Edit files in `app/` or `components/` → Auto-reloads
- **Database**: Create new migration → `npx supabase migration new [name]`
- **Types**: Regenerate after schema changes → `npx supabase gen types typescript`

### 3. Run Tests

```bash
# Unit tests
npm run test

# E2E tests (starts dev server automatically)
npm run test:e2e

# Coverage report
npm run test:coverage
```

### 4. Lint & Format

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint:fix

# Format with Prettier
npm run format
```

---

## Deploying to Production

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com/)
2. Click **"New Project"**
3. Name: `kill-board-game-prod`
4. Region: Choose closest to users
5. Password: Generate strong password

### 2. Apply Migrations

```bash
# Link to remote project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL (from Supabase Settings → API)
# - NEXT_PUBLIC_SUPABASE_ANON_KEY (from Supabase Settings → API)

# Production deployment
vercel --prod
```

### 4. Configure OAuth (Optional)

In Supabase dashboard:
1. **Authentication** → **Providers** → **Google**
2. Add OAuth Client ID and Secret
3. Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | Check code quality |
| `npm run format` | Format code with Prettier |
| `npx supabase start` | Start local Supabase |
| `npx supabase stop` | Stop local Supabase |
| `npx supabase db reset` | Reset database to migrations |
| `npx supabase db diff` | Show pending migration changes |
| `npx supabase gen types typescript` | Regenerate TypeScript types |

---

## Next Steps

1. **Read the Spec**: Review `/specs/001-aggravation-game/spec.md` for requirements
2. **Explore Data Model**: Check `/specs/001-aggravation-game/data-model.md` for schema
3. **Review Contracts**: Read `/specs/001-aggravation-game/contracts/` for API docs
4. **Start Coding**: Follow tasks in `/specs/001-aggravation-game/tasks.md`

---

## Getting Help

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Tailwind CSS**: [tailwindcss.com/docs](https://tailwindcss.com/docs)
- **shadcn/ui**: [ui.shadcn.com](https://ui.shadcn.com/)
- **Framer Motion**: [framer.com/motion](https://www.framer.com/motion/)

---

## Summary

You now have:
- ✅ Local development environment running
- ✅ Next.js 15 + React 19 dev server on port 3000
- ✅ Supabase local stack with database, auth, realtime
- ✅ TypeScript types auto-generated from schema
- ✅ Test suite ready to run
- ✅ Production deployment path (Vercel + Supabase)

**Ready to code!** 🎮
