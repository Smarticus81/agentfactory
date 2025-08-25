import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const convexToken = process.env.CONVEX_TEAM_ACCESS_TOKEN;
    const vercelHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;

    if (!convexToken || !vercelHookUrl) {
      return new NextResponse("Missing deployment configuration", { status: 500 });
    }

    // TODO: Implement Convex deployment logic using the Management API

    const vercelResponse = await fetch(vercelHookUrl, {
      method: "POST",
    });

    if (!vercelResponse.ok) {
      const errorBody = await vercelResponse.text();
      console.error("Vercel deployment error:", errorBody);
      return new NextResponse("Failed to trigger Vercel deployment", { status: 500 });
    }

    const responseData = await vercelResponse.json();
    console.log("Vercel deployment triggered:", responseData);

    return NextResponse.json({ message: "Deployment triggered successfully", vercel: responseData });

  } catch (error) {
    console.error("[DEPLOY_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
