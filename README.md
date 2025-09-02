# FamilyAI — Personal Assistant Platform for Busy Families

A low-code platform where busy parents and individuals can create their own personal AI assistant in minutes. Voice-first with wake-word, RAG over personal knowledge, web search, email triage/sending, and calendar orchestration. Built for LiveKit (self-host or Cloud), with usage metering + Stripe.

> Core UX examples
> • "hey **{assistant}**, what does my son have today?" → Dylan's agenda + leave-now reminder
> • "check my emails and add potential tasks to the calendar" → extract → confirm → create events
> • "I'm running late—email **[Soar@fwcd.com](mailto:Soar@fwcd.com)** I'll arrive at **5:30pm**." → confirm → send → log

---

## 0) Stack at a glance

* **Frontend**: Next.js (PWA), React, LiveKit JS, Web Push
* **Voice**: LiveKit Agents (WebRTC SFU, turn detection, barge-in), optional OpenWakeWord / Porcupine for wake-word
* **Backend**: Node/Express (or Next API routes) + Postgres (+ `pgvector`)
* **RAG**: embeddings → Postgres/pgvector (HNSW)
* **Auth/OAuth**: Google (Gmail/Calendar) & Microsoft Graph (Mail/Calendar)
* **Metering/Paywall**: Stripe Subscriptions + Usage-based Meters
* **Infra**: LiveKit Cloud **or** self-host LiveKit server

**Why LiveKit Cloud?** It gives elastic SFU, global TURN, analytics, and a pricing model oriented to AI agents; connect via JWT access tokens and scale without managing media servers. ([LiveKit Docs][1], [LiveKit Blog][2])
**Connection reliability:** ICE → TURN fallbacks over UDP/TCP/TLS handled by LiveKit clients. ([LiveKit Docs][3])

---

## 1) Voice pipelines (tiered)

Map plan → pipeline to monetize "experience quality".

### Lite (Free)

* **STT ↔ LLM ↔ TTS** (turn-based), no barge-in, no wake-word by default
* LiveKit room + Agents VoicePipelineAgent basic pipeline. ([LiveKit Docs][4])

### Pro

* **Streaming** STT, interruptible TTS (barge-in), automatic turn detection
* LiveKit Agents with **turn detector** plugin for tight end-of-turns. ([LiveKit Docs][5])

### Pro+

* Pro + **wake-word** ("Hey Buddy", "Hey Mira", etc.)
* Browser wake-word via **Porcupine Web** (WASM) or **openWakeWord**; both are on-device. ([Picovoice][6], [Home Assistant][7], [GitHub][8])

### Premium / Enterprise

* All above + expressive/low-latency TTS and/or Realtime multimodal models; LiveKit Agents integrates with multiple providers including OpenAI Realtime and TTS. ([LiveKit Docs][9])

> LiveKit Agents is the orchestrator (session runs STT→LLM→TTS; customize nodes or swap providers). ([LiveKit Docs][10])

---

## 2) Project scaffold

```bash
# 1) Create app
pnpm create next-app familyai --typescript --eslint
cd familyai

# 2) Core deps
pnpm add livekit-client @livekit/components-react
pnpm add zod ky jose dotenv
pnpm add pg pgvector drizzle-orm
pnpm add stripe

# 3) Agents (server side)
pnpm add livekit-agents

# 4) Wake-word (choose ONE; Porcupine for web is turnkey)
pnpm add @picovoice/porcupine-web @picovoice/porcupine-web-react

# 5) Auth SDKs you prefer (e.g., next-auth) + Google/Microsoft OAuth
pnpm add next-auth
```

---

## 3) Environment

Create `.env.local`:

```bash
# LiveKit (Cloud or self-host)
LIVEKIT_URL="wss://<your-livekit-host>"
LIVEKIT_API_KEY="<lk_api_key>"
LIVEKIT_API_SECRET="<lk_api_secret>"

# JWT for your API (used to sign WS/REST auth to tool gateway)
APP_JWT_SECRET="<long-random>"

# Postgres
DATABASE_URL="postgresql://user:pass@host:5432/familyai"
# pgvector enabled at DB level

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Google OAuth & scopes
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="https://your.app/api/oauth/google/callback"

# Microsoft OAuth
MS_CLIENT_ID="..."
MS_CLIENT_SECRET="..."
MS_REDIRECT_URI="https://your.app/api/oauth/ms/callback"

# Porcupine (if used for wake-word)
PICOVOICE_ACCESS_KEY="pv_..._access_key"
```

