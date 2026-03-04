import http from "http";
import fs from "fs";
import path from "path";

const STATIC_DIR = path.resolve(process.cwd(), "static");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

export async function serveStatic(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string
): Promise<boolean> {
  // Default to index.html
  let filePath = pathname === "/" ? "/index.html" : pathname;
  filePath = path.join(STATIC_DIR, filePath);

  // Prevent directory traversal
  if (!filePath.startsWith(STATIC_DIR)) {
    return false;
  }

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      // Try index.html for SPA routing
      filePath = path.join(STATIC_DIR, "index.html");
      if (!fs.existsSync(filePath)) return false;
    }
  } catch {
    // Try index.html for SPA routing
    const indexPath = path.join(STATIC_DIR, "index.html");
    if (fs.existsSync(indexPath)) {
      filePath = indexPath;
    } else {
      return false;
    }
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
  return true;
}
