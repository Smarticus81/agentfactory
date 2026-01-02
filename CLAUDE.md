# CLAUDE.md - AI Assistant Guide for FamilyAI/Bevpro Studio

This document provides comprehensive guidance for AI assistants working on this codebase.

## Project Overview

**FamilyAI (Bevpro Studio)** is a voice-first AI assistant platform built for families and event venues. Users can create, configure, and deploy custom AI voice agents with features like:

- Voice interactions with wake-word detection
- Gmail integration (read, send, triage emails)
- Calendar management
- RAG (Retrieval-Augmented Generation) over personal documents
- Usage tracking and billing
- PWA deployment

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS, Framer Motion, Radix UI |
| **Backend** | Convex (serverless database + real-time) |
| **Authentication** | Clerk |
| **AI/Voice** | OpenAI GPT-4, multiple TTS providers (ElevenLabs, Deepgram, Cartesia, PlayHT) |
| **Package Manager** | pnpm (required) |
| **Deployment** | Vercel, Render (Docker), GitHub Actions |

## Directory Structure

```
agentfactory/
├── convex/                    # Convex backend (database schema + functions)
│   ├── schema.ts              # Database schema definitions
│   ├── assistants.ts          # Agent/assistant CRUD operations
│   ├── gmail.ts               # Gmail integration functions
│   ├── calendar.ts            # Calendar event management
│   ├── usage.ts               # Usage tracking/billing
│   └── ...                    # Other domain-specific functions
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── chat/          # Chat/conversation endpoints
│   │   │   ├── gmail/         # Gmail OAuth + operations
│   │   │   └── ...
│   │   ├── dashboard/         # Dashboard pages (agent management)
│   │   ├── agent/[agentId]/   # Agent interaction pages
│   │   ├── a/[agentId]/       # Short URL for agent access
│   │   └── ...
│   ├── components/            # React components
│   │   ├── ui/                # Shared UI primitives (shadcn/ui style)
│   │   └── ...                # Feature-specific components
│   ├── hooks/                 # Custom React hooks
│   │   ├── useVoiceSession.ts # Voice session management
│   │   ├── useWakeWord.ts     # Wake word detection
│   │   └── ...
│   └── lib/                   # Utilities and services
│       ├── voice.ts           # Voice session core
│       ├── gmail-service.ts   # Gmail API wrapper
│       ├── types.ts           # TypeScript type definitions
│       └── ...
├── public/                    # Static assets
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   └── wakeword.worker.js     # Wake word detection worker
├── scripts/
│   └── build.js               # Custom build script (Convex + Next.js)
└── Configuration files...
```

## Development Commands

```bash
# Install dependencies (use pnpm, not npm/yarn)
pnpm install

# Development mode
pnpm dev                    # Start Next.js dev server
pnpm convex:dev            # Start Convex development (in separate terminal)

# Building
pnpm build                 # Full build (Convex deploy + Next.js build)
pnpm build:next           # Next.js build only

# Testing
pnpm test                  # Run Vitest tests
pnpm test:ui              # Run tests with UI
pnpm test:coverage        # Run tests with coverage

# Linting
pnpm lint                  # Run ESLint

# Deployment
pnpm deploy:check         # Lint + build verification
pnpm convex:deploy:prod   # Deploy Convex to production
pnpm deploy:full          # Full production deploy
```

## Key Architecture Patterns

### 1. Convex Backend Pattern
Convex functions are in `/convex/`. Use queries for reads and mutations for writes:

```typescript
// Query example (convex/assistants.ts)
export const get = query({
  args: { assistantId: v.id("assistants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assistantId);
  },
});

// Mutation example
export const create = mutation({
  args: { name: v.string(), ... },
  handler: async (ctx, args) => {
    return await ctx.db.insert("assistants", { ...args });
  },
});
```

### 2. Client-Side Convex Usage
Use the generated API in React components:

```typescript
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// In component
const agents = useQuery(api.assistants.getUserAgents, { userId: user?.id || '' });
const createAgent = useMutation(api.assistants.create);
```

### 3. Voice Pipeline Architecture
Voice sessions use a tiered system:
- **Starter**: Basic STT → LLM → TTS
- **Pro**: Streaming, barge-in, turn detection
- **Premium**: Wake word, expressive TTS

### 4. Authentication Flow
- Clerk handles user authentication
- User ID from Clerk is passed to Convex functions
- OAuth tokens for Gmail/Calendar stored separately

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Core
NEXT_PUBLIC_CONVEX_URL=         # Convex deployment URL
CONVEX_DEPLOY_KEY=              # Convex deployment key

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# AI Services
NEXT_PUBLIC_OPENAI_API_KEY=

