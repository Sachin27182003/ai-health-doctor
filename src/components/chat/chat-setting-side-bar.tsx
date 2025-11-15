// chat-setting-side-bar.tsx (modified parts)
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import useSWR from "swr";
// ... other imports stay the same

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
// import React, { useEffect, useMemo, useState, useCallback } from "react";
// import useSWR from "swr";
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

  // Initialize assistant mode from chatRoomData
  useEffect(() => {
    if (!chatRoomData?.chatRoom.assistantMode) return;
    setSelectedAssistantMode(chatRoomData.chatRoom.assistantMode);
  }, [chatRoomData?.chatRoom.assistantMode]);

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

  /**
   * Make onChangeChatRoom stable by removing chatRoomData from deps.
   * Use chatRoomMutate(prev => ...) to update local cache safely without capturing
   * the previous chatRoomData in the closure.
   */
  const onChangeChatRoom = useCallback(
    async ({
      assistantModeId,
      llmProviderId,
      llmProviderModelId,
    }: {
      assistantModeId?: string;
      llmProviderId?: string;
      llmProviderModelId?: string | null;
    }) => {
      // send patch
      const response = await fetch(`/api/chat-rooms/${chatRoomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistantModeId,
          llmProviderId,
          llmProviderModelId,
        }),
      });

      if (!response.ok) {
        console.error("Failed to update chat room:", response.status);
        return;
      }

      const data = await response.json();
      const updatedAssistantMode = {
        ...data.chatRoom.assistantMode,
        systemPrompt: data.chatRoom.assistantMode?.systemPrompt,
      };

      // Mutate using functional update so we don't depend on captured chatRoomData
      await chatRoomMutate(
        (prev) => {
          const prevData = (prev as ChatRoomGetResponse | undefined) || {
            chatRoom: {
              id: chatRoomId,
              name: "",
              assistantMode: updatedAssistantMode,
              llmProviderId: llmProviderId || undefined,
              llmProviderModelId: llmProviderModelId || undefined,
              createdAt: new Date().toISOString(),
              lastActivityAt: new Date().toISOString(),
            },
          };

          return {
            ...prevData,
            chatRoom: {
              ...prevData.chatRoom,
              assistantMode: updatedAssistantMode,
              llmProviderId: llmProviderId ?? prevData.chatRoom.llmProviderId,
              llmProviderModelId:
                llmProviderModelId ?? prevData.chatRoom.llmProviderModelId,
            },
          } as ChatRoomGetResponse;
        },
        { revalidate: false }
      ); // we already have new data, no immediate re-fetch

      // update local selected assistant mode
      setSelectedAssistantMode(updatedAssistantMode);
    },
    [chatRoomId, chatRoomMutate]
  );

  // Fetch models when LLM provider selected
  useEffect(() => {
    if (!selectedLLMProvider) return;

    let cancelled = false;
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

        const text = await response.text();
        if (!text) {
          console.warn("Empty response for models");
          setLLMProviderModels([]);
          return;
        }

        let data: LLMProviderModelListResponse;
        try {
          data = JSON.parse(text);
        } catch (e: unknown) {
          console.error("Invalid JSON from /models endpoint:", text);
          console.error("Error:", e);
          setLLMProviderModels([]);
          return;
        }

        if (cancelled) return;

        const models = data.llmProviderModels || [];
        setLLMProviderModels(models);

        if (models.length > 0) {
          // pick a safe index (prefer index 0, or 3 if available)
          const chooseIndex = Math.min(3, models.length - 1);
          const chosen = models[chooseIndex];
          setSelectedLLMProviderModel(chosen);

          // Only call onChangeChatRoom if chosen id differs from server state
          if (chosen.id !== chatRoomData?.chatRoom.llmProviderModelId) {
            await onChangeChatRoom({ llmProviderModelId: chosen.id });
          }
        }
      } catch (err) {
        console.error("Error fetching LLM models:", err);
        setLLMProviderModels([]);
      }
    };

    fetchLLMProviderModels();

    return () => {
      cancelled = true;
    };
    // onChangeChatRoom is stable now (doesn't depend on chatRoomData), so safe to include
  }, [
    selectedLLMProvider,
    onChangeChatRoom,
    chatRoomData?.chatRoom.llmProviderModelId,
  ]);

  // If only one provider, select and update (but only if different)
  useEffect(() => {
    if (llmProvidersData?.llmProviders?.length === 1) {
      const provider = llmProvidersData.llmProviders[0];
      setSelectedLLMProvider(provider);

      // Only call if different from server state to avoid redundant PATCH
      if (provider.id !== chatRoomData?.chatRoom.llmProviderId) {
        onChangeChatRoom({
          llmProviderId: provider.id,
          llmProviderModelId: null,
        });
      }
    }
  }, [
    llmProvidersData,
    onChangeChatRoom,
    chatRoomData?.chatRoom.llmProviderId,
  ]);

  // When user selects a model, patch only if it actually changed
  useEffect(() => {
    if (!selectedLLMProviderModel) return;

    if (
      selectedLLMProviderModel.id === chatRoomData?.chatRoom.llmProviderModelId
    ) {
      return; // nothing to update
    }

    onChangeChatRoom({
      llmProviderModelId: selectedLLMProviderModel.id,
    });
  }, [
    selectedLLMProviderModel,
    onChangeChatRoom,
    chatRoomData?.chatRoom.llmProviderModelId,
  ]);

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

  // ... rest of the JSX unchanged

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
                className={cn(
                  "bg-white max-h-80 overflow-y-auto rounded-md",
                  "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                )}
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
