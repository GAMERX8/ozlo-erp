import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";
import { type FC, useState } from "react";

export type RecentThreadItem = {
  id: string;
  title: string;
};

interface ThreadProps {
  recentThreads?: RecentThreadItem[];
  activeThreadId?: string | null;
  onSelectThread?: (threadId: string) => void;
  modelSelector?: React.ReactNode;
}

export const Thread: FC<ThreadProps> = ({
  recentThreads = [],
  activeThreadId = null,
  onSelectThread,
  modelSelector,
}) => {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root @container flex h-full flex-col bg-background"
      style={{
        ["--thread-max-width" as string]: "44rem",
        ["--composer-radius" as string]: "24px",
        ["--composer-padding" as string]: "10px",
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth px-4 pt-4"
      >
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <ThreadWelcome
            recentThreads={recentThreads}
            activeThreadId={activeThreadId}
            onSelectThread={onSelectThread}
          />
        </AuiIf>

        <ThreadPrimitive.Messages>
          {() => <ThreadMessage />}
        </ThreadPrimitive.Messages>

        <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer sticky bottom-0 z-20 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible rounded-t-(--composer-radius) bg-background pb-4 md:pb-6">
          <ThreadScrollToBottom />
          <Composer modelSelector={modelSelector} />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);
  if (isEditing) return <EditComposer />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessage />;
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Ir al final"
        variant="outline"
        className="aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible dark:border-border dark:bg-background dark:hover:bg-accent"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

interface ThreadWelcomeProps {
  recentThreads: RecentThreadItem[];
  activeThreadId: string | null;
  onSelectThread?: (threadId: string) => void;
}

const ThreadWelcome: FC<ThreadWelcomeProps> = ({ recentThreads, activeThreadId, onSelectThread }) => {
  return (
    <div className="aui-thread-welcome-root mx-auto my-auto flex w-full max-w-(--thread-max-width) grow flex-col">
      <div className="aui-thread-welcome-center flex w-full grow flex-col items-center justify-center">
        <div className="aui-thread-welcome-message flex size-full flex-col justify-center px-4">
          <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both font-semibold text-2xl duration-200">
            Hola!
          </h1>
          <p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-muted-foreground text-xl delay-75 duration-200">
            Como puedo ayudarte hoy?
          </p>
        </div>
      </div>
      <ThreadRecentChats
        recentThreads={recentThreads}
        activeThreadId={activeThreadId}
        onSelectThread={onSelectThread}
      />
      <ThreadSuggestions />
    </div>
  );
};

interface ThreadRecentChatsProps {
  recentThreads: RecentThreadItem[];
  activeThreadId: string | null;
  onSelectThread?: (threadId: string) => void;
}

const ThreadRecentChats: FC<ThreadRecentChatsProps> = ({
  recentThreads,
  activeThreadId,
  onSelectThread,
}) => {
  if (!recentThreads.length) return null;

  return (
    <div className="mb-3 space-y-1">
      <div className="px-1">
        <p className="text-xs font-medium text-foreground">Tus chats</p>
        <p className="text-[11px] text-muted-foreground/80">Retoma una conversacion reciente</p>
      </div>
      <div className="max-h-[112px] space-y-1 overflow-y-auto pr-1">
        {recentThreads.map((chat) => (
          <Button
            key={chat.id}
            type="button"
            variant="ghost"
            onClick={() => onSelectThread?.(chat.id)}
            className={cn(
              "h-auto w-full items-start justify-start rounded-xl px-3 py-1.5 text-left",
              activeThreadId === chat.id && "bg-muted",
            )}
          >
            <div className="min-w-0">
              <p className="line-clamp-1 text-xs font-medium text-foreground">{chat.title}</p>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions grid w-full @md:grid-cols-2 gap-2 pb-4">
      <ThreadPrimitive.Suggestions>
        {() => <ThreadSuggestionItem />}
      </ThreadPrimitive.Suggestions>
    </div>
  );
};

const ThreadSuggestionItem: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 @md:nth-[n+3]:block nth-[n+3]:hidden animate-in fill-mode-both duration-200">
      <SuggestionPrimitive.Trigger send asChild>
        <Button
          variant="ghost"
          className="aui-thread-welcome-suggestion h-auto w-full @md:flex-col flex-wrap items-start justify-start gap-1 rounded-3xl border bg-background px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
        >
          <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1 font-medium" />
          <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 text-muted-foreground empty:hidden" />
        </Button>
      </SuggestionPrimitive.Trigger>
    </div>
  );
};

const Composer: FC<{ modelSelector?: React.ReactNode }> = ({ modelSelector }) => {
  const aui = useAui();
  const hasUploadingAttachments = useAuiState((s) =>
    s.composer.attachments.some((attachment) => attachment.status.type === "running"),
  );

  const addFiles = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (!imageFiles.length) {
      toast.error("Por ahora solo puedes adjuntar imagenes en el chat");
      return;
    }

    if (imageFiles.length !== files.length) {
      toast.error("Algunos archivos no son imagenes y fueron omitidos");
    }

    for (const file of imageFiles) {
      await aui.composer().addAttachment(file);
    }
  };

  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col pointer-events-auto">
      <ComposerPrimitive.AttachmentDropzone asChild>
        <div
          data-slot="composer-shell"
          className="flex w-full flex-col gap-2 rounded-(--composer-radius) border bg-background p-(--composer-padding) transition-shadow focus-within:border-ring/75 focus-within:ring-2 focus-within:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:border-dashed data-[dragging=true]:bg-accent/50"
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={async (event) => {
            const files = Array.from(event.dataTransfer?.files || []);
            if (!files.length) return;
            event.preventDefault();
            event.stopPropagation();
            await addFiles(files);
          }}
        >
          <ComposerAttachments />
          <ComposerPrimitive.Input
            placeholder="Escribe un mensaje..."
            className="aui-composer-input h-10 max-h-32 min-h-10 w-full resize-none bg-transparent px-1.75 py-2 text-sm leading-5 outline-none pointer-events-auto placeholder:text-muted-foreground/80"
            rows={1}
            autoFocus
            aria-label="Entrada de mensaje"
            onKeyDown={(event) => {
              if (hasUploadingAttachments && event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
              }
            }}
            onPaste={async (event) => {
              const files = Array.from(event.clipboardData?.files || []);
              if (!files.length) return;
              event.preventDefault();
              await addFiles(files);
            }}
          />
          <ComposerAction modelSelector={modelSelector} />
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC<{ modelSelector?: React.ReactNode }> = ({ modelSelector }) => {
  const hasUploadingAttachments = useAuiState((s) =>
    s.composer.attachments.some((attachment) => attachment.status.type === "running"),
  );

  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ComposerAddAttachment />
        {modelSelector ? <div className="max-w-[220px]">{modelSelector}</div> : null}
      </div>
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Enviar mensaje"
            side="bottom"
            type="button"
            variant="default"
            size="icon"
            className="aui-composer-send size-8 rounded-full"
            aria-label="Enviar mensaje"
            disabled={hasUploadingAttachments}
          >
            <ArrowUpIcon className="aui-composer-send-icon size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="aui-composer-cancel size-8 rounded-full"
            aria-label="Detener generacion"
          >
            <SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const hasMeaningfulText = (text: string) => /[\p{L}\p{N}]/u.test(text || "");

const AssistantMessage: FC = () => {
  const hasVisibleText = useAuiState((s) =>
    s.message.content.some((part) => part.type === "text" && hasMeaningfulText(part.text)),
  );

  return (
    <MessagePrimitive.Root
      className="aui-assistant-message-root fade-in slide-in-from-bottom-1 relative mx-auto w-full max-w-(--thread-max-width) animate-in py-3 duration-150"
      data-role="assistant"
    >
      <div className="aui-assistant-message-content wrap-break-word px-2 text-sm text-foreground leading-relaxed">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === "text") return hasVisibleText ? <MarkdownText /> : null;
            if (part.type === "reasoning") return <ReasoningPart text={part.text} />;
            if (part.type === "tool-call") return part.toolUI ?? <ToolFallback {...part} />;
            return null;
          }}
        </MessagePrimitive.Parts>
        <MessageError />
      </div>

      <div className="aui-assistant-message-footer mt-1 ml-2 flex min-h-6 items-center">
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const ReasoningPart: FC<{ text: string }> = ({ text }) => {
  const isStreamingReasoning = useAuiState((s) => s.thread.isRunning);
  const [open, setOpen] = useState(false);
  const hasReasoningSignal = Boolean(text?.trim());

  if (!hasReasoningSignal) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
      <CollapsibleTrigger className="w-full text-left">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className={cn(isStreamingReasoning && "reasoning-wave")}>Razonamiento</span>
          {!isStreamingReasoning ? (
            <ChevronDownIcon
              className={cn(
                "size-3.5 transition-transform duration-200",
                open ? "rotate-180" : "rotate-0",
              )}
            />
          ) : null}
        </span>
      </CollapsibleTrigger>
      {!isStreamingReasoning && text.trim() ? (
        <CollapsibleContent className="pt-2">
          <div className="ml-1 border-l border-border/50 pl-4 text-xs text-muted-foreground">
            <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
          </div>
        </CollapsibleContent>
      ) : null}
    </Collapsible>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root col-start-3 row-start-2 -ml-1 flex gap-1 text-muted-foreground"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copiar">
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Regenerar">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton tooltip="Mas" className="data-[state=open]:bg-accent">
            <MoreHorizontalIcon />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          className="aui-action-bar-more-content z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item className="aui-action-bar-more-item flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
              <DownloadIcon className="size-4" />
              Exportar como Markdown
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-user-message-root fade-in slide-in-from-bottom-1 mx-auto grid w-full max-w-(--thread-max-width) animate-in auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3 duration-150 [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <AuiIf condition={(s) => s.message.content.length > 0}>
        <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
          <div className="aui-user-message-content wrap-break-word peer rounded-2xl bg-muted px-4 py-2.5 text-sm text-foreground empty:hidden">
            <MessagePrimitive.Parts />
          </div>
          <div className="aui-user-action-bar-wrapper absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2 peer-empty:hidden">
            <UserActionBar />
          </div>
        </div>
      </AuiIf>

      <BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Editar" className="aui-user-action-edit p-4">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
      <ComposerPrimitive.Root className="aui-edit-composer-root ml-auto flex w-full max-w-[85%] flex-col rounded-2xl bg-muted">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input min-h-14 w-full resize-none bg-transparent p-4 text-foreground text-sm outline-none"
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
              <Button variant="ghost" size="sm">
              Cancelar
              </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm">Actualizar</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({ className, ...rest }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root mr-2 -ml-2 inline-flex items-center text-muted-foreground text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Anterior">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Siguiente">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
