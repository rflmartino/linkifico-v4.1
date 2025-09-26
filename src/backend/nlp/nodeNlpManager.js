// nodeNlpManager.js - Node-NLP Manager for microfunctional model
// Handles training, storage, and prediction with Redis persistence

import { NlpManager } from 'node-nlp';
import { getRedisClient } from '../redisClient';
import { Logger } from '../logger';

const REDIS_KEYS = {
    MODEL: 'nlp:model',
    VERSION: 'nlp:version',
    STATUS: 'nlp:status'
};

export class NodeNlpManager {
    constructor() {
        this.manager = new NlpManager({ languages: ['en'] });
        this.isInitialized = false;
        this.modelVersion = '1.0.0';
        Logger.info('nodeNlpManager', 'constructor', 'Node-NLP Manager initialized');
    }

    // Initialize the manager and load existing model
    async initialize() {
        try {
            Logger.info('nodeNlpManager', 'initialize', 'Starting initialization');
            
            // Try to load existing model from Redis
            const existingModel = await this.loadModelFromRedis();
            if (existingModel) {
                Logger.info('nodeNlpManager', 'initialize', 'Loaded existing model from Redis');
                this.isInitialized = true;
                return { success: true, message: 'Model loaded from Redis', wasTraining: false };
            }

            // If no existing model, train with minimal data
            Logger.info('nodeNlpManager', 'initialize', 'No existing model found, training with minimal data');
            const trainingResult = await this.trainWithMinimalData();
            
            this.isInitialized = true;
            return trainingResult;
            
        } catch (error) {
            Logger.error('nodeNlpManager', 'initialize', error);
            return { success: false, message: 'Initialization failed: ' + error.message };
        }
    }

    // Train with minimal data for testing
    async trainWithMinimalData() {
        try {
            Logger.info('nodeNlpManager', 'trainWithMinimalData', 'Starting minimal training');
            
            // Clear existing model
            this.manager = new NlpManager({ languages: ['en'] });
            
            // Add minimal training data
            this.addMinimalTrainingData();
            
            // Train the model
            const startTime = Date.now();
            await this.manager.train();
            const trainingTime = Date.now() - startTime;
            
            // Save to Redis
            await this.saveModelToRedis();
            
            Logger.info('nodeNlpManager', 'trainWithMinimalData', `Training completed in ${trainingTime}ms`);
            
            return {
                success: true,
                message: `Model trained with minimal data in ${trainingTime}ms`,
                wasTraining: true,
                trainingTime: trainingTime,
                version: this.modelVersion
            };
            
        } catch (error) {
            Logger.error('nodeNlpManager', 'trainWithMinimalData', error);
            return { success: false, message: 'Training failed: ' + error.message };
        }
    }

    // Add minimal training data
    addMinimalTrainingData() {
        // Project creation intents
        this.manager.addDocument('en', 'create a new project', 'project_creation');
        this.manager.addDocument('en', 'start new project', 'project_creation');
        this.manager.addDocument('en', 'create a hardware store project', 'project_creation');
        this.manager.addDocument('en', 'create a mobile app project', 'project_creation');
        
        // Task management intents
        this.manager.addDocument('en', 'update task 3', 'task_update');
        this.manager.addDocument('en', 'mark task complete', 'task_update');
        this.manager.addDocument('en', 'task is done', 'task_update');
        
        // Budget questions
        this.manager.addDocument('en', 'what is my budget', 'budget_question');
        this.manager.addDocument('en', 'budget range', 'budget_question');
        
        // Status checks
        this.manager.addDocument('en', 'project status', 'status_check');
        this.manager.addDocument('en', 'show me the timeline', 'status_check');
        
        Logger.info('nodeNlpManager', 'addMinimalTrainingData', 'Added 10 training examples');
    }

    // Process input and get prediction
    async processInput(text) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            const startTime = Date.now();
            const result = await this.manager.process('en', text);
            const processingTime = Date.now() - startTime;
            
            Logger.info('nodeNlpManager', 'processInput', `Processed "${text}" in ${processingTime}ms`);
            
            return {
                success: true,
                intent: result.intent,
                confidence: result.score,
                processingTime: processingTime,
                originalText: text
            };
            
        } catch (error) {
            Logger.error('nodeNlpManager', 'processInput', error);
            return {
                success: false,
                error: error.message,
                originalText: text
            };
        }
    }

    // Save model to Redis
    async saveModelToRedis() {
        try {
            const client = await getRedisClient();
            const modelData = this.manager.export();
            
            await client.set(REDIS_KEYS.MODEL, JSON.stringify(modelData));
            await client.set(REDIS_KEYS.VERSION, this.modelVersion);
            await client.set(REDIS_KEYS.STATUS, JSON.stringify({
                status: 'trained',
                version: this.modelVersion,
                lastTraining: new Date().toISOString(),
                trainingExamples: 10
            }));
            
            Logger.info('nodeNlpManager', 'saveModelToRedis', 'Model saved to Redis');
            
        } catch (error) {
            Logger.error('nodeNlpManager', 'saveModelToRedis', error);
            throw error;
        }
    }

    // Load model from Redis
    async loadModelFromRedis() {
        try {
            const client = await getRedisClient();
            const modelData = await client.get(REDIS_KEYS.MODEL);
            
            if (modelData) {
                const parsedModel = JSON.parse(modelData);
                this.manager.import(parsedModel);
                Logger.info('nodeNlpManager', 'loadModelFromRedis', 'Model loaded from Redis');
                return true;
            }
            
            return false;
            
        } catch (error) {
            Logger.error('nodeNlpManager', 'loadModelFromRedis', error);
            return false;
        }
    }

    // Get model status
    async getModelStatus() {
        try {
            const client = await getRedisClient();
            const statusData = await client.get(REDIS_KEYS.STATUS);
            
            if (statusData) {
                return JSON.parse(statusData);
            }
            
            return {
                status: 'not_trained',
                version: '0.0.0',
                lastTraining: null,
                trainingExamples: 0
            };
            
        } catch (error) {
            Logger.error('nodeNlpManager', 'getModelStatus', error);
            return {
                status: 'error',
                version: '0.0.0',
                lastTraining: null,
                trainingExamples: 0,
                error: error.message
            };
        }
    }

    // Test the model with sample inputs
    async testModel() {
        try {
            const testCases = [
                'create a new project',
                'update task 3',
                'what is my budget',
                'project status'
            ];
            
            const results = [];
            
            for (const testCase of testCases) {
                const result = await this.processInput(testCase);
                results.push({
                    input: testCase,
                    intent: result.intent,
                    confidence: result.confidence,
                    success: result.success
                });
            }
            
            Logger.info('nodeNlpManager', 'testModel', `Tested ${results.length} cases`);
            
            return {
                success: true,
                results: results,
                totalTests: results.length,
                passedTests: results.filter(r => r.success && r.confidence > 0.7).length
            };
            
        } catch (error) {
            Logger.error('nodeNlpManager', 'testModel', error);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }
}

// Export singleton instance
export const nodeNlpManager = new NodeNlpManager();
