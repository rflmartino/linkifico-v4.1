// Page Code for NLP Admin (Wix Velo) - FIXED VERSION
// Put this in the page code section of your Wix page

import { 
    trainNLPModel, 
    getNLPModelStatus, 
    testNLPModel, 
    initializeNLP 
} from './backend/nlp/nlpWebMethods';

$w.onReady(function () {
    console.log('NLP Admin Panel initializing...');
    setupHTMLCommunication();
});

/**
 * Set up communication with HTML element
 */
function setupHTMLCommunication() {
    const htmlElement = $w('#htmlNLPConsole');
    
    if (!htmlElement) {
        console.error('HTML element #htmlNLPConsole not found!');
        return;
    }
    
    // Listen for messages from HTML element
    htmlElement.onMessage((event) => {
        console.log('Velo received message from HTML:', event);
        
        if (event.data && event.data.type === 'HTML_TO_VELO') {
            handleHTMLCall(event.data, htmlElement);
        }
    });
    
    console.log('HTML communication setup complete');
}

/**
 * Handle function calls from HTML element
 */
async function handleHTMLCall(data, htmlElement) {
    const { functionName, args, requestId } = data;
    
    try {
        console.log(`Velo: Handling call to ${functionName}`);
        
        let result;
        
        switch (functionName) {
            case 'getNLPModelStatus':
                result = await getNLPModelStatus();
                break;
                
            case 'trainNLPModel':
                result = await trainNLPModel();
                break;
                
            case 'testNLPModel':
                result = await testNLPModel(...(args || []));
                break;
                
            case 'initializeNLP':
                result = await initializeNLP();
                break;
                
            default:
                throw new Error(`Unknown function: ${functionName}`);
        }
        
        console.log(`Velo: ${functionName} completed successfully`);
        
        // Send success response back to HTML - FIXED METHOD
        sendToHTML(htmlElement, {
            requestId,
            success: true,
            result
        });
        
    } catch (error) {
        console.error(`Velo: Error calling ${functionName}:`, error);
        
        // Send error response back to HTML - FIXED METHOD
        sendToHTML(htmlElement, {
            requestId,
            success: false,
            error: error.message
        });
    }
}

/**
 * Send message to HTML element - FIXED VERSION
 */
function sendToHTML(htmlElement, data) {
    try {
        // Use postMessage which is the correct method for Wix HTML elements
        htmlElement.postMessage(data);
        console.log('Message sent to HTML:', data);
        
    } catch (error) {
        console.error('Failed to send message to HTML:', error);
    }
}

/**
 * Export functions for direct testing from console
 */
export async function testAdminPanel() {
    console.log('Testing admin panel functions...');
    
    try {
        const status = await getNLPModelStatus();
        console.log('Status test:', status);
        
        if (!status.success || !status.stats.isReady) {
            console.log('Model not ready, initializing...');
            const initResult = await initializeNLP();
            console.log('Initialize test:', initResult);
        }
        
        const testResult = await testNLPModel(['hello', 'create project']);
        console.log('Test result:', testResult);
        
        return { success: true, message: 'All tests completed' };
        
    } catch (error) {
        console.error('Test failed:', error);
        return { success: false, error: error.message };
    }
}

export async function quickStatus() {
    const result = await getNLPModelStatus();
    console.log('Quick status:', result);
    return result;
}

export async function quickTrain() {
    const result = await trainNLPModel();
    console.log('Quick train:', result);
    return result;
}