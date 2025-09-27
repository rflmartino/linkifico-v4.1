// Page Code for NLP Admin (Wix Velo) - FULL FUNCTIONALITY WITH ENHANCED LOGGING
import { 
    trainNLPModel, 
    getNLPModelStatus, 
    testNLPModel, 
    initializeNLP 
} from './backend/nlp/nlpWebMethods';

$w.onReady(function () {
    console.log('🔧 PMaaS Dashboard page ready - FULL NLP FUNCTIONALITY');
    setupHTMLCommunication();
});

function setupHTMLCommunication() {
    console.log('🔧 Setting up HTML communication...');
    
    const htmlElement = $w('#htmlNLPConsole');
    if (!htmlElement) {
        console.error('❌ HTML element #htmlNLPConsole not found!');
        return;
    }
    
    console.log('✅ HTML element found:', htmlElement);
    
    htmlElement.onMessage((event) => {
        console.log('📥 Velo received message from HTML:', event);
        console.log('📥 Event type:', typeof event);
        console.log('📥 Event keys:', Object.keys(event));
        
        const data = (event && event.data) || event;
        console.log('📥 Parsed data:', data);
        console.log('📥 Data type:', typeof data);
        console.log('📥 Data keys:', Object.keys(data));
        
        const action = data.action;
        console.log('📥 Action:', action);
        
        if (action) {
            console.log(`✅ Processing action: ${action}`);
            handleHTMLCall(data, htmlElement);
        } else {
            console.log('⚠️ Message not processed - no action field');
            console.log('⚠️ Available fields:', Object.keys(data));
        }
    });
    
    console.log('✅ HTML communication setup complete');
}

async function handleHTMLCall(data, htmlElement) {
    const { action, args, requestId } = data;
    
    console.log(`🔧 Velo: Handling call to ${action}`);
    console.log(`🔧 Request ID: ${requestId}`);
    console.log(`🔧 Args:`, args);
    
    try {
        let result;
        
        switch (action) {
            case 'getNLPModelStatus':
                console.log('🔧 Calling getNLPModelStatus...');
                result = await getNLPModelStatus();
                console.log('🔧 getNLPModelStatus result:', result);
                break;
                
            case 'trainNLPModel':
                console.log('🔧 Calling trainNLPModel...');
                result = await trainNLPModel();
                console.log('🔧 trainNLPModel result:', result);
                break;
                
            case 'testNLPModel':
                console.log('🔧 Calling testNLPModel with args:', args);
                result = await testNLPModel(...(args || []));
                console.log('🔧 testNLPModel result:', result);
                break;
                
            case 'initializeNLP':
                console.log('🔧 Calling initializeNLP...');
                result = await initializeNLP();
                console.log('🔧 initializeNLP result:', result);
                break;
                
            case 'test':
                console.log('🔧 Handling test action...');
                result = { 
                    message: 'Test successful!', 
                    timestamp: new Date().toISOString(),
                    receivedData: data
                };
                console.log('✅ Test action handled successfully');
                break;
                
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        
        console.log(`✅ Velo: ${action} completed successfully`);
        console.log(`📤 Sending response to HTML with requestId: ${requestId}`);
        sendToHTML(htmlElement, { requestId, success: true, result });
        
    } catch (error) {
        console.error(`❌ Velo: Error calling ${action}:`, error);
        console.log(`📤 Sending error response to HTML with requestId: ${requestId}`);
        sendToHTML(htmlElement, { requestId, success: false, error: error.message });
    }
}

function sendToHTML(htmlElement, data) {
    try {
        console.log('📤 Sending message to HTML:', data);
        console.log('📤 Message type:', typeof data);
        console.log('📤 Message keys:', Object.keys(data));
        console.log('📤 Has requestId:', !!data.requestId);
        console.log('📤 Has success:', !!data.success);
        console.log('📤 Has result:', !!data.result);
        console.log('📤 Has error:', !!data.error);
        
        htmlElement.postMessage(data);
        console.log('✅ Message sent to HTML successfully');
        
    } catch (error) {
        console.error('❌ Failed to send message to HTML:', error);
    }
}