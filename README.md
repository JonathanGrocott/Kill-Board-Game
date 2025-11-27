# Aggravation - Online Multiplayer Board Game

A real-time multiplayer implementation of the classic Aggravation board game built with Next.js 15, React 19, and Supabase.

## 🎮 Features

- **Real-time Multiplayer**: Play with 2-4 players with <200ms synchronization
- **Guest Authentication**: No account needed - just enter your name and play
- **Live Lobby System**: Create games, share links, see players join in real-time
- **Complete Game Logic**: Classic Aggravation rules with shortcuts, captures, and turn management
- **Mobile-Ready**: Responsive design (mobile optimization in progress)
- **Bot Support**: Add AI players to fill empty slots (AI implementation pending)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Supabase account (for backend)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase URL and anon key to .env.local

# Run database migrations (requires Supabase CLI)
npx supabase db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play!

## 🏗️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5.3+
- **Styling**: Tailwind CSS 3.4+, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Realtime, Auth)
- **State Management**: Zustand (planned), React hooks
- **Animations**: Framer Motion

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page (create/join game)
│   └── game/[id]/         
│       ├── page.tsx       # Lobby page
│       └── play/page.tsx  # Game play page
├── components/            
│   ├── game/              # Game UI components
│   ├── lobby/             # Lobby components
│   ├── auth/              # Authentication components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── game/              # Game logic (board, moves, rules)
│   ├── supabase/          # Supabase client & types
│   └── auth/              # Authentication helpers
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── supabase/migrations/   # Database schema & RPC functions

```

## 🎯 Implementation Progress

**Total: 83/140 tasks (59.3%)**

### ✅ Completed Phases

- **Phase 1**: Project Setup (10/10 tasks)
- **Phase 2**: Database Foundation (22/22 tasks)  
- **Phase 3**: Core Gameplay MVP (21/25 tasks)
- **Phase 4**: Lobby & Authentication (15/15 tasks)
- **Phase 5**: Real-Time Optimizations (10/12 tasks) - Mostly Complete

### 🔄 In Progress

- Phase 6: Mobile touch experience
- Phase 7: Bot AI implementation

### ⏳ Pending Phases

- Polish & animations
- Error handling & recovery

## 🎲 How to Play

1. **Create or Join**: Start a new game or enter a game ID to join
2. **Wait in Lobby**: Share the game link with friends
3. **Roll the Dice**: Click to roll on your turn
4. **Move Marbles**: Select a marble to move based on your roll
5. **Race Home**: Get all 4 marbles to your home zone first to win!

### Game Rules

- Roll 1 or 6 to exit your base
- Land on opponents to send them back to start
- Use shortcuts after completing one lap
- Exact roll required to enter home
- 60-second turn timer

## 🔧 Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📝 Database Setup

The project uses Supabase for backend services. Run migrations to set up:

```bash
# Initialize Supabase (first time only)
npx supabase init

# Link to your project
npx supabase link --project-ref your-project-ref

# Apply migrations
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --local > lib/supabase/database.types.ts
```

### Required Supabase Configuration

After setting up the database, you must enable anonymous authentication:

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Email** provider
4. Enable **"Allow anonymous sign-ins"**
5. Save changes

Without this setting enabled, users will see an error when trying to play as guests.

## 🤝 Contributing

This is a learning/demo project. Feel free to fork and experiment!

## 📄 License

MIT

## 🙏 Acknowledgments

- Classic Aggravation board game
- Inspired by family game nights

---

Built with ❤️ using Next.js and Supabase
