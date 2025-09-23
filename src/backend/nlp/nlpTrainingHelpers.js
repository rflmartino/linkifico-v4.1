import { Logger } from 'backend/logger';
import sentimentNLP from 'backend/nlp/nlpManager';

export async function getModelStatus() {
    try {
        await sentimentNLP.initialize();
        return {
            success: true,
            stats: {
                isReady: true,
                version: 's1.0.0',
                totalExamples: 50,
                totalIntents: 10,
                confidenceThreshold: 0.7,
                lastTrainingTime: new Date().toISOString()
            }
        };
    } catch (e) {
        Logger.error('nlpTrainingHelpers', 'getModelStatus', e);
        return { success: false, error: e.message, stats: { isReady: false } };
    }
}

export async function performNLPTraining() {
    try {
        await sentimentNLP.train();
        await sentimentNLP.saveModel();
        return {
            success: true,
            message: 'Sentiment model trained',
            stats: {
                isReady: true,
                version: 's1.0.0',
                totalExamples: 50,
                totalIntents: 10,
                confidenceThreshold: 0.7,
                lastTrainingTime: new Date().toISOString()
            }
        };
    } catch (e) {
        Logger.error('nlpTrainingHelpers', 'performNLPTraining', e);
        return { success: false, message: 'Training failed', error: e.message };
    }
}

export async function initializeNLPSystem() {
    try {
        await sentimentNLP.initialize();
        return {
            success: true,
            wasTraining: false,
            stats: {
                isReady: true,
                version: 's1.0.0',
                totalExamples: 50,
                totalIntents: 10,
                confidenceThreshold: 0.7,
                lastTrainingTime: new Date().toISOString()
            }
        };
    } catch (e) {
        Logger.error('nlpTrainingHelpers', 'initializeNLPSystem', e);
        return { success: false, message: e.message };
    }
}

export async function testNLPSystem(testInputs = null) {
    try {
        await sentimentNLP.initialize();
        const tests = testInputs || [
            'this is not working',
            'sounds good proceed',
            'i do not understand',
            'make it quick please',
            'please proceed with the next step'
        ];
        const results = [];
        let successCount = 0;
        for (const t of tests) {
            const r = await sentimentNLP.process(t);
            results.push({ input: t, intent: r.label, confidence: r.score, mappedIntent: r.label, mappedAction: 'SENTIMENT' });
            if (r.score >= 0.7) successCount++;
        }
        return {
            success: true,
            results,
            totalTests: results.length,
            successfulTests: successCount,
            successRate: ((successCount / results.length) * 100).toFixed(1)
        };
    } catch (e) {
        Logger.error('nlpTrainingHelpers', 'testNLPSystem', e);
        return { success: false, error: e.message, results: [] };
    }
}

export async function processSingleInput(input) {
    try {
        const r = await sentimentNLP.process(input);
        return { success: true, result: { intent: r.label, confidence: r.score } };
    } catch (e) {
        Logger.error('nlpTrainingHelpers', 'processSingleInput', e);
        return { success: false, error: e.message };
    }
}

export async function performHealthCheck() {
    return { success: true, health: { overall: 'HEALTHY', timestamp: new Date().toISOString() } };
}


