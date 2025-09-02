import { ConvexReactClient } from "convex/react";
import { ConvexHttpClient } from "convex/browser";

// Client for React components (client-side)
export const convexReactClient = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

// Client for server-side API routes
export const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

// Export the React client as default for backward compatibility
export default convexReactClient;