> **LiveKit tokens are JWTs** signed with your API secret and include room/identity/permissions. ([LiveKit Docs][11])

---

## 4) LiveKit Cloud setup (or self-host)

1. **Create a project** in LiveKit Cloud console; grab `API Key/Secret` and `WSS URL`. ([LiveKit Docs][1])
2. **(Optional)** Self-host: install server & CLI; run via Docker or brew; generate dev tokens. ([GitHub][12])
3. **Agents quickstart:** scaffold a Python/Node agent if you want server-side voice orchestration (recommended). ([LiveKit Docs][13])

Connection order & fallbacks are handled by the LiveKit client (ICE/UDP → TURN/UDP → ICE/TCP → TURN/TLS). ([LiveKit Docs][3])

---

## 5) RAG store (Postgres + pgvector)

Enable `pgvector` and create embeddings index.

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE docs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  source text,
  title text,
  chunk text,
  embedding vector(3072), -- match your model dims
  created_at timestamptz default now()
);

-- HNSW index for fast ANN
CREATE INDEX ON docs USING hnsw (embedding vector_l2_ops);
```

Use OpenAI `text-embedding-3-large` (3072 dims) or `-small` (cost-effective) and store vectors in Postgres. ([OpenAI][14], [OpenAI Platform][15], [Neon][16])

---

## 6) OAuth scopes (email + calendar)

**Google Gmail**: use only what you need (least privilege). Typical mix:

* Read summaries: `https://www.googleapis.com/auth/gmail.readonly`
* Modify labels: `https://www.googleapis.com/auth/gmail.modify`
* Send mail: `https://www.googleapis.com/auth/gmail.send`
  Scope catalog & guidance: Google OAuth scopes, Gmail scopes. ([Google for Developers][17])

**Google Calendar**: create events with `https://www.googleapis.com/auth/calendar`. ([Google for Developers][18])

**Microsoft Graph**: `Mail.Read`, `Mail.Send`, `offline_access` (plus Calendars.\* if you add MS calendars). See permissions reference and `sendMail` action. ([Microsoft Learn][19])

---

## 7) Web Push (PWA reminders)

Use Push API + VAPID for morning briefs/leave-now nudges.

* Client subscribes → send subscription to server
* Server signs with VAPID and pushes payload

Docs & tutorial: MDN Push API, Web Push + VAPID. ([MDN Web Docs][20], [Mozilla Blog][21])

---

## 8) Stripe paywall + usage meters

Use **Stripe Meters** for usage-based pricing (new model; legacy "metered price without a Meter" is deprecated). Configure meters for: voice minutes, email sends, automations, storage GB. ([Stripe][22], [Stripe Docs][23])

**Entitlements per plan** (example):

* Free: 60 voice min/mo, 300 email summaries/mo, 30 sends/mo, 1 routine/day
* Plus: 300 min, 2k summaries, 200 sends, 3 routines/day
* Family: 600 min shared, wake-word, 5 routines/day
* Studio: 2k min, expressive TTS, voice cloning (consent), 10 routines/day

---

## 9) Code — minimal but production-grade starters

### 9.1 LiveKit access token (Next API route)

`/app/api/livekit-token/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "anon";
  const roomName = req.nextUrl.searchParams.get("room") || "assistant";
  const now = Math.floor(Date.now() / 1000);

  // LiveKit AccessToken payload (JWT). See LiveKit auth docs.
  const payload = {
    sub: userId,
    nbf: now - 10,
    exp: now + 60 * 10,
    video: {
      room: roomName,
      canPublish: true,
      canSubscribe: true
    }
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(new TextEncoder().encode(process.env.LIVEKIT_API_SECRET!));

  return NextResponse.json({ url: process.env.LIVEKIT_URL, token });
}
```

