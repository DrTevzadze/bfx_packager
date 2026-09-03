import type { FolderStatus, QueuedFolder } from "@/types";

export function folderStatusLabel(folder: QueuedFolder): string {
  switch (folder.status) {
    case "cleaning":
      return "Cleaning…";
    case "copying":
      return "Copying…";
    case "encrypting":
      return "Encrypting…";
    case "zipping":
      return "Zipping…";
    case "done":
      if (folder.bfxPath) return "Done · .bfx ready";
      if (folder.removedCount === undefined) return "Done";
      return folder.removedCount === 0
        ? "Done · 0 removed"
        : folder.removedCount === 1
          ? "Done · 1 removed"
          : `Done · ${folder.removedCount} removed`;
    case "failed":
      return "Failed";
    default:
      return "Queued";
  }
}

export function folderStatusVariant(
  status: FolderStatus
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "cleaning":
    case "copying":
    case "encrypting":
    case "zipping":
      return "default";
    case "done":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

export function folderSubline(folder: QueuedFolder): string {
  if (folder.status === "failed" && folder.error) return folder.error;
  if (folder.bfxPath) return folder.bfxPath;
  if (folder.copiedTo) return folder.copiedTo;
  return folder.path;
}
