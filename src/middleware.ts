import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/sign-in",
    "/sign-up",
    "/onboarding",
    "/agent-api",
    "/api/gmail/status",
    "/api/gmail/auth",
    "/api/gmail/callback",
    "/api/gmail/check",
  ],
  ignoredRoutes: [
    "/api/gmail/callback",
  ],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
  runtime: "nodejs",
};