> Access tokens are JWT-based and encode room/permissions. ([LiveKit Docs][11])

### 9.2 Client hook to join LiveKit room

`/app/(voice)/useRoomClient.tsx`

```ts
"use client";
import { useEffect, useState } from "react";
import { Room, RoomEvent } from "livekit-client";

export function useRoomClient(roomName = "assistant") {
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    let r: Room | null = null;
    (async () => {
      const res = await fetch(`/api/livekit-token?room=${roomName}`);
      const { url, token } = await res.json();
      r = new Room();
      await r.connect(url, token);
      r?.on(RoomEvent.Connected, () => console.log("connected"));
      setRoom(r);
    })();
    return () => { r?.disconnect(); };
  }, [roomName]);

  return room;
}
```

### 9.3 Wake-word (Porcupine Web)

`/app/(voice)/wakeword.tsx`

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { usePorcupine } from "@picovoice/porcupine-web-react";

export default function WakeWord({ onWake }: { onWake: () => void }) {
  const [active, setActive] = useState(false);
  const { init, start, stop, keywordDetection } = usePorcupine();

  useEffect(() => {
    init({
      accessKey: process.env.NEXT_PUBLIC_PICOVOICE_ACCESS_KEY!, // from .env
      // Use a trained .ppn for "Hey Buddy" or any phrase you create in Console
      keywords: [{ publicPath: "/keywords/hey-buddy.ppn", label: "hey-buddy" }],
    }).then(() => start());

    return () => { stop(); };
  }, [init, start, stop]);

  useEffect(() => {
    if (!keywordDetection) return;
    if (keywordDetection.label === "hey-buddy") {
      setActive(true);
      onWake();
    }
  }, [keywordDetection, onWake]);

  return <div aria-live="polite">{active ? "Listening..." : "Say 'Hey Buddy' to start"}</div>;
}
```

> Porcupine Web quickstart & API (WASM) for browser wake-word. ([Picovoice][6])
> Alternative open-source: **openWakeWord** (Python/edge) if you prefer OSS training. ([GitHub][8])

### 9.4 Agents session (server) — Pro/Pro+

Create an Agent that runs STT→LLM→TTS with barge-in and turn detection.

```ts
// server/agent.ts
import { AgentSession, pipeline } from "livekit-agents";
// configure STT/TTS providers per plan (OpenAI TTS, AssemblyAI, etc.)

