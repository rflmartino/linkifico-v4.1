// nodeNlpManager.js - Node-NLP Manager for microfunctional model
// Handles training, storage, and prediction with Redis persistence

import { NlpManager } from 'node-nlp';
import { getRedisClient } from '../redisClient';
import { Logger } from '../logger';

const REDIS_KEYS = {
    MODEL: 'nlp:model',
    VERSION: 'nlp:version',
    TRAINING_DATA: 'nlp:training_data'
};

class NodeNlpManager {
    constructor() {
        this.nlpManager = null;
        this.isInitialized = false;
        this.isTrained = false;
        this.version = '1.0.0';
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            Logger.info('nodeNlpManager', 'initialize', 'Initializing Node-NLP manager');
            
            this.nlpManager = new NlpManager({ 
                languages: ['en'],
                forceNER: true,
                autoSave: false,
                autoLoad: false
            });

            // Try to load existing model
            const modelLoaded = await this.loadModel();
            if (!modelLoaded) {
                Logger.info('nodeNlpManager', 'initialize', 'No existing model found, will train new one');
            }

            this.isInitialized = true;
            Logger.info('nodeNlpManager', 'initialize', 'Node-NLP manager initialized successfully');
            
        } catch (error) {
            Logger.error('nodeNlpManager', 'initialize', error);
            throw error;
        }
    }

    async train() {
        try {
            Logger.info('nodeNlpManager', 'train', 'Starting model training');
            
            if (!this.nlpManager) {
                await this.initialize();
            }

            // Minimal training data
            const trainingData = [
                { text: 'create a new project', intent: 'project.create' },
                { text: 'add tasks to my project', intent: 'tasks.create' },
                { text: 'set budget to 10000', intent: 'budget.set' },
                { text: 'what is the project status', intent: 'project.status' },
                { text: 'yes that looks good', intent: 'response.positive' },
                { text: 'no change it', intent: 'response.negative' },
                { text: 'help me', intent: 'general.help' },
                { text: 'thanks', intent: 'general.thanks' },
                { text: 'show timeline', intent: 'timeline.query' },
                { text: 'add team member', intent: 'stakeholder.add' }
            ];

            // Add training data
            for (const example of trainingData) {
                this.nlpManager.addDocument('en', example.text, example.intent);
            }

            // Add responses
            this.nlpManager.addAnswer('en', 'project.create', 'I\'ll help you create a new project.');
            this.nlpManager.addAnswer('en', 'tasks.create', 'Let me add tasks to your project.');
            this.nlpManager.addAnswer('en', 'budget.set', 'I\'ll set your budget.');
            this.nlpManager.addAnswer('en', 'project.status', 'Here\'s your project status.');
            this.nlpManager.addAnswer('en', 'response.positive', 'Great! Let\'s continue.');
            this.nlpManager.addAnswer('en', 'response.negative', 'I\'ll make those changes.');
            this.nlpManager.addAnswer('en', 'general.help', 'I\'m here to help you.');
            this.nlpManager.addAnswer('en', 'general.thanks', 'You\'re welcome!');
            this.nlpManager.addAnswer('en', 'timeline.query', 'Here\'s your timeline.');
            this.nlpManager.addAnswer('en', 'stakeholder.add', 'I\'ll add a team member.');

            // Train the model
            await this.nlpManager.train();
            this.isTrained = true;

            // Save to Redis
            await this.saveModel();

            Logger.info('nodeNlpManager', 'train', 'Model training completed successfully');
            return true;

        } catch (error) {
            Logger.error('nodeNlpManager', 'train', error);
            throw error;
        }
    }

    async processInput(input) {
        try {
            if (!this.nlpManager || !this.isTrained) {
                await this.initialize();
            }

            const result = await this.nlpManager.process('en', input);
            
            return {
                intent: result.intent,
                confidence: result.score,
                answer: result.answer,
                entities: result.entities || []
            };

        } catch (error) {
            Logger.error('nodeNlpManager', 'processInput', error);
            return {
                intent: 'general.help',
                confidence: 0.1,
                answer: 'I\'m having trouble understanding that.',
                entities: []
            };
        }
    }

    async saveModel() {
        try {
            if (!this.nlpManager || !this.isTrained) {
                throw new Error('No trained model to save');
            }

            const redis = getRedisClient();
            const modelData = this.nlpManager.export(true);
            
            await redis.set(REDIS_KEYS.MODEL, modelData);
            await redis.set(REDIS_KEYS.VERSION, this.version);
            
            Logger.info('nodeNlpManager', 'saveModel', 'Model saved to Redis successfully');
            return true;

        } catch (error) {
            Logger.error('nodeNlpManager', 'saveModel', error);
            return false;
        }
    }

    async loadModel() {
        try {
            const redis = getRedisClient();
            const modelData = await redis.get(REDIS_KEYS.MODEL);
            
            if (!modelData) {
                Logger.info('nodeNlpManager', 'loadModel', 'No model found in Redis');
                return false;
            }

            if (!this.nlpManager) {
                this.nlpManager = new NlpManager({ 
                    languages: ['en'],
                    forceNER: true,
                    autoSave: false,
                    autoLoad: false
                });
            }

            this.nlpManager.import(modelData);
            this.isTrained = true;
            
            Logger.info('nodeNlpManager', 'loadModel', 'Model loaded from Redis successfully');
            return true;

        } catch (error) {
            Logger.error('nodeNlpManager', 'loadModel', error);
            return false;
        }
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isTrained: this.isTrained,
            version: this.version,
            hasModel: !!this.nlpManager
        };
    }

    async testModel() {
        try {
            const testCases = [
                'create a new project',
                'add tasks',
                'set budget to 5000',
                'yes that looks good',
                'help me'
            ];

            const results = [];
            for (const testCase of testCases) {
                const result = await this.processInput(testCase);
                results.push({
                    input: testCase,
                    intent: result.intent,
                    confidence: result.confidence
                });
            }

            return results;

        } catch (error) {
            Logger.error('nodeNlpManager', 'testModel', error);
            return [];
        }
    }
}

export default new NodeNlpManager();
