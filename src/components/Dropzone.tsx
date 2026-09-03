import { useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from "react";
import { Folder, FolderUp, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { QueuedFolder } from "@/types";
import { folderStatusLabel, folderSubline, folderStatusVariant } from "@/utils/folderStatus";

type DropzoneProps = {
  folders: QueuedFolder[];
  isProcessing: boolean;
  onBrowse: () => void;
  onDropFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
};

function prevent(event: DragEvent<HTMLElement>) {
  event.preventDefault();
}

export default function Dropzone({
  folders,
  isProcessing,
  onBrowse,
  onDropFiles,
  onRemove,
}: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);
  const hasFolders = folders.length > 0;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!hasFolders && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onBrowse();
    }
  }

  function handleBrowseClick(event: MouseEvent) {
    event.stopPropagation();
    onBrowse();
  }

  return (
    <section
      className={cn(
        "flex w-full min-h-0 flex-1 flex-col rounded-xl border border-dashed outline-none transition-colors animate-fade-up [animation-delay:60ms]",
        dragOver
          ? "border-solid border-primary bg-primary/15"
          : "border-border bg-card/40",
        !hasFolders && "cursor-pointer hover:border-primary hover:bg-primary/8 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/40",
        isProcessing && "pointer-events-none opacity-80"
      )}
      tabIndex={hasFolders ? -1 : 0}
      role={hasFolders ? "region" : "button"}
      aria-label={
        hasFolders
          ? `${folders.length} folders queued. Drop more folders here.`
          : "Drop folders here or browse"
      }
      onDragEnter={(event) => {
        prevent(event);
        dragDepth.current += 1;
        setDragOver(true);
      }}
      onDragOver={(event) => {
        prevent(event);
        setDragOver(true);
      }}
      onDragLeave={(event) => {
        prevent(event);
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragOver(false);
      }}
      onDrop={(event) => {
        prevent(event);
        dragDepth.current = 0;
        setDragOver(false);
        onDropFiles(Array.from(event.dataTransfer.files));
      }}
      onClick={hasFolders ? undefined : onBrowse}
      onKeyDown={handleKeyDown}
    >
      {hasFolders ? (
        <>
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <FolderUp className="size-4 shrink-0 text-primary" />
              <span className="truncate">
                Drop more folders or{" "}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto cursor-pointer p-0 text-sm text-primary"
                  onClick={handleBrowseClick}
                >
                  browse
                </Button>
              </span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {folders.length} queued
            </span>
          </div>
          <Separator />
          <ScrollArea className="min-h-0 flex-1 basis-0">
            <ul className="pr-3">
              {folders.map((folder) => (
                <li
                  key={folder.id}
                  className="flex items-center gap-2 border-b border-border px-4 py-2.5 last:border-b-0"
                >
                  <div
                    className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/15 text-primary"
                    aria-hidden="true"
                  >
                    <Folder className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{folder.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {folderSubline(folder)}
                    </div>
                  </div>
                  <Badge
                    variant={folderStatusVariant(folder.status)}
                    className="shrink-0 px-1.5 py-0 text-[0.6rem]"
                  >
                    {folderStatusLabel(folder)}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isProcessing || folder.status === "cleaning" || folder.status === "copying"}
                    className="size-7 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                    title="Remove"
                    aria-label={`Remove ${folder.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(folder.id);
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </>
      ) : (
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center sm:px-10 sm:py-16">
          <div className="text-primary animate-bob" aria-hidden="true">
            <FolderUp className="size-14" strokeWidth={1.5} />
          </div>
          <p className="w-full text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
            Drop folders here
          </p>
          <p className="flex w-full flex-wrap items-center justify-center gap-x-1 text-base text-muted-foreground">
            Or{" "}
            <Button
              type="button"
              variant="link"
              className="h-auto cursor-pointer p-0 text-base text-primary"
              onClick={handleBrowseClick}
            >
              browse
            </Button>{" "}
            to select folders
          </p>
        </div>
      )}
    </section>
  );
}
