import { Pool } from "pg";
import type { ConnectionConfig, ToolConfig } from "./config.js";

let pool: Pool | null = null;

export function initPool(config: ConnectionConfig): Pool {
  if (pool) return pool;

  pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
  });

  return pool;
}

export async function executeTool(
  tool: ToolConfig,
  params: Record<string, any>,
  config: ConnectionConfig
): Promise<{ rows: any[]; formatted: string }> {
  const p = initPool(config);

  // Convert {{param}} to $1, $2, etc.
  const values: any[] = [];
  let idx = 0;

  const sql = tool.sql.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    idx++;
    values.push(params[name]);
    return `$${idx}`;
  });

  const result = await p.query(sql, values);

  // Format response using template
  const formatted = formatResponse(tool.responseTemplate, result.rows, params);

  return { rows: result.rows, formatted };
}

function formatResponse(
  template: string,
  rows: any[],
  params: Record<string, any>
): string {
  let out = template;

  // Replace {{param}}
  for (const [k, v] of Object.entries(params)) {
    out = out.replaceAll(`{{${k}}}`, String(v ?? ""));
  }

  // Replace {{result.length}}
  out = out.replaceAll("{{result.length}}", String(rows.length));

  // Replace {{result[0].field}}
  out = out.replace(/\{\{result\[(\d+)\]\.(\w+)\}\}/g, (_, i, f) => {
    return String(rows[parseInt(i)]?.[f] ?? "");
  });

  // Replace {{result.field}} (first row)
  out = out.replace(/\{\{result\.(\w+)\}\}/g, (_, f) => {
    return String(rows[0]?.[f] ?? "");
  });

  return out;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
