const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("bfx", {
  pickFolders: () => ipcRenderer.invoke("folders:pick"),
  getDroppedPath: (file) => webUtils.getPathForFile(file),
  inspectPaths: (paths) => ipcRenderer.invoke("folders:inspect", paths),
  cleanFolders: (paths) => ipcRenderer.invoke("pipeline:clean", paths),
  getDesktopPath: () => ipcRenderer.invoke("paths:desktop"),
  pickDestination: () => ipcRenderer.invoke("paths:pickDestination"),
  copyFolder: (sourcePath, destDir) =>
    ipcRenderer.invoke("pipeline:copyFolder", { sourcePath, destDir }),
  encryptFolder: (folderPath) =>
    ipcRenderer.invoke("pipeline:encryptFolder", folderPath),
  zipFolder: (folderPath) => ipcRenderer.invoke("pipeline:zipFolder", folderPath),
  removeFolder: (folderPath) => ipcRenderer.invoke("pipeline:removeFolder", folderPath),
});
