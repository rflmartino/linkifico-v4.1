// PMaaS Dashboard - Node-NLP Admin Console
// This page hosts the Node-NLP training and testing interface

import { 
    initializeNLP,
    trainNLPModel,
    testNLPModel,
    processNLPInput,
    getNLPModelStatus
} from './backend/nlp/nlpWebMethods';

$w.onReady(function () {
    console.log('PMaaS Dashboard page ready - Node-NLP Admin Console');
    
    // Initialize the HTML embed for Node-NLP admin console
    const htmlEmbed = $w('#htmlNLPConsole');
    if (htmlEmbed) {
        console.log('HTML embed found - Node-NLP Admin Console ready');
        
        // Set up message handling for the HTML embed
        htmlEmbed.onMessage((event) => {
            console.log('Received message from HTML embed:', event);
            handleHtmlEmbedMessage(event);
        });
    } else {
        console.log('HTML embed not found - please add #htmlNLPConsole element');
    }
});

// Handle messages from HTML embed
async function handleHtmlEmbedMessage(event) {
    try {
        console.log('[DASHBOARD] Message received from HTML embed:', event);
        // Extract data from the event structure
        const { action, input, timestamp } = event.data || event;
        console.log(`[DASHBOARD] Handling action: ${action}`);
        
        let response;
        
        switch (action) {
            case 'initializeNlpSystem':
                console.log('[DASHBOARD] Calling initializeNLP()');
                response = await initializeNLP();
                console.log('[DASHBOARD] initializeNLP() response:', response);
                break;
            case 'trainNlpModel':
                console.log('[DASHBOARD] Calling trainNLPModel()');
                response = await trainNLPModel();
                console.log('[DASHBOARD] trainNLPModel() response:', response);
                break;
            case 'testNlpModel':
                console.log('[DASHBOARD] Calling testNLPModel()');
                response = await testNLPModel();
                console.log('[DASHBOARD] testNLPModel() response:', response);
                break;
            case 'processNlpInput':
                console.log('[DASHBOARD] Calling processNLPInput() with input:', input);
                response = await processNLPInput(input);
                console.log('[DASHBOARD] processNLPInput() response:', response);
                break;
            case 'getNlpModelStatus':
                console.log('[DASHBOARD] Calling getNLPModelStatus()');
                response = await getNLPModelStatus();
                console.log('[DASHBOARD] getNLPModelStatus() response:', response);
                break;
            default:
                console.log(`[DASHBOARD] Unknown action: ${action}`);
                response = { success: false, error: 'Unknown action' };
        }
        
        // Send response back to HTML embed
        const htmlEmbed = $w('#htmlNLPConsole');
        if (htmlEmbed) {
            const messageToSend = {
                action: action,
                ...response,
                timestamp: new Date().toISOString()
            };
            console.log('[DASHBOARD] Sending response to HTML embed:', messageToSend);
            htmlEmbed.postMessage(messageToSend);
            console.log('[DASHBOARD] Response sent to HTML embed successfully');
        } else {
            console.log('[DASHBOARD] HTML embed not found for response');
        }
        
    } catch (error) {
        console.error('[DASHBOARD] Error handling HTML embed message:', error);
        
        // Send error response back to HTML embed
        const htmlEmbed = $w('#htmlNLPConsole');
        if (htmlEmbed) {
            htmlEmbed.postMessage({
                action: (event.data || event).action,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

// Initialize Node-NLP system
export function initializeNlpSystem() {
    console.log('Initializing Node-NLP system from dashboard');
    return { success: true, message: 'Node-NLP system initialization requested' };
}

// Get Node-NLP status
export function getNlpStatus() {
    console.log('Getting Node-NLP status from dashboard');
    return { success: true, message: 'Node-NLP status requested' };
}