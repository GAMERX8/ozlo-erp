"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Plus } from "lucide-react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type AttachmentAdapter,
  type ChatModelAdapter,
  type ThreadMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";

import { Thread, type RecentThreadItem } from "@/components/assistant-ui/thread";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSidebar } from "@/components/ui/sidebar";
import { API_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

type AssistantModel = {
  id: string;
  provider: string;
  model_key: string;
  label: string;
  supports_reasoning: boolean;
  supports_vision: boolean;
  supports_streaming: boolean;
};

type AssistantThread = {
  id: string;
  title: string;
  model_key: string;
  provider: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
};

type AssistantMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning_summary?: string | null;
  status?: string;
  created_at: string;
  attachments?: AssistantAttachment[];
};

type AssistantAttachment = {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  signed_url: string;
};

type PresignedUploadPayload = {
  fileId: string;
  uploadUrl: string;
  headers: Record<string, string>;
};

type CompletedUploadPayload = {
  success: boolean;
  file: {
    id: string;
  };
  signedUrl: string;
};

type UploadTaskResult = {
  fileId: string;
  signedUrl: string;
};

type AttachmentLifecycle = {
  active: boolean;
};

const getAssistantModelStorageKey = (workspaceId: string) =>
  `ozlo:assistant:model:${workspaceId}`;

type SseChunk = {
  event: string;
  data: Record<string, unknown>;
};

interface ChatRailProps {
  workspaceId: string;
  accessToken?: string;
}

interface ChatRuntimePaneProps {
  chatModel: ChatModelAdapter;
  initialMessages: ThreadMessageLike[];
  recentThreads: RecentThreadItem[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  modelSelector: React.ReactNode;
  attachmentsAdapter: AttachmentAdapter;
}

function ChatRuntimePane({
  chatModel,
  initialMessages,
  recentThreads,
  activeThreadId,
  onSelectThread,
  modelSelector,
  attachmentsAdapter,
}: ChatRuntimePaneProps) {
  const runtime = useLocalRuntime(chatModel, {
    initialMessages,
    adapters: {
      attachments: attachmentsAdapter,
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread
        recentThreads={recentThreads}
        activeThreadId={activeThreadId}
        onSelectThread={onSelectThread}
        modelSelector={modelSelector}
      />
    </AssistantRuntimeProvider>
  );
}

const getLastUserPrompt = (messages: readonly ThreadMessage[]) => {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUserMessage || !lastUserMessage.content) return "";

  return lastUserMessage.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
};

const getLastUserAttachments = (messages: readonly ThreadMessage[]) => {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  return lastUserMessage?.attachments ?? [];
};

const mapAttachmentToRuntime = (attachment: AssistantAttachment) => ({
  id: attachment.id,
  type: attachment.mime_type.startsWith("image/") ? "image" : "file",
  name: attachment.filename,
  contentType: attachment.mime_type,
  status: { type: "complete" as const },
  content: attachment.mime_type.startsWith("image/")
    ? [{ type: "image" as const, image: attachment.signed_url, filename: attachment.filename }]
    : [],
});

const mapMessagesToRuntime = (messages: AssistantMessage[]): ThreadMessageLike[] => {
  return messages.map((message) => {
    if (message.role === "assistant") {
      const parts: Array<{ type: "text" | "reasoning"; text: string }> = [];

      if (message.reasoning_summary?.trim()) {
        parts.push({
          type: "reasoning",
          text: message.reasoning_summary.trim(),
        });
      }

      parts.push({
        type: "text",
        text: message.content,
      });

      return {
        id: message.id,
        role: "assistant",
        content: parts,
        status: { type: "complete", reason: "stop" } as const,
        createdAt: new Date(message.created_at),
      };
    }

    return {
      id: message.id,
      role: message.role,
      content: message.content,
      attachments: message.attachments?.map(mapAttachmentToRuntime),
      createdAt: new Date(message.created_at),
    };
  });
};

const parseSseChunks = (chunk: string): { chunks: SseChunk[]; remainder: string } => {
  const events: SseChunk[] = [];
  const blocks = chunk.split("\n\n");
  const remainder = blocks.pop() || "";

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) continue;

    let eventName = "message";
    let dataPayload = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      }

