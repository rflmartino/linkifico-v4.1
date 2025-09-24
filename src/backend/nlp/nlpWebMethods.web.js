import { Permissions, webMethod } from 'wix-web-module';
import { Logger } from '../logger.js';
import { 
    performNLPTraining,
    initializeNLPSystem,
    testNLPSystem,
    processSingleInput,
    testNLPFeatures as testNLPFeaturesHelper,
    forceRetrainNLP as forceRetrainNLPHelper,
    getNLPModelInfo as getNLPModelInfoHelper,
    getModelStatus,
    performHealthCheck
} from './nlpTrainingHelpers.js';

export const trainNLPModel = webMethod(Permissions.Anyone, async () => {
    try {
        Logger.log('nlpWebMethods', 'trainNLPModel', 'start');
        Logger.log('nlpWebMethods', 'trainNLPModel', 'Calling performNLPTraining...');
        const result = await performNLPTraining();
        Logger.log('nlpWebMethods', 'trainNLPModel', 'success', result);
        return result;
    } catch (e) {
        Logger.error('nlpWebMethods', 'trainNLPModel', 'ERROR:', e);
        Logger.error('nlpWebMethods', 'trainNLPModel', `Error message: ${e.message}`);
        return { success: false, message: e.message };
    }
});

export const getNLPModelStatus = webMethod(Permissions.Anyone, async () => {
    try {
        Logger.log('nlpWebMethods', 'getNLPModelStatus', 'start');
        Logger.log('nlpWebMethods', 'getNLPModelStatus', 'Calling getModelStatus from nlpStatusOnly.js...');
        const result = await getModelStatus();
        Logger.log('nlpWebMethods', 'getNLPModelStatus', 'success', result);
        Logger.log('nlpWebMethods', 'getNLPModelStatus', `Result type: ${typeof result}, success: ${result.success}`);
        return result;
    } catch (e) {
        Logger.error('nlpWebMethods', 'getNLPModelStatus', 'ERROR:', e);
        Logger.error('nlpWebMethods', 'getNLPModelStatus', `Error message: ${e.message}`);
        Logger.error('nlpWebMethods', 'getNLPModelStatus', `Error stack: ${e.stack}`);
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

