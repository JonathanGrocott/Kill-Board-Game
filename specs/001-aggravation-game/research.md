# Technology Research: Multiplayer Aggravation Board Game

**Created**: 2025-11-26  
**Purpose**: Document technology choices, rationale, and alternatives considered for the Aggravation game implementation

## Frontend Framework Decision

### Decision: Next.js 15 with React 19

**Rationale**:
- **Server Components**: Reduce JavaScript bundle size, improve initial load performance
- **App Router**: File-system based routing with layouts, loading states, and error boundaries built-in
- **Automatic Code Splitting**: Each route loads only necessary code
- **Image Optimization**: Built-in next/image for optimized asset delivery
- **Vercel Integration**: Zero-config deployment to Vercel (meets FR-038)
- **TypeScript Support**: First-class TypeScript support out of the box
- **React 19 Features**: Concurrent rendering, automatic batching for better performance

**Alternatives Considered**:
- **Vite + React**: Faster dev server but requires manual routing, SSR setup, deployment config
- **Remix**: Great SSR but smaller ecosystem, less mature than Next.js
- **SvelteKit**: Smaller bundle but team unfamiliar with Svelte, React ecosystem is larger

---

## Styling Solution Decision

### Decision: Tailwind CSS 3.4+ with shadcn/ui Components

**Rationale**:
- **Utility-First**: Rapid UI development without context switching to CSS files
- **Design Tokens**: Consistent spacing, colors, typography through Tailwind config
- **Responsive**: Mobile-first responsive utilities align with FR-033, FR-034
- **Performance**: PurgeCSS removes unused styles, minimal CSS bundle
- **shadcn/ui**: Accessible, unstyled components that meet WCAG 2.1 AA (Constitutional Principle II)
- **Customizable**: Full control over component styling, no black-box component library
- **Open Source**: MIT licensed, no proprietary dependencies (FR-037)

**Alternatives Considered**:
- **CSS Modules**: More verbose, harder to maintain consistency
- **Styled Components**: Runtime CSS-in-JS adds bundle size and performance overhead
- **Material UI**: Opinionated design, harder to customize, larger bundle size

---

## Backend/Database Decision

### Decision: Supabase (PostgreSQL + Auth + Realtime)

**Rationale**:
- **All-in-One**: Database, authentication, and real-time subscriptions in one service (FR-039)
- **PostgreSQL**: Robust relational database for game state, ACID compliance for move conflicts
- **Realtime**: Built on PostgreSQL LISTEN/NOTIFY, achieves <200ms sync requirement (FR-007, SC-003)
- **Row Level Security (RLS)**: Database-level authorization prevents cheating (FR-010)
- **Auto-Generated Types**: TypeScript types from schema via Supabase CLI (Constitutional Principle I)
- **Free Tier**: 500MB database, 2GB bandwidth, 50k monthly active users - sufficient for MVP (SC-009)
- **Open Source**: PostgreSQL and Supabase client libraries are open source (FR-037)
- **Auth Providers**: Built-in Google/GitHub OAuth + email/password (FR-021)

**Alternatives Considered**:
- **Firebase**: Proprietary Google service, doesn't meet open-source requirement (FR-037)
- **PlanetScale + Clerk**: More complex setup, higher cost, no built-in realtime
- **Convex**: Excellent realtime but less mature, smaller ecosystem, vendor lock-in concerns

---

## Real-Time Synchronization Decision

### Decision: Supabase Realtime (PostgreSQL LISTEN/NOTIFY)

**Rationale**:
- **Low Latency**: WebSocket connection with <200ms message delivery (FR-007, SC-003)
- **Presence System**: Track connected players for disconnect handling (FR-008, FR-009)
- **Broadcast Channels**: Send game events (dice rolls, moves) to all subscribed clients
- **Database Changes**: Subscribe to database row changes for automatic state sync
- **Automatic Reconnection**: Client library handles reconnection logic
- **Conflict Resolution**: PostgreSQL transactions ensure server-authoritative state (FR-010)

