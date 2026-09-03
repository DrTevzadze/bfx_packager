import { useState } from "react";

import { getBfxApi } from "@/lib/electron";
import type { AddLog, ProcessingProgress, QueuedFolder } from "@/types";
import { createProgressTracker } from "@/utils/progress";

type FolderQueueActions = {
  folders: QueuedFolder[];
  updateFolder: (id: string, patch: Partial<QueuedFolder>) => void;
  setProcessing: (value: boolean) => void;
};

function isPending(folder: QueuedFolder): boolean {
  return folder.status === "queued" || folder.status === "failed";
}

export function useFolderProcessing(
  { folders, updateFolder, setProcessing }: FolderQueueActions,
  addLog: AddLog,
  resolveDestination: () => Promise<string | null>
) {
  const [processingLabel, setProcessingLabel] = useState("Processing…");
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);

  const canProceed = folders.some(isPending);

  async function proceedFolders() {
    const api = getBfxApi();
    const pending = folders.filter(isPending);

    if (!api) {
      addLog("Electron API unavailable — run inside the desktop app", "warn");
      return;
    }

    if (pending.length === 0) {
      addLog("No queued folders to process", "warn");
      return;
    }

    addLog(`Starting pipeline for ${pending.length} folder(s)…`);
    addLog("Step 0: Resolving destination…");

    const destDir = await resolveDestination();
    if (!destDir) {
      addLog("Destination not chosen — flow cancelled", "warn");
      return;
    }

    addLog(`Destination set to: ${destDir}`, "ok");

    const tracker = createProgressTracker(pending.length);
    const stagingFolders: string[] = [];

    setProcessing(true);
    setProcessingLabel("Processing…");
    setProgress({
      value: 0,
      etaLabel: "Calculating…",
      detailLabel: "Starting pipeline…",
    });

    for (const folder of pending) {
      addLog(`--- Processing “${folder.name}” ---`);
      addLog(`Source: ${folder.path}`);

      updateFolder(folder.id, {
        status: "cleaning",
        error: undefined,
        copiedTo: undefined,
        encryptedCount: undefined,
        bfxPath: undefined,
      });
      setProcessingLabel(`Cleaning “${folder.name}”…`);
      setProgress(tracker.bump(`Cleaning “${folder.name}”…`));
      addLog("Step 1: Cleaning artifacts (._* / .DS_Store)…");

      try {
        const [result] = await api.cleanFolders([folder.path]);

        if (!result) {
          updateFolder(folder.id, {
            status: "failed",
            error: "No response from cleaner",
          });
          addLog(`Clean failed: no response from main process`, "warn");
          continue;
        }

        if (result.error) {
          updateFolder(folder.id, {
            status: "failed",
            error: result.error,
          });
          addLog(`Clean failed: ${result.error}`, "warn");
          continue;
        }

        addLog(
          `Clean OK — removed ${result.removedCount} file(s)`,
          result.removedCount > 0 ? "ok" : "info"
        );

        for (const warning of result.warnings) {
          addLog(`Clean warning: ${warning}`, "warn");
        }

        updateFolder(folder.id, {
          status: "copying",
          encryptedCount: undefined,
          bfxPath: undefined,
        });
        setProcessingLabel(`Copying “${folder.name}”…`);
        setProgress(tracker.bump(`Copying “${folder.name}”…`));
        addLog(`Step 2: Copying to ${destDir}…`);

        const copyResult = await api.copyFolder(folder.path, destDir);
        if (copyResult.error || !copyResult.destination) {
          updateFolder(folder.id, {
            status: "failed",
            error: copyResult.error ?? "Copy failed",
          });
          addLog(`Copy failed: ${copyResult.error ?? "unknown error"}`, "warn");
          continue;
        }

        addLog(`Copy OK → ${copyResult.destination}`, "ok");

        updateFolder(folder.id, { status: "encrypting" });
        setProcessingLabel(`Encrypting “${folder.name}”…`);
        setProgress(tracker.bump(`Encrypting “${folder.name}”…`));
        addLog(`Step 3: Encrypting .json / .jsx files in copy only…`);

        const encryptResult = await api.encryptFolder(copyResult.destination);
        if (encryptResult.error) {
          updateFolder(folder.id, {
            status: "failed",
            error: encryptResult.error,
            copiedTo: copyResult.destination,
          });
          addLog(`Encrypt failed: ${encryptResult.error}`, "warn");
          continue;
        }

        if (encryptResult.errors && encryptResult.errors.length > 0) {
          const first = encryptResult.errors[0];
          updateFolder(folder.id, {
            status: "failed",
            error: first?.error ?? "Encrypt failed",
            copiedTo: copyResult.destination,
          });
          addLog(`Encrypt failed: ${first?.path} — ${first?.error}`, "warn");
          continue;
        }

        addLog(
          `Encrypt OK — ${encryptResult.encryptedCount ?? 0} file(s) → *.enc`,
          "ok"
        );
        addLog(`Using embedded crypt key`, "info");
        for (const item of encryptResult.encrypted ?? []) {
          addLog(`Encrypted → ${item.outPath}`, "info");
          if (item.selfTests) {
            addLog(
              `Self-tests PASS (${item.outPath}): header, roundtrip, wrong-key`,
              "ok"
            );
          }
        }
        for (const skipped of encryptResult.skipped ?? []) {
          const label = skipped.outPath ?? skipped.sourcePath ?? skipped.path ?? "file";
          addLog(`Skipped (${skipped.reason}): ${label}`, "info");
        }

        updateFolder(folder.id, { status: "zipping" });
        setProcessingLabel(`Zipping “${folder.name}”…`);
        setProgress(tracker.bump(`Zipping “${folder.name}”…`));
        addLog(`Step 4: Zipping folder…`);

        const zipResult = await api.zipFolder(copyResult.destination);
        if (zipResult.error || !zipResult.bfxPath) {
          updateFolder(folder.id, {
            status: "failed",
            error: zipResult.error ?? "Zip failed",
            copiedTo: copyResult.destination,
            encryptedCount: encryptResult.encryptedCount,
          });
          addLog(`Zip failed: ${zipResult.error ?? "unknown error"}`, "warn");
          continue;
        }

        addLog(`Step 5: Renamed archive to .bfx`, "info");
        addLog(`Package OK → ${zipResult.bfxPath}`, "ok");

        stagingFolders.push(copyResult.destination);

        updateFolder(folder.id, {
          status: "done",
          removedCount: result.removedCount,
          copiedTo: undefined,
          encryptedCount: encryptResult.encryptedCount,
          bfxPath: zipResult.bfxPath,
          error: undefined,
        });

        addLog(`Finished “${folder.name}”`, "ok");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        updateFolder(folder.id, {
          status: "failed",
          error: message,
        });
        addLog(`Unexpected error: ${message}`, "warn");
      }
    }

    if (stagingFolders.length > 0) {
      setProcessingLabel("Removing staging folders…");
      setProgress(tracker.complete("Removing staging folders…"));
      addLog(
        `Step 6: Removing ${stagingFolders.length} copied staging folder(s)…`
      );

      for (const stagingPath of stagingFolders) {
        const removeResult = await api.removeFolder(stagingPath);
        if (removeResult.error) {
          addLog(
            `Could not remove staging folder: ${stagingPath} — ${removeResult.error}`,
            "warn"
          );
          continue;
        }
        addLog(`Removed staging folder → ${stagingPath}`, "ok");
      }
    }

    addLog("Pipeline complete.", "ok");
    setProgress(tracker.complete("Pipeline complete"));
    setProcessing(false);
    setProcessingLabel("Processing…");
    setProgress(null);
  }

  return { proceedFolders, canProceed, processingLabel, progress };
}
