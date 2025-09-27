// Page Code for NLP Admin (Wix Velo) - MINIMAL TEST VERSION
$w.onReady(function () {
    console.log('🔧 PMaaS Dashboard page ready - MINIMAL TEST MODE');
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
    const { action, requestId } = data;
    
    console.log(`🔧 Velo: Handling call to ${action}`);
    console.log(`🔧 Request ID: ${requestId}`);
    
    try {
        let result;
        
        if (action === 'test') {
            result = { 
                message: 'Test successful!', 
                timestamp: new Date().toISOString(),
                receivedData: data
            };
            console.log('✅ Test action handled successfully');
        } else {
            throw new Error(`Unknown action: ${action}`);
        }
        
        console.log(`✅ Velo: ${action} completed successfully`);
        sendToHTML(htmlElement, { requestId, success: true, result });
        
    } catch (error) {
        console.error(`❌ Velo: Error calling ${action}:`, error);
        sendToHTML(htmlElement, { requestId, success: false, error: error.message });
    }
}

function sendToHTML(htmlElement, data) {
    try {
        console.log('📤 Sending message to HTML:', data);
        htmlElement.postMessage(data);
        console.log('✅ Message sent to HTML successfully');
    } catch (error) {
        console.error('❌ Failed to send message to HTML:', error);
    }
}