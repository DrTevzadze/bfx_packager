import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProcessingProgress } from "@/types";

type ProcessingProgressBarProps = {
  progress: ProcessingProgress;
};

export default function ProcessingProgressBar({ progress }: ProcessingProgressBarProps) {
  return (
    <Card className="shrink-0 gap-0 overflow-hidden py-0 animate-fade-up [animation-delay:180ms]">
      <CardContent className="space-y-2 px-3 py-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="truncate text-foreground">{progress.detailLabel}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {progress.value}% · {progress.etaLabel}
          </span>
        </div>
        <Progress value={progress.value} />
      </CardContent>
    </Card>
  );
}
