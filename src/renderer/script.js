// Enhanced Frontend Script - Fixed for Electron Compatibility
// Supports all backend endpoints with improved Electron and Web compatibility

// Backend Configuration - Complete API endpoints
const BACKEND_CONFIG = {
    BASE_URL: 'http://localhost:8000',
    ENDPOINTS: {
        // Health and status
        HEALTH: '/api/health',

        // Single image processing
        DETECT_YOLO: '/api/detect-yolo',
        COMPARE_DATASET: '/api/compare-dataset',

        // Batch processing endpoints
        BATCH_YOLO: '/api/batch-yolo',
        BATCH_SIAMESE: '/api/batch-siamese',
        BATCH_COMBINED: '/api/batch-combined',
        BATCH_INDIVIDUAL_ELEPHANTS: '/api/batch-individual-elephants',

        // Download endpoints
        DOWNLOAD_BATCH: '/api/download-batch',
        PREPARE_DOWNLOAD_PACKAGE: '/api/prepare-download-package',
        DOWNLOAD_PREPARED_PACKAGE: '/api/download-prepared-package'
    },
    PROCESSING_TYPES: {
        YOLO: 'yolo',
        SIAMESE: 'siamese',
        COMBINED: 'combined',
        INDIVIDUAL_ELEPHANTS: 'individual_elephants'
    },
    DEFAULT_OPTIONS: {
        confidence_threshold: 0.5,
        siamese_threshold: 0.85,
        similarity_threshold: 0.85,
        max_workers: 4,
        iou: 0.45,
        image_size: 640,
        top_k: 10
    }
};

// App State - Initialize with safe defaults
let selectedFiles = [];
let isProcessing = false;
let appReady = false;
let offlineMode = false;
let supportedFormats = ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff', 'tif'];
let lastResults = null;
let backendHealth = null;
let isElectron = false;

// DOM Elements - Will be initialized after DOM is ready
let loadingScreen, mainContent, statusIndicator, uploadArea, fileList, processBtn,
    resultsSection, resultsContainer, processingModal, errorModal;

// Safe DOM element getter with fallback
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

// Initialize DOM elements safely
function initializeDOMElements() {
    loadingScreen = getElement('loadingScreen');
    mainContent = getElement('mainContent');
    statusIndicator = getElement('statusIndicator');
    uploadArea = getElement('uploadArea');
    fileList = getElement('fileList');
    processBtn = getElement('processBtn');
    resultsSection = getElement('resultsSection');
    resultsContainer = getElement('resultsContainer');
    processingModal = getElement('processingModal');
    errorModal = getElement('errorModal');
}

// Safe environment detection
function detectEnvironment() {
    try {
        // More robust Electron detection
        isElectron = !!(window && window.process && window.process.type === 'renderer') ||
                     !!(window && window.electronAPI) ||
                     !!(window && window.require);

        console.log('🔍 Environment detected:', isElectron ? 'Electron' : 'Web Browser');

        if (isElectron && window.electronAPI) {
            // Listen for Electron-specific events with error handling
            try {
                if (typeof window.electronAPI.onAppReady === 'function') {
                    window.electronAPI.onAppReady(handleAppReady);
                }
                if (typeof window.electronAPI.onBatchProgress === 'function') {
                    window.electronAPI.onBatchProgress(handleBatchProgress);
                }
                if (typeof window.electronAPI.onDownloadProgress === 'function') {
                    window.electronAPI.onDownloadProgress(handleDownloadProgress);
                }
            } catch (error) {
                console.warn('⚠️ Electron API setup warning:', error.message);
            }
        }
    } catch (error) {
        console.error('❌ Environment detection error:', error);
        isElectron = false;
    }
}

// Initialize app with better error handling
function initializeApp() {
    try {
        console.log('🚀 Initializing application...');

        // Initialize DOM elements first
        initializeDOMElements();

        // Detect environment
        detectEnvironment();

        // Setup event listeners
        setupEventListeners();

        // Initialize advanced settings
        initializeAdvancedSettings();

        // Check backend connection
        checkBackendConnection();

        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        showError('Failed to initialize application: ' + error.message);
    }
}

// DOM ready event with fallback
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded
    setTimeout(initializeApp, 100);
}

// Handle app ready event from Electron
function handleAppReady(data) {
    try {
        console.log('📱 Electron app ready:', data);

        appReady = data && data.modelsAvailable !== false;
        offlineMode = data && data.offlineMode || false;
        backendHealth = data && data.modelInfo || null;

        hideLoadingScreen();

        if (appReady) {
            updateStatus('Connected (Electron)', 'success');
            showNotification('Electron app ready with AI models!', 'success');
        } else {
            updateStatus('Offline Mode', 'warning');
            showNotification('Running in offline mode - limited functionality', 'warning');
        }

        updateProcessButton();
    } catch (error) {
        console.error('❌ Error handling app ready:', error);
        showError('Error initializing Electron app: ' + error.message);
    }
}

// Handle batch progress from Electron with error handling
function handleBatchProgress(progress) {
    try {
        console.log('📊 Batch progress:', progress);

        updateProcessingProgress({
            progress: progress && progress.progress || 0,
            currentFile: progress && progress.currentFile || 'Processing...',
            processedCount: progress && progress.current || 0,
            totalCount: progress && progress.total || selectedFiles.length,
            stage: progress && progress.stage || 'Processing files'
        });
    } catch (error) {
        console.error('❌ Error handling batch progress:', error);
    }
}

