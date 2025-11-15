import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { currentDeploymentEnv } from "@/lib/current-deployment-env";

export interface LLMProviderModel {
  id: string;
  name: string;
}

export interface LLMProviderModelListResponse {
  llmProviderModels: LLMProviderModel[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Fetch the provider from DB
  const llmProvider = await prisma.lLMProvider.findUniqueOrThrow({
    where: { id },
  });

  // Use API key from DB, fallback to env if cloud
  let apiKey = llmProvider.apiKey;
  if (currentDeploymentEnv === "cloud") {
    apiKey = process.env.GOOGLE_API_KEY as string;
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not set for this provider" },
      { status: 400 }
    );
  }

  try {
    const url = new URL(
      "https://generativelanguage.googleapis.com/v1beta/models"
    );
    url.searchParams.append("key", apiKey);
    url.searchParams.append("pageSize", "1000");

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error("Failed to fetch models:", response.status, await response.text());
      return NextResponse.json({ llmProviderModels: [] }, { status: 500 });
    }

    const { models } = await response.json();

    const llmProviderModels = models
      .filter(({ displayName }: { displayName: string }) => {
        if (currentDeploymentEnv === "cloud") {
          return displayName === "Gemini 2.0 Flash";
        }
        return true;
      })
      .map(({ name, displayName }: { name: string; displayName: string }) => ({
        id: name,
        name: displayName,
      }));

    return NextResponse.json<LLMProviderModelListResponse>({
      llmProviderModels,
    });
  } catch (err) {
    console.error("Error fetching models:", err);
    return NextResponse.json({ llmProviderModels: [] }, { status: 500 });
  }
}
