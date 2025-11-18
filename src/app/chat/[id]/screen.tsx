"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, PanelLeftOpen} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LogoutButton from "@/components/auth/logout-button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ChatSideBar from "@/components/chat/chat-side-bar";
import ChatMessage from "@/components/chat/chat-message";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { ChatMessageListResponse } from "@/app/api/chat-rooms/[id]/messages/route";
import { ChatRole } from "@prisma/client";
import ChatSettingSideBar from "@/components/chat/chat-setting-side-bar";
import { useTranslations } from "next-intl";
import { NavLinks } from "@/components/ui/nav-links";
import Link from "next/link";

interface ScreenProps {
  isMobile: boolean;
}

export default function Screen({ isMobile }: ScreenProps) {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("Chat");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [inputText, setInputText] = useState("");
  const [sources] = useState([]);
  const [isJsonViewerOpen, setIsJsonViewerOpen] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(!isMobile);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(!isMobile);

  const { data, mutate } = useSWR<ChatMessageListResponse>(
    `/api/chat-rooms/${id}/messages`,
    async (url: string) => {
      const response = await fetch(url);
      return response.json();
    }
  );
  const messages = useMemo(() => data?.chatMessages || [], [data]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Clear input
    setInputText("");

    // Add user message and an assistant placeholder message so the UI shows "Thinking..."
    const userMessage = {
      id: new Date().toISOString(),
      content: inputText,
      role: "USER" as ChatRole,
      createdAt: new Date(),
    };

    const placeholderId = `assistant-temp-${Date.now()}`;
    const assistantPlaceholder = {
      id: placeholderId,
      content: "Thinking...",
      role: "ASSISTANT" as ChatRole,
      createdAt: new Date(),
    };

    const oldMessages = [...messages, userMessage, assistantPlaceholder];
    // show immediately
    await mutate({ chatMessages: oldMessages }, { revalidate: false });

    // Function to update the thinking stage message
    const updateThinkingStage = async (stage: string) => {
      await mutate(
        {
          chatMessages: [
            ...messages,
            userMessage,
            {
              id: placeholderId,
              content: stage,
              role: "ASSISTANT" as ChatRole,
              createdAt: new Date(),
            },
          ],
        },
        { revalidate: false }
      );
    };

    // Start the thinking stage sequence
    // Extract first few words from input for the reflecting stage
    const inputWords = inputText.trim().split(/\s+/).slice(0, 3).join(" ");
    const thinkingStages = [
      "Thinking...",
      `Reflecting on the ${inputWords}...`,
      "Considering the flow...",
    ];
    let stageIndex = 0;
    const stageInterval = setInterval(async () => {
      if (stageIndex < thinkingStages.length) {
        await updateThinkingStage(thinkingStages[stageIndex]);
        stageIndex++;
      } else {
        clearInterval(stageInterval);
      }
    }, 2000); // Update every 2 seconds

    const response = await fetch(`/api/chat-rooms/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: inputText,
        role: "USER",
      }),
    });

    // Read as a stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    const createdAt = new Date();
    if (reader) {
      let done = false;
      // accumulate assistant content and replace the placeholder message progressively
      let messageContent = "";
      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        const content = decoder.decode(value, { stream: !done });
        for (const data of content.split("\n").filter(Boolean)) {
          const { content, error }: { content?: string; error?: string } =
            JSON.parse(data);
          if (error) {
            console.error("Error from LLM:", error);
            continue;
          }
          if (content) {
            // Clear the thinking stage interval when LLM starts responding
            if (messageContent === "") {
              clearInterval(stageInterval);
            }

            // append delta to accumulated content
            messageContent += content;

            // replace the assistant placeholder with current accumulated content
            const updated = [
              ...messages,
              userMessage,
              {
                id: placeholderId,
                content: messageContent,
                role: "ASSISTANT" as ChatRole,
                createdAt,
              },
            ];

            await mutate({ chatMessages: updated }, { revalidate: false });
          }
        }
      }
      // Clean up the interval when done
      clearInterval(stageInterval);
      // final revalidation to sync with server
      await mutate();
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white dark:bg-zinc-900 border-b h-14 flex items-center px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="default"
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          >
            <PanelLeftOpen className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">OpenHealth</h1>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <NavLinks />
          <div className="flex items-center gap-1 -ml-7">
            <LogoutButton />
            <Button
              variant="ghost"
              size="default"
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            >
              <PanelLeftOpen className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        {isLeftSidebarOpen && (
          <div className="w-72 border-r bg-gray-50 flex flex-col overflow-hidden">
            <ChatSideBar chatRoomId={id} isLeftSidebarOpen={true} />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {messages.map((message, index) => (
              <div key={message.id ?? index}>
                {message.role === "ASSISTANT" &&
                (message.content === "Thinking..." ||
                  message.content === "Reflecting on the topic..." ||
                  message.content === "Considering the flow...") ? (
                  <div className="flex gap-2 bg-gray-50 p-2 rounded">
                    <div className="shrink-0 mt-1">
                      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200">
                        <span className="text-xs font-semibold text-gray-600">
                          A
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        <span>{message.content}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ChatMessage message={message} />
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="mb-16 md:mb-0 ">
            <div className="border-t p-4 z-10 md:static fixed bottom-0 left-0 w-full bg-white ">
              <div className="flex gap-2">
                <Button className="">
                  <Link href="/assistant">Talk to AI doctor</Link>
                </Button>
                <Input
                  placeholder={t("inputPlaceholder")}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button onClick={handleSendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        {isRightSidebarOpen && (
          <div className="w-80 border-l bg-gray-50 flex flex-col overflow-y-auto">
            <ChatSettingSideBar chatRoomId={id} />
          </div>
        )}
      </div>

      <Dialog open={isJsonViewerOpen} onOpenChange={setIsJsonViewerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Source Data</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
              {JSON.stringify(sources, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
