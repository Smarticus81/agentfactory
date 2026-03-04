import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
  llm,
  voice,
} from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as silero from "@livekit/agents-plugin-silero";

import { loadAppConfig, type AppConfig } from "../lib/bevone/config";
import { createTools } from "../lib/bevone/tool-factory";
import { initPool, closePool } from "../lib/bevone/sql-executor";

let appConfig: AppConfig;

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    // Load VAD
    proc.userData.vad = await silero.VAD.load();

    // Load BevOne config
    appConfig = loadAppConfig();

    // Initialize connection pool
    initPool(appConfig.connection);

    console.log(`[BevOne] Loaded app: ${appConfig.name}`);
    console.log(`[BevOne] Tools: ${appConfig.tools.map(t => t.name).join(", ")}`);
  },

  entry: async (ctx: JobContext) => {
    // Create tools from BevOne config
    const tools = createTools(appConfig);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(appConfig);

    // Create voice agent
    const agent = new voice.Agent({
      instructions: systemPrompt,
      tools,
    });

    // Configure voice session
    const session = new voice.AgentSession({
      stt: deepgram.STT(),
      llm: openai.LLM({ model: "gpt-4o-mini" }),
      tts: openai.TTS({ voice: appConfig.voice.voiceId as any }),
      vad: ctx.proc.userData.vad,
      turnDetection: voice.turnDetection.livekit(),
    });

    // Connect to room
    await ctx.connect();

    // Start session
    session.start(ctx.room);

    // Say greeting
    await session.say(appConfig.voice.greeting);

    // Wait for end
    await session.wait();
  },
});

function buildSystemPrompt(config: AppConfig): string {
  const toolList = config.tools
    .map(t => `- ${t.name}: ${t.description}`)
    .join("\n");

  const venueName = config.pos?.venueName || "this venue";

  return `${config.voice.personality}

You are ${config.voice.name}, the voice assistant for ${venueName}.

AVAILABLE TOOLS:
${toolList}

CRITICAL RULES FOR POS OPERATIONS:
1. ALWAYS confirm before closing tabs / processing payments
2. State the updated total after adding or voiding items
3. Use exact menu item names - ask for clarification if ambiguous
4. Keep responses SHORT - staff are busy
5. For payments: state amount, payment method, then ask "Confirm?"

EXAMPLE FLOWS:
- "Open a tab for Sarah" → Use pos_open_tab → "Tab opened for Sarah"
- "Add two IPAs" → Use pos_add_items → "Added 2 IPAs. Total is $16"
- "Close it out, cash" → "Sarah's tab is $16. Cash payment. Confirm?" → (wait for yes) → Use pos_close_tab
`;
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  await closePool();
  process.exit(0);
});

// Start agent
cli.runApp(new WorkerOptions({ agent: __filename }));
