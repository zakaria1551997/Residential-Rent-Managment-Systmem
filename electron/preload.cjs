// =============================================================================
// Hospital Residential Allocation & Management System
// Electron Preload Script - Secure Bridge
// =============================================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronDesktopAPI', {
  isElectron: true,
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  printPage: () => ipcRenderer.invoke('app:print-page')
});
