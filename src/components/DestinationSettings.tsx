import { FolderOutput } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DestinationSettingsProps = {
  askEachTime: boolean;
  destinationPath: string;
  isProcessing: boolean;
  onAskEachTimeChange: (value: boolean) => void;
  onBrowseDestination: () => void;
};

export default function DestinationSettings({
  askEachTime,
  destinationPath,
  isProcessing,
  onAskEachTimeChange,
  onBrowseDestination,
}: DestinationSettingsProps) {
  return (
    <section className="shrink-0 rounded-xl border border-border bg-card/40 px-4 py-3 animate-fade-up [animation-delay:120ms]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={askEachTime}
            disabled={isProcessing}
            onChange={(event) => onAskEachTimeChange(event.target.checked)}
            className="size-4 cursor-pointer rounded border-border accent-primary disabled:cursor-not-allowed"
          />
          Ask for destination each time
        </label>

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-2 sm:max-w-[70%] sm:flex-row sm:items-center sm:justify-end sm:gap-2",
            askEachTime && "opacity-50"
          )}
        >
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <FolderOutput className="size-4 shrink-0 text-primary" />
            <span className="truncate" title={destinationPath || "Desktop"}>
              {askEachTime
                ? "You'll pick a folder when processing"
                : destinationPath || "Desktop"}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={askEachTime || isProcessing}
            onClick={onBrowseDestination}
          >
            Browse
          </Button>
        </div>
      </div>
    </section>
  );
}
