// Page Code for NLP Admin (Wix Velo) - RESTORED WORKING VERSION
console.log('🔧 PMaaS Dashboard page script loaded at:', new Date().toISOString());

// Safe import with error handling
let trainNLPModel, getNLPModelStatus, testNLPModel, initializeNLP;
let importsLoaded = false;

try {
    console.log('🔧 Attempting to import NLP web methods...');
    const nlpMethods = await import('backend/nlp/nlpWebMethods.web.js');
    trainNLPModel = nlpMethods.trainNLPModel;
    getNLPModelStatus = nlpMethods.getNLPModelStatus;
    testNLPModel = nlpMethods.testNLPModel;
    initializeNLP = nlpMethods.initializeNLP;
    importsLoaded = true;
    console.log('🔧 Imports completed successfully');
} catch (error) {
    console.error('❌ Failed to import NLP methods:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Create fallback functions
    trainNLPModel = async () => ({ success: false, error: 'NLP methods not available' });
    getNLPModelStatus = async () => ({ success: false, error: 'NLP methods not available' });
    testNLPModel = async () => ({ success: false, error: 'NLP methods not available' });
    initializeNLP = async () => ({ success: false, error: 'NLP methods not available' });
    
    console.log('🔧 Fallback functions created - dashboard will work with limited functionality');
}

$w.onReady(function () {
    try {
        console.log('🔧 PMaaS Dashboard page ready - NLP FUNCTIONALITY:', importsLoaded ? 'AVAILABLE' : 'DEGRADED');
        console.log('🔧 Page loaded at:', new Date().toISOString());
        console.log('🔧 About to call setupHTMLCommunication...');
        setupHTMLCommunication();
        console.log('🔧 setupHTMLCommunication completed successfully');
    } catch (error) {
        console.error('❌ Error in $w.onReady:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
    }
});

function setupHTMLCommunication() {
    try {
        console.log('🔧 Setting up HTML communication...');
        
        const htmlElement = $w('#htmlNLPConsole');
        console.log('🔧 HTML element query result:', htmlElement);
        
        if (!htmlElement) {
            console.error('❌ HTML element #htmlNLPConsole not found!');
            return;
        }
        
        console.log('✅ HTML element found:', htmlElement);
        console.log('🔧 About to set up onMessage listener...');
        
        htmlElement.onMessage((event) => {
            try {
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
            } catch (error) {
                console.error('❌ Error in onMessage handler:', error);
            }
        });
        
        console.log('✅ HTML communication setup complete');
    } catch (error) {
        console.error('❌ Error in setupHTMLCommunication:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
    }
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
                
            case 'processNlpInput':
                console.log('🔧 Calling processSingleInput with input:', data.input);
                try {
                    const { processSingleInput } = await import('backend/nlp/nlpTrainingHelpers.js');
                    result = await processSingleInput(data.input);
                    console.log('🔧 processSingleInput result:', result);
                } catch (importError) {
                    console.error('❌ Failed to import processSingleInput:', importError);
                    result = { success: false, error: 'Processing not available' };
                }
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