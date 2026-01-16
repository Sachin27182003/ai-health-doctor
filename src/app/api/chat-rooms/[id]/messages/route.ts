import { NextRequest, NextResponse } from "next/server";
// 1. Import the database instance from your local lib
import prisma from "@/lib/prisma"; 
// 2. Import the types directly from the Prisma package
import { Prisma } from "@prisma/client"; 
import { auth } from "@/auth";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// ----------------------
// Interfaces
// ----------------------
export interface ChatMessage
  extends Prisma.ChatMessageGetPayload<{
    select: { id: true; content: true; createdAt: true; role: true };
  }> {
  id: string;
}

export interface ChatMessageListResponse {
  chatMessages: ChatMessage[];
}

export interface ChatMessageCreateRequest {
  content: string;
  role: "USER" | "ASSISTANT";
  settings?: {
    company: string;
    model: string;
    apiEndpoint: string;
    apiKey: string;
  };
}

// ----------------------
// GET handler
// ----------------------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chatMessages = await prisma.chatMessage.findMany({
    where: { chatRoomId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json<ChatMessageListResponse>({ chatMessages });
}

// ----------------------
// POST handler
// ----------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user;
  if (!session || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body: ChatMessageCreateRequest = await req.json();

  const { chatRoom, assistantMode, chatMessages, healthDataList } =
    await prisma.$transaction(async (prisma) => {
      // Save user message
      await prisma.chatMessage.create({
        data: { content: body.content, role: body.role, chatRoomId: id },
      });

      // Get chatRoom, assistant mode, messages, health data
      const { assistantMode } = await prisma.chatRoom.update({
        where: { id },
        data: { lastActivityAt: new Date() },
        select: { assistantMode: { select: { systemPrompt: true } } },
      });

      const chatMessages = await prisma.chatMessage.findMany({
        where: { chatRoomId: id },
        orderBy: { createdAt: "asc" },
      });

      const healthDataList = await prisma.healthData.findMany({
        where: { authorId: user.id },
      });
      const chatRoom = await prisma.chatRoom.findUniqueOrThrow({
        where: { id },
      });

      return { chatRoom, chatMessages, assistantMode, healthDataList };
    });

  // Only Google API key
  const apiKey = process.env.GOOGLE_API_KEY as string;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set");

  const messages = [
    { role: "system" as const, content: assistantMode.systemPrompt },
    {
      role: "user" as const,
      content: `Health data sources: ${healthDataList
        .map((h) => `${h.type}: ${JSON.stringify(h.data)}`)
        .join("\n")}`,
    },
    ...chatMessages.map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant",
      content: m.content,
    })),
  ];

  // ----------------------
  // Google LLM streaming
  // ----------------------
 // ... inside the POST function ...

  const responseStream = new ReadableStream({
    async start(controller) {
      let fullMessageForDb = ""; // Store full text here for DB saving

      try {
        let llmProviderModelId = chatRoom.llmProviderModelId;

        // FIX 1: Use a valid model name
        if (!llmProviderModelId) {
          llmProviderModelId = "gemini-2.5-flash"; // Changing 2.5 to 1.5-flash (faster/cheaper) or 1.5-pro
          
          // Optional: Update DB to use this valid model
          await prisma.chatRoom.update({
            where: { id },
            data: { llmProviderModelId },
          });
        }

        const gemini = new ChatGoogleGenerativeAI({
          apiKey,
          model: llmProviderModelId,
        }).withConfig({ metadata: { chatRoomId: id }, runName: "chat" });

        const chatStream = await gemini.stream(messages);
        
        for await (const part of chatStream) {
          const deltaContent = part.content?.toString() || "";
          
          if (deltaContent) {
            // Accumulate for the Database
            fullMessageForDb += deltaContent;

            // FIX 2: Send only the DELTA to the client
            // The client does "messageContent += content", so we send only the new part
            controller.enqueue(
              `${JSON.stringify({ content: deltaContent })}\n`
            );
          }
        }

        // Save assistant response to DB
        await prisma.$transaction(async (prisma) => {
          await prisma.chatMessage.create({
            data: {
              content: fullMessageForDb, // Save the full message
              role: "ASSISTANT",
              chatRoomId: id,
            },
          });
          await prisma.chatRoom.update({
            where: { id },
            data: { lastActivityAt: new Date(), name: fullMessageForDb.substring(0, 50) },
          });
        });
      } catch (error) {
        console.error("Error in chat stream:", error);
        controller.enqueue(
          `${JSON.stringify({ error: "Failed to get response from LLM" })}\n`
        );
      }

      controller.close();
    },
  });

  return new NextResponse(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
