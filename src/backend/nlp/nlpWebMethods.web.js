import { Permissions, webMethod } from 'wix-web-module';
import { Logger } from 'backend/logger';
import { 
    performNLPTraining,
    initializeNLPSystem,
    testNLPSystem,
    getModelStatus,
    processSingleInput,
    performHealthCheck
} from 'backend/nlp/nlpTrainingHelpers';

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