// Handle download progress from Electron with error handling
function handleDownloadProgress(progress) {
    try {
        console.log('📥 Download progress:', progress);

        updateProcessingProgress({
            progress: progress && progress.progress || 0,
            stage: progress && progress.stage || 'Preparing download...',
            currentFile: 'Preparing results package...'
        });
    } catch (error) {
        console.error('❌ Error handling download progress:', error);
    }
}

// Backend Connection with improved error handling
async function checkBackendConnection() {
    if (isElectron) {
        // In Electron, backend connection is handled by main process
        showLoadingScreen('Initializing Electron App', 'Loading AI models and backend...');
        return;
    }

    try {
        console.log('🔍 Checking backend connection...');
        showLoadingScreen('Connecting to Backend', 'Checking server availability...');

        // Create a timeout promise for the fetch request
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
        });

        const fetchPromise = fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.HEALTH}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (response && response.ok) {
            backendHealth = await response.json();
            console.log('✅ Backend connected:', backendHealth);

            appReady = true;
            offlineMode = false;
            hideLoadingScreen();
            updateStatus('Connected (Web)', 'success');

            // Update supported formats from backend
            if (backendHealth && backendHealth.models_loaded) {
                supportedFormats = backendHealth.supportedFormats || ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff', 'tif'];
            }

            showNotification('Backend connected successfully!', 'success');
        } else {
            throw new Error(`Backend returned ${response ? response.status : 'no response'}`);
        }
    } catch (error) {
        console.error('❌ Backend connection failed:', error);

        appReady = false;
        offlineMode = true;
        hideLoadingScreen();
        updateStatus('Offline - Backend Unavailable', 'error');

        const errorMessage = error.message || 'Unknown connection error';
        showError(`Backend connection failed: ${errorMessage}. Please ensure the FastAPI server is running on ${BACKEND_CONFIG.BASE_URL}`);
    }

    updateProcessButton();
}

// Setup event listeners with error handling
function setupEventListeners() {
    try {
        // File selection buttons
        const selectFilesBtn = getElement('selectFilesBtn');
        const selectZipBtn = getElement('selectZipBtn');

        if (selectFilesBtn) selectFilesBtn.addEventListener('click', selectFiles);
        if (selectZipBtn) selectZipBtn.addEventListener('click', selectZip);

        // Upload area drag & drop
        if (uploadArea) {
            uploadArea.addEventListener('dragover', handleDragOver);
            uploadArea.addEventListener('dragleave', handleDragLeave);
            uploadArea.addEventListener('drop', handleDrop);
            uploadArea.addEventListener('click', (event) => {
                if (!appReady) return;
                const rect = uploadArea.getBoundingClientRect();
                showContextMenu(rect.left + rect.width/2, rect.top + rect.height/2);
            });
        }

        // Control buttons
        if (processBtn) processBtn.addEventListener('click', processFiles);

        const clearFilesBtn = getElement('clearFilesBtn');
        const clearResultsBtn = getElement('clearResultsBtn');
        const downloadResultsBtn = getElement('downloadResultsBtn');

        if (clearFilesBtn) clearFilesBtn.addEventListener('click', clearFiles);
        if (clearResultsBtn) clearResultsBtn.addEventListener('click', clearResults);
        if (downloadResultsBtn) downloadResultsBtn.addEventListener('click', downloadResults);

        // Processing type change
        const processingTypeRadios = document.querySelectorAll('input[name="processingType"]');
        processingTypeRadios.forEach(radio => {
            radio.addEventListener('change', updateProcessingOptions);
        });

        // Error modal
        const closeErrorBtn = getElement('closeErrorBtn');
        if (closeErrorBtn) closeErrorBtn.addEventListener('click', hideErrorModal);
        if (errorModal) {
            errorModal.addEventListener('click', (e) => {
                if (e.target === errorModal) hideErrorModal();
            });
        }

        console.log('✅ Event listeners setup completed');
    } catch (error) {
        console.error('❌ Error setting up event listeners:', error);
    }
}

function initializeAdvancedSettings() {
    try {
        // Confidence threshold slider
        const confidenceSlider = getElement('confidenceThreshold');
        const confidenceValue = getElement('confidenceValue');

        if (confidenceSlider && confidenceValue) {
            confidenceSlider.addEventListener('input', (e) => {
                confidenceValue.textContent = e.target.value;
            });
        }

        // Siamese threshold slider
        const siameseSlider = getElement('siameseThreshold');
        const siameseValue = getElement('siameseValue');

        if (siameseSlider && siameseValue) {
            siameseSlider.addEventListener('input', (e) => {
                siameseValue.textContent = e.target.value;
            });
        }

        // Similarity threshold slider
        const similaritySlider = getElement('similarityThreshold');
        const similarityValue = getElement('similarityValue');

        if (similaritySlider && similarityValue) {
            similaritySlider.addEventListener('input', (e) => {
                similarityValue.textContent = e.target.value;
            });
        }

        console.log('✅ Advanced settings initialized');
    } catch (error) {
        console.error('❌ Error initializing advanced settings:', error);
    }
}

