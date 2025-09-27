// nodeNlpWebMethods.web.js - Web methods for Node-NLP management

import { webMethod, Permissions } from 'wix-web-module';
import { Logger } from '../logger';
import nodeNlpManager from './nodeNlpManager';

export const initializeNlpSystem = webMethod(Permissions.Anyone, async () => {
    try {
        Logger.info('nodeNlpWebMethods', 'initializeNlpSystem', 'Initializing NLP system');
        
        await nodeNlpManager.initialize();
        const status = nodeNlpManager.getStatus();
        
        return {
            success: true,
            message: 'NLP system initialized successfully',
            status: status
        };
        
    } catch (error) {
        Logger.error('nodeNlpWebMethods', 'initializeNlpSystem', error);
        return {
            success: false,
            error: error.message
        };
    }
});

export const trainNlpModel = webMethod(Permissions.Anyone, async () => {
    try {
        Logger.info('nodeNlpWebMethods', 'trainNlpModel', 'Training NLP model');
        
        const success = await nodeNlpManager.train();
        
        if (success) {
            return {
                success: true,
                message: 'Model trained successfully',
                status: nodeNlpManager.getStatus()
            };
        } else {
            return {
                success: false,
                error: 'Training failed'
            };
        }
        
    } catch (error) {
        Logger.error('nodeNlpWebMethods', 'trainNlpModel', error);
        return {
            success: false,
            error: error.message
        };
    }
});

export const testNlpModel = webMethod(Permissions.Anyone, async () => {
    try {
        Logger.info('nodeNlpWebMethods', 'testNlpModel', 'Testing NLP model');
        
        const results = await nodeNlpManager.testModel();
        
        return {
            success: true,
            results: results,
            totalTests: results.length,
            successfulTests: results.filter(r => r.confidence > 0.5).length
        };
        
    } catch (error) {
        Logger.error('nodeNlpWebMethods', 'testNlpModel', error);
        return {
            success: false,
            error: error.message
        };
    }
});

export const processNlpInput = webMethod(Permissions.Anyone, async (input) => {
    try {
        if (!input) {
            return {
                success: false,
                error: 'Input is required'
            };
        }
        
        Logger.info('nodeNlpWebMethods', 'processNlpInput', `Processing input: ${input}`);
        
        const result = await nodeNlpManager.processInput(input);
        
        return {
            success: true,
            result: result
        };
        
    } catch (error) {
        Logger.error('nodeNlpWebMethods', 'processNlpInput', error);
        return {
            success: false,
            error: error.message
        };
    }
});

export const getNlpModelStatus = webMethod(Permissions.Anyone, async () => {
    try {
        Logger.info('nodeNlpWebMethods', 'getNlpModelStatus', 'Getting NLP model status');
        
        const status = nodeNlpManager.getStatus();
        
        return {
            success: true,
            status: status
        };
        
    } catch (error) {
        Logger.error('nodeNlpWebMethods', 'getNlpModelStatus', error);
        return {
            success: false,
            error: error.message
        };
    }
});