      if (line.startsWith("data:")) {
        dataPayload += line.slice(5).trim();
      }
    }

    if (!dataPayload) continue;

    try {
      const parsed = JSON.parse(dataPayload) as Record<string, unknown>;
      events.push({ event: eventName, data: parsed });
    } catch {
      // ignore malformed payloads
    }
  }

  return { chunks: events, remainder };
};

export function ChatRail({ workspaceId, accessToken }: ChatRailProps) {
  const { isMobile } = useSidebar();

  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [runtimeKey, setRuntimeKey] = useState(0);
  const [models, setModels] = useState<AssistantModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [threads, setThreads] = useState<AssistantThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<ThreadMessageLike[]>([]);
  const [hasConversation, setHasConversation] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const accessTokenRef = useRef<string | undefined>(accessToken);
  const activeThreadIdRef = useRef<string | null>(activeThreadId);
  const selectedModelKeyRef = useRef<string | undefined>(undefined);
  const uploadedAttachmentIdsRef = useRef(new Map<string, string>());
  const attachmentUploadTasksRef = useRef(new Map<string, Promise<UploadTaskResult>>());
  const attachmentPreviewUrlsRef = useRef(new Map<string, string>());
  const attachmentLifecycleRef = useRef(new Map<string, AttachmentLifecycle>());

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    const root = document.documentElement;

    if (isMobile) {
      root.style.setProperty("--chat-rail-offset", "0px");
      return;
    }

    root.style.setProperty("--chat-rail-offset", open ? "37rem" : "3.5rem");

    return () => {
      root.style.setProperty("--chat-rail-offset", "0px");
    };
  }, [open, isMobile]);

  const authorizedFetch = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    if (!accessToken) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Request failed");
    }

    return response.json() as Promise<T>;
  };

  const loadThreads = async () => {
    const list = await authorizedFetch<AssistantThread[]>(`/assistant/threads?workspace_id=${workspaceId}`);
    setThreads(list);
    return list;
  };

  const loadThreadMessages = async (threadId: string) => {
    const payload = await authorizedFetch<{ messages: AssistantMessage[] }>(
      `/assistant/threads/${threadId}/messages`,
    );

    setInitialMessages(mapMessagesToRuntime(payload.messages));
    setHasConversation(payload.messages.length > 0);
    setActiveThreadId(threadId);
  };

  const uploadImageFile = async (
    localAttachmentId: string,
    file: File,
    onProgress?: (progress: number) => void,
  ) => {
    const existingTask = attachmentUploadTasksRef.current.get(localAttachmentId);
    if (existingTask) {
      return existingTask;
    }

    const task = (async () => {
      const contentType = file.type || "application/octet-stream";

      const presigned = await authorizedFetch<PresignedUploadPayload>("/storage/presign-upload", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: workspaceId,
          filename: file.name,
          content_type: contentType,
          size_bytes: file.size,
          scope: "assistant-chat",
        }),
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presigned.uploadUrl);

        Object.entries(presigned.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const progress = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
          onProgress?.(progress);
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress?.(100);
            resolve();
            return;
          }

          reject(new Error("No se pudo subir el archivo al storage"));
        };

        xhr.onerror = () => reject(new Error("No se pudo subir el archivo al storage"));
        xhr.onabort = () => reject(new Error("La subida del archivo fue cancelada"));
        xhr.send(file);
      });

      const completed = await authorizedFetch<CompletedUploadPayload>("/storage/complete-upload", {
        method: "POST",
        body: JSON.stringify({
          file_id: presigned.fileId,
          workspace_id: workspaceId,
        }),
      });

      uploadedAttachmentIdsRef.current.set(localAttachmentId, completed.file.id);

      return {
        fileId: completed.file.id,
        signedUrl: completed.signedUrl,
      };
    })();

    attachmentUploadTasksRef.current.set(localAttachmentId, task);
    return task;
  };

  useEffect(() => {
    let cancelled = false;

    if (!accessToken) return;

    const bootstrap = async () => {
      setIsBootstrapping(true);
      try {
        const modelsResponse = await authorizedFetch<AssistantModel[]>("/assistant/models");

        if (cancelled) return;

        const savedModelKey =
          typeof window !== "undefined"
            ? window.localStorage.getItem(getAssistantModelStorageKey(workspaceId))
            : null;
        const fallbackModelKey = modelsResponse[0]?.model_key || "";
        const nextModelKey = modelsResponse.some((model) => model.model_key === savedModelKey)
          ? savedModelKey || fallbackModelKey
          : fallbackModelKey;

        setModels(modelsResponse);
        setSelectedModelId(nextModelKey);

        if (typeof window !== "undefined" && nextModelKey) {
          window.localStorage.setItem(getAssistantModelStorageKey(workspaceId), nextModelKey);
        }

        await loadThreads();
        if (cancelled) return;

        setInitialMessages([]);
        setHasConversation(false);
        setActiveThreadId(null);
      } catch (error) {
        console.error("Chat bootstrap failed", error);
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, accessToken]);

  const selectedModel = useMemo(
    () =>
      models.find(
        (model) => model.model_key === selectedModelId || model.id === selectedModelId,
      ) || null,
    [models, selectedModelId],
  );

  useEffect(() => {
    selectedModelKeyRef.current = selectedModel?.model_key;
  }, [selectedModel?.model_key]);

  const attachmentsAdapter = useMemo<AttachmentAdapter>(
    () => ({
      accept: "image/*",
      async *add({ file }) {
        const localAttachmentId = `${file.name}-${crypto.randomUUID()}`;
        const previewUrl = URL.createObjectURL(file);
        const updates: Array<{
          status:
            | { type: "running"; reason: "uploading"; progress: number }
            | { type: "requires-action"; reason: "composer-send" }
            | { type: "incomplete"; reason: "error" };
        }> = [];
        let resolveWaiter: (() => void) | null = null;
        let uploadFinished = false;
        let uploadError: unknown = null;
        let lastProgress = -1;

        attachmentPreviewUrlsRef.current.set(localAttachmentId, previewUrl);
        attachmentLifecycleRef.current.set(localAttachmentId, { active: true });

        const isAttachmentActive = () => attachmentLifecycleRef.current.get(localAttachmentId)?.active === true;

        const pushUpdate = (
          status:
            | { type: "running"; reason: "uploading"; progress: number }
            | { type: "requires-action"; reason: "composer-send" }
            | { type: "incomplete"; reason: "error" },
        ) => {
          if (!isAttachmentActive()) return;
          updates.push({ status });
          resolveWaiter?.();
          resolveWaiter = null;
        };

        pushUpdate({ type: "running", reason: "uploading", progress: 0 });

        void uploadImageFile(localAttachmentId, file, (progress) => {
          if (progress === lastProgress) return;
          lastProgress = progress;
          pushUpdate({ type: "running", reason: "uploading", progress });
        })
          .then(() => {
            pushUpdate({ type: "requires-action", reason: "composer-send" });
          })
          .catch((error) => {
            uploadError = error;
            pushUpdate({ type: "incomplete", reason: "error" });
          })
          .finally(() => {
            uploadFinished = true;
            resolveWaiter?.();
            resolveWaiter = null;
          });

        while (!uploadFinished || updates.length > 0) {
          if (!isAttachmentActive()) {
            break;
          }

          if (updates.length === 0) {
            await new Promise<void>((resolve) => {
              resolveWaiter = resolve;
            });
            continue;
          }

          const nextUpdate = updates.shift();
          if (!nextUpdate) continue;

          yield {
            id: localAttachmentId,
            type: "image",
            name: file.name,
            contentType: file.type,
            file,
            status: nextUpdate.status,
            content: [{ type: "image", image: previewUrl, filename: file.name }],
          };
        }

        if (uploadError) {
          throw uploadError;
        }
      },
      async send(attachment) {
        const lifecycle = attachmentLifecycleRef.current.get(attachment.id);
        if (lifecycle) {
          lifecycle.active = false;
        }

        const previewUrl = attachmentPreviewUrlsRef.current.get(attachment.id);

        await uploadImageFile(attachment.id, attachment.file);

        return {
          id: attachment.id,
          type: "image",
          name: attachment.name,
          contentType: attachment.contentType,
          status: { type: "complete" },
          content: [
            {
              type: "image",
              image: previewUrl || attachment.content?.find((part) => part.type === "image")?.image || "",
              filename: attachment.name,
            },
          ],
        };
      },
      async remove(attachment) {
        const lifecycle = attachmentLifecycleRef.current.get(attachment.id);
        if (lifecycle) {
          lifecycle.active = false;
        }

        attachmentUploadTasksRef.current.delete(attachment.id);
        uploadedAttachmentIdsRef.current.delete(attachment.id);
        const previewUrl = attachmentPreviewUrlsRef.current.get(attachment.id);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        attachmentPreviewUrlsRef.current.delete(attachment.id);
        attachmentLifecycleRef.current.delete(attachment.id);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceId, accessToken],
  );

  const createThread = async (firstMessage?: string, modelKey?: string) => {
    const thread = await authorizedFetch<AssistantThread>("/assistant/threads", {
      method: "POST",
      body: JSON.stringify({
        workspace_id: workspaceId,
        model_key: modelKey,
        ...(firstMessage?.trim() ? { first_message: firstMessage.trim() } : {}),
      }),
    });

    await loadThreads();
    setInitialMessages([]);
    setActiveThreadId(thread.id);
    return thread;
  };

  const handleNewChat = async () => {
    setHasConversation(false);
    setActiveThreadId(null);
    setInitialMessages([]);
    attachmentUploadTasksRef.current.clear();
    uploadedAttachmentIdsRef.current.clear();
    for (const lifecycle of attachmentLifecycleRef.current.values()) {
      lifecycle.active = false;
    }
    attachmentLifecycleRef.current.clear();
    for (const previewUrl of attachmentPreviewUrlsRef.current.values()) {
      URL.revokeObjectURL(previewUrl);
    }
    attachmentPreviewUrlsRef.current.clear();
    setRuntimeKey((value) => value + 1);
  };

  const handleSelectThread = async (threadId: string) => {
    if (threadId === activeThreadId) return;

    try {
      await loadThreadMessages(threadId);
      setRuntimeKey((value) => value + 1);
    } catch (error) {
      console.error("Failed to load selected thread", error);
    }
  };

  const handleModelChange = async (modelId: string) => {
    if (!modelId) return;

    const model =
      models.find((item) => item.model_key === modelId) ||
      models.find((item) => item.id === modelId);

    if (!model) {
      console.warn("Modelo invalido en selector:", modelId);
      return;
    }

    setSelectedModelId(model.model_key);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(getAssistantModelStorageKey(workspaceId), model.model_key);
    }
  };

  const chatModel = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        const prompt = getLastUserPrompt(messages);
        const pendingAttachments = getLastUserAttachments(messages);
        if (!prompt && pendingAttachments.length === 0) {
          return;
        }

        setHasConversation(true);

        let currentThreadId = activeThreadIdRef.current;
        if (!currentThreadId) {
          const created = await createThread(prompt, selectedModelKeyRef.current);
          currentThreadId = created.id;
        }

        if (!accessTokenRef.current) {
          throw new Error("No access token available");
        }

        const attachmentIds = Array.from(
          new Set(
            pendingAttachments
              .map((attachment) => uploadedAttachmentIdsRef.current.get(attachment.id))
              .filter((attachmentId): attachmentId is string => Boolean(attachmentId)),
          ),
        );

        const response = await fetch(`${API_URL}/assistant/threads/${currentThreadId}/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessTokenRef.current}`,
          },
          body: JSON.stringify({
            prompt,
            model_key: selectedModelKeyRef.current,
            attachment_ids: attachmentIds,
          }),
          signal: abortSignal,
        });

        if (!response.ok || !response.body) {
          const errorText = await response.text();
          throw new Error(errorText || "No se pudo iniciar el stream");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        let pending = "";
        let accumulatedText = "";
        let accumulatedReasoning = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          pending += decoder.decode(value, { stream: true });
          const parsed = parseSseChunks(pending);
          pending = parsed.remainder;

          for (const chunk of parsed.chunks) {
            if (chunk.event === "delta") {
              accumulatedText += (chunk.data?.text as string) || "";
            }

            if (chunk.event === "reasoning") {
              accumulatedReasoning += (chunk.data?.text as string) || "";
            }

            if (chunk.event === "error") {
              throw new Error((chunk.data?.message as string) || "Error en streaming del asistente");
            }

            if (chunk.event === "delta" || chunk.event === "reasoning") {
              const parts: Array<{ type: "text" | "reasoning"; text: string }> = [];

              if (accumulatedReasoning.trim()) {
                parts.push({ type: "reasoning", text: accumulatedReasoning });
              }

              parts.push({ type: "text", text: accumulatedText });

              yield {
                content: parts,
              };
            }
          }
        }

        await loadThreads();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceId],
  );

  const recentThreads: RecentThreadItem[] = threads.map((thread) => ({
    id: thread.id,
    title: thread.title,
  }));

  const modelSelector = (
    <Select value={selectedModelId} onValueChange={handleModelChange}>
      <SelectTrigger
        size="sm"
        className="group h-8 w-auto min-w-[170px] border-0 !bg-transparent dark:!bg-transparent px-2 text-xs text-muted-foreground shadow-none transition-colors hover:!bg-muted/60 dark:hover:!bg-muted/60 hover:text-foreground focus-visible:border-0 focus-visible:ring-0 [&_svg]:text-muted-foreground [&_svg]:transition-colors hover:[&_svg]:text-foreground"
      >
        <SelectValue
          placeholder="Modelo"
          className="text-muted-foreground transition-colors group-hover:text-foreground"
        />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.model_key}>
            {model.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (isMobile) {
    return (
      <>
        {!mobileOpen && (
          <Button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="fixed bottom-4 right-4 z-40 h-12 rounded-full px-4 shadow-lg md:hidden"
          >
            <MessageCircle className="mr-2 size-4" />
            Asistente
          </Button>
        )}

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="bottom" className="h-[92svh] p-0" showCloseButton>
            <SheetTitle className="sr-only">Asistente Ozlo</SheetTitle>

            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between gap-2 border-b px-4 py-3 pr-12">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Asistente Ozlo</p>
                  <Badge variant="secondary" className="text-[10px]">Beta</Badge>
                </div>
                {hasConversation ? (
                  <Button type="button" variant="ghost" size="sm" className="h-8" onClick={handleNewChat}>
                    <Plus className="size-4" />
                    Nuevo chat
                  </Button>
                ) : null}
              </div>

              <div className="min-h-0 flex-1">
                <ChatRuntimePane
                  key={runtimeKey}
                  chatModel={chatModel}
                  initialMessages={initialMessages}
                  recentThreads={recentThreads}
                  activeThreadId={activeThreadId}
                  onSelectThread={handleSelectThread}
                  modelSelector={modelSelector}
                  attachmentsAdapter={attachmentsAdapter}
                />
              </div>

              {isBootstrapping && (
                <div className="border-t px-4 py-2 text-xs text-muted-foreground">Sincronizando chat...</div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-40 hidden overflow-hidden border-l bg-background md:flex transition-[width] duration-200",
        open ? "w-[37rem]" : "w-[3.5rem]",
      )}
    >
      <div className="h-full border-r bg-background px-1 pt-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen((previous) => !previous)}
          className="h-auto w-12 justify-center p-1"
        >
          <div className="mx-auto flex flex-col items-center justify-center gap-2 text-center">
            <div className="flex w-full justify-center">
              <Logo type="icon" width={22} height={22} className="h-[22px] w-[22px] justify-center" />
            </div>
            <span className="text-xs leading-none font-semibold tracking-wide [writing-mode:vertical-rl]">
              Asistente Ozlo
            </span>
          </div>
        </Button>
      </div>

      <div className={cn("flex h-full flex-1 flex-col", open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            {hasConversation ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={handleNewChat}
                  aria-label="Ir a pantalla inicial"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <p className="text-sm font-semibold">Asistente Ozlo</p>
                <Badge variant="secondary" className="text-[10px]">Beta</Badge>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {hasConversation ? (
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={handleNewChat}>
                <Plus className="size-4" />
                Nuevo chat
              </Button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <ChatRuntimePane
            key={runtimeKey}
            chatModel={chatModel}
            initialMessages={initialMessages}
            recentThreads={recentThreads}
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
            modelSelector={modelSelector}
            attachmentsAdapter={attachmentsAdapter}
          />
        </div>

        {isBootstrapping && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">Sincronizando chat...</div>
        )}
      </div>
    </div>
  );
}
