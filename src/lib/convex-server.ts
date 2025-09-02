import { ConvexHttpClient } from "convex/browser";

// Server-side Convex client for API routes
export const convexServer = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
