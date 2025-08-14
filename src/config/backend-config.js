// config/backend-config.js
const BACKEND_CONFIG = {
    // Local development server
    LOCAL_URL: 'http://localhost:8000',

    // Production server (if deployed)
    RENDER_URL: 'https://airavat-backend-zlgv.onrender.com', // Update this with your actual URL

    // API endpoints
    ENDPOINTS: {
        HEALTH: '/api/health',

        // Single file processing
        DETECT_YOLO: '/api/detect-yolo',
        COMPARE_DATASET: '/api/compare-dataset',

        // Batch processing
        BATCH_YOLO: '/api/batch-yolo',
        BATCH_SIAMESE: '/api/batch-siamese',
        BATCH_COMBINED: '/api/batch-combined',

        // Download results from batch processing
        DOWNLOAD_BATCH: '/api/download-batch/:filename',

        // New: Prepare and download custom packages from frontend results
        PREPARE_DOWNLOAD_PACKAGE: '/api/prepare-download-package',
        DOWNLOAD_PREPARED_PACKAGE: '/api/download-prepared-package'
    },

    // Request settings
    TIMEOUT: 30000, // 30 seconds
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB for single images
    MAX_ZIP_SIZE: 200 * 1024 * 1024 * 1024, // 200GB for ZIP files

    // Supported formats
    SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif'],
    SUPPORTED_ARCHIVES: ['zip'],

    // Processing types
    PROCESSING_TYPES: {
        YOLO: 'yolo',
        DATASET_COMPARE: 'compare-dataset',
        COMBINED: 'combined',
        BATCH_YOLO: 'batch-yolo',
        BATCH_SIAMESE: 'batch-siamese',
        BATCH_COMBINED: 'batch-combined'
    },

    // Default options
    DEFAULT_OPTIONS: {
        confidence_threshold: 0.5,
        siamese_threshold: 0.85,
        max_workers: 4,
        enable_yolo: true,
        enable_siamese: true
    }
};

module.exports = { BACKEND_CONFIG };
