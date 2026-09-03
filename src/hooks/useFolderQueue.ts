import { useState } from "react";
import type { AddLog, FolderStatus, InspectedFolder, QueuedFolder } from "@/types";
import { pathsEqual } from "@/utils/folders";

export function useFolderQueue(addLog: AddLog): {
  folders: QueuedFolder[];
  isProcessing: boolean;
  addFolders: (incoming: InspectedFolder[]) => void;
  removeFolder: (id: string) => void;
  clearFolders: () => void;
  updateFolder: (id: string, patch: Partial<QueuedFolder>) => void;
  setProcessing: (value: boolean) => void;
  resetStatuses: () => void;
} {
  const [folders, setFolders] = useState<QueuedFolder[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  function addFolders(incoming: InspectedFolder[]) {
    const fresh: QueuedFolder[] = [];
    const duplicates: InspectedFolder[] = [];

    for (const folder of incoming) {
      const alreadyQueued =
        folders.some((item) => pathsEqual(item.path, folder.path)) ||
        fresh.some((item) => pathsEqual(item.path, folder.path));

      if (alreadyQueued) {
        duplicates.push(folder);
        continue;
      }

      fresh.push({
        id: folder.path,
        name: folder.name,
        path: folder.path,
        status: "queued",
      });
    }

    if (fresh.length > 0) {
      setFolders((prev) => [...prev, ...fresh]);
      for (const folder of fresh) {
        addLog(`Added “${folder.name}”`);
      }
    }

    for (const folder of duplicates) {
      addLog(`Already queued: ${folder.name}`, "warn");
    }
  }

  function removeFolder(id: string) {
    if (isProcessing) return;
    const folder = folders.find((item) => item.id === id);
    setFolders((prev) => prev.filter((item) => item.id !== id));
    if (folder) addLog(`Removed “${folder.name}” from queue`, "warn");
  }

  function clearFolders() {
    if (isProcessing || folders.length === 0) return;
    setFolders([]);
    addLog("Queue cleared");
  }

  function updateFolder(id: string, patch: Partial<QueuedFolder>) {
    setFolders((prev) =>
      prev.map((folder) => (folder.id === id ? { ...folder, ...patch } : folder))
    );
  }

  function resetStatuses() {
    setFolders((prev) =>
      prev.map((folder) => ({
        ...folder,
        status: "queued" as FolderStatus,
        removedCount: undefined,
        copiedTo: undefined,
        error: undefined,
      }))
    );
  }

  return {
    folders,
    isProcessing,
    addFolders,
    removeFolder,
    clearFolders,
    updateFolder,
    setProcessing: setIsProcessing,
    resetStatuses,
  };
}
