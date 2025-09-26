// nodeNlpWebMethods.web.js - Web methods for Node-NLP admin interface
// Exposes training, testing, and status functions to the frontend

import { webMethod, Permissions } from 'wix-web-module';
import { nodeNlpManager } from './nodeNlpManager';
import { Logger } from '../logger';

// Get model status
export const getNlpModelStatus = webMethod(Permissions.Anyone, async () => {
    try {
        Logger.info('nodeNlpWebMethods', 'getNlpModelStatus', 'Getting model status');
        
        const status = await nodeNlpManager.getModelStatus();
        
        return {
            success: true,
            status: status,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        Logger.error('nodeNlpWebMethods', 'getNlpModelStatus', error);
        return {
            success: false,
            error: error.message,
            status: {
                status: 'error',
                version: '0.0.0',
                lastTraining: null,
                trainingExamples: 0
            }
        };
    }
});

// Train the model
export const trainNlpModel = webMethod(Permissions.Anyone, async () => {
    try {
        Logger.info('nodeNlpWebMethods', 'trainNlpModel', 'Starting model training');
        
        const result = await nodeNlpManager.trainWithMinimalData();
        
        return {
            success: result.success,
            message: result.message,
            trainingTime: result.trainingTime,
            version: result.version,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        Logger.error('nodeNlpWebMethods', 'trainNlpModel', error);
        return {
            success: false,
            message: 'Training failed: ' + error.message,
            timestamp: new Date().toISOString()
        };
    }
});

// Test the model
export const testNlpModel = webMethod(Permissions.Anyone, async () => {
    try {
        Logger.info('nodeNlpWebMethods', 'testNlpModel', 'Starting model testing');
        
        const result = await nodeNlpManager.testModel();
        
        return {
            success: result.success,
            results: result.results,
            totalTests: result.totalTests,
            passedTests: result.passedTests,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        Logger.error('nodeNlpWebMethods', 'testNlpModel', error);
        return {
            success: false,
            error: error.message,
            results: [],
            timestamp: new Date().toISOString()
        };
    }
});

// Process single input
export const processNlpInput = webMethod(Permissions.Anyone, async (input) => {
    try {
        if (!input || typeof input !== 'string') {
            return {
                success: false,
                error: 'Input required',
                timestamp: new Date().toISOString()
            };
        }
        
        Logger.info('nodeNlpWebMethods', 'processNlpInput', `Processing: "${input}"`);
        
        const result = await nodeNlpManager.processInput(input);
        
        return {
            success: result.success,
            intent: result.intent,
            confidence: result.confidence,
            processingTime: result.processingTime,
            originalText: result.originalText,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        Logger.error('nodeNlpWebMethods', 'processNlpInput', error);
        return {
            success: false,
            error: error.message,
            originalText: input,
            timestamp: new Date().toISOString()
        };
    }
});

// Initialize the system
export const initializeNlpSystem = webMethod(Permissions.Anyone, async () => {
    try {
        Logger.info('nodeNlpWebMethods', 'initializeNlpSystem', 'Initializing NLP system');
        
        const result = await nodeNlpManager.initialize();
        
        return {
            success: result.success,
            message: result.message,
            wasTraining: result.wasTraining,
            version: result.version,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        Logger.error('nodeNlpWebMethods', 'initializeNlpSystem', error);
        return {
            success: false,
            message: 'Initialization failed: ' + error.message,
            timestamp: new Date().toISOString()
        };
    }
});
