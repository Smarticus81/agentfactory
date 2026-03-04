import { ConvexHttpClient } from "convex/browser";

let client: ConvexHttpClient | null = null;

export function getConvexServer(): ConvexHttpClient {
  if (!client) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
    }
    client = new ConvexHttpClient(convexUrl);
    const adminKey = process.env.CONVEX_DEPLOY_KEY;
    if (adminKey && typeof (client as any).setAdminAuth === 'function') {
      (client as any).setAdminAuth(adminKey);
    }
  }
  return client;
}

// Lazy getter for backwards compat
export const convexServer = new Proxy({} as ConvexHttpClient, {
  get(_target, prop) {
    return (getConvexServer() as any)[prop];
  }
});
