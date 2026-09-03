import type { ProcessingProgress } from "@/types";

const STEPS_PER_FOLDER = 4;

export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 3) return "Almost done";
  if (seconds < 60) return `~${Math.ceil(seconds)}s left`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);
  return `~${minutes}m ${remainingSeconds}s left`;
}

export function createProgressTracker(totalFolders: number) {
  const totalSteps = Math.max(totalFolders * STEPS_PER_FOLDER, 1);
  let completedSteps = 0;
  const startedAt = Date.now();

  return {
    totalSteps,
    bump(detailLabel: string): ProcessingProgress {
      completedSteps = Math.min(completedSteps + 1, totalSteps);
      const elapsed = (Date.now() - startedAt) / 1000;
      const fraction = completedSteps / totalSteps;
      const etaSeconds = fraction > 0 ? (elapsed / fraction) * (1 - fraction) : 0;

      return {
        value: Math.round(fraction * 100),
        etaLabel: formatEta(etaSeconds),
        detailLabel,
      };
    },
    complete(detailLabel: string): ProcessingProgress {
      return {
        value: 100,
        etaLabel: "Done",
        detailLabel,
      };
    },
  };
}

export { STEPS_PER_FOLDER };
