// nlpManager.js - PERMANENT Model Storage (No TTL)
// Your trained model will persist forever in Redis

// @ts-ignore - no types
// Use ES6 import syntax instead of require
import { NlpManager } from 'node-nlp';
import { createClient } from 'redis';
import { getSecret } from 'wix-secrets-backend';
import { Logger } from '../logger.js';

class LinkificoNLPManager {
    constructor() {
        this.redis = null;
        this.nlpManager = null;
        this.modelKey = 'linkifico:nlp:model:permanent';  // Changed key for permanence
        this.modelVersionKey = 'linkifico:nlp:version:permanent';
        this.modelBackupKey = 'linkifico:nlp:model:backup'; // Backup copy
        this.currentVersion = '1.0.5'; // Increment to save permanent version WITH NEW FEATURES
        this.confidenceThreshold = 0.7;
        this.isInitialized = false;
        this.isTraining = false;
        this.isModelTrained = false;
    }

    /**
     * Initialize Redis connection and NLP Manager
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            Logger.log('nlpManager', 'initialize', 'Starting NLP Manager initialization');

            // Initialize Redis connection
            Logger.log('nlpManager', 'initialize', 'Initializing Redis connection');
            await this.initRedis();
            Logger.log('nlpManager', 'initialize', 'Redis connection established');

            // Initialize NLP Manager with NO FILE SYSTEM settings
            Logger.log('nlpManager', 'initialize', 'Creating NlpManager instance');
            this.nlpManager = new NlpManager({
                languages: ['en'],
                forceNER: true,
                autoSave: false,  // CRITICAL: Disable auto-save to file system
                autoLoad: false,  // CRITICAL: Disable auto-load from file system
                modelFileName: false, // CRITICAL: No model file
                nlu: {
                    useNoneFeature: true,
                    log: false
                },
                ner: {
                    useDuckling: false, // Disable external dependencies
                    useBuiltins: true
                }
            });

            // Try to load existing model from Redis
            console.log('[NLP-MANAGER] Attempting to load existing model from Redis...');
            const modelLoaded = await this.loadModel();
            console.log(`[NLP-MANAGER] Model load result: ${modelLoaded}`);
            
            if (!modelLoaded) {
                Logger.log('nlpManager', 'initialize', 'No existing model found, training new model');
                console.log('[NLP-MANAGER] No existing model found, starting training...');
                await this.trainModel(); // Train immediately if no model exists
                console.log('[NLP-MANAGER] Training completed');
            }

            this.isInitialized = true;
            Logger.log('nlpManager', 'initialize', 'NLP Manager initialized successfully');
            console.log('[NLP-MANAGER] Initialization completed successfully');

        } catch (error) {
            Logger.error('nlpManager', 'initialize', error);
            throw error;
        }
    }

    /**
     * Initialize Redis connection
     */
    async initRedis() {
        try {
            if (!this.redis) {
                console.log('[NLP-MANAGER] Getting Redis connection URL from secrets...');
                const redisUrl = await getSecret('REDIS_CONNECTION_URL');
                console.log(`[NLP-MANAGER] Redis URL obtained: ${redisUrl ? 'YES' : 'NO'}`);
                
                console.log('[NLP-MANAGER] Creating Redis client...');
                this.redis = createClient({
                    url: redisUrl
                });
                
                console.log('[NLP-MANAGER] Connecting to Redis...');
                await this.redis.connect();
                console.log('[NLP-MANAGER] Redis connection successful');
                Logger.log('nlpManager', 'initRedis', 'Redis connected for NLP storage');
            }
        } catch (error) {
            console.log(`[NLP-MANAGER] Redis connection failed: ${error.message}`);
            Logger.error('nlpManager', 'initRedis', error);
            throw error;
        }
    }

