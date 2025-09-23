// NODE-NLP Access Page Controller
// Frontend interface for training and managing the NLP sentiment analysis model

import { 
    trainNLPModel, 
    getNLPModelStatus, 
    testNLPModel, 
    testNLPFeatures, 
    processNLPInput, 
    initializeNLP, 
    nlpHealthCheck, 
    forceRetrainNLP, 
    getNLPModelInfo 
} from 'backend/nlp/nlpWebMethods.web.js';

// Page-level variables
let isInitialized = false;
let currentModelStatus = null;
let testResults = null;

$w.onReady(function () {
    console.log('NODE-NLP Access page ready - initializing...');
    initializeNLPConsole();
    setupEventListeners();
});

/**
 * Initialize the NLP Console interface
 */
async function initializeNLPConsole() {
    try {
        console.log('Initializing NLP Console...');
        
        // Send initialization message to HTML console
        sendToNLPConsole('initialize', {
            title: 'NODE-NLP Sentiment Analysis Console',
            version: '1.0.5',
            features: ['Sentiment Analysis', 'State Response Patterns', 'Original Intent Recognition']
        });

        // Get initial model status
        await refreshModelStatus();
        
        // Perform health check
        await performHealthCheck();
        
        isInitialized = true;
        console.log('NLP Console initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize NLP Console:', error);
        sendToNLPConsole('error', { 
            message: 'Failed to initialize NLP Console', 
            error: error.message 
        });
    }
}

/**
 * Set up event listeners for HTML console interactions
 */
function setupEventListeners() {
    // Listen for messages from the HTML NLP Console
    $w('#htmlNLPConsole').onMessage((event) => {
        handleNLPConsoleMessage(event.data);
    });
    
    console.log('NLP Console event listeners set up');
}

/**
 * Handle messages from the HTML NLP Console
 */
async function handleNLPConsoleMessage(data) {
    try {
        if (!data || !data.action) {
            console.warn('Invalid message from NLP Console');
            return;
        }

        console.log('NLP Console action:', data.action);

        switch (data.action) {
            case 'ready':
                console.log('NLP Console UI is ready');
                break;
                
            case 'trainModel':
                await handleTrainModel();
                break;
                
            case 'testModel':
                await handleTestModel(data.testType || 'all');
                break;
                
            case 'testFeatures':
                await handleTestFeatures(data.feature || 'all');
                break;
                
            case 'processInput':
                await handleProcessInput(data.input);
                break;
                
            case 'getStatus':
                await handleGetStatus();
                break;
                
            case 'initializeNLP':
                await handleInitializeNLP();
                break;
                
            case 'healthCheck':
                await handleHealthCheck();
                break;
                
            case 'forceRetrain':
                await handleForceRetrain();
                break;
                
            case 'getModelInfo':
                await handleGetModelInfo();
                break;
                
            default:
                console.log('Unknown NLP Console action:', data.action);
        }
    } catch (error) {
        console.error('Error handling NLP Console message:', error);
        sendToNLPConsole('error', { 
            message: 'Error processing request', 
            error: error.message 
        });
    }
}

/**
 * Handle model training request
 */
