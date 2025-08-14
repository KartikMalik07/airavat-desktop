const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // File processing
    processFile: (filePath, options) => ipcRenderer.invoke('process-file', filePath, options),
    processBatch: (filePaths, options) => ipcRenderer.invoke('process-batch', filePaths, options),
    processZip: (zipFilePath, options) => ipcRenderer.invoke('process-zip', zipFilePath, options),

    // Download-based export system
    prepareDownloadPackage: (downloadRequest) => ipcRenderer.invoke('prepare-download-package', downloadRequest),
    downloadFileToDownloads: (zipPath, filename) => ipcRenderer.invoke('download-file-to-downloads', zipPath, filename),

    // Model and system info
    getModelInfo: () => ipcRenderer.invoke('get-model-info'),
    getSupportedFormats: () => ipcRenderer.invoke('get-supported-formats'),

    // File dialogs
    selectFiles: () => ipcRenderer.invoke('select-files'),
    selectZip: () => ipcRenderer.invoke('select-zip'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

    // Event listeners
    onAppReady: (callback) => ipcRenderer.on('app-ready', callback),
    onBatchProgress: (callback) => ipcRenderer.on('batch-progress', callback),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),

    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