    /**
     * Train the NLP model with minimal training data
     */
    async trainModel() {
        if (this.isTraining) {
            Logger.warn('nlpManager', 'trainModel', 'Training already in progress');
            return false;
        }

        try {
            this.isTraining = true;
            this.isModelTrained = false;
            Logger.log('nlpManager', 'trainModel', 'Starting NLP model training');

            // Create fresh NLP manager for training - NO FILE SYSTEM
            this.nlpManager = new NlpManager({
                languages: ['en'],
                forceNER: true,
                autoSave: false,      // NO file save
                autoLoad: false,      // NO file load
                modelFileName: false, // NO model file
                nlu: {
                    useNoneFeature: true,
                    log: false
                },
                ner: {
                    useDuckling: false,
                    useBuiltins: true
                }
            });

            // Minimal training data for testing
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

            // Add basic responses
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

            Logger.log('nlpManager', 'trainModel', `Added ${trainingData.length} training examples`);

            // TRAIN the model - this should NOT try to save to file system
            const startTime = Date.now();
            await this.nlpManager.train();
            const trainingTime = Date.now() - startTime;

            // Mark as trained
            this.isModelTrained = true;

            Logger.log('nlpManager', 'trainModel', `Training completed in ${trainingTime}ms`);

            // Test the model immediately after training
            const testResult = await this.testModelAfterTraining();
            Logger.log('nlpManager', 'trainModel', `Post-training test: ${testResult}`);

            // Save model to Redis PERMANENTLY
            await this.saveModel();

            this.isTraining = false;
            return true;

        } catch (error) {
            this.isTraining = false;
            this.isModelTrained = false;
            Logger.error('nlpManager', 'trainModel', error);
            throw error;
        }
    }

    /**
     * Test model immediately after training
     */
    async testModelAfterTraining() {
        try {
            const testPhrases = [
                'create a new project',
                'add tasks',
                'yes looks good'
            ];

            const results = [];
            for (const phrase of testPhrases) {
                const result = await this.nlpManager.process('en', phrase);
                results.push(`"${phrase}" -> ${result.intent} (${(result.score * 100).toFixed(1)}%)`);
            }
            
            return results.join('; ');
        } catch (error) {
            return `Test failed: ${error.message}`;
        }
    }

    /**
     * Save trained model to Redis PERMANENTLY (NO TTL)
     */
    async saveModel() {
        try {
            if (!this.nlpManager || !this.isModelTrained) {
                throw new Error('NLP Manager not trained');
            }

            await this.initRedis();

            // Export model as JSON (in-memory only)
            const modelData = this.nlpManager.export(true); // minified = true
            
            Logger.log('nlpManager', 'saveModel', `Exporting model data (${modelData.length} chars)`);
            
            // PERMANENT STORAGE - NO TTL!
            await this.redis.set(this.modelKey, modelData); // NO EXPIRATION
            await this.redis.set(this.modelVersionKey, this.currentVersion); // NO EXPIRATION
            
            // Also create a backup copy
            await this.redis.set(this.modelBackupKey, modelData); // NO EXPIRATION
            
            // Set a timestamp for when model was saved
            await this.redis.set('linkifico:nlp:last_saved', new Date().toISOString());

            Logger.log('nlpManager', 'saveModel', `Model saved PERMANENTLY to Redis (version ${this.currentVersion}) - NO EXPIRATION`);
            return true;

        } catch (error) {
            Logger.error('nlpManager', 'saveModel', error);
            return false;
        }
    }

    /**
     * Load model from Redis PERMANENT storage
     */
    async loadModel() {
        try {
            await this.initRedis();

            // Check if model exists in Redis
            const modelData = await this.redis.get(this.modelKey);
            if (!modelData) {
                Logger.log('nlpManager', 'loadModel', 'No permanent model found in Redis');
                
                // Try backup
                const backupData = await this.redis.get(this.modelBackupKey);
                if (backupData) {
                    Logger.log('nlpManager', 'loadModel', 'Found backup model, using that');
                    // Restore from backup
                    await this.redis.set(this.modelKey, backupData);
                    return await this.loadModel(); // Recursive call to load restored model
                }
                
                return false;
            }

            // Check version
            const savedVersion = await this.redis.get(this.modelVersionKey);
            if (savedVersion !== this.currentVersion) {
                Logger.log('nlpManager', 'loadModel', 
                    `Version mismatch (saved: ${savedVersion}, current: ${this.currentVersion}), will retrain`);
                return false;
            }

            // Create fresh NLP manager for loading - NO FILE SYSTEM
            this.nlpManager = new NlpManager({
                languages: ['en'],
                forceNER: true,
                autoSave: false,      // NO file save
                autoLoad: false,      // NO file load
                modelFileName: false, // NO model file
                nlu: {
                    useNoneFeature: true,
                    log: false
                },
                ner: {
                    useDuckling: false,
                    useBuiltins: true
                }
            });

            // Import the model from Redis data
            this.nlpManager.import(modelData);
            this.isModelTrained = true;
            
            Logger.log('nlpManager', 'loadModel', 'PERMANENT model loaded successfully from Redis');
            
            // Test loaded model
            const testResult = await this.testModelAfterTraining();
            Logger.log('nlpManager', 'loadModel', `Post-load test: ${testResult}`);
            
            return true;

        } catch (error) {
            Logger.error('nlpManager', 'loadModel', error);
            this.isModelTrained = false;
            return false;
        }
    }

