import { useRef, useState } from "react";
import type { AddLog, LogLine } from "@/types";
import { appendLog, createLogLine, INITIAL_LOG } from "@/utils/logs";

export function useActivityLog(): {
  logs: LogLine[];
  addLog: AddLog;
  clearLogs: () => void;
} {
  const [logs, setLogs] = useState<LogLine[]>([INITIAL_LOG]);
  const nextId = useRef(1);

  const addLog: AddLog = (message, kind = "info") => {
    const id = `${Date.now()}-${nextId.current++}`;
    const line = createLogLine(message, kind, id);
    console.log(`[bfx-ui] ${line.text}`);
    setLogs((prev) => appendLog(prev, line));
  };

  function clearLogs() {
    setLogs([INITIAL_LOG]);
    nextId.current = 1;
  }

  return { logs, addLog, clearLogs };
}
