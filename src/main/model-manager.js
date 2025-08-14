const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { BACKEND_CONFIG } = require('../config/backend-config');

class ModelManager {
    constructor() {
        this.modelsDir = path.join(__dirname, '../../models');
        this.tempDir = path.join(__dirname, '../../temp');

        // Ensure directories exist
        fs.ensureDirSync(this.modelsDir);
        fs.ensureDirSync(this.tempDir);
    }

    async checkModelsExist() {
        try {
            const yoloDir = path.join(this.modelsDir, 'yolo');
            const datasetDir = path.join(this.modelsDir, 'datasets');

            // Check if essential model files exist
            const yoloExists = await fs.pathExists(path.join(yoloDir, 'model.weights'));
            const configExists = await fs.pathExists(path.join(yoloDir, 'config.json'));

            return yoloExists && configExists;
        } catch (error) {
            console.error('Error checking models:', error);
            return false;
        }
    }

    async downloadModels(progressCallback) {
        try {
            console.log('Starting model download...');

            // First, get model info from backend
            const modelInfo = await this.getModelInfo();

            if (!modelInfo) {
                throw new Error('Could not retrieve model information from backend');
            }

            // Download YOLO model
            await this.downloadYoloModel(modelInfo.yolo, progressCallback);

            // Download any additional datasets
            if (modelInfo.datasets) {
                await this.downloadDatasets(modelInfo.datasets, progressCallback);
            }

            // Save model configuration
            await this.saveModelConfig(modelInfo);

            console.log('Model download completed successfully');

        } catch (error) {
            console.error('Model download failed:', error);
            throw error;
        }
    }

    async getModelInfo() {
        try {
            // Try production URL first, then local
            const urls = [BACKEND_CONFIG.RENDER_URL, BACKEND_CONFIG.LOCAL_URL];

            for (const baseUrl of urls) {
                try {
                    const response = await axios.get(
                        `${baseUrl}${BACKEND_CONFIG.ENDPOINTS.MODEL_INFO}`,
                        { timeout: BACKEND_CONFIG.TIMEOUT }
                    );

                    if (response.data) {
                        console.log(`Connected to backend at: ${baseUrl}`);
                        return response.data;
                    }
                } catch (error) {
                    console.log(`Failed to connect to ${baseUrl}`);
                    continue;
                }
            }

            throw new Error('Could not connect to any backend server');

        } catch (error) {
            console.error('Error getting model info:', error);
            throw error;
        }
    }

    async downloadYoloModel(yoloInfo, progressCallback) {
        const yoloDir = path.join(this.modelsDir, 'yolo');
        await fs.ensureDir(yoloDir);

        // Download model weights
        if (yoloInfo.weightsUrl) {
            await this.downloadFile(
                yoloInfo.weightsUrl,
                path.join(yoloDir, 'model.weights'),
                (progress) => progressCallback({
                    stage: 'Downloading YOLO weights',
                    progress: progress * 0.7 // 70% of total progress
                })
            );
        }

        // Download model configuration
        if (yoloInfo.configUrl) {
            await this.downloadFile(
                yoloInfo.configUrl,
                path.join(yoloDir, 'config.json'),
                (progress) => progressCallback({
                    stage: 'Downloading YOLO config',
                    progress: 70 + (progress * 0.2) // 20% of total progress
                })
            );
        }

        // Download class names
        if (yoloInfo.classesUrl) {
            await this.downloadFile(
                yoloInfo.classesUrl,
                path.join(yoloDir, 'classes.txt'),
                (progress) => progressCallback({
                    stage: 'Downloading class names',
                    progress: 90 + (progress * 0.1) // 10% of total progress
                })
            );
        }
    }

    async downloadDatasets(datasetsInfo, progressCallback) {
        const datasetDir = path.join(this.modelsDir, 'datasets');
        await fs.ensureDir(datasetDir);

        // Download any additional datasets or reference data
        for (const dataset of datasetsInfo) {
            if (dataset.url) {
                const filename = dataset.name || path.basename(dataset.url);
                await this.downloadFile(
                    dataset.url,
                    path.join(datasetDir, filename),
                    (progress) => progressCallback({
                        stage: `Downloading ${filename}`,
                        progress: 95 + (progress * 0.05)
                    })
                );
            }
        }
    }

    async downloadFile(url, destination, progressCallback) {
        try {
            console.log(`Downloading: ${url} -> ${destination}`);

            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream',
                timeout: BACKEND_CONFIG.TIMEOUT * 3 // Longer timeout for downloads
            });

            const totalLength = parseInt(response.headers['content-length'], 10);
            let downloadedLength = 0;

            const writer = fs.createWriteStream(destination);

            response.data.on('data', (chunk) => {
                downloadedLength += chunk.length;
                if (totalLength && progressCallback) {
                    const progress = (downloadedLength / totalLength) * 100;
                    progressCallback(progress);
                }
            });

            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

        } catch (error) {
            console.error(`Download failed for ${url}:`, error);
            throw error;
        }
    }

    async saveModelConfig(modelInfo) {
        const configPath = path.join(this.modelsDir, 'model-config.json');

        const config = {
            version: modelInfo.version || '1.0.0',
            downloadDate: new Date().toISOString(),
            yolo: modelInfo.yolo,
            datasets: modelInfo.datasets || [],
            offline: true
        };

        await fs.writeJson(configPath, config, { spaces: 2 });
        console.log('Model configuration saved');
    }

    async getLocalModelConfig() {
        try {
            const configPath = path.join(this.modelsDir, 'model-config.json');
            return await fs.readJson(configPath);
        } catch (error) {
            console.error('Error reading local model config:', error);
            return null;
        }
    }

    getModelsDirectory() {
        return this.modelsDir;
    }

    getTempDirectory() {
        return this.tempDir;
    }
}

module.exports = ModelManager;
