import type { AddLog, InspectedFolder } from "@/types";
import { getBfxApi } from "@/lib/electron";

function droppedPaths(files: File[]): string[] {
  const api = getBfxApi();
  if (!api) return [];

  const paths: string[] = [];
  for (const file of files) {
    try {
      const filePath = api.getDroppedPath(file);
      if (filePath) paths.push(filePath);
    } catch {
      // Some OS drops don't expose a path; inspect will skip empties.
    }
  }
  return paths;
}

export function useFolderIntake(
  addFolders: (incoming: InspectedFolder[]) => void,
  addLog: AddLog
) {
  async function ingestPaths(paths: string[]) {
    const api = getBfxApi();
    if (!api) {
      addLog("Folder access is only available in the desktop app", "warn");
      return;
    }

    if (paths.length === 0) {
      addLog("No folders found in that drop", "warn");
      return;
    }

    const result = await api.inspectPaths(paths);
    addFolders(result.folders);

    for (const skipped of result.skipped) {
      addLog(`Skipped ${skipped.path} (${skipped.reason})`, "warn");
    }

    if (result.folders.length === 0 && result.skipped.length === 0) {
      addLog("No folders were added", "warn");
    }
  }

  async function browseFolders() {
    const api = getBfxApi();
    if (!api) {
      addLog("Folder access is only available in the desktop app", "warn");
      return;
    }

    const paths = await api.pickFolders();
    if (paths.length === 0) return;
    await ingestPaths(paths);
  }

  async function dropFiles(files: File[]) {
    await ingestPaths(droppedPaths(files));
  }

  return { browseFolders, dropFiles };
}