// UI Functions with null checks
function showLoadingScreen(title, message, isError = false) {
    try {
        const loadingTitle = getElement('loadingTitle');
        const loadingMessage = getElement('loadingMessage');
        const loadingSpinner = document.querySelector('.loading-spinner');

        if (loadingTitle) loadingTitle.textContent = title || 'Loading...';
        if (loadingMessage) loadingMessage.textContent = message || 'Please wait...';

        if (isError && loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }

        if (loadingScreen) loadingScreen.style.display = 'flex';
        if (mainContent) mainContent.style.display = 'none';
    } catch (error) {
        console.error('❌ Error showing loading screen:', error);
    }
}

function hideLoadingScreen() {
    try {
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
    } catch (error) {
        console.error('❌ Error hiding loading screen:', error);
    }
}

function updateStatus(text, type) {
    try {
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');

        if (statusText) statusText.textContent = text || 'Unknown';

        if (statusDot) {
            statusDot.className = 'status-dot';

            const colors = {
                success: '#48bb78',
                error: '#e53e3e',
                warning: '#ed8936',
                default: '#4299e1'
            };

            statusDot.style.background = colors[type] || colors.default;
        }
    } catch (error) {
        console.error('❌ Error updating status:', error);
    }
}

// File handling functions with improved error handling
async function selectFiles() {
    if (!appReady) {
        showError('Backend not connected. Please refresh the page.');
        return;
    }

    try {
        if (isElectron && window.electronAPI && window.electronAPI.selectFiles) {
            // Use Electron's file dialog
            const filePaths = await window.electronAPI.selectFiles();
            if (filePaths && Array.isArray(filePaths) && filePaths.length > 0) {
                addFiles(filePaths, 'images');
            }
        } else {
            // Use web file input
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = supportedFormats.map(f => `.${f}`).join(',');

            input.onchange = (event) => {
                const files = Array.from(event.target.files || []);
                if (files.length > 0) {
                    addFiles(files.map(f => f.name), 'images', files);
                }
            };

            input.click();
        }
    } catch (error) {
        console.error('❌ Error selecting files:', error);
        showError('Error selecting files: ' + error.message);
    }
}

async function selectZip() {
    if (!appReady) {
        showError('Backend not connected. Please refresh the page.');
        return;
    }

    try {
        if (isElectron && window.electronAPI && window.electronAPI.selectZip) {
            // Use Electron's file dialog
            const zipPath = await window.electronAPI.selectZip();
            if (zipPath) {
                addFiles([zipPath], 'zip');
            }
        } else {
            // Use web file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.zip';

            input.onchange = (event) => {
                const file = event.target.files && event.target.files[0];
                if (file) {
                    addFiles([file.name], 'zip', [file]);
                }
            };

            input.click();
        }
    } catch (error) {
        console.error('❌ Error selecting ZIP:', error);
        showError('Error selecting ZIP file: ' + error.message);
    }
}

function handleDragOver(e) {
    try {
        e.preventDefault();
        if (uploadArea) uploadArea.classList.add('dragover');
    } catch (error) {
        console.error('❌ Error in drag over:', error);
    }
}

function handleDragLeave(e) {
    try {
        e.preventDefault();
        if (uploadArea) uploadArea.classList.remove('dragover');
    } catch (error) {
        console.error('❌ Error in drag leave:', error);
    }
}

function handleDrop(e) {
    try {
        e.preventDefault();
        if (uploadArea) uploadArea.classList.remove('dragover');

        if (!appReady) {
            showError('Backend not connected. Please refresh the page.');
            return;
        }

        const files = Array.from(e.dataTransfer.files || []);

        // Separate images and ZIP files
        const imageFiles = files.filter(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            return supportedFormats.includes(ext);
        });

        const zipFiles = files.filter(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            return ext === 'zip';
        });

        if (imageFiles.length > 0) {
            addFiles(imageFiles.map(f => f.name), 'images', imageFiles);
        }

        if (zipFiles.length > 0) {
            addFiles(zipFiles.map(f => f.name), 'zip', zipFiles);
        }

        if (imageFiles.length === 0 && zipFiles.length === 0) {
            showNotification('No supported files found. Please select images or ZIP archives.', 'warning');
        }
    } catch (error) {
        console.error('❌ Error in drop handler:', error);
        showError('Error handling dropped files: ' + error.message);
    }
}

function addFiles(filePaths, type = 'images', fileObjects = []) {
    try {
        if (!Array.isArray(filePaths)) {
            console.error('❌ filePaths is not an array:', filePaths);
            return;
        }

        let addedCount = 0;

        filePaths.forEach((filePath, index) => {
            if (filePath && !selectedFiles.find(f => f.name === filePath)) {
                const fileName = String(filePath);
                const fileExt = fileName.split('.').pop().toLowerCase();
                const isZip = fileExt === 'zip';

                selectedFiles.push({
                    name: fileName,
                    type: isZip ? 'zip' : 'image',
                    path: filePath, // For Electron file paths
                    size: fileObjects && fileObjects[index] ? formatFileSize(fileObjects[index].size) : '',
                    icon: isZip ? '📦' : getFileIcon(fileExt),
                    fileObject: fileObjects && fileObjects[index] // Store actual file object for web upload
                });
                addedCount++;
            }
        });

        updateFileList();
        updateProcessButton();

        if (addedCount > 0) {
            showNotification(`Added ${addedCount} file(s)`, 'success');
        }
    } catch (error) {
        console.error('❌ Error adding files:', error);
        showError('Error adding files: ' + error.message);
    }
}

