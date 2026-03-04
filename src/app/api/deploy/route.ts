import { NextResponse } from "next/server";
import { deploymentService } from "@/lib/deployment-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { appConfig } = body;

    if (!appConfig || !appConfig.id) {
      return NextResponse.json(
        { error: "Missing appConfig with id" },
        { status: 400 }
      );
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    if (!vercelToken) {
      return NextResponse.json(
        { error: "Missing deployment configuration (VERCEL_TOKEN)" },
        { status: 500 }
      );
    }

    const result = await deploymentService.deployToVercel({ appConfig });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Deployment triggered successfully",
      url: result.url,
      deploymentId: result.deploymentId,
    });
  } catch (error) {
    console.error("[DEPLOY_POST]", error);
    return NextResponse.json(
      { error: "Internal Error" },
      { status: 500 }
    );
  }
}
