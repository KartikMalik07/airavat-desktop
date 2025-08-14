const axios = require('axios');
const fs = require('fs-extra');
const FormData = require('form-data');
const path = require('path');
const os = require('os');
const archiver = require('archiver');
const { BACKEND_CONFIG } = require('../config/backend-config');

class BackendProcessor {
    constructor() {
        this.baseUrl = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log('Initializing backend connection...');

            const urls = [BACKEND_CONFIG.RENDER_URL ,BACKEND_CONFIG.LOCAL_URL];

            for (const url of urls) {
                try {
                    const response = await axios.get(
                        `${url}${BACKEND_CONFIG.ENDPOINTS.HEALTH}`,
                        { timeout: BACKEND_CONFIG.TIMEOUT }
                    );

                    // Check if the response indicates the backend is healthy
                    if (response.status === 200) {
                        this.baseUrl = url;
                        this.isInitialized = true;
                        console.log(`✅ Connected to backend at: ${url}`);
                        return;
                    }
                } catch (error) {
                    console.log(`❌ Failed to connect to ${url}: ${error.message}`);
                }
            }

            throw new Error('Could not connect to any backend server');

        } catch (error) {
            console.error('Failed to initialize backend connection:', error);
            throw error;
        }
    }

    async processFile(filePath, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Backend processor not initialized');
        }

        try {
            console.log(`Processing file: ${filePath}`);

            // Verify file exists
            if (!await fs.pathExists(filePath)) {
                throw new Error('Input file not found');
            }

            // Create form data
            const formData = new FormData();
            formData.append('image', fs.createReadStream(filePath));

            // Determine the endpoint based on processing type
            let endpoint;
            const processingType = options.type || options.processingType || 'yolo';

            if (processingType === 'yolo' || processingType === 'yolo-detect' || processingType === 'yolo-only') {
                endpoint = '/api/detect-yolo';

                // Add YOLO-specific options
                if (options.confidence_threshold !== undefined) {
                    formData.append('confidence_threshold', String(options.confidence_threshold));
                }
                if (options.confidence !== undefined) {
                    formData.append('confidence', String(options.confidence));
                }
            } else if (processingType === 'compare-dataset' || processingType === 'siamese' || processingType === 'siamese-only') {
                endpoint = '/api/compare-dataset';

                // Add dataset comparison options
                if (options.siamese_threshold !== undefined) {
                    formData.append('siamese_threshold', String(options.siamese_threshold));
                }
                if (options.threshold !== undefined) {
                    formData.append('threshold', String(options.threshold));
                }
            } else {
                throw new Error(`Unknown processing type: ${processingType}`);
            }

            // Send request
            const response = await axios.post(
                `${this.baseUrl}${endpoint}`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders()
                    },
                    timeout: BACKEND_CONFIG.TIMEOUT
                }
            );

            return response.data;

        } catch (error) {
            console.error('File processing error:', error);
            throw error;
        }
    }

    async processBatch(filePaths, options = {}, progressCallback) {
        if (!this.isInitialized) {
            throw new Error('Backend processor not initialized');
        }

        try {
            console.log(`Processing batch of ${filePaths.length} files`);

            // Create form data
            const formData = new FormData();

            // Add all files
            for (const filePath of filePaths) {
                if (await fs.pathExists(filePath)) {
                    formData.append('images', fs.createReadStream(filePath));
                }
            }

            // Determine endpoint and add options based on processing type
            let endpoint;
            const processingType = options.type || options.processingType || 'yolo';

            if (processingType === 'yolo' || processingType === 'yolo-detect' || processingType === 'yolo-only') {
                endpoint = '/api/batch-yolo';

                // Add YOLO batch options
                formData.append('confidence_threshold', String(options.confidence_threshold || 0.5));
                formData.append('max_workers', String(options.max_workers || 4));

            } else if (processingType === 'compare-dataset' || processingType === 'siamese' || processingType === 'siamese-only') {
                endpoint = '/api/batch-siamese';

                // Add Siamese batch options
                formData.append('siamese_threshold', String(options.siamese_threshold || 0.85));
                formData.append('max_workers', String(options.max_workers || 4));

            } else if (processingType === 'combined') {
                endpoint = '/api/batch-combined';

                // Add combined processing options
                formData.append('confidence_threshold', String(options.confidence_threshold || 0.5));
                formData.append('siamese_threshold', String(options.siamese_threshold || 0.85));
                formData.append('enable_yolo_detection', String(options.enable_yolo !== false));
                formData.append('enable_siamese_comparison', String(options.enable_siamese !== false));
                formData.append('max_workers', String(options.max_workers || 4));

            } else if (processingType === 'individual-elephants' || processingType === 'individual_elephants') {
                endpoint = '/api/batch-individual-elephants';

                // Add individual elephant processing options
                formData.append('confidence_threshold', String(options.confidence_threshold || 0.5));
                formData.append('similarity_threshold', String(options.similarity_threshold || 0.85));
                formData.append('max_workers', String(options.max_workers || 4));

            } else {
                throw new Error(`Unknown processing type: ${processingType}`);
            }

            // Send request with progress tracking
            const response = await axios.post(
                `${this.baseUrl}${endpoint}`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders()
                    },
                    timeout: BACKEND_CONFIG.TIMEOUT * 10, // Longer timeout for batch
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        if (progressCallback) {
                            progressCallback({
                                stage: 'Uploading files',
                                progress: progress,
                                loaded: progressEvent.loaded,
                                total: progressEvent.total,
                                current: 0,
                                currentFile: 'Uploading...'
                            });
                        }
                    }
                }
            );

            return response.data;

        } catch (error) {
            console.error('Batch processing error:', error);
            throw error;
        }
    }

    async processBatchZip(zipFilePath, options = {}, progressCallback) {
        if (!this.isInitialized) {
            throw new Error('Backend processor not initialized');
        }

        try {
            console.log(`Processing ZIP file: ${zipFilePath}`);

            // Verify ZIP file exists
            if (!await fs.pathExists(zipFilePath)) {
                throw new Error('ZIP file not found');
            }

            // Create form data
            const formData = new FormData();
            formData.append('zip_file', fs.createReadStream(zipFilePath));

            // Determine endpoint and add options based on processing type
            let endpoint;
            const processingType = options.type || options.processingType || 'yolo';

            if (processingType === 'yolo' || processingType === 'yolo-detect' || processingType === 'yolo-only') {
                endpoint = '/api/batch-yolo';
                formData.append('confidence_threshold', String(options.confidence_threshold || 0.5));
            } else if (processingType === 'compare-dataset' || processingType === 'siamese' || processingType === 'siamese-only') {
                endpoint = '/api/batch-siamese';
                formData.append('siamese_threshold', String(options.siamese_threshold || 0.85));
            } else if (processingType === 'combined') {
                endpoint = '/api/batch-combined';
                formData.append('confidence_threshold', String(options.confidence_threshold || 0.5));
                formData.append('siamese_threshold', String(options.siamese_threshold || 0.85));
                formData.append('enable_yolo_detection', String(options.enable_yolo !== false));
                formData.append('enable_siamese_comparison', String(options.enable_siamese !== false));
            } else if (processingType === 'individual-elephants' || processingType === 'individual_elephants') {
                endpoint = '/api/batch-individual-elephants';
                formData.append('confidence_threshold', String(options.confidence_threshold || 0.5));
                formData.append('similarity_threshold', String(options.similarity_threshold || 0.85));
            } else {
                throw new Error(`Unknown processing type: ${processingType}`);
            }

            formData.append('max_workers', String(options.max_workers || 4));

            // Send request
            const response = await axios.post(
                `${this.baseUrl}${endpoint}`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders()
                    },
                    timeout: BACKEND_CONFIG.TIMEOUT * 20, // Much longer for ZIP processing
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        if (progressCallback) {
                            progressCallback({
                                stage: 'Uploading ZIP file',
                                progress: progress,
                                loaded: progressEvent.loaded,
                                total: progressEvent.total,
                                current: 0,
                                currentFile: 'Processing ZIP...'
                            });
                        }
                    }
                }
            );

            return response.data;

        } catch (error) {
            console.error('ZIP processing error:', error);
            throw error;
        }
    }

    // NEW: Individual elephant identification for batch files
    async processIndividualElephants(filePaths, zipFilePath, options = {}, progressCallback) {
        if (!this.isInitialized) {
            throw new Error('Backend processor not initialized');
        }

        try {
            console.log('🐘 Processing individual elephant identification...');

            // Create form data
            const formData = new FormData();

            // Add files based on input type
            if (zipFilePath) {
                // Process ZIP file
                if (await fs.pathExists(zipFilePath)) {
                    formData.append('zip_file', fs.createReadStream(zipFilePath));
                }
            } else if (filePaths && filePaths.length > 0) {
                // Process individual files
                for (const filePath of filePaths) {
                    if (await fs.pathExists(filePath)) {
                        formData.append('images', fs.createReadStream(filePath));
                    }
                }
            } else {
                throw new Error('No valid files provided for individual elephant processing');
            }

            // Add individual elephant processing options
            formData.append('confidence_threshold', String(options.confidence_threshold || 0.5));
            formData.append('similarity_threshold', String(options.similarity_threshold || 0.85));
            formData.append('max_workers', String(options.max_workers || 4));

            // Use individual elephant endpoint
            const endpoint = '/api/batch-individual-elephants';

            // Send request with progress tracking
            const response = await axios.post(
                `${this.baseUrl}${endpoint}`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders()
                    },
                    timeout: BACKEND_CONFIG.TIMEOUT * 20, // Longer timeout for individual processing
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        if (progressCallback) {
                            progressCallback({
                                stage: 'Processing individual elephants',
                                progress: progress,
                                loaded: progressEvent.loaded,
                                total: progressEvent.total,
                                current: 0,
                                currentFile: 'Identifying individuals...',
                                individual_groups: 0,
                                similarity_threshold: options.similarity_threshold || 0.85
                            });
                        }
                    }
                }
            );

            return response.data;

        } catch (error) {
            console.error('Individual elephant processing error:', error);
            throw error;
        }
    }

    // NEW: Process ZIP file specifically for individual elephant identification
    async processBatchZipIndividualElephants(zipFilePath, options = {}, progressCallback) {
        if (!this.isInitialized) {
            throw new Error('Backend processor not initialized');
        }

        try {
            console.log('🐘📦 Processing ZIP for individual elephant identification...');

            return await this.processIndividualElephants(null, zipFilePath, options, progressCallback);

        } catch (error) {
            console.error('ZIP individual elephant processing error:', error);
            throw error;
        }
    }

    // Enhanced prepare download package method
    async prepareDownloadPackage(downloadRequest) {
        if (!this.isInitialized) {
            throw new Error('Backend processor not initialized');
        }

        try {
            console.log('📦 Calling backend to prepare download package...');

            const response = await axios.post(
                `${this.baseUrl}/api/prepare-download-package`,
                downloadRequest,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: BACKEND_CONFIG.TIMEOUT * 15 // Longer timeout for package preparation
                }
            );

            console.log('✅ Backend download package response:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Error preparing download package:', error);

            // Handle different error types
            if (error.response) {
                // Backend returned an error response
                return {
                    success: false,
                    error: `Backend error: ${error.response.data?.error || error.response.statusText}`
                };
            } else if (error.request) {
                // Network error
                return {
                    success: false,
                    error: 'Network error: Unable to connect to backend'
                };
            } else {
                // Other error
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    }

    // NEW: Prepare download package specifically for individual elephant results
    async prepareIndividualElephantDownloadPackage(downloadRequest) {
        if (!this.isInitialized) {
            throw new Error('Backend processor not initialized');
        }

        try {
            console.log('🐘 Preparing individual elephant download package...');

            // Enhance the download request with individual elephant specific options
            const enhancedRequest = {
                ...downloadRequest,
                options: {
                    ...downloadRequest.options,
                    processingType: 'individual_elephants',
                    organizeByIndividual: true,
                    includeGroupSummaries: true
                }
            };

            return await this.prepareDownloadPackage(enhancedRequest);

        } catch (error) {
            console.error('❌ Individual elephant download preparation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Download prepared ZIP file from backend
    async downloadFileToDownloads(backendZipPath, filename) {
        try {
            console.log('📥 Downloading prepared ZIP file from backend...');

            // Get the ZIP file from backend
            const response = await axios.get(
                `${this.baseUrl}/api/download-prepared-package`,
                {
                    params: {
                        zip_path: backendZipPath,
                        filename: filename
                    },
                    responseType: 'stream',
                    timeout: BACKEND_CONFIG.TIMEOUT * 10
                }
            );

            // Determine Downloads folder path
            const downloadsPath = path.join(os.homedir(), 'Downloads');
            await fs.ensureDir(downloadsPath);

            // Ensure unique filename if file already exists
            let finalPath = path.join(downloadsPath, filename);
            let counter = 1;
            while (await fs.pathExists(finalPath)) {
                const ext = path.extname(filename);
                const name = path.basename(filename, ext);
                finalPath = path.join(downloadsPath, `${name}_${counter}${ext}`);
                counter++;
            }

            // Create write stream and download file
            const writer = fs.createWriteStream(finalPath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log('✅ File downloaded to:', finalPath);
                    resolve({
                        success: true,
                        path: finalPath,
                        filename: path.basename(finalPath)
                    });
                });

                writer.on('error', (error) => {
                    console.error('❌ Download stream error:', error);
                    reject(error);
                });

                response.data.on('error', (error) => {
                    console.error('❌ Response stream error:', error);
                    reject(error);
                });
            });

        } catch (error) {
            console.error('❌ Download error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async downloadBatchResults(filename, savePath) {
        if (!this.isInitialized) {
            throw new Error('Backend processor not initialized');
        }

        try {
            console.log(`Downloading batch results: ${filename}`);

            const response = await axios.get(
                `${this.baseUrl}${BACKEND_CONFIG.ENDPOINTS.DOWNLOAD_BATCH}/${filename}`,
                {
                    responseType: 'stream',
                    timeout: BACKEND_CONFIG.TIMEOUT * 5
                }
            );

            // Create write stream
            const writer = fs.createWriteStream(savePath);

            // Pipe response to file
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }

    async getModelInfo() {
        if (!this.isInitialized) {
            throw new Error('Backend processor not initialized');
        }

        try {
            const response = await axios.get(
                `${this.baseUrl}${BACKEND_CONFIG.ENDPOINTS.HEALTH}`,
                { timeout: BACKEND_CONFIG.TIMEOUT }
            );

            // Enhanced model info with individual elephant support detection
            const baseInfo = response.data;
            const hasYolo = baseInfo.models_loaded?.yolo || false;
            const hasSiamese = baseInfo.models_loaded?.siamese || false;

            return {
                status: 'ready',
                backend_url: this.baseUrl,
                models_loaded: {
                    yolo: hasYolo,
                    siamese: hasSiamese,
                    individual_elephants: hasYolo && hasSiamese // Both needed for individual identification
                },
                dependencies: baseInfo.dependencies || [],
                supportedFormats: BACKEND_CONFIG.SUPPORTED_FORMATS || ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff', 'tif'],
                capabilities: [
                    'single-process',
                    'batch-process',
                    'zip-process',
                    'download-export',
                    'individual-elephant-identification'
                ],
                processingTypes: [
                    'yolo',
                    'siamese',
                    'combined',
                    'individual_elephants'
                ],
                features: {
                    yolo_detection: hasYolo,
                    siamese_comparison: hasSiamese,
                    individual_identification: hasYolo && hasSiamese,
                    batch_processing: true,
                    zip_support: true
                },
                max_file_size: baseInfo.max_file_size || '200GB',
                ...baseInfo // Include any additional backend-provided info
            };

        } catch (error) {
            console.error('Error getting model info:', error);
            throw error;
        }
    }

    // NEW: Get enhanced capabilities info
    async getProcessingCapabilities() {
        try {
            const modelInfo = await this.getModelInfo();

            return {
                yolo_detection: modelInfo.models_loaded?.yolo || false,
                siamese_comparison: modelInfo.models_loaded?.siamese || false,
                individual_identification: modelInfo.models_loaded?.individual_elephants || false,
                batch_processing: true,
                zip_support: true,
                max_file_size: modelInfo.max_file_size || '200GB',
                supported_formats: modelInfo.supportedFormats || ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif'],
                processing_types: modelInfo.processingTypes || ['yolo', 'siamese', 'combined', 'individual_elephants']
            };
        } catch (error) {
            console.error('Error getting processing capabilities:', error);
            return {
                yolo_detection: false,
                siamese_comparison: false,
                individual_identification: false,
                batch_processing: false,
                zip_support: false
            };
        }
    }

    // NEW: Health check with enhanced status
    async performHealthCheck() {
        try {
            if (!this.isInitialized) {
                return {
                    success: false,
                    status: 'not_initialized',
                    error: 'Backend processor not initialized'
                };
            }

            const response = await axios.get(
                `${this.baseUrl}${BACKEND_CONFIG.ENDPOINTS.HEALTH}`,
                { timeout: BACKEND_CONFIG.TIMEOUT }
            );

            if (response.status === 200) {
                const health = response.data;
                return {
                    success: true,
                    status: 'healthy',
                    backend_url: this.baseUrl,
                    models_loaded: health.models_loaded || {},
                    uptime: health.uptime || 'unknown',
                    memory_usage: health.memory_usage || 'unknown',
                    gpu_available: health.gpu_available || false
                };
            } else {
                return {
                    success: false,
                    status: 'unhealthy',
                    error: `Backend returned status ${response.status}`
                };
            }
        } catch (error) {
            console.error('Health check failed:', error);
            return {
                success: false,
                status: 'error',
                error: error.message
            };
        }
    }

    // NEW: Test connection method
    async testConnection() {
        try {
            const healthCheck = await this.performHealthCheck();

            if (healthCheck.success) {
                console.log('✅ Connection test passed');
                return {
                    success: true,
                    message: 'Backend connection is working properly',
                    details: healthCheck
                };
            } else {
                console.log('❌ Connection test failed');
                return {
                    success: false,
                    message: 'Backend connection failed',
                    details: healthCheck
                };
            }
        } catch (error) {
            console.error('Connection test error:', error);
            return {
                success: false,
                message: 'Connection test error: ' + error.message,
                error: error.message
            };
        }
    }

    // NEW: Get backend status summary
    async getStatusSummary() {
        try {
            const capabilities = await this.getProcessingCapabilities();
            const healthCheck = await this.performHealthCheck();

            return {
                initialized: this.isInitialized,
                connected: healthCheck.success,
                backend_url: this.baseUrl,
                status: healthCheck.status || 'unknown',
                capabilities: capabilities,
                last_check: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting status summary:', error);
            return {
                initialized: this.isInitialized,
                connected: false,
                backend_url: this.baseUrl,
                status: 'error',
                error: error.message,
                last_check: new Date().toISOString()
            };
        }
    }

    cleanup() {
        console.log('Backend processor cleanup completed');
        // Add any cleanup logic here if needed
        this.isInitialized = false;
        this.baseUrl = null;
    }
}

module.exports = BackendProcessor;
