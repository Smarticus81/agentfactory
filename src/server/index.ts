import http from "http";
import { spawn, type ChildProcess } from "child_process";
import { loadAppConfig, type AppConfig } from "../lib/bevone/config";
import { executeTool } from "../lib/bevone/sql-executor";
import { serveStatic } from "./static";
import { generateLiveKitToken } from "./livekit-token";

const PORT = parseInt(process.env.PORT || "8080");

async function main() {
  const config = loadAppConfig();

  // Start LiveKit agent worker as subprocess
  const agentProc = startAgentWorker();

  // Create HTTP server
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);

    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", app: config.name }));
      return;
    }

    // LiveKit token
    if (url.pathname === "/api/livekit-token") {
      await handleLiveKitToken(req, res, config);
      return;
    }

    // POS API routes
    if (url.pathname.startsWith("/api/pos/")) {
      await handlePosApi(req, res, url.pathname, config);
      return;
    }

    // Static files (POS UI)
    if (await serveStatic(req, res, url.pathname)) {
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(PORT, () => {
    console.log(`[BevOne] Server running on port ${PORT}`);
    console.log(`[BevOne] App: ${config.name}`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    agentProc.kill("SIGTERM");
    server.close();
    process.exit(0);
  });
}

function startAgentWorker(): ChildProcess {
  const proc = spawn("node", ["dist/agent/worker.js", "start"], {
    stdio: "inherit",
    env: process.env,
  });

  proc.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[BevOne] Agent worker crashed, restarting...`);
      setTimeout(startAgentWorker, 3000);
    }
  });

  return proc;
}

async function handleLiveKitToken(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  config: AppConfig
) {
  try {
    const token = await generateLiveKitToken(config.id);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(token));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: error instanceof Error ? error.message : "Token generation failed"
    }));
  }
}

async function handlePosApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  config: AppConfig
) {
  const segments = pathname.replace("/api/pos/", "").split("/");
  const method = req.method!;

  // Map REST routes to tool names
  const routeMap: Record<string, string> = {
    "GET:/tabs": "pos_get_tabs",
    "POST:/tabs": "pos_open_tab",
    "GET:/tabs/:id": "pos_get_tab_detail",
    "POST:/tabs/:id/items": "pos_add_items",
    "PATCH:/tabs/:id/items/:itemId": "pos_void_item",
    "POST:/tabs/:id/pay": "pos_close_tab",
    "GET:/menu": "pos_get_menu",
    "GET:/menu/categories": "pos_get_categories",
    "POST:/menu/items/:id/86": "pos_86_item",
    "GET:/reports": "pos_get_sales",
  };

  // Find matching route
  let toolName: string | null = null;
  let params: Record<string, any> = {};

  for (const [route, tool] of Object.entries(routeMap)) {
    const [routeMethod, routePath] = route.split(":");
    if (routeMethod !== method) continue;

    const match = matchRoute(routePath, "/" + segments.join("/"));
    if (match) {
      toolName = tool;
      params = match;
      break;
    }
  }

  if (!toolName) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  // Find tool config
  const tool = config.tools.find(t => t.name === toolName);
  if (!tool) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Tool ${toolName} not configured` }));
    return;
  }

  // Parse body for POST/PATCH
  if (["POST", "PATCH"].includes(method)) {
    const body = await parseBody(req);
    params = { ...params, ...body };
  }

  // Execute tool
  try {
    const result = await executeTool(tool, params, config.connection);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data: result.rows }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Execution failed"
    }));
  }
}

function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }

  return params;
}

async function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

main().catch(console.error);
