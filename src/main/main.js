const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { glob } = require('glob');
const BackendProcessor = require('./backend-processor');

let mainWindow;
let backendProcessor;

// Enable live reload for development
if (process.argv.includes('--dev')) {
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, '../../node_modules/.bin/electron'),
        hardResetMethod: 'exit'
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../../assets/icons/icon.png'),
        show: false // Don't show until ready
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        // Check for backend connection on startup
        checkBackendStatus();
    });

    // Development tools
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}

async function checkBackendStatus() {
    try {
        backendProcessor = new BackendProcessor();
        await backendProcessor.initialize();

        const modelInfo = await backendProcessor.getModelInfo();
        console.log('Backend ready:', modelInfo);

        // Notify renderer that backend is ready
        mainWindow.webContents.send('app-ready', {
            modelsAvailable: true,
            modelInfo: modelInfo
        });

    } catch (error) {
        console.error('Error connecting to backend:', error);

        // Show connection error dialog
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'error',
            buttons: ['Retry', 'Continue Offline', 'Exit'],
            defaultId: 0,
            title: 'Backend Connection Failed',
            message: 'Could not connect to the AI backend server.',
            detail: 'Make sure the backend server is running on http://localhost:8000\n\nYou can continue in offline mode with limited functionality.'
        });

        if (result.response === 0) {
            // Retry connection
            setTimeout(checkBackendStatus, 2000);
        } else if (result.response === 1) {
            // Continue offline
            mainWindow.webContents.send('app-ready', {
                modelsAvailable: false,
                offlineMode: true
            });
        } else {
            // Exit
            app.quit();
        }
    }
}

function showErrorDialog(message) {
    dialog.showErrorBox('Error', message);
}

