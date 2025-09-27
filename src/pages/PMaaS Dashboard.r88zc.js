// Page Code for NLP Admin (Wix Velo) - WITH PROPER WEB LOGGING
import { 
    trainNLPModel, 
    getNLPModelStatus, 
    testNLPModel, 
    initializeNLP 
} from 'backend/nlp/nlpWebMethods.web.js';

import { logToBackend } from 'backend/webLogger.web.js';

// Log page load
logToBackend('PMaaS-Dashboard', 'pageLoad', { timestamp: new Date().toISOString() });

$w.onReady(function () {
    try {
        logToBackend('PMaaS-Dashboard', 'onReady', { 
            message: 'Page ready - FULL NLP FUNCTIONALITY',
            timestamp: new Date().toISOString()
        });
        
        logToBackend('PMaaS-Dashboard', 'onReady', { message: 'About to call setupHTMLCommunication' });
        setupHTMLCommunication();
        logToBackend('PMaaS-Dashboard', 'onReady', { message: 'setupHTMLCommunication completed successfully' });
    } catch (error) {
        logToBackend('PMaaS-Dashboard', 'onReady', null, error);
    }
});

function setupHTMLCommunication() {
    try {
        logToBackend('PMaaS-Dashboard', 'setupHTMLCommunication', { message: 'Setting up HTML communication' });
        
        const htmlElement = $w('#htmlNLPConsole');
        logToBackend('PMaaS-Dashboard', 'setupHTMLCommunication', { 
            message: 'HTML element query result',
            elementFound: !!htmlElement
        });
        
        if (!htmlElement) {
            logToBackend('PMaaS-Dashboard', 'setupHTMLCommunication', null, new Error('HTML element #htmlNLPConsole not found'));
            return;
        }
        
        logToBackend('PMaaS-Dashboard', 'setupHTMLCommunication', { message: 'HTML element found, setting up onMessage listener' });
        
        htmlElement.onMessage((event) => {
            try {
                logToBackend('PMaaS-Dashboard', 'onMessage', { 
                    message: 'Velo received message from HTML',
                    eventType: typeof event,
                    eventKeys: Object.keys(event)
                });
                
                const data = (event && event.data) || event;
                logToBackend('PMaaS-Dashboard', 'onMessage', { 
                    message: 'Parsed message data',
                    dataType: typeof data,
                    dataKeys: Object.keys(data),
                    action: data.action
                });
                
                const action = data.action;
                
                if (action) {
                    logToBackend('PMaaS-Dashboard', 'onMessage', { message: `Processing action: ${action}` });
                    handleHTMLCall(data, htmlElement);
                } else {
                    logToBackend('PMaaS-Dashboard', 'onMessage', { 
                        message: 'Message not processed - no action field',
                        availableFields: Object.keys(data)
                    });
                }
            } catch (error) {
                logToBackend('PMaaS-Dashboard', 'onMessage', null, error);
            }
        });
        
        logToBackend('PMaaS-Dashboard', 'setupHTMLCommunication', { message: 'HTML communication setup complete' });
    } catch (error) {
        logToBackend('PMaaS-Dashboard', 'setupHTMLCommunication', null, error);
    }
}

async function handleHTMLCall(data, htmlElement) {
    const { action, args, requestId } = data;
    
    logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { 
        message: `Handling call to ${action}`,
        requestId: requestId,
        args: args
    });
    
    try {
        let result;
        
        switch (action) {
            case 'getNLPModelStatus':
                logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { message: 'Calling getNLPModelStatus' });
                result = await getNLPModelStatus();
                logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { message: 'getNLPModelStatus completed', result: result });
                break;
                
            case 'trainNLPModel':
                logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { message: 'Calling trainNLPModel' });
                result = await trainNLPModel();
                logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { message: 'trainNLPModel completed', result: result });
                break;
                
            case 'testNLPModel':
                logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { message: 'Calling testNLPModel', args: args });
                result = await testNLPModel(...(args || []));
                logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { message: 'testNLPModel completed', result: result });
                break;
                
            case 'initializeNLP':
                logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { message: 'Calling initializeNLP' });
                result = await initializeNLP();
                logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { message: 'initializeNLP completed', result: result });
                break;
                
            case 'processNlpInput':
                logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { message: 'Calling processSingleInput', input: data.input });
                const { processSingleInput } = await import('backend/nlp/nlpTrainingHelpers.js');
                result = await processSingleInput(data.input);
                logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { message: 'processSingleInput completed', result: result });
                break;
                
            case 'test':
                logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { message: 'Handling test action' });
                result = { 
                    message: 'Test successful!', 
                    timestamp: new Date().toISOString(),
                    receivedData: data
                };
                logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { message: 'Test action handled successfully' });
                break;
                
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        
        logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { 
            message: `${action} completed successfully`,
            requestId: requestId
        });
        logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { message: 'Sending response to HTML' });
        sendToHTML(htmlElement, { requestId, success: true, result });
        
    } catch (error) {
        logToBackend('PMaaS-Dashboard', 'handleHTMLCall', null, error);
        logToBackend('PMaaS-Dashboard', 'handleHTMLCall', { 
            message: 'Sending error response to HTML',
            requestId: requestId
        });
        sendToHTML(htmlElement, { requestId, success: false, error: error.message });
    }
}

function sendToHTML(htmlElement, data) {
    try {
        logToBackend('PMaaS-Dashboard', 'sendToHTML', { 
            message: 'Sending message to HTML',
            messageType: typeof data,
            messageKeys: Object.keys(data),
            hasRequestId: !!data.requestId,
            hasSuccess: !!data.success,
            hasResult: !!data.result,
            hasError: !!data.error
        });
        
        htmlElement.postMessage(data);
        logToBackend('PMaaS-Dashboard', 'sendToHTML', { message: 'Message sent to HTML successfully' });
        
    } catch (error) {
        logToBackend('PMaaS-Dashboard', 'sendToHTML', null, error);
    }
}