# Gmail Integration
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GMAIL_REDIRECT_URI=

# Voice Providers (optional)
NEXT_PUBLIC_ELEVENLABS_API_KEY=
NEXT_PUBLIC_DEEPGRAM_API_KEY=
```

## Code Conventions

### TypeScript
- Strict mode enabled
- Use `@/` path alias for imports from `src/`
- Define interfaces for component props

### React Components
- Use `"use client"` directive for client components
- Prefer functional components with hooks
- Use Framer Motion for animations

### Styling
- Use Tailwind CSS classes
- Follow the existing design system (see CSS variables in globals.css)
- Use `Inter` font family for consistency

### File Naming
- React components: PascalCase (`AgentDesigner.tsx`)
- Utilities/hooks: camelCase (`useVoiceSession.ts`)
- Convex functions: snake_case for table names, camelCase for functions

## Database Schema (Convex)

Key tables in `convex/schema.ts`:

| Table | Purpose |
|-------|---------|
| `users` | User profiles and settings |
| `assistants` | AI agent configurations |
| `deployments` | Agent deployment statuses |
| `connections` | OAuth connections (Gmail, Calendar) |
| `familyMembers` | Family member profiles |
| `knowledgeItems` | RAG document chunks |
| `tasks` | User tasks |
| `events` | Calendar events |
| `emails` | Email records |
| `usageLedger` | Usage tracking for billing |
| `voiceSessions` | Voice session logs |

## API Routes

Key API endpoints in `src/app/api/`:

| Endpoint | Purpose |
|----------|---------|
| `/api/chat` | Main chat/conversation endpoint |
| `/api/gmail/*` | Gmail OAuth and operations |
| `/api/calendar/events` | Calendar event management |
| `/api/agents` | Agent CRUD operations |
| `/api/usage` | Usage statistics |

## Testing

- Test framework: Vitest
- Tests located alongside source files or in `__tests__` directories
- Run with `pnpm test`

## Deployment

### Vercel (Primary)
- Automatic deploys from `main` branch
- Environment variables set in Vercel dashboard
- See `.github/workflows/deploy.yml`

### Render (Docker)
- Uses `Dockerfile` for containerized deployment
- Configuration in `render.yaml`
- Standalone output mode enabled in `next.config.js`

## Important Notes for AI Assistants

### When Making Changes:

1. **Always read files before editing** - Understand existing patterns and conventions

2. **Use pnpm** - Not npm or yarn. The lockfile is `pnpm-lock.yaml`

3. **Convex schema changes** require:
   - Updating `convex/schema.ts`
   - Running `pnpm convex:dev` to push changes
   - Updating related functions in `convex/*.ts`

4. **Type safety** - Leverage TypeScript strictly. Use the generated Convex types from `convex/_generated/`

5. **Environment variables**:
   - Client-side: prefix with `NEXT_PUBLIC_`
   - Server-side only: no prefix
   - Never commit `.env` files

6. **Voice features** - Changes to voice functionality should consider:
   - Browser compatibility (WebRTC, Web Audio API)
   - Multiple TTS/STT provider support
   - Wake word detection runs in a Web Worker

7. **Gmail integration** - Uses OAuth 2.0 with refresh tokens. Handle token expiration gracefully

8. **Component patterns**:
   - Use existing UI components from `src/components/ui/`
   - Follow existing component structure patterns
   - Use the existing design system variables

9. **Avoid over-engineering**:
   - Don't add features beyond what's requested
   - Keep solutions simple and focused
   - Don't add unnecessary abstractions

10. **Security considerations**:
    - Never expose API keys in client-side code
    - Validate user ownership in Convex mutations
    - Sanitize user inputs

## Common Tasks

### Adding a new Convex function:
1. Add function to appropriate file in `convex/`
2. Run `pnpm convex:dev` to generate types
3. Import from `api` in client components

### Adding a new API route:
1. Create `route.ts` in `src/app/api/[endpoint]/`
2. Export named HTTP method handlers (GET, POST, etc.)
3. Use `NextRequest`/`NextResponse` from Next.js

### Adding a new component:
1. Create in `src/components/`
2. Use `"use client"` if it needs interactivity
3. Import with `@/components/` path alias

### Modifying the database schema:
1. Update `convex/schema.ts`
2. Update related Convex functions
3. Run migration if needed (see `migrateAssistants` pattern)

## Getting Help

- Next.js docs: https://nextjs.org/docs
- Convex docs: https://docs.convex.dev
- Clerk docs: https://clerk.com/docs
- Tailwind CSS: https://tailwindcss.com/docs
