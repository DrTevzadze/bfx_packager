import { useEffect, useRef } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LogKind, LogLine } from "@/types";

const KIND_CLASS: Record<LogKind, string> = {
  muted: "text-muted-foreground/70",
  info: "text-foreground",
  ok: "text-emerald-400",
  warn: "text-primary",
};

type ActivityLogProps = {
  logs: LogLine[];
  onClear?: () => void;
};

export default function ActivityLog({ logs, onClear }: ActivityLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [logs]);

  return (
    <Card className="shrink-0 gap-0 overflow-hidden py-0 animate-fade-up [animation-delay:200ms]">
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-[0.65rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Activity log
        </CardTitle>
        {onClear && logs.length > 1 && (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClear}>
            Clear
          </Button>
        )}
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <ScrollArea className="h-28">
          <div className="px-3 py-2 font-mono text-[0.72rem] leading-relaxed">
            {logs.map((line) => (
              <p key={line.id} className={cn(KIND_CLASS[line.kind])}>
                {line.text}
              </p>
            ))}
            <div ref={endRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
