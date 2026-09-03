const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { cleanFolder } = require("./lib/clean");
const { copyFolderTo } = require("./lib/copy");
const { encryptFolder } = require("./lib/encrypt");
const { zipFolderToBfx } = require("./lib/zip");
const { removeFolderRecursive } = require("./lib/remove");

const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173";

function logMain(step, detail) {
  const suffix = detail === undefined ? "" : ` ${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
  console.log(`[bfx-main] ${step}${suffix}`);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1080,
    height: 820,
    minWidth: 780,
    minHeight: 600,
    title: "BFX Packager",
    backgroundColor: "#1a1814",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  } else {
    win.loadURL(DEV_URL);
  }
}

ipcMain.handle("folders:pick", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win ?? undefined, {
    title: "Select folders",
    properties: ["openDirectory", "multiSelections"],
  });

  if (result.canceled) return [];
  return result.filePaths;
});

ipcMain.handle("folders:inspect", async (_event, inputPaths) => {
  const folders = [];
  const skipped = [];
  const seen = new Set();

  for (const raw of Array.isArray(inputPaths) ? inputPaths : []) {
    if (typeof raw !== "string" || raw.trim() === "") continue;

    const resolved = path.resolve(raw);
    const key = process.platform === "win32" ? resolved.toLowerCase() : resolved;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const stat = await fs.stat(resolved);
      if (!stat.isDirectory()) {
        skipped.push({ path: resolved, reason: "not a folder" });
        continue;
      }
      folders.push({ path: resolved, name: path.basename(resolved) });
    } catch {
      skipped.push({ path: raw, reason: "unreadable" });
    }
  }

  return { folders, skipped };
});

ipcMain.handle("pipeline:clean", async (_event, inputPaths) => {
  logMain("pipeline:clean start", { count: inputPaths?.length ?? 0 });
  const results = [];

  for (const raw of Array.isArray(inputPaths) ? inputPaths : []) {
    if (typeof raw !== "string" || raw.trim() === "") continue;

    try {
      logMain("clean folder", raw);
      const result = await cleanFolder(raw);
      logMain("clean done", { path: result.path, removed: result.removedCount });
      results.push(result);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logMain("clean error", { path: raw, error });
      results.push({
        path: path.resolve(raw),
        removedCount: 0,
        warnings: [],
        error,
      });
    }
  }

  logMain("pipeline:clean finish", { count: results.length });
  return results;
});

ipcMain.handle("paths:desktop", () => app.getPath("desktop"));

ipcMain.handle("paths:pickDestination", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win ?? undefined, {
    title: "Choose destination folder",
    properties: ["openDirectory", "createDirectory"],
  });

  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

ipcMain.handle("pipeline:copyFolder", async (_event, payload) => {
  const sourcePath = payload?.sourcePath;
  const destDir = payload?.destDir;

  logMain("pipeline:copyFolder start", { sourcePath, destDir });

  if (typeof sourcePath !== "string" || typeof destDir !== "string") {
    logMain("pipeline:copyFolder invalid payload");
    return { error: "Invalid copy request" };
  }

  try {
    const result = await copyFolderTo(sourcePath, destDir);
    logMain("pipeline:copyFolder done", result);
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logMain("pipeline:copyFolder error", error);
    return { error };
  }
});

ipcMain.handle("pipeline:encryptFolder", async (_event, folderPath) => {
  logMain("pipeline:encryptFolder start", folderPath);

  if (typeof folderPath !== "string" || folderPath.trim() === "") {
    return { error: "Invalid encrypt request" };
  }

  try {
    const result = await encryptFolder(folderPath);
    logMain("pipeline:encryptFolder done", {
      encrypted: result.encryptedCount,
      skipped: result.skipped.length,
      errors: result.errors.length,
    });
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logMain("pipeline:encryptFolder error", error);
    return { error };
  }
});

ipcMain.handle("pipeline:zipFolder", async (_event, folderPath) => {
  logMain("pipeline:zipFolder start", folderPath);

  if (typeof folderPath !== "string" || folderPath.trim() === "") {
    return { error: "Invalid zip request" };
  }

  try {
    const result = await zipFolderToBfx(folderPath);
    logMain("pipeline:zipFolder done", result);
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logMain("pipeline:zipFolder error", error);
    return { error };
  }
});

ipcMain.handle("pipeline:removeFolder", async (_event, folderPath) => {
  logMain("pipeline:removeFolder start", folderPath);

  if (typeof folderPath !== "string" || folderPath.trim() === "") {
    return { error: "Invalid remove request" };
  }

  try {
    const result = await removeFolderRecursive(folderPath);
    logMain("pipeline:removeFolder done", result);
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logMain("pipeline:removeFolder error", error);
    return { error };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
