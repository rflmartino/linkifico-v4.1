import { Permissions, webMethod } from 'wix-web-module';
import { Logger } from '../logger.js';
import { 
    performNLPTraining,
    initializeNLPSystem,
    testNLPSystem,
    getModelStatus,
    processSingleInput,
    performHealthCheck,
    testNLPFeatures as testNLPFeaturesHelper,
    forceRetrainNLP as forceRetrainNLPHelper,
    getNLPModelInfo as getNLPModelInfoHelper
} from './nlpTrainingHelpers.js';

export const trainNLPModel = webMethod(Permissions.Anyone, async () => {
    try {
        Logger.info('nlpWebMethods', 'trainNLPModel');
        return await performNLPTraining();
    } catch (e) {
        Logger.error('nlpWebMethods', 'trainNLPModel', e);
        return { success: false, message: e.message };
    }
});

export const getNLPModelStatus = webMethod(Permissions.Anyone, async () => {
    try {
        return await getModelStatus();
    } catch (e) {
        return { success: false, error: e.message, stats: { isReady: false } };
    }
});

export const testNLPModel = webMethod(Permissions.Anyone, async (testInputs = null) => {
    try {
        return await testNLPSystem(testInputs);
    } catch (e) {
        return { success: false, error: e.message, results: [] };
    }
});

export const initializeNLP = webMethod(Permissions.Anyone, async () => {
    try {
        return await initializeNLPSystem();
    } catch (e) {
        return { success: false, message: e.message };
    }
});

export const processNLPInput = webMethod(Permissions.Anyone, async (input) => {
    try {
        return await processSingleInput(input);
    } catch (e) {
        return { success: false, error: e.message };
    }
});

export const nlpHealthCheck = webMethod(Permissions.Anyone, async () => {
    try {
        return await performHealthCheck();
    } catch (e) {
        return { success: false, error: e.message };
    }
});

export const testNLPFeatures = webMethod(Permissions.Anyone, async (feature = 'all') => {
    try {
        return await testNLPFeaturesHelper(feature);
    } catch (e) {
        return { success: false, error: e.message, results: [] };
    }
});

export const forceRetrainNLP = webMethod(Permissions.Anyone, async () => {
    try {
        return await forceRetrainNLPHelper();
    } catch (e) {
        return { success: false, message: 'Force retrain failed', error: e.message };
    }
});

export const getNLPModelInfo = webMethod(Permissions.Anyone, async () => {
    try {
        return await getNLPModelInfoHelper();
    } catch (e) {
        return { success: false, error: e.message };
    }
});