**Alternatives Considered**:
- **Socket.io**: Requires custom WebSocket server, more infrastructure complexity
- **Pusher**: Proprietary service, costs scale with usage, doesn't meet free hosting requirement
- **Ably**: Similar to Pusher, not self-hostable on free tier

---

## Authentication Strategy Decision

### Decision: Supabase Auth with Guest Mode

**Rationale**:
- **Guest Support**: Anonymous sessions with display name only (FR-019, FR-020)
- **OAuth Integration**: Google and GitHub providers built-in (FR-021)
- **Session Management**: JWT tokens with automatic refresh (FR-022)
- **Migration Path**: Guests can upgrade to full accounts mid-session (FR-023)
- **Privacy Compliant**: Minimal data collection for guests aligns with constitutional privacy principles
- **Email/Password**: Optional for users who want permanent accounts

**Implementation**:
```typescript
// Guest flow: Create anonymous session
const { data, error } = await supabase.auth.signInAnonymously({
  options: {
    data: { display_name: userInput } // Store display name in user metadata
  }
})

// Upgrade guest to full account
const { error } = await supabase.auth.updateUser({
  email: 'user@example.com',
  password: 'secure_password'
})
```

---

## Animation Library Decision

### Decision: Framer Motion

**Rationale**:
- **Declarative**: React-first animation library with component-based API
- **Performance**: GPU-accelerated animations achieve 60fps requirement (SC-012)
- **Gestures**: Touch gesture support for mobile marble selection (FR-033)
- **Layout Animations**: Automatic animations for marble position changes
- **Spring Physics**: Natural-looking marble movements
- **Bundle Size**: Tree-shakeable, ~30KB gzipped for features we need

**Alternatives Considered**:
- **React Spring**: Similar capabilities but slightly larger bundle
- **CSS Animations**: Limited control, harder to coordinate complex sequences
- **GSAP**: More powerful but proprietary license for some features

---

## State Management Decision

### Decision: React Hooks + Zustand (if needed)

**Rationale**:
- **React 19 Hooks**: useState, useEffect, useReducer for component-local state
- **Zustand**: Lightweight (1KB) global state if needed for cross-component game state
- **Server State**: Supabase handles persistence, React Query not needed (Supabase client has built-in caching)
- **Simplicity**: Avoid overengineering with Redux/MobX for relatively simple state needs
- **TypeScript**: Full type safety with TypeScript integration

**State Architecture**:
- **Game State**: Stored in Supabase, synced via Realtime to all clients
- **UI State**: Local component state (selected marble, highlighted spaces)
- **Auth State**: Supabase auth context provided to components
- **Turn Timer**: Local countdown with server-authoritative validation

---

## Testing Strategy Decision

### Decision: Vitest + Playwright + React Testing Library

**Rationale**:
- **Vitest**: Vite-powered test runner, faster than Jest, native ESM support
- **Playwright**: Cross-browser E2E testing (Chrome, Firefox, Safari) for FR-040
- **React Testing Library**: Test components from user perspective, accessibility-focused
- **Coverage**: Achieve >80% coverage goal from Constitutional Quality Gates
- **Bot Players**: Enable automated E2E tests without multiple human testers (FR-007 benefit)

**Test Pyramid**:
- **Unit Tests**: Game logic (move validation, bot AI, board calculations)
- **Integration Tests**: Supabase interactions, realtime sync behavior
- **E2E Tests**: Full game flows with Playwright (create, join, play, win)

---

## Deployment Platform Decision

### Decision: Vercel

**Rationale**:
- **Zero Config**: Next.js deploys automatically (FR-038, SC-008)
- **Edge Network**: Global CDN for fast load times worldwide
- **Preview Deployments**: Every git push gets a preview URL for testing
- **Environment Variables**: Secure management of Supabase credentials (SC-011)
- **Free Tier**: Generous limits for personal projects, 100GB bandwidth/month
- **Analytics**: Built-in Web Vitals monitoring for Constitutional Performance Requirements

