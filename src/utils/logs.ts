import type { LogKind, LogLine } from "@/types";
import { formatTime } from "@/utils/time";

export const INITIAL_LOG: LogLine = {
  id: "init",
  kind: "muted",
  text: "Activity log ready — proceed folders to trace the pipeline.",
};

export function createLogLine(
  message: string,
  kind: LogKind,
  id: string
): LogLine {
  return {
    id,
    kind,
    text: `[${formatTime()}] ${message}`,
  };
}

export function appendLog(logs: LogLine[], entry: LogLine): LogLine[] {
  const next = logs[0]?.kind === "muted" ? [] : [...logs];
  next.push(entry);
  return next;
}
