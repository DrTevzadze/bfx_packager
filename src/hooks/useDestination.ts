import { useEffect, useState } from "react";

import { getBfxApi } from "@/lib/electron";

export function useDestination(): {
  askEachTime: boolean;
  destinationPath: string;
  setAskEachTime: (value: boolean) => void;
  browseDestination: () => Promise<void>;
  resolveDestination: () => Promise<string | null>;
} {
  const [askEachTime, setAskEachTime] = useState(false);
  const [destinationPath, setDestinationPath] = useState("");

  useEffect(() => {
    getBfxApi()
      ?.getDesktopPath()
      .then((desktop) => {
        if (desktop) setDestinationPath(desktop);
      })
      .catch(() => {
        // Desktop path unavailable outside Electron.
      });
  }, []);

  async function browseDestination() {
    const api = getBfxApi();
    if (!api) return;

    const picked = await api.pickDestination();
    if (picked) setDestinationPath(picked);
  }

  async function resolveDestination(): Promise<string | null> {
    const api = getBfxApi();
    if (!api) return null;

    if (askEachTime) {
      return api.pickDestination();
    }

    if (destinationPath) return destinationPath;

    const desktop = await api.getDesktopPath();
    if (desktop) setDestinationPath(desktop);
    return desktop ?? null;
  }

  return {
    askEachTime,
    destinationPath,
    setAskEachTime,
    browseDestination,
    resolveDestination,
  };
}