function getFileIcon(extension) {
    const iconMap = {
        'jpg': '🖼', 'jpeg': '🖼', 'png': '🖼',
        'bmp': '🖼', 'gif': '🖼', 'tiff': '🖼', 'tif': '🖼'
    };
    return iconMap[extension] || '📄';
}

function formatFileSize(bytes) {
    try {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    } catch (error) {
        console.error('❌ Error formatting file size:', error);
        return 'Unknown size';
    }
}

function removeFile(index) {
    try {
        if (index >= 0 && index < selectedFiles.length) {
            selectedFiles.splice(index, 1);
            updateFileList();
            updateProcessButton();
            showNotification('File removed', 'info');
        }
    } catch (error) {
        console.error('❌ Error removing file:', error);
    }
}

function clearFiles() {
    try {
        selectedFiles = [];
        updateFileList();
        updateProcessButton();
        showNotification('All files cleared', 'info');
    } catch (error) {
        console.error('❌ Error clearing files:', error);
    }
}

function updateFileList() {
    try {
        if (!fileList) return;

        if (selectedFiles.length === 0) {
            fileList.innerHTML = `
                <div class="empty-state">
                    <p>No files selected yet</p>
                    <small>Select images or a ZIP archive to get started</small>
                </div>
            `;
            return;
        }

        fileList.innerHTML = selectedFiles.map((file, index) => {
            const fileName = file.name || 'Unknown file';
            const fileType = (file.type || 'unknown').toUpperCase();
            const fileSize = file.size || '';
            const fileIcon = file.icon || '📄';

            return `
                <div class="file-item">
                    <div class="file-info">
                        <div class="file-icon">${fileIcon}</div>
                        <div class="file-details">
                            <h4>${fileName}</h4>
                            <p>Type: ${fileType}</p>
                            ${fileSize ? `<small class="file-size">${fileSize}</small>` : ''}
                        </div>
                    </div>
                    <div class="file-actions">
                        <button class="btn-icon" onclick="removeFile(${index})" title="Remove file">🗑</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Error updating file list:', error);
    }
}

function updateProcessButton() {
    try {
        if (!processBtn) return;

        const hasFiles = selectedFiles.length > 0;
        const backendReady = appReady && !offlineMode;

        processBtn.disabled = !hasFiles || isProcessing || !backendReady;

        if (!backendReady) {
            processBtn.textContent = 'Backend Offline';
            processBtn.title = 'Backend connection required for processing';
        } else if (isProcessing) {
            processBtn.textContent = 'Processing...';
            processBtn.title = '';
        } else {
            processBtn.textContent = 'Process Files';
            processBtn.title = hasFiles ? '' : 'Please select files to process';
        }
    } catch (error) {
        console.error('❌ Error updating process button:', error);
    }
}

function updateProcessingOptions() {
    try {
        const selectedType = document.querySelector('input[name="processingType"]:checked');
        if (!selectedType) return;

        const processingTypeValue = selectedType.value;

        // Show/hide relevant settings based on processing type
        const confidenceGroup = document.querySelector('.setting-item:has(#confidenceThreshold)');
        const siameseGroup = document.querySelector('.setting-item:has(#siameseThreshold)');
        const similarityGroup = document.querySelector('.setting-item:has(#similarityThreshold)');

        if (confidenceGroup && siameseGroup && similarityGroup) {
            // Reset all visibility
            confidenceGroup.style.display = 'none';
            siameseGroup.style.display = 'none';
            similarityGroup.style.display = 'none';

            switch(processingTypeValue) {
                case 'yolo':
                    confidenceGroup.style.display = 'block';
                    break;
                case 'siamese':
                    siameseGroup.style.display = 'block';
                    break;
                case 'combined':
                    confidenceGroup.style.display = 'block';
                    siameseGroup.style.display = 'block';
                    break;
                case 'individual_elephants':
                    confidenceGroup.style.display = 'block';
                    similarityGroup.style.display = 'block';
                    break;
            }
        }
    } catch (error) {
        console.error('❌ Error updating processing options:', error);
    }
}

// Processing Functions with enhanced error handling
async function processFiles() {
    if (!selectedFiles.length || isProcessing || !appReady || offlineMode) return;

    isProcessing = true;
    updateProcessButton();

    try {
        // Get processing options with fallbacks
        const processingTypeElement = document.querySelector('input[name="processingType"]:checked');
        const processingType = processingTypeElement ? processingTypeElement.value : 'yolo';

        const confidenceSlider = getElement('confidenceThreshold');
        const siameseSlider = getElement('siameseThreshold');
        const similaritySlider = getElement('similarityThreshold');
        const maxWorkersInput = getElement('maxWorkers');

        const confidence_threshold = confidenceSlider ? parseFloat(confidenceSlider.value) : BACKEND_CONFIG.DEFAULT_OPTIONS.confidence_threshold;
        const siamese_threshold = siameseSlider ? parseFloat(siameseSlider.value) : BACKEND_CONFIG.DEFAULT_OPTIONS.siamese_threshold;
        const similarity_threshold = similaritySlider ? parseFloat(similaritySlider.value) : BACKEND_CONFIG.DEFAULT_OPTIONS.similarity_threshold;
        const max_workers = maxWorkersInput ? parseInt(maxWorkersInput.value) : BACKEND_CONFIG.DEFAULT_OPTIONS.max_workers;

        console.log('🚀 Starting processing with type:', processingType);

        // Show processing modal
        showProcessingModal();

        let result;

        if (isElectron && window.electronAPI) {
            // Use Electron IPC for processing
            result = await processWithElectron(processingType, {
                confidence_threshold,
                siamese_threshold,
                similarity_threshold,
                max_workers
            });
        } else {
            // Use web API for processing
            result = await processWithWebAPI(processingType, {
                confidence_threshold,
                siamese_threshold,
                similarity_threshold,
                max_workers
            });
        }

        hideProcessingModal();

        if (result && result.success) {
            console.log('✅ Processing completed:', result.data);
            displayResults(result.data);
            lastResults = result.data;

            const successMsg = `Successfully processed ${result.data.successfully_processed || 0} out of ${result.data.total_images || 0} images`;
            showNotification(successMsg, 'success');

            // Show download button if results are available
            if (result.data.zip_file_path) {
                showDownloadButton(result.data.zip_file_path);
            }
        } else {
            throw new Error(result && result.error ? result.error : 'Processing failed with unknown error');
        }

    } catch (error) {
        console.error('❌ Processing error:', error);
        hideProcessingModal();
        showError('Processing failed: ' + error.message);
    } finally {
        isProcessing = false;
        updateProcessButton();
    }
}

async function processWithElectron(processingType, options) {
    try {
        // Determine which Electron IPC method to use
        const zipFiles = selectedFiles.filter(f => f && f.type === 'zip');
        const imageFiles = selectedFiles.filter(f => f && f.type === 'image');

        if (zipFiles.length > 0 && window.electronAPI.processZip) {
            // Process ZIP file
            return await window.electronAPI.processZip(zipFiles[0].path, {
                processingType,
                ...options
            });
        } else if (imageFiles.length > 0 && window.electronAPI.processBatch) {
            // Process individual files
            const filePaths = imageFiles.map(f => f.path);
            return await window.electronAPI.processBatch(filePaths, {
                processingType,
                ...options
            });
        } else {
            throw new Error('No valid files selected or Electron API methods not available');
        }
    } catch (error) {
        console.error('❌ Electron processing error:', error);
        throw error;
    }
}

async function processWithWebAPI(processingType, options) {
    try {
        // Determine which endpoint to use based on processing type
        let endpoint;
        switch(processingType) {
            case 'yolo':
                endpoint = BACKEND_CONFIG.ENDPOINTS.BATCH_YOLO;
                break;
            case 'siamese':
                endpoint = BACKEND_CONFIG.ENDPOINTS.BATCH_SIAMESE;
                break;
            case 'combined':
                endpoint = BACKEND_CONFIG.ENDPOINTS.BATCH_COMBINED;
                break;
            case 'individual_elephants':
                endpoint = BACKEND_CONFIG.ENDPOINTS.BATCH_INDIVIDUAL_ELEPHANTS;
                break;
            default:
                throw new Error(`Unknown processing type: ${processingType}`);
        }

        // Create FormData for the request
        const formData = new FormData();

        // Add processing parameters
        formData.append('confidence_threshold', options.confidence_threshold);
        formData.append('siamese_threshold', options.siamese_threshold);
        formData.append('similarity_threshold', options.similarity_threshold);
        formData.append('max_workers', options.max_workers);

        // Separate ZIP files and regular images
        const zipFiles = selectedFiles.filter(f => f && f.type === 'zip');
        const imageFiles = selectedFiles.filter(f => f && f.type === 'image');

        // Add files to FormData
        if (zipFiles.length > 0) {
            // For ZIP files, use zip_file parameter
            if (zipFiles[0].fileObject) {
                formData.append('zip_file', zipFiles[0].fileObject);
            } else {
                throw new Error('ZIP file object not available for web upload');
            }
        } else if (imageFiles.length > 0) {
            // For regular images, use images parameter
            imageFiles.forEach(file => {
                if (file.fileObject) {
                    formData.append('images', file.fileObject);
                } else {
                    console.warn('File object missing for:', file.name);
                }
            });
        } else {
            throw new Error('No valid files found for processing');
        }

        console.log(`📡 Calling ${endpoint} with ${zipFiles.length} ZIP files and ${imageFiles.length} image files`);

        // Make the API call
        const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${endpoint}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend error (${response.status}): ${errorText}`);
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Web API processing error:', error);
        throw error;
    }
}

function showProcessingModal() {
    try {
        if (processingModal) {
            processingModal.style.display = 'flex';

            // Reset progress indicators
            const progressFill = getElement('batchProgressFill');
            const progressText = getElement('batchProgressText');
            const progressPercent = getElement('batchProgressPercent');
            const currentFileText = getElement('currentFileText');
            const processedCount = getElement('processedCount');
            const totalCount = getElement('totalCount');

            if (progressFill) progressFill.style.width = '0%';
            if (progressText) progressText.textContent = 'Starting...';
            if (progressPercent) progressPercent.textContent = '0%';
            if (currentFileText) currentFileText.textContent = 'Preparing files...';
            if (processedCount) processedCount.textContent = '0';
            if (totalCount) totalCount.textContent = selectedFiles.length.toString();
        }
    } catch (error) {
        console.error('❌ Error showing processing modal:', error);
    }
}

function hideProcessingModal() {
    try {
        if (processingModal) {
            processingModal.style.display = 'none';
        }
    } catch (error) {
        console.error('❌ Error hiding processing modal:', error);
    }
}

function updateProcessingProgress(progress) {
    try {
        const progressFill = getElement('batchProgressFill');
        const progressText = getElement('batchProgressText');
        const progressPercent = getElement('batchProgressPercent');
        const currentFileText = getElement('currentFileText');
        const processedCount = getElement('processedCount');

        if (progressFill) progressFill.style.width = `${progress.progress || 0}%`;
        if (progressText) progressText.textContent = progress.stage || 'Processing...';
        if (progressPercent) progressPercent.textContent = `${Math.round(progress.progress || 0)}%`;
        if (currentFileText) currentFileText.textContent = progress.currentFile || 'Processing...';
        if (processedCount) processedCount.textContent = (progress.processedCount || 0).toString();
    } catch (error) {
        console.error('❌ Error updating processing progress:', error);
    }
}

// Results Functions - Enhanced for all processing types
function displayResults(results) {
    try {
        console.log('📊 Displaying results:', results);

        if (!results) {
            console.error('No results provided');
            showError('Invalid results received from backend');
            return;
        }

        if (resultsSection) resultsSection.style.display = 'block';

        // Handle the batch response format from backend
        const detailedResults = results.detailed_results || [];

        if (detailedResults.length === 0) {
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No detailed results to display</p>
                        <small>Processing completed but no detailed results were returned</small>
                    </div>
                `;
            }
            return;
        }

        // Display processing summary
        const summaryHTML = `
            <div class="results-summary">
                <h3>🎯 Processing Summary</h3>
                <div class="summary-stats">
                    <div class="stat-item">
                        <strong>${results.total_images || 0}</strong>
                        <span>Total Images</span>
                    </div>
                    <div class="stat-item success">
                        <strong>${results.successfully_processed || 0}</strong>
                        <span>Successfully Processed</span>
                    </div>
                    <div class="stat-item ${(results.failed_images || 0) > 0 ? 'error' : ''}">
                        <strong>${results.failed_images || 0}</strong>
                        <span>Failed</span>
                    </div>
                    <div class="stat-item">
                        <strong>${results.processing_time || 'N/A'}</strong>
                        <span>Processing Time</span>
                    </div>
                    ${results.individual_elephant_groups ? `
                    <div class="stat-item special">
                        <strong>${results.individual_elephant_groups}</strong>
                        <span>Individual Elephants</span>
                    </div>` : ''}
                </div>
                ${results.results_summary ? formatResultsSummary(results.results_summary) : ''}
            </div>
        `;

        // Display individual results
        const detailedHTML = detailedResults.map((result, index) => {
            const fileName = result.filename || `Result ${index + 1}`;
            const isSuccess = result.category !== 'processing_error';

            return `
                <div class="result-item ${isSuccess ? 'success' : 'error'}">
                    <div class="result-header">
                        <h4>📄 ${fileName}</h4>
                        <span class="result-status ${isSuccess ? 'success' : 'error'}">
                            ${isSuccess ? '✅ Success' : '❌ Failed'}
                        </span>
                        <span class="result-category">${formatCategory(result.category)}</span>
                    </div>
                    <div class="result-content">
                        ${isSuccess ? formatDetailedResultData(result) : `<div class="error-message">Error: ${result.error_message || 'Unknown error'}</div>`}
                    </div>
                </div>
            `;
        }).join('');

        if (resultsContainer) {
            resultsContainer.innerHTML = summaryHTML + detailedHTML;
        }
    } catch (error) {
        console.error('❌ Error displaying results:', error);
        showError('Error displaying results: ' + error.message);
    }
}

function formatResultsSummary(summary) {
    try {
        if (!summary || typeof summary !== 'object') return '';

        const summaryItems = Object.entries(summary).map(([category, count]) =>
            `<div class="summary-category">
                <strong>${formatCategory(category)}</strong>: ${count}
            </div>`
        ).join('');

        return `
            <div class="category-summary">
                <h4>📈 Category Breakdown:</h4>
                ${summaryItems}
            </div>
        `;
    } catch (error) {
        console.error('❌ Error formatting results summary:', error);
        return '';
    }
}

function formatCategory(category) {
    const categoryMap = {
        'elephants_detected': '🐘 Elephants Detected',
        'matches_found': '🔍 Matches Found',
        'no_elephants': '❌ No Elephants',
        'no_matches': '🔍 No Matches',
        'processing_error': '⚠️ Processing Error',
        // Individual elephant categories
        '01_elephant_individual': '🐘 Individual 01',
        '02_elephant_individual': '🐘 Individual 02',
        '03_elephant_individual': '🐘 Individual 03',
        '00_no_elephants_detected': '❌ No Elephants',
        '99_processing_errors': '⚠️ Errors'
    };

    return categoryMap[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDetailedResultData(data) {
    try {
        if (!data) return '<div class="no-data">No data available</div>';

        let html = `
            <div class="result-details">
                <div class="file-info">
                    <span><strong>Size:</strong> ${data.original_size || 'N/A'}</span>
                    <span><strong>File Size:</strong> ${data.file_size_mb || 0} MB</span>
                    <span><strong>Processing Time:</strong> ${data.processing_time || 0}s</span>
                </div>
            </div>
        `;

        // Handle YOLO results
        if (data.yolo_result && !data.yolo_result.error) {
            const yolo = data.yolo_result;
            html += `
                <div class="yolo-results">
                    <h5>🎯 YOLO Detection Results:</h5>
                    <div class="detection-info">
                        <p><strong>Message:</strong> ${yolo.message || 'N/A'}</p>
                        <p><strong>Detections:</strong> ${yolo.total_detections || 0}</p>
                        <p><strong>Highest Confidence:</strong> ${Math.round((yolo.highest_confidence || 0) * 100)}%</p>
                    </div>
                </div>
            `;
        }

        // Handle Siamese results
        if (data.siamese_result && !data.siamese_result.error) {
            const siamese = data.siamese_result;
            html += `
                <div class="siamese-results">
                    <h5>🔍 Dataset Comparison Results:</h5>
                    <p><strong>Total Matches:</strong> ${siamese.total_matches || 0}</p>
            `;

            if (siamese.matches && siamese.matches.length > 0) {
                html += '<div class="matches-list">';
                siamese.matches.slice(0, 3).forEach(match => { // Show top 3 matches
                    html += `
                        <div class="match-item">
                            <span><strong>${match.elephant_id}</strong></span>
                            <span>Confidence: ${Math.round((match.confidence || match.similarity || 0) * 100)}%</span>
                            <span>Quality: ${match.match_quality || 'N/A'}</span>
                        </div>
                    `;
                });
                html += '</div>';
            }
            html += '</div>';
        }

        // Handle Individual Elephant results
        if (data.individual_elephant_info) {
            const individual = data.individual_elephant_info;
            html += `
                <div class="individual-results">
                    <h5>🐘 Individual Elephant Information:</h5>
                    <div class="individual-info">
                        <p><strong>Group ID:</strong> ${individual.group_id || 'Unknown'}</p>
                        <p><strong>Similarity Score:</strong> ${Math.round((individual.similarity_score || 0) * 100)}%</p>
                        <p><strong>Group Size:</strong> ${individual.group_size || 1} images</p>
                    </div>
                </div>
            `;
        }

        return html;
    } catch (error) {
        console.error('❌ Error formatting detailed result data:', error);
        return '<div class="error-message">Error formatting result data</div>';
    }
}

function showDownloadButton(zipPath) {
    try {
        // Add download button to results section if not already present
        if (!getElement('downloadResultsBtn')) {
            const downloadBtn = document.createElement('button');
            downloadBtn.id = 'downloadResultsBtn';
            downloadBtn.className = 'btn btn-primary';
            downloadBtn.innerHTML = '⬇️ Download Results';
            downloadBtn.onclick = () => downloadResults(zipPath);

            const clearBtn = getElement('clearResultsBtn');
            if (clearBtn && clearBtn.parentNode) {
                clearBtn.parentNode.insertBefore(downloadBtn, clearBtn);
            }
        }
    } catch (error) {
        console.error('❌ Error showing download button:', error);
    }
}

async function downloadResults(zipPath) {
    try {
        console.log('📥 Downloading results from:', zipPath);

        if (isElectron && window.electronAPI && window.electronAPI.downloadFileToDownloads) {
            // Use Electron's download functionality
            const result = await window.electronAPI.downloadFileToDownloads(zipPath, `batch_results_${Date.now()}.zip`);

            if (result && result.success) {
                showNotification(`Download completed! File saved to: ${result.path}`, 'success');
            } else {
                throw new Error(result && result.error ? result.error : 'Download failed');
            }
        } else {
            // Use web browser download
            const filename = zipPath.split('/').pop() || `batch_results_${Date.now()}.zip`;
            const link = document.createElement('a');
            link.href = `${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.DOWNLOAD_BATCH}/${filename}`;
            link.download = filename;

            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showNotification('Download started! Check your Downloads folder.', 'success');
        }

    } catch (error) {
        console.error('❌ Download error:', error);
        showError('Download failed: ' + error.message);
    }
}

function clearResults() {
    try {
        if (resultsContainer) resultsContainer.innerHTML = '';
        if (resultsSection) resultsSection.style.display = 'none';
        lastResults = null;

        // Remove download button
        const downloadBtn = getElement('downloadResultsBtn');
        if (downloadBtn && downloadBtn.parentNode) {
            downloadBtn.parentNode.removeChild(downloadBtn);
        }

        showNotification('Results cleared', 'info');
    } catch (error) {
        console.error('❌ Error clearing results:', error);
    }
}

// Context menu for file selection
function showContextMenu(x, y) {
    try {
        // Remove existing menu
        removeContextMenu();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.zIndex = '10000';

        menu.innerHTML = `
            <div class="menu-item" onclick="selectFiles(); removeContextMenu();">
                📷 Select Images
            </div>
            <div class="menu-item" onclick="selectZip(); removeContextMenu();">
                📦 Select ZIP Archive
            </div>
        `;

        // Add styles if not exists
        if (!getElement('context-menu-styles')) {
            const styles = document.createElement('style');
            styles.id = 'context-menu-styles';
            styles.textContent = `
                .context-menu {
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    min-width: 160px;
                    animation: fadeIn 0.2s ease;
                }
                .menu-item {
                    padding: 12px 16px;
                    cursor: pointer;
                    border-bottom: 1px solid #f0f0f0;
                    transition: background-color 0.2s;
                }
                .menu-item:hover {
                    background-color: #f8f9fa;
                }
                .menu-item:last-child {
                    border-bottom: none;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(menu);

        // Remove on click outside
        setTimeout(() => {
            document.addEventListener('click', removeContextMenu, { once: true });
        }, 100);
    } catch (error) {
        console.error('❌ Error showing context menu:', error);
    }
}

function removeContextMenu() {
    try {
        const menu = document.querySelector('.context-menu');
        if (menu && menu.parentNode) menu.parentNode.removeChild(menu);
    } catch (error) {
        console.error('❌ Error removing context menu:', error);
    }
}

// Error handling with better UI feedback
function showError(message) {
    try {
        console.error('❌ Error:', message);

        const errorMessageEl = getElement('errorMessage');
        if (errorMessageEl) {
            errorMessageEl.textContent = message || 'An unknown error occurred';
        }

        if (errorModal) {
            errorModal.style.display = 'flex';
        } else {
            // Fallback to notification if modal not available
            showNotification(message || 'An error occurred', 'error');
        }
    } catch (error) {
        console.error('❌ Error showing error:', error);
        // Last resort - use alert
        alert('Error: ' + (message || 'An unknown error occurred'));
    }
}

function hideErrorModal() {
    try {
        if (errorModal) {
            errorModal.style.display = 'none';
        }
    } catch (error) {
        console.error('❌ Error hiding error modal:', error);
    }
}

// Utility Functions with enhanced error handling
function showNotification(message, type = 'info') {
    try {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message || 'Notification'}</span>
            <button onclick="this.parentElement.remove()" type="button">×</button>
        `;

        // Add styles if not exists
        if (!getElement('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    min-width: 300px;
                    max-width: 500px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    animation: slideIn 0.3s ease;
                    word-wrap: break-word;
                }

                .notification-success { background: #48bb78; }
                .notification-error { background: #e53e3e; }
                .notification-warning { background: #ed8936; }
                .notification-info { background: #4299e1; }

                .notification button {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                    flex-shrink: 0;
                }

                .notification button:hover {
                    opacity: 1;
                }

                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            try {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            } catch (error) {
                console.warn('Error removing notification:', error);
            }
        }, 5000);
    } catch (error) {
        console.error('❌ Error showing notification:', error);
        // Fallback to console log
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Development and debugging helpers
function debugBackendConnection() {
    console.log('🔍 Backend Debug Info:');
    console.log('Environment:', isElectron ? 'Electron' : 'Web Browser');
    console.log('Base URL:', BACKEND_CONFIG.BASE_URL);
    console.log('App Ready:', appReady);
    console.log('Offline Mode:', offlineMode);
    console.log('Backend Health:', backendHealth);
    console.log('Selected Files:', selectedFiles);
    console.log('Available Endpoints:', Object.keys(BACKEND_CONFIG.ENDPOINTS));
    console.log('Electron API Available:', !!(window.electronAPI));
    console.log('DOM Elements Status:', {
        loadingScreen: !!loadingScreen,
        mainContent: !!mainContent,
        uploadArea: !!uploadArea,
        processBtn: !!processBtn,
        fileList: !!fileList,
        resultsSection: !!resultsSection
    });
}

// Health check function for manual testing
async function performHealthCheck() {
    try {
        showNotification('Performing health check...', 'info');

        if (isElectron && window.electronAPI && window.electronAPI.getModelInfo) {
            const result = await window.electronAPI.getModelInfo();
            if (result && result.success) {
                console.log('Health check result:', result.data);
                showNotification('Health check passed! All models loaded.', 'success');
                backendHealth = result.data;
                updateStatus('Healthy (Electron)', 'success');
            } else {
                throw new Error(result && result.error ? result.error : 'Health check failed');
            }
        } else {
            const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.HEALTH}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const health = await response.json();
                console.log('Health check result:', health);
                showNotification('Health check passed! Backend is healthy.', 'success');
                backendHealth = health;
                updateStatus('Healthy (Web)', 'success');
                appReady = true;
                offlineMode = false;
            } else {
                throw new Error(`Health check failed: ${response.status}`);
            }
        }
    } catch (error) {
        console.error('Health check failed:', error);
        showError('Health check failed: ' + error.message);
        updateStatus('Unhealthy', 'error');
        appReady = false;
        offlineMode = true;
    }

    updateProcessButton();
}

// Make functions available globally for onclick handlers
window.removeFile = removeFile;
window.removeContextMenu = removeContextMenu;
window.selectFiles = selectFiles;
window.selectZip = selectZip;
window.debugBackendConnection = debugBackendConnection;
window.performHealthCheck = performHealthCheck;

// Auto-refresh backend connection if it fails (web mode only)
if (!isElectron) {
    setInterval(() => {
        try {
            if (!appReady && !isProcessing) {
                console.log('🔄 Attempting to reconnect to backend...');
                checkBackendConnection();
            }
        } catch (error) {
            console.error('❌ Error in auto-reconnect:', error);
        }
    }, 30000); // Check every 30 seconds
}

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
    console.error('❌ Unhandled error:', event.error);
    showNotification('An unexpected error occurred. Check console for details.', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
    showNotification('An unexpected error occurred. Check console for details.', 'error');
});

console.log('✅ Enhanced Frontend script loaded successfully!');
console.log('🔧 Environment:', isElectron ? 'Electron' : 'Web Browser');
console.log('🔧 Backend URL:', BACKEND_CONFIG.BASE_URL);
console.log('📋 Available endpoints:', Object.keys(BACKEND_CONFIG.ENDPOINTS));
console.log('🎯 Processing types:', Object.values(BACKEND_CONFIG.PROCESSING_TYPES));
