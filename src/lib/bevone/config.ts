/**
 * BevOne App Configuration
 * Loaded from APP_CONFIG environment variable (injected by deployment engine)
 */

export interface VoiceConfig {
  name: string;           // "Bev"
  provider: string;       // "openai"
  voiceId: string;        // "alloy"
  personality: string;    // System prompt
  greeting: string;       // "Ready! What can I get you?"
}

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array";
  description: string;
  required: boolean;
}

export interface ToolConfig {
  name: string;           // "pos_open_tab"
  displayName: string;    // "Open Tab"
  description: string;    // Used by LLM for tool selection
  type: "SQL_READ" | "SQL_WRITE";
  sql: string;            // Parameterized SQL with {{placeholders}}
  parameters: ToolParameter[];
  responseTemplate: string;
  requiresApproval: boolean;
}

export interface ConnectionConfig {
  type: "POSTGRES";
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export interface PosConfig {
  venueName: string;
  taxRate: number;        // 0.08 = 8%
  currency: string;       // "USD"
  paymentMethods: string[];
  tipPresets: number[];   // [15, 18, 20]
}

export interface AppConfig {
  id: string;
  name: string;
  voice: VoiceConfig;
  tools: ToolConfig[];
  connection: ConnectionConfig;
  pos?: PosConfig;
}

let cachedConfig: AppConfig | null = null;

export function loadAppConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const json = process.env.APP_CONFIG;
  if (!json) {
    throw new Error("APP_CONFIG environment variable not set");
  }

  cachedConfig = JSON.parse(json);
  return cachedConfig!;
}

export function getAppConfig(): AppConfig {
  if (!cachedConfig) {
    return loadAppConfig();
  }
  return cachedConfig;
}
