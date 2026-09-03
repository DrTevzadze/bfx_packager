import ActionBar from "@/components/ActionBar";
import ActivityLog from "@/components/ActivityLog";
import Atmosphere from "@/components/Atmosphere";
import DestinationSettings from "@/components/DestinationSettings";
import Dropzone from "@/components/Dropzone";
import Header from "@/components/Header";
import ProcessingProgressBar from "@/components/ProcessingProgressBar";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useDestination } from "@/hooks/useDestination";
import { useFolderIntake } from "@/hooks/useFolderIntake";
import { useFolderProcessing } from "@/hooks/useFolderProcessing";
import { useFolderQueue } from "@/hooks/useFolderQueue";

export default function App() {
  const { logs, addLog, clearLogs } = useActivityLog();
  const {
    folders,
    isProcessing,
    addFolders,
    removeFolder,
    clearFolders,
    updateFolder,
    setProcessing,
  } = useFolderQueue(addLog);
  const { browseFolders, dropFiles } = useFolderIntake(addFolders, addLog);
  const {
    askEachTime,
    destinationPath,
    setAskEachTime,
    browseDestination,
    resolveDestination,
  } = useDestination();
  const { proceedFolders, canProceed, processingLabel, progress } = useFolderProcessing(
    { folders, updateFolder, setProcessing },
    addLog,
    resolveDestination
  );

  return (
    <div className="relative h-full">
      <Atmosphere />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-220 flex-col px-5 pt-6 pb-7 sm:px-9 sm:pt-8">
        <Header />

        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <Dropzone
            folders={folders}
            isProcessing={isProcessing}
            onBrowse={browseFolders}
            onDropFiles={dropFiles}
            onRemove={removeFolder}
          />
          <DestinationSettings
            askEachTime={askEachTime}
            destinationPath={destinationPath}
            isProcessing={isProcessing}
            onAskEachTimeChange={setAskEachTime}
            onBrowseDestination={browseDestination}
          />
          <ActionBar
            canClear={folders.length > 0}
            canProceed={canProceed}
            isProcessing={isProcessing}
            processingLabel={processingLabel}
            onClear={clearFolders}
            onProceed={proceedFolders}
          />
          {progress && <ProcessingProgressBar progress={progress} />}
          <ActivityLog logs={logs} onClear={clearLogs} />
        </main>
      </div>
    </div>
  );
}
