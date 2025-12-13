import { ConvexHttpClient } from "convex/browser";

let convexClient: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
  const deploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const adminKey = process.env.CONVEX_DEPLOY_KEY;

  if (!deploymentUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not defined");
  }

  if (!adminKey) {
    throw new Error("CONVEX_DEPLOY_KEY is not defined");
  }

  if (!convexClient) {
    convexClient = new ConvexHttpClient(deploymentUrl, {
      skipConvexDeploymentUrlCheck: true,
    });
    convexClient.setAdminAuth(adminKey);
  }

  return convexClient;
}

export const convex = getConvexClient();
