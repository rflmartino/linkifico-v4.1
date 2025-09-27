// Page Code for NLP Admin (Wix Velo) - CLEAN VERSION
console.log('🔧 PMaaS Dashboard script loading...');

import { 
    trainNLPModel, 
    getNLPModelStatus, 
    testNLPModel, 
    initializeNLP 
} from 'backend/nlp/nlpWebMethods.web.js';

console.log('🔧 Imports completed');

$w.onReady(function () {
    try {
        console.log('🧠 PMaaS Dashboard ready - Node-NLP Admin Console');
        console.log('🔧 Available functions:', { trainNLPModel: !!trainNLPModel, getNLPModelStatus: !!getNLPModelStatus, testNLPModel: !!testNLPModel, initializeNLP: !!initializeNLP });
        setupHTMLCommunication();
    } catch (error) {
        console.error('❌ Page initialization error:', error.message);
        console.error('❌ Error stack:', error.stack);
    }
});

function setupHTMLCommunication() {
    try {
        const htmlElement = $w('#htmlNLPConsole');
        
        if (!htmlElement) {
            console.error('❌ HTML element #htmlNLPConsole not found!');
            return;
        }
        
        console.log('✅ HTML communication established');
        
        htmlElement.onMessage((event) => {
            try {
                const data = (event && event.data) || event;
                const action = data.action;
                
                if (action) {
                    console.log(`📥 ${action} request received`);
                    handleHTMLCall(data, htmlElement);
                } else {
                    console.log('⚠️ Invalid message format - no action field');
                }
            } catch (error) {
                console.error('❌ Message handler error:', error.message);
            }
        });
        
    } catch (error) {
        console.error('❌ Communication setup error:', error.message);
    }
}

async function handleHTMLCall(data, htmlElement) {
    const { action, args, requestId } = data;
    
    try {
        let result;
        
        switch (action) {
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
                
            case 'processNlpInput':
                const { processSingleInput } = await import('backend/nlp/nlpTrainingHelpers.js');
                result = await processSingleInput(data.input);
                break;
                
            case 'test':
                result = { 
                    message: 'Test successful!', 
                    timestamp: new Date().toISOString(),
                    receivedData: data
                };
                break;
                
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        
        console.log(`✅ ${action} completed successfully`);
        sendToHTML(htmlElement, { requestId, success: true, result });
        
    } catch (error) {
        console.error(`❌ ${action} failed:`, error.message);
        sendToHTML(htmlElement, { requestId, success: false, error: error.message });
    }
}

function sendToHTML(htmlElement, data) {
    try {
        htmlElement.postMessage(data);
        console.log(`📤 Response sent to HTML (${data.success ? 'success' : 'error'})`);
    } catch (error) {
        console.error('❌ Failed to send response to HTML:', error.message);
    }
}