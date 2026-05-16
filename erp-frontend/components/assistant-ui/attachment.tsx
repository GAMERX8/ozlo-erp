"use client";

import { PropsWithChildren, useEffect, useMemo, useRef, useState, type ChangeEvent, type FC } from "react";
import { XIcon, PlusIcon, FileText } from "lucide-react";
import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAuiState,
  useAui,
} from "@assistant-ui/react";
import { useShallow } from "zustand/shallow";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogTitle, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";

const useFileSrc = (file: File | undefined) => {
  const src = useMemo(() => {
    if (!file) return undefined;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  return src;
};

const useAttachmentSrc = () => {
  const { file, src } = useAuiState(
    useShallow((s): { file?: File; src?: string } => {
      if (s.attachment.type !== "image") return {};
      const imgSrc = s.attachment.content?.filter((c) => c.type === "image")[0]?.image;
      return {
        file: s.attachment.file,
        src: imgSrc,
      };
    }),
  );

  const fileSrc = useFileSrc(file);

  return src ?? fileSrc;
};

type AttachmentPreviewProps = {
  src: string;
};

const AttachmentPreview: FC<AttachmentPreviewProps> = ({ src }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <img
      src={src}
      alt="Vista previa de imagen"
      className={cn(
        "block h-auto max-h-[80vh] w-auto max-w-full object-contain",
        isLoaded ? "aui-attachment-preview-image-loaded" : "aui-attachment-preview-image-loading invisible",
      )}
      onLoad={() => setIsLoaded(true)}
    />
  );
};

const AttachmentPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const src = useAttachmentSrc();

  if (!src) return children;

  return (
    <Dialog>
      <DialogTrigger
        className="aui-attachment-preview-trigger cursor-pointer transition-colors hover:bg-accent/50"
        asChild
      >
        {children}
      </DialogTrigger>
      <DialogContent className="aui-attachment-preview-dialog-content p-2 sm:max-w-3xl [&>button]:rounded-full [&>button]:bg-foreground/60 [&>button]:p-1 [&>button]:opacity-100 [&>button]:ring-0! [&_svg]:text-background [&>button]:hover:[&_svg]:text-destructive">
        <DialogTitle className="aui-sr-only sr-only">Vista previa del adjunto</DialogTitle>
        <div className="aui-attachment-preview relative mx-auto flex max-h-[80dvh] w-full items-center justify-center overflow-hidden bg-background">
          <AttachmentPreview src={src} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AttachmentThumb: FC<{ className?: string }> = ({ className }) => {
  const isImage = useAuiState((s) => s.attachment.type === "image");
  const src = useAttachmentSrc();

  if (isImage && src) {
    return <img src={src} alt="Attachment preview" className={cn("h-full w-full object-cover", className)} />;
  }

  return (
    <Avatar className={cn("aui-attachment-tile-avatar h-full w-full rounded-none", className)}>
      <AvatarImage src={src} alt="Attachment preview" className="aui-attachment-tile-image object-cover" />
      <AvatarFallback delayMs={isImage ? 200 : 0}>
        <FileText className="aui-attachment-tile-fallback-icon size-8 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
};

const AttachmentUI: FC = () => {
  const aui = useAui();
  const isComposer = aui.attachment.source !== "message";

  const isImage = useAuiState((s) => s.attachment.type === "image");
  const isUploading = useAuiState((s) => s.attachment.status.type === "running");
  const uploadProgress = useAuiState((s) =>
    s.attachment.status.type === "running" ? s.attachment.status.progress : 100,
  );
  const typeLabel = useAuiState((s) => {
      const type = s.attachment.type;
      switch (type) {
        case "image":
          return "Imagen";
        case "document":
          return "Documento";
        case "file":
          return "Archivo";
      default:
        return type;
    }
  });

  return (
    <Tooltip>
      <AttachmentPrimitive.Root
        className={cn(
          "aui-attachment-root relative",
          isImage && isComposer && "aui-attachment-root-composer",
        )}
      >
        <AttachmentPreviewDialog>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "aui-attachment-tile cursor-pointer overflow-hidden border bg-muted transition-opacity hover:opacity-75",
                isImage && isComposer
                  ? "h-24 w-24 rounded-2xl shadow-sm"
                  : "size-14 rounded-[calc(var(--composer-radius)-var(--composer-padding))]",
              )}
              role="button"
              aria-label={`Adjunto de tipo ${typeLabel}`}
            >
              <AttachmentThumb className={isUploading ? "scale-[1.02] blur-sm" : undefined} />
              {isUploading ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative size-7">
                    <svg className="size-7 -rotate-90 drop-shadow-sm" viewBox="0 0 40 40" aria-hidden="true">
                      <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
                      <circle
                        cx="20"
                        cy="20"
                        r="15"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 15}`}
                        strokeDashoffset={`${2 * Math.PI * 15 * (1 - uploadProgress / 100)}`}
                        className="transition-[stroke-dashoffset] duration-150 ease-out"
                      />
                    </svg>
                  </div>
                </div>
              ) : null}
            </div>
          </TooltipTrigger>
        </AttachmentPreviewDialog>
        {isComposer && <AttachmentRemove />}
      </AttachmentPrimitive.Root>
      <TooltipContent side="top">
        <AttachmentPrimitive.Name />
      </TooltipContent>
    </Tooltip>
  );
};

const AttachmentRemove: FC = () => {
  return (
    <AttachmentPrimitive.Remove asChild>
        <TooltipIconButton
          tooltip="Quitar archivo"
        className="aui-attachment-tile-remove absolute top-1.5 right-1.5 size-3.5 rounded-full bg-white text-muted-foreground opacity-100 shadow-sm hover:bg-white! [&_svg]:text-black hover:[&_svg]:text-destructive"
        side="top"
      >
        <XIcon className="aui-attachment-remove-icon size-3 dark:stroke-[2.5px]" />
      </TooltipIconButton>
    </AttachmentPrimitive.Remove>
  );
};

export const UserMessageAttachments: FC = () => {
  return (
    <div className="aui-user-message-attachments-end col-span-full col-start-1 row-start-1 flex w-full flex-row justify-end gap-2">
      <MessagePrimitive.Attachments>{() => <AttachmentUI />}</MessagePrimitive.Attachments>
    </div>
  );
};

export const ComposerAttachments: FC = () => {
  return (
    <div className="aui-composer-attachments flex w-full flex-row items-center gap-2 overflow-x-auto empty:hidden">
      <ComposerPrimitive.Attachments>{() => <AttachmentUI />}</ComposerPrimitive.Attachments>
    </div>
  );
};

export const ComposerAddAttachment: FC = () => {
  const aui = useAui();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      await aui.composer().addAttachment(file);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <TooltipIconButton
        tooltip="Agregar adjunto"
        side="bottom"
        variant="ghost"
        size="icon"
        className="aui-composer-add-attachment size-8 rounded-full p-1 font-semibold text-xs hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30"
        aria-label="Agregar adjunto"
        onClick={() => inputRef.current?.click()}
      >
        <PlusIcon className="aui-attachment-add-icon size-5 stroke-[1.5px]" />
      </TooltipIconButton>
    </>
  );
};
