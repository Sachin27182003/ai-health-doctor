// chat-setting-side-bar.tsx

"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  AssistantMode,
  AssistantModeListResponse,
} from "@/app/api/assistant-modes/route";
import { ChatRoomGetResponse } from "@/app/api/chat-rooms/[id]/route";
import { AssistantModePatchRequest } from "@/app/api/assistant-modes/[id]/route";
import {
  LLMProvider,
  LLMProviderListResponse,
} from "@/app/api/llm-providers/route";
import {
  LLMProviderModel,
  LLMProviderModelListResponse,
} from "@/app/api/llm-providers/[id]/models/route";
import { cn } from "@/lib/utils";
import { ConditionalDeploymentEnv } from "@/components/common/deployment-env";
import { useTranslations } from "next-intl";

interface ChatSettingSideBarProps {
  chatRoomId: string;
}

export default function ChatSettingSideBar({
  chatRoomId,
}: ChatSettingSideBarProps) {
  const t = useTranslations("ChatSettingSideBar");

  const [selectedAssistantMode, setSelectedAssistantMode] =
    useState<AssistantMode>();
  const [selectedLLMProvider, setSelectedLLMProvider] = useState<LLMProvider>();
  const [selectedLLMProviderModel, setSelectedLLMProviderModel] =
    useState<LLMProviderModel>();
  const [llmProviderModels, setLLMProviderModels] = useState<
    LLMProviderModel[]
  >([]);

  const { data: chatRoomData, mutate: chatRoomMutate } =
    useSWR<ChatRoomGetResponse>(
      `/api/chat-rooms/${chatRoomId}`,
      async (url: string) => {
        const response = await fetch(url);
        return response.json();
      }
    );

  const { data: llmProvidersData } = useSWR<LLMProviderListResponse>(
    "/api/llm-providers",
    async (url: string) => {
      const response = await fetch(url);
      return response.json();
    }
  );

  useEffect(() => {
    onChangeChatRoom({
      llmProviderModelId: selectedLLMProviderModel?.id,
    });
  }, [selectedLLMProviderModel]);

  // Initialize assistant mode from localStorage or chatRoomData
  useEffect(() => {
    if (!chatRoomData?.chatRoom.assistantMode) return;

    // If no saved prompt, use the current one and save it
    setSelectedAssistantMode(chatRoomData.chatRoom.assistantMode);
  }, [chatRoomData?.chatRoom.assistantMode?.id]);

  useEffect(() => {
    if (llmProvidersData?.llmProviders?.length === 1) {
      const provider = llmProvidersData.llmProviders[0];
      setSelectedLLMProvider(provider);
      onChangeChatRoom({
        llmProviderId: provider.id,
        llmProviderModelId: null,
      });
    }
  }, [llmProvidersData]);

  const { data: assistantModesData, mutate: assistantModesMutate } =
    useSWR<AssistantModeListResponse>(
      "/api/assistant-modes",
      async (url: string) => {
        const response = await fetch(url);
        return response.json();
      }
    );
  const assistantModes = useMemo(
    () => assistantModesData?.assistantModes || [],
    [assistantModesData]
  );

  // Fetch models when LLM is selected
  useEffect(() => {
    if (!selectedLLMProvider) return;

    const fetchLLMProviderModels = async () => {
      try {
        const response = await fetch(
          `/api/llm-providers/${selectedLLMProvider.id}/models`
        );

        if (!response.ok) {
          console.error("Failed to fetch models:", response.status);
          setLLMProviderModels([]);
          return;
        }

        // 🧠 Handle empty or invalid responses safely
        const text = await response.text();
        if (!text) {
          console.warn("Empty response for models");
          setLLMProviderModels([]);
          return;
        }

        let data: LLMProviderModelListResponse;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("Invalid JSON from /models endpoint:", text);
          console.error(e);
          setLLMProviderModels([]);
          return;
        }

        const models = data.llmProviderModels || [];
        setLLMProviderModels(models);

        if (models.length > 0) {
          setSelectedLLMProviderModel(models[3]);
          await onChangeChatRoom({ llmProviderModelId: models[3].id });
        }
      } catch (err) {
        console.error("Error fetching LLM models:", err);
        setLLMProviderModels([]);
      }
    };

    fetchLLMProviderModels();
  }, [selectedLLMProvider]);

  const onChangeChatRoom = async ({
    assistantModeId,
    llmProviderId,
    llmProviderModelId,
  }: {
    assistantModeId?: string;
    llmProviderId?: string;
    llmProviderModelId?: string | null;
  }) => {
    if (chatRoomData === undefined) return;
    const response = await fetch(`/api/chat-rooms/${chatRoomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assistantModeId,
        llmProviderId,
        llmProviderModelId,
      }),
    });
    const data = await response.json();

    // Get the saved system prompt
    const updatedAssistantMode = {
      ...data.chatRoom.assistantMode,
      systemPrompt: data.chatRoom.assistantMode.systemPrompt,
    };

    await chatRoomMutate({
      ...chatRoomData,
      chatRoom: {
        ...chatRoomData.chatRoom,
        assistantMode: updatedAssistantMode,
        llmProviderId: llmProviderId || chatRoomData.chatRoom.llmProviderId,
        llmProviderModelId:
          llmProviderModelId || chatRoomData.chatRoom.llmProviderModelId,
      },
    });
    setSelectedAssistantMode(updatedAssistantMode);
  };

  const onChangeAssistantMode = async (
    assistantModeId: string,
    body: AssistantModePatchRequest
  ) => {
    const response = await fetch(`/api/assistant-modes/${assistantModeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    await assistantModesMutate({
      ...assistantModesData,
      assistantModes:
        assistantModesData?.assistantModes.map((assistantMode) => {
          if (assistantMode.id === assistantModeId) {
            return data.assistantMode;
          }
          return assistantMode;
        }) || [],
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="space-y-4">
          <h4 className="text-sm font-medium ">{t("modelSettings")}</h4>
          <div className="space-y-2 ">
            {llmProvidersData?.llmProviders?.length ? (
              <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
                <p className="text-sm font-medium text-gray-700">
                  {llmProvidersData.llmProviders[0]?.name}
                </p>
              </div>
            ) : null}

            <Select
              value={selectedLLMProviderModel?.id}
              onValueChange={(value) =>
                setSelectedLLMProviderModel(
                  llmProviderModels.find((model) => model.id === value)
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectModel")} />
              </SelectTrigger>
              <SelectContent
                className={cn("bg-white max-h-80 overflow-y-auto rounded-md",
    "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent")}
              >
                {llmProviderModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}

                {llmProviderModels.length === 0 && (
                  <div className="p-2 text-sm text-gray-500">
                    {t("noModelsFound")}
                  </div>
                )}
              </SelectContent>
            </Select>

            <ConditionalDeploymentEnv
              env={["cloud"]}
            ></ConditionalDeploymentEnv>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("systemPrompt")}</label>
          <Textarea
            value={selectedAssistantMode?.systemPrompt || ""}
            onChange={async (e) => {
              if (selectedAssistantMode) {
                setSelectedAssistantMode({
                  ...selectedAssistantMode,
                  systemPrompt: e.target.value,
                });
                await onChangeAssistantMode(selectedAssistantMode.id, {
                  systemPrompt: e.target.value,
                });
              }
            }}
            rows={6}
            className="resize-none"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium ">{t("assistantMode")}</h4>
          </div>
          <div className="space-y-2">
            {assistantModes.map((assistantMode) => (
              <button
                key={assistantMode.id}
                className={`w-full p-3 rounded-lg text-left border transition-colors
                        ${
                          selectedAssistantMode?.id === assistantMode.id
                            ? "bg-white border-gray-300"
                            : "border-transparent hover:bg-gray-100"
                        }`}
                onClick={async () => {
                  await onChangeChatRoom({ assistantModeId: assistantMode.id });
                }}
              >
                <div className="text-sm font-medium">{assistantMode.name}</div>
                <div className="text-xs text-gray-500">
                  {assistantMode.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