async function handleTrainModel() {
    try {
        sendToNLPConsole('updateStatus', { 
            status: 'training', 
            message: 'Training NLP model...' 
        });

        const result = await trainNLPModel();
        
        if (result.success) {
            sendToNLPConsole('trainingComplete', {
                success: true,
                message: result.message,
                stats: result.stats,
                trainingTime: result.trainingTime
            });
            
            // Refresh status after training
            await refreshModelStatus();
        } else {
            sendToNLPConsole('trainingComplete', {
                success: false,
                message: result.message,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error training model:', error);
        sendToNLPConsole('trainingComplete', {
            success: false,
            message: 'Training failed',
            error: error.message
        });
    }
}

/**
 * Handle model testing request
 */
async function handleTestModel(testType = 'all') {
    try {
        sendToNLPConsole('updateStatus', { 
            status: 'testing', 
            message: 'Testing NLP model...' 
        });

        const result = await testNLPModel();
        
        if (result.success) {
            testResults = result;
            sendToNLPConsole('testComplete', {
                success: true,
                results: result.results,
                totalTests: result.totalTests,
                successfulTests: result.successfulTests,
                successRate: result.successRate,
                averageConfidence: result.averageConfidence,
                featureDetection: result.featureDetection
            });
        } else {
            sendToNLPConsole('testComplete', {
                success: false,
                message: result.message,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error testing model:', error);
        sendToNLPConsole('testComplete', {
            success: false,
            message: 'Testing failed',
            error: error.message
        });
    }
}

/**
 * Handle feature-specific testing
 */
async function handleTestFeatures(feature = 'all') {
    try {
        sendToNLPConsole('updateStatus', { 
            status: 'testing', 
            message: `Testing ${feature} features...` 
        });

        const result = await testNLPFeatures(feature);
        
        if (result.success) {
            sendToNLPConsole('featureTestComplete', {
                success: true,
                feature: feature,
                results: result.results,
                totalTests: result.totalTests,
                successfulTests: result.successfulTests,
                successRate: result.successRate
            });
        } else {
            sendToNLPConsole('featureTestComplete', {
                success: false,
                feature: feature,
                message: result.message,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error testing features:', error);
        sendToNLPConsole('featureTestComplete', {
            success: false,
            feature: feature,
            message: 'Feature testing failed',
            error: error.message
        });
    }
}

/**
 * Handle single input processing
 */
async function handleProcessInput(input) {
    try {
        if (!input || input.trim() === '') {
            sendToNLPConsole('processResult', {
                success: false,
                message: 'Input is required'
            });
            return;
        }

        sendToNLPConsole('updateStatus', { 
            status: 'processing', 
            message: 'Processing input...' 
        });

        const result = await processNLPInput(input);
        
        if (result.success) {
            sendToNLPConsole('processResult', {
                success: true,
                input: input,
                result: result.result
            });
        } else {
            sendToNLPConsole('processResult', {
                success: false,
                input: input,
                message: result.message,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error processing input:', error);
        sendToNLPConsole('processResult', {
            success: false,
            input: input,
            message: 'Processing failed',
            error: error.message
        });
    }
}

/**
 * Handle status request
 */
async function handleGetStatus() {
    await refreshModelStatus();
}

/**
 * Handle NLP initialization
 */
async function handleInitializeNLP() {
    try {
        sendToNLPConsole('updateStatus', { 
            status: 'initializing', 
            message: 'Initializing NLP system...' 
        });

        const result = await initializeNLP();
        
        if (result.success) {
            sendToNLPConsole('initializationComplete', {
                success: true,
                message: result.message,
                stats: result.stats,
                wasTraining: result.wasTraining
            });
            
            // Refresh status after initialization
            await refreshModelStatus();
        } else {
            sendToNLPConsole('initializationComplete', {
                success: false,
                message: result.message,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error initializing NLP:', error);
        sendToNLPConsole('initializationComplete', {
            success: false,
            message: 'Initialization failed',
            error: error.message
        });
    }
}

/**
 * Handle health check request
 */
async function handleHealthCheck() {
    await performHealthCheck();
}

/**
 * Handle force retrain request
 */
async function handleForceRetrain() {
    try {
        sendToNLPConsole('updateStatus', { 
            status: 'retraining', 
            message: 'Force retraining model from scratch...' 
        });

        const result = await forceRetrainNLP();
        
        if (result.success) {
            sendToNLPConsole('retrainComplete', {
                success: true,
                message: result.message,
                stats: result.stats,
                trainingTime: result.trainingTime
            });
            
            // Refresh status after retraining
            await refreshModelStatus();
        } else {
            sendToNLPConsole('retrainComplete', {
                success: false,
                message: result.message,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error force retraining:', error);
        sendToNLPConsole('retrainComplete', {
            success: false,
            message: 'Force retrain failed',
            error: error.message
        });
    }
}

/**
 * Handle model info request
 */
async function handleGetModelInfo() {
    try {
        sendToNLPConsole('updateStatus', { 
            status: 'loading', 
            message: 'Getting model information...' 
        });

        const result = await getNLPModelInfo();
        
        if (result.success) {
            sendToNLPConsole('modelInfo', {
                success: true,
                modelStatus: result.modelStatus,
                systemHealth: result.systemHealth,
                timestamp: result.timestamp
            });
        } else {
            sendToNLPConsole('modelInfo', {
                success: false,
                message: 'Failed to get model info',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error getting model info:', error);
        sendToNLPConsole('modelInfo', {
            success: false,
            message: 'Failed to get model info',
            error: error.message
        });
    }
}

/**
 * Refresh model status from backend
 */
async function refreshModelStatus() {
    try {
        const result = await getNLPModelStatus();
        
        if (result.success) {
            currentModelStatus = result.stats;
            sendToNLPConsole('statusUpdate', {
                success: true,
                stats: result.stats
            });
        } else {
            sendToNLPConsole('statusUpdate', {
                success: false,
                message: 'Failed to get model status',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error refreshing model status:', error);
        sendToNLPConsole('statusUpdate', {
            success: false,
            message: 'Failed to refresh status',
            error: error.message
        });
    }
}

/**
 * Perform health check
 */
async function performHealthCheck() {
    try {
        const result = await nlpHealthCheck();
        
        if (result.success) {
            sendToNLPConsole('healthCheck', {
                success: true,
                health: result.health
            });
        } else {
            sendToNLPConsole('healthCheck', {
                success: false,
                message: 'Health check failed',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error performing health check:', error);
        sendToNLPConsole('healthCheck', {
            success: false,
            message: 'Health check failed',
            error: error.message
        });
    }
}

/**
 * Send message to HTML NLP Console
 */
function sendToNLPConsole(action, data = {}) {
    try {
        const message = {
            action: action,
            timestamp: new Date().toISOString(),
            ...data
        };
        
        $w('#htmlNLPConsole').postMessage(message);
        console.log('Sent to NLP Console:', action, data);
    } catch (error) {
        console.error('Error sending message to NLP Console:', error);
    }
}

/**
 * Debug function - get current status
 */
export function getNLPConsoleStatus() {
    return {
        isInitialized,
        currentModelStatus,
        testResults,
        timestamp: new Date().toISOString()
    };
}

/**
 * Debug function - force refresh
 */
export function forceRefresh() {
    console.log('Force refreshing NLP Console...');
    initializeNLPConsole();
}

/**
 * Debug function - test with sample input
 */
export function testSampleInput(input = "yes perfect lets do that") {
    console.log('Testing sample input:', input);
    handleProcessInput(input);
}
