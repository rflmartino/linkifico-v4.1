// PMaaS Dashboard - Node-NLP Admin Console
// This page hosts the Node-NLP training and testing interface

import { 
    initializeNlpSystem as initNlpSystem,
    trainNlpModel,
    testNlpModel,
    processNlpInput,
    getNlpModelStatus
} from 'backend/nlp/nodeNlpWebMethods';

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
        const { action, input, timestamp } = event;
        console.log(`Handling action: ${action}`);
        
        let response;
        
        switch (action) {
            case 'initializeNlpSystem':
                response = await initNlpSystem();
                break;
            case 'trainNlpModel':
                response = await trainNlpModel();
                break;
            case 'testNlpModel':
                response = await testNlpModel();
                break;
            case 'processNlpInput':
                response = await processNlpInput(input);
                break;
            case 'getNlpModelStatus':
                response = await getNlpModelStatus();
                break;
            default:
                response = { success: false, error: 'Unknown action' };
        }
        
        // Send response back to HTML embed
        const htmlEmbed = $w('#htmlNLPConsole');
        if (htmlEmbed) {
            htmlEmbed.postMessage({
                action: action,
                ...response,
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('Error handling HTML embed message:', error);
        
        // Send error response back to HTML embed
        const htmlEmbed = $w('#htmlNLPConsole');
        if (htmlEmbed) {
            htmlEmbed.postMessage({
                action: event.action,
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