**Alternatives Considered**:
- **Netlify**: Similar capabilities but Vercel has tighter Next.js integration
- **Cloudflare Pages**: Good option but less mature Next.js support
- **Self-Hosted**: Requires server management, doesn't meet "free to host" requirement

---

## Development Tools Decision

### Decisions:
- **TypeScript 5.3+**: Type safety (Constitutional Principle I)
- **ESLint + Prettier**: Code quality and formatting (Constitutional Pre-Commit Gates)
- **Husky + lint-staged**: Pre-commit hooks for automatic linting
- **Supabase CLI**: Local development with database migrations
- **GitHub Actions**: CI/CD pipeline (run tests, check types, deploy)

---

## Mobile Responsiveness Decision

### Decision: Mobile-First Tailwind CSS + Touch Events

**Rationale**:
- **Breakpoints**: Tailwind's default breakpoints (sm, md, lg, xl) cover all devices (FR-034)
- **Touch Targets**: 44x44px minimum via Tailwind utilities (FR-035)
- **Orientation**: CSS media queries for portrait/landscape (FR-036)
- **Testing**: Playwright's mobile emulation for automated testing
- **Performance**: CSS-only responsiveness, no JavaScript overhead

**Implementation**:
```tsx
// Mobile-first responsive component
<div className="
  w-full h-screen p-4           // Mobile default
  sm:p-6                        // Small devices
  md:max-w-6xl md:mx-auto      // Medium+ centered layout
  lg:grid lg:grid-cols-2       // Large+ split layout
">
  {/* Content */}
</div>
```

---

## Bot AI Decision

### Decision: Random Valid Move Selection

**Rationale**:
- **Simplicity**: Assumption states "simple random move selection" - no advanced AI needed
- **Sufficient**: For testing and casual solo play, random moves are adequate
- **Performance**: Instant move calculation, <3 second turn completion (FR-008)
- **Extensible**: Architecture allows upgrading to smarter AI later if desired

**Algorithm**:
1. Get all valid moves for bot's marbles
2. Randomly select one move
3. Execute with 1-2 second delay for natural feel
4. If no valid moves, pass turn immediately

---

## Summary: Technology Stack

| Layer | Technology | Version | License | Rationale |
|-------|-----------|---------|---------|-----------|
| **Frontend Framework** | Next.js | 15.x | MIT | Server Components, App Router, Vercel integration |
| **UI Library** | React | 19.x | MIT | Industry standard, large ecosystem |
| **Language** | TypeScript | 5.3+ | Apache 2.0 | Type safety, Constitutional Principle I |
| **Styling** | Tailwind CSS | 3.4+ | MIT | Utility-first, responsive, mobile-first |
| **Components** | shadcn/ui | Latest | MIT | Accessible, unstyled, customizable |
| **Animation** | Framer Motion | 11.x | MIT | Declarative, performant, gesture support |
| **Backend** | Supabase | Latest | Apache 2.0 | Database + Auth + Realtime in one |
| **Database** | PostgreSQL | 15+ | PostgreSQL | Via Supabase, ACID compliance |
| **Realtime** | Supabase Realtime | Latest | Apache 2.0 | <200ms sync, WebSocket-based |
| **Auth** | Supabase Auth | Latest | Apache 2.0 | Guest mode, OAuth, JWT sessions |
| **Unit Testing** | Vitest | 1.x | MIT | Fast, ESM-native, Vite-powered |
| **E2E Testing** | Playwright | 1.x | Apache 2.0 | Cross-browser, mobile emulation |
| **Component Testing** | React Testing Library | 14.x | MIT | User-centric testing |
| **Deployment** | Vercel | N/A | Proprietary | Free tier, zero-config Next.js |
| **CI/CD** | GitHub Actions | N/A | N/A | Free for public repos |

**All dependencies are open source (FR-037) and free to use in production.**