// IPC handlers for file processing
ipcMain.handle('process-file', async (event, filePath, options = {}) => {
    try {
        if (!backendProcessor || !backendProcessor.isInitialized) {
            throw new Error('Backend not connected. Please restart the app.');
        }

        console.log('Processing file with options:', options);
        const result = await backendProcessor.processFile(filePath, options);
        return { success: true, data: result };
    } catch (error) {
        console.error('Processing error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('process-batch', async (event, filePaths, options = {}) => {
    try {
        if (!backendProcessor || !backendProcessor.isInitialized) {
            throw new Error('Backend not connected. Please restart the app.');
        }

        console.log('Processing batch with options:', options);

        const results = await backendProcessor.processBatch(filePaths, options, (progress) => {
            event.sender.send('batch-progress', {
                progress: progress.progress || 0,
                current: progress.current || 0,
                total: progress.total || filePaths.length,
                currentFile: progress.currentFile || 'Processing...',
                stage: progress.stage || 'Processing files'
            });
        });

        return { success: true, data: results };
    } catch (error) {
        console.error('Batch processing error:', error);
        return { success: false, error: error.message };
    }
});

// ZIP processing handler
ipcMain.handle('process-zip', async (event, zipFilePath, options = {}) => {
    try {
        if (!backendProcessor || !backendProcessor.isInitialized) {
            throw new Error('Backend not connected. Please restart the app.');
        }

        const results = await backendProcessor.processBatchZip(zipFilePath, options, (progress) => {
            event.sender.send('batch-progress', progress);
        });

        return { success: true, data: results };
    } catch (error) {
        console.error('ZIP processing error:', error);
        return { success: false, error: error.message };
    }
});

// NEW: Individual elephant identification handler
ipcMain.handle('process-individual-elephants', async (event, data, options = {}) => {
    try {
        if (!backendProcessor || !backendProcessor.isInitialized) {
            throw new Error('Backend not connected. Please restart the app.');
        }

        console.log('🐘 Processing individual elephant identification with options:', options);

        // Extract file paths and ZIP file path from data
        const { filePaths, zipFilePath } = data;

        const results = await backendProcessor.processIndividualElephants(
            filePaths,
            zipFilePath,
            options,
            (progress) => {
                event.sender.send('batch-progress', {
                    progress: progress.progress || 0,
                    current: progress.current || 0,
                    total: progress.total || 0,
                    currentFile: progress.currentFile || 'Processing individual elephants...',
                    stage: progress.stage || 'Identifying individual elephants',
                    individual_groups: progress.individual_groups || 0,
                    similarity_threshold: progress.similarity_threshold || options.similarity_threshold || 0.85
                });
            }
        );

        return { success: true, data: results };
    } catch (error) {
        console.error('Individual elephant processing error:', error);
        return { success: false, error: error.message };
    }
});

// Enhanced ZIP processing with individual elephant support
ipcMain.handle('process-zip-individual-elephants', async (event, zipFilePath, options = {}) => {
    try {
        if (!backendProcessor || !backendProcessor.isInitialized) {
            throw new Error('Backend not connected. Please restart the app.');
        }

        console.log('🐘📦 Processing ZIP for individual elephant identification...');

        const results = await backendProcessor.processBatchZipIndividualElephants(zipFilePath, options, (progress) => {
            event.sender.send('batch-progress', {
                ...progress,
                stage: progress.stage || 'Identifying individual elephants in ZIP',
                individual_groups: progress.individual_groups || 0,
                similarity_threshold: progress.similarity_threshold || options.similarity_threshold || 0.85
            });
        });

        return { success: true, data: results };
    } catch (error) {
        console.error('ZIP individual elephant processing error:', error);
        return { success: false, error: error.message };
    }
});

// NEW: Prepare download package handler (enhanced for individual elephants)
ipcMain.handle('prepare-download-package', async (event, downloadRequest) => {
    try {
        if (!backendProcessor || !backendProcessor.isInitialized) {
            throw new Error('Backend not connected. Please restart the app.');
        }

        console.log('🔄 Preparing download package...');

        // Send progress updates to frontend
        event.sender.send('download-progress', {
            stage: 'Preparing download package...',
            progress: 10
        });

        const downloadResult = await backendProcessor.prepareDownloadPackage(downloadRequest);

        event.sender.send('download-progress', {
            stage: 'Package ready!',
            progress: 100
        });

        return downloadResult;

    } catch (error) {
        console.error('Download preparation error:', error);
        return { success: false, error: error.message };
    }
});

// NEW: Enhanced download with individual elephant support
ipcMain.handle('prepare-individual-elephant-download', async (event, downloadRequest) => {
    try {
        if (!backendProcessor || !backendProcessor.isInitialized) {
            throw new Error('Backend not connected. Please restart the app.');
        }

        console.log('🐘 Preparing individual elephant download package...');

        // Send progress updates to frontend
        event.sender.send('download-progress', {
            stage: 'Organizing individual elephant groups...',
            progress: 20
        });

        const downloadResult = await backendProcessor.prepareIndividualElephantDownloadPackage(downloadRequest);

        event.sender.send('download-progress', {
            stage: 'Individual elephant package ready!',
            progress: 100
        });

        return downloadResult;

    } catch (error) {
        console.error('Individual elephant download preparation error:', error);
        return { success: false, error: error.message };
    }
});

// NEW: Download file to user's Downloads folder
ipcMain.handle('download-file-to-downloads', async (event, zipPath, filename) => {
    try {
        console.log(`📥 Downloading file: ${filename}`);

        const result = await backendProcessor.downloadFileToDownloads(zipPath, filename);

        if (result.success) {
            // Show different messages based on processing type
            let message = 'Your processed images have been downloaded!';
            let detail = `File saved to: ${result.path}`;

            // Check if it's individual elephant results
            if (filename.includes('individual_elephants')) {
                message = 'Individual elephant identification results downloaded!';
                detail = `Each numbered folder contains images of the same individual elephant.\nFile saved to: ${result.path}`;
            }

            // Notify user of successful download
            const downloadResult = await dialog.showMessageBox(mainWindow, {
                type: 'info',
                buttons: ['Open Downloads Folder', 'OK'],
                defaultId: 0,
                title: 'Download Complete',
                message: message,
                detail: detail
            });

            if (downloadResult.response === 0) {
                // Open Downloads folder (this is OS-specific)
                const { shell } = require('electron');
                shell.showItemInFolder(result.path);
            }
        }

        return result;

    } catch (error) {
        console.error('Download error:', error);
        return { success: false, error: error.message };
    }
});

// Get model info handler
ipcMain.handle('get-model-info', async () => {
    try {
        if (!backendProcessor || !backendProcessor.isInitialized) {
            return {
                success: false,
                error: 'Backend not connected',
                offline: true
            };
        }

        const modelInfo = await backendProcessor.getModelInfo();
        return { success: true, data: modelInfo };
    } catch (error) {
        console.error('Model info error:', error);
        return { success: false, error: error.message };
    }
});

// Enhanced model info handler with individual elephant capability check
ipcMain.handle('get-enhanced-model-info', async () => {
    try {
        if (!backendProcessor || !backendProcessor.isInitialized) {
            return {
                success: false,
                error: 'Backend not connected',
                offline: true
            };
        }

        const modelInfo = await backendProcessor.getModelInfo();

        // Check if both YOLO and Siamese models are available for individual identification
        const individualElephantSupported =
            modelInfo.models_loaded &&
            modelInfo.models_loaded.yolo &&
            modelInfo.models_loaded.siamese;

        return {
            success: true,
            data: {
                ...modelInfo,
                individual_elephant_identification: individualElephantSupported,
                features: {
                    yolo_detection: modelInfo.models_loaded?.yolo || false,
                    siamese_comparison: modelInfo.models_loaded?.siamese || false,
                    individual_identification: individualElephantSupported,
                    batch_processing: true,
                    zip_support: true
                }
            }
        };
    } catch (error) {
        console.error('Enhanced model info error:', error);
        return { success: false, error: error.message };
    }
});

// File selection handlers
ipcMain.handle('select-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff', 'tif'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled) {
        return [];
    }

    return result.filePaths;
});