export async function startAgent(roomName: string) {
  const session = await AgentSession.create({
    room: { name: roomName, url: process.env.LIVEKIT_URL!, apiKey: process.env.LIVEKIT_API_KEY!, apiSecret: process.env.LIVEKIT_API_SECRET! },
    agent: pipeline.voice({
      stt: pipeline.stt.openai(),     // swap per plan/provider
      llm: pipeline.llm.openai(),     // your system prompt + tools
      tts: pipeline.tts.openai(),     // or ElevenLabs/Rime/etc.
      turnDetection: pipeline.turn.livekit() // end-of-turn improvements
    })
  });
  return session;
}
```

> VoicePipelineAgent abstracts STT→LLM→TTS; providers are swappable. Turn detection & interruptions are first-class. ([LiveKit Docs][4])

---

## 10) Usage metering & enforcement (Stripe Meters)

Record usage events server-side and feed Stripe **Meters**:

```ts
// usage.ts
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function recordUsage({ meter, value, userId }: { meter: string; value: number; userId: string }) {
  // Map your userId -> Stripe customer in DB
  const customer = await lookupCustomer(userId);
  await stripe.meters.usageRecords.create({
    meter,
    value,
    customer,
    timestamp: Math.floor(Date.now()/1000)
  });
}
```

* **Emit** `voice.session_started/ended` → minutes
* **Emit** `email.sent`, `email.summary_created`
* **Emit** `rag.ingest_bytes` & `storage.gb` snapshots

Stripe's new usage-based model relies on **Meters**; legacy "metered without Meter" was removed. ([Stripe][22], [Stripe Docs][23])

---

## 11) Email & calendar flows (least-privilege OAuth)

* **Gmail**: request `gmail.readonly` for triage/summaries; add `gmail.send` *only* to send; `gmail.modify` if labeling. Scope lists & guidance here. ([Google for Developers][24])
* **Calendar**: `.../auth/calendar` to create events. ([Google for Developers][18])
* **Microsoft Graph**: `Mail.Read`, `Mail.Send` (and `offline_access`), use `/me/sendMail` to send. ([Microsoft Learn][19])

---

## 12) Push notifications (PWA)

* Generate VAPID keys; subscribe client; send notifications from server.
  Docs: MDN Push API & VAPID tutorial (includes Node sample). ([MDN Web Docs][20])

---

## 13) Data model (Postgres)

```sql
CREATE TABLE users(
  id uuid primary key, email text unique, created_at timestamptz default now()
);
CREATE TABLE assistants(
  id uuid primary key, owner uuid references users(id), name text, plan text, settings jsonb
);
CREATE TABLE connections(
  id uuid primary key, user_id uuid references users(id),
  type text, scopes text[], token_ref text, status text, created_at timestamptz default now()
);
CREATE TABLE tasks(
  id uuid primary key, user_id uuid references users(id),
  title text, due_at timestamptz, attendees text[], source_email_id text
);
CREATE TABLE events(
  id uuid primary key, user_id uuid references users(id),
  title text, start_at timestamptz, end_at timestamptz, location text
);
CREATE TABLE usage_ledger(
  id bigserial primary key, user_id uuid, category text, unit text, amount numeric, occurred_at timestamptz, session_id text
);
```

---

## 14) Routines (low-code automations)

Ship 3 canned routines users can toggle:

* **Morning Brief (7:30am)**: today's agenda + flagged emails → push
* **Inbox Sweep (4:30pm)**: summarize new threads; propose tasks → confirm
* **After-School Digest (6:00pm)**: kid agenda deltas + tomorrow preview

---

## 15) Plan gates (UI)

* Disabled toggles (e.g., **Wake-word** requires **Pro+**) with Upgrade CTA
* Usage bars with soft-cap alerts at 80%
* Explain pipelines inline: "Pro enables barge-in & faster turn-taking"

---

## 16) Notes on alternatives / options

* **Self-host** LiveKit if you need fully private media; Cloud is simpler to scale with transparent pricing calculators for AI agents. ([LiveKit][25])
* **Wake-word**: Porcupine has first-class Web/Node SDKs & Console to train custom words in seconds (WASM in browser). If you want OSS, openWakeWord + Silero-VAD combine well on edge devices. ([Picovoice][26], [GitHub][8])

---

## 17) Dev scripts

```json
// package.json (scripts)
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "db:push": "drizzle-kit push",
  "stripe:listen": "stripe listen --forward-to localhost:3000/api/stripe/webhook"
}
```

---

## 18) What's next

* Add **email → task extractor** with lightweight rules + LLM
* Ship **Family template**: children, schools, teams (ICS import)
* Add **meeting mode** (Enterprise): multi-party diarization via Agents; see LiveKit's STT/TTS integrations list. ([LiveKit Docs][27])

---

### Appendix: reference links you'll use while building

* LiveKit Cloud overview & pricing; auth & connecting; Agents quickstarts & pipeline docs. ([LiveKit Docs][1], [LiveKit][25])
* OpenAI Realtime/TTS integrations via LiveKit. ([LiveKit Docs][9])
* Gmail scopes; Calendar scopes. ([Google for Developers][24])
* Microsoft Graph permissions & sendMail. ([Microsoft Learn][19])
* Push API & VAPID. ([MDN Web Docs][20])
* pgvector for RAG (incl. Neon/Supabase docs). ([GitHub][28], [Neon][16], [Supabase][29])
* Use levenshtein for wake word and an option for Porcupine Web quickstart/API; openWakeWord. ([Picovoice][6], [GitHub][8])
* Stripe usage-based billing & meters (and legacy deprecations). ([Stripe][22], [Stripe Docs][23])

---

[1]: https://docs.livekit.io/home/cloud/?utm_source=chatgpt.com "LiveKit Cloud"
[2]: https://blog.livekit.io/towards-a-future-aligned-pricing-model/?utm_source=chatgpt.com "Towards a future-aligned pricing model"
[3]: https://docs.livekit.io/home/client/connect/?utm_source=chatgpt.com "Connecting to LiveKit"
[4]: https://docs.livekit.io/agents/v0/voice-agent/voice-pipeline/?utm_source=chatgpt.com "VoicePipelineAgent"
[5]: https://docs.livekit.io/agents/build/turns/?utm_source=chatgpt.com "Turn detection and interruptions"
[6]: https://picovoice.ai/docs/quick-start/porcupine-web/?utm_source=chatgpt.com "Porcupine Wake Word Web Quick Start"
[7]: https://www.home-assistant.io/voice_control/create_wake_word/?utm_source=chatgpt.com "Wake words for Assist"
[8]: https://github.com/dscripka/openWakeWord?utm_source=chatgpt.com "dscripka/openWakeWord: An open-source audio wake ..."
[9]: https://docs.livekit.io/agents/integrations/realtime/openai/?utm_source=chatgpt.com "OpenAI Realtime API integration guide"
[10]: https://docs.livekit.io/agents/build/?utm_source=chatgpt.com "Building voice agents"
[11]: https://docs.livekit.io/home/get-started/authentication/?utm_source=chatgpt.com "Authentication"
[12]: https://github.com/livekit/livekit?utm_source=chatgpt.com "livekit/livekit: End-to-end realtime stack for connecting ..."
[13]: https://docs.livekit.io/agents/start/voice-ai/?utm_source=chatgpt.com "Voice AI quickstart"
[14]: https://openai.com/index/new-embedding-models-and-api-updates/?utm_source=chatgpt.com "New embedding models and API updates"
[15]: https://platform.openai.com/docs/guides/embeddings?utm_source=chatgpt.com "OpenAI Embeddings Guide"
[16]: https://neon.com/docs/extensions/pgvector?utm_source=chatgpt.com "The pgvector extension - Neon Docs"
[17]: https://developers.google.com/identity/protocols/oauth2/scopes?utm_source=chatgpt.com "OAuth 2.0 Scopes for Google APIs"
[18]: https://developers.google.com/workspace/calendar/api/guides/create-events?utm_source=chatgpt.com "Create events | Google Calendar"
[19]: https://learn.microsoft.com/en-us/graph/permissions-reference?utm_source=chatgpt.com "Microsoft Graph permissions reference"
[20]: https://developer.mozilla.org/en-US/docs/Web/API/Push_API?utm_source=chatgpt.com "Push API - MDN - Mozilla"
[21]: https://blog.mozilla.org/services/2016/08/23/sending-vapid-identified-webpush-notifications-via-mozillas-push-service/?utm_source=chatgpt.com "Sending VAPID identified WebPush Notifications via ..."
[22]: https://stripe.com/billing/usage-based-billing?utm_source=chatgpt.com "Fast, Flexible Usage-Based Billing Software"
[23]: https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-legacy-usage-based-billing?utm_source=chatgpt.com "Removes legacy usage-based billing"
[24]: https://developers.google.com/workspace/gmail/api/auth/scopes?utm_source=chatgpt.com "Choose Gmail API scopes"
[25]: https://livekit.io/pricing?utm_source=chatgpt.com "LiveKit Pricing"
[26]: https://picovoice.ai/docs/porcupine/?utm_source=chatgpt.com "Porcupine Wake Word SDK Introduction - Picovoice Docs"
[27]: https://docs.livekit.io/agents/integrations/stt/?utm_source=chatgpt.com "Speech-to-text (STT) integrations"
[28]: https://github.com/pgvector/pgvector?utm_source=chatgpt.com "pgvector/pgvector: Open-source vector similarity search for ..."
[29]: https://supabase.com/docs/guides/database/extensions/pgvector?utm_source=chatgpt.com "pgvector: Embeddings and vector similarity"
