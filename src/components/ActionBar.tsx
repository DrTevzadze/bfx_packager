import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type ActionBarProps = {
  canClear: boolean;
  canProceed: boolean;
  isProcessing: boolean;
  processingLabel: string;
  onClear: () => void;
  onProceed: () => void;
};

export default function ActionBar({
  canClear,
  canProceed,
  isProcessing,
  processingLabel,
  onClear,
  onProceed,
}: ActionBarProps) {
  return (
    <section className="flex shrink-0 items-center justify-end gap-2.5 animate-fade-up [animation-delay:160ms]">
      <Button
        type="button"
        variant="outline"
        disabled={!canClear || isProcessing}
        onClick={onClear}
      >
        Clear all
      </Button>
      <Button
        type="button"
        disabled={!canProceed || isProcessing}
        onClick={onProceed}
      >
        {isProcessing ? (
          <>
            <Loader2 className="animate-spin" />
            {processingLabel}
          </>
        ) : (
          <>
            Proceed folders
            <ArrowRight />
          </>
        )}
      </Button>
    </section>
  );
}
