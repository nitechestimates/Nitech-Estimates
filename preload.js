const { contextBridge, ipcRenderer } = require("electron");

// Expose protected APIs to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  onUpdateAvailable: (callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on("update-available", subscription);
    return () => ipcRenderer.removeListener("update-available", subscription);
  },
});