    /**
     * Process user input and return intent analysis
     */
    async processInput(text, sessionContext = {}) {
        try {
            // Ensure model is ready
            await this.ensureModelReady();

            if (!this.nlpManager || !this.isModelTrained) {
                throw new Error('NLP Manager not available or not trained');
            }

            Logger.log('nlpManager', 'processInput', `Processing: "${text}"`);

            // Process the input
            const result = await this.nlpManager.process('en', text);
            
            Logger.log('nlpManager', 'processInput', `Raw result: intent=${result.intent}, score=${result.score}`);
            
            // Extract relevant information
            const analysis = {
                originalText: text,
                intent: result.intent,
                confidence: result.score,
                entities: result.entities || [],
                sentiment: result.sentiment,
                answer: result.answer,
                
                // Map to our action system
                mappedIntent: null,
                mappedAction: null,
                isHighConfidence: result.score >= this.confidenceThreshold,
                
                // Additional context
                language: result.language,
                domain: result.domain,
                classifications: result.classifications || []
            };

            Logger.log('nlpManager', 'processInput', {
                text: text.substring(0, 50) + '...',
                intent: analysis.intent,
                confidence: analysis.confidence
            });

            return analysis;

        } catch (error) {
            Logger.error('nlpManager', 'processInput', error);
            
            // Return fallback analysis
            return {
                originalText: text,
                intent: 'general.help',
                confidence: 0.3,
                entities: [],
                sentiment: { score: 0, comparative: 0, vote: 'neutral' },
                answer: 'I\'ll help you with that.',
                mappedIntent: 'GENERAL_INQUIRY',
                mappedAction: 'QUERY',
                isHighConfidence: false,
                error: error.message
            };
        }
    }

    /**
     * Ensure model is ready for processing
     */
    async ensureModelReady() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // If no model is trained, train one
        if (!this.nlpManager || !this.isModelTrained) {
            Logger.log('nlpManager', 'ensureModelReady', 'No trained model available, training now');
            await this.trainModel();
        }
    }

    /**
     * Check if the model has been trained
     */
    hasTrainedModel() {
        return this.isModelTrained && this.nlpManager;
    }

    /**
     * Force retrain the model (for updates or testing)
     */
    async forceRetrain() {
        try {
            Logger.log('nlpManager', 'forceRetrain', 'Force retraining model');
            
            // Clear existing model
            this.nlpManager = null;
            this.isModelTrained = false;
            await this.trainModel();
            
            return true;
        } catch (error) {
            Logger.error('nlpManager', 'forceRetrain', error);
            return false;
        }
    }

    /**
     * Get model statistics
     */
    async getModelStats() {
        try {
            await this.ensureModelReady();

            const stats = {
                isReady: this.hasTrainedModel(),
                version: this.currentVersion,
                totalExamples: 10,
                totalIntents: 10,
                confidenceThreshold: this.confidenceThreshold,
                lastTrainingTime: new Date().toISOString(),
                categories: 1,
                modelTrained: this.isModelTrained,
                fileSystemUsed: false,  // We don't use file system
                permanentStorage: true,  // Model stored permanently
                newFeatures: {
                    sentimentAnalysis: false,
                    stateResponsePatterns: false,
                    stateResponseTemplates: false
                }
            };

            return stats;

        } catch (error) {
            Logger.error('nlpManager', 'getModelStats', error);
            return { isReady: false, error: error.message };
        }
    }

    /**
     * Test the model with sample inputs
     */
    async testModel() {
        try {
            await this.ensureModelReady();

            const testCases = [
                'create a new project',
                'add some tasks',
                'set budget to 5000',
                'yes that looks good',
                'no change it',
                'what is the status',
                'help me'
            ];

            const results = [];
            for (const testCase of testCases) {
                const result = await this.processInput(testCase);
                results.push({
                    input: testCase,
                    intent: result.intent,
                    confidence: result.confidence,
                    mapped: result.mappedIntent
                });
            }

            Logger.log('nlpManager', 'testModel', `Tested ${testCases.length} cases`);
            return results;

        } catch (error) {
            Logger.error('nlpManager', 'testModel', error);
            return [];
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            if (this.redis) {
                await this.redis.quit();
                this.redis = null;
            }
            this.nlpManager = null;
            this.isInitialized = false;
            this.isModelTrained = false;
            Logger.log('nlpManager', 'cleanup', 'NLP Manager cleaned up');
        } catch (error) {
            Logger.error('nlpManager', 'cleanup', error);
        }
    }
}

// Export singleton instance
export default new LinkificoNLPManager();
