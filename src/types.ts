export type LogKind = "muted" | "info" | "ok" | "warn";

export type LogLine = {
  id: string;
  kind: LogKind;
  text: string;
};

export type FolderStatus =
  | "queued"
  | "cleaning"
  | "copying"
  | "encrypting"
  | "zipping"
  | "done"
  | "failed";

export type QueuedFolder = {
  id: string;
  name: string;
  path: string;
  status: FolderStatus;
  removedCount?: number;
  copiedTo?: string;
  encryptedCount?: number;
  bfxPath?: string;
  error?: string;
};

export type InspectedFolder = {
  name: string;
  path: string;
};

export type SkippedPath = {
  path: string;
  reason: string;
};

export type InspectResult = {
  folders: InspectedFolder[];
  skipped: SkippedPath[];
};

export type CleanFolderResult = {
  path: string;
  removedCount: number;
  warnings: string[];
  error?: string;
};

export type CopyFolderResult = {
  destination?: string;
  error?: string;
};

export type EncryptFolderResult = {
  folderPath?: string;
  encryptedCount?: number;
  encrypted?: {
    sourcePath: string;
    outPath: string;
    selfTests?: { header: boolean; roundtrip: boolean; wrongKey: boolean };
  }[];
  skipped?: { sourcePath?: string; path?: string; outPath?: string; reason: string }[];
  errors?: { path: string; error: string }[];
  error?: string;
};

export type ZipFolderResult = {
  bfxPath?: string;
  bytesWritten?: number;
  error?: string;
};

export type RemoveFolderResult = {
  path?: string;
  error?: string;
};

export type ProcessingProgress = {
  value: number;
  etaLabel: string;
  detailLabel: string;
};

export type DestinationOptions = {
  askEachTime: boolean;
  destinationPath: string;
};

export type AddLog = (message: string, kind?: LogKind) => void;

export type BfxApi = {
  pickFolders: () => Promise<string[]>;
  getDroppedPath: (file: File) => string;
  inspectPaths: (paths: string[]) => Promise<InspectResult>;
  cleanFolders: (paths: string[]) => Promise<CleanFolderResult[]>;
  getDesktopPath: () => Promise<string>;
  pickDestination: () => Promise<string | null>;
  copyFolder: (sourcePath: string, destDir: string) => Promise<CopyFolderResult>;
  encryptFolder: (folderPath: string) => Promise<EncryptFolderResult>;
  zipFolder: (folderPath: string) => Promise<ZipFolderResult>;
  removeFolder: (folderPath: string) => Promise<RemoveFolderResult>;
};

declare global {
  interface Window {
    bfx?: BfxApi;
  }
}
