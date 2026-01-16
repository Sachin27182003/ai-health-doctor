// 1. Import the database instance from your local lib
import prisma from "@/lib/prisma"; 
// 2. Import the types directly from the Prisma package
import { Prisma } from "@prisma/client"; 
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { currentDeploymentEnv } from "@/lib/current-deployment-env";

export interface LLMProvider
  extends Prisma.LLMProviderGetPayload<{
    select: {
      id: true;
      providerId: true;
      name: true;
      apiKey: true;
      apiURL: true;
    };
  }> {
  id: string;
}

export interface LLMProviderListResponse {
  llmProviders: LLMProvider[];
}

export async function GET() {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const llmProviders = await prisma.lLMProvider.findMany({
    where: { authorId: session.user.id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json<LLMProviderListResponse>({
    llmProviders: llmProviders
      .filter(({ providerId }) => {
        // exclude Ollama from cloud deployment
        if (currentDeploymentEnv === "cloud")
          return !["ollama"].includes(providerId);
        return true;
      })
      .map((provider) => {
        // simply return the provider as-is, including the raw apiKey
        return { ...provider };
      }),
  });
}