ipcMain.handle('select-zip', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'ZIP Archives', extensions: ['zip'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled) {
        return null;
    }

    return result.filePaths[0];
});

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (result.canceled) {
        return null;
    }

    return result.filePaths[0];
});

// File dialog handlers
ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
});

// Get supported formats
ipcMain.handle('get-supported-formats', async () => {
    if (backendProcessor && backendProcessor.isInitialized) {
        const modelInfo = await backendProcessor.getModelInfo();
        return modelInfo.supportedFormats;
    }
    return ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff', 'tif'];
});

// NEW: Get processing capabilities
ipcMain.handle('get-processing-capabilities', async () => {
    try {
        if (!backendProcessor || !backendProcessor.isInitialized) {
            return {
                yolo_detection: false,
                siamese_comparison: false,
                individual_identification: false,
                batch_processing: false,
                zip_support: false
            };
        }

        const modelInfo = await backendProcessor.getModelInfo();

        return {
            yolo_detection: modelInfo.models_loaded?.yolo || false,
            siamese_comparison: modelInfo.models_loaded?.siamese || false,
            individual_identification:
                (modelInfo.models_loaded?.yolo && modelInfo.models_loaded?.siamese) || false,
            batch_processing: true,
            zip_support: true,
            max_file_size: modelInfo.max_file_size || '200GB',
            supported_formats: modelInfo.supportedFormats || ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif']
        };
    } catch (error) {
        console.error('Processing capabilities error:', error);
        return {
            yolo_detection: false,
            siamese_comparison: false,
            individual_identification: false,
            batch_processing: false,
            zip_support: false
        };
    }
});

// NEW: Show processing type selection dialog
ipcMain.handle('show-processing-type-dialog', async (event, capabilities) => {
    const buttons = [];
    const details = [];

    if (capabilities.individual_identification) {
        buttons.push('Individual Elephant ID');
        details.push('✅ Identify and group same individual elephants');
    }

    if (capabilities.yolo_detection) {
        buttons.push('YOLO Detection Only');
        details.push('🔍 Detect elephants in images');
    }

    if (capabilities.siamese_comparison) {
        buttons.push('Siamese Comparison Only');
        details.push('🧠 Compare against known elephants');
    }

    if (capabilities.yolo_detection && capabilities.siamese_comparison) {
        buttons.push('Combined Processing');
        details.push('🔍🧠 Detection + comparison');
    }

    buttons.push('Cancel');

    const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: buttons,
        defaultId: 0,
        cancelId: buttons.length - 1,
        title: 'Select Processing Type',
        message: 'Choose how you want to process your images:',
        detail: details.join('\n')
    });

    if (result.response === buttons.length - 1) {
        return null; // Cancelled
    }

    const processingTypes = {
        'Individual Elephant ID': 'individual-elephants',
        'YOLO Detection Only': 'yolo-only',
        'Siamese Comparison Only': 'siamese-only',
        'Combined Processing': 'combined'
    };

    return processingTypes[buttons[result.response]];
});

// NEW: Show similarity threshold dialog
ipcMain.handle('show-similarity-threshold-dialog', async () => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Strict (0.9)', 'Balanced (0.85)', 'Permissive (0.8)', 'Custom', 'Cancel'],
        defaultId: 1,
        cancelId: 4,
        title: 'Similarity Threshold',
        message: 'Choose similarity threshold for individual elephant grouping:',
        detail: 'Strict: Fewer groups, very similar elephants only\n' +
               'Balanced: Recommended setting\n' +
               'Permissive: More groups, includes somewhat similar elephants'
    });

    switch (result.response) {
        case 0: return 0.9;  // Strict
        case 1: return 0.85; // Balanced (default)
        case 2: return 0.8;  // Permissive
        case 3:
            // Custom threshold - could add input dialog here
            return 0.85; // For now, return default
        default: return null; // Cancelled
    }
});

// App event handlers
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (backendProcessor) {
        backendProcessor.cleanup();
    }
});
