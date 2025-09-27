// Page Code for NLP Admin (Wix Velo) - SIMPLE TEST VERSION
console.log('🔧 PMaaS Dashboard page script loaded at:', new Date().toISOString());

// Test basic functionality first
$w.onReady(function () {
    try {
        console.log('🔧 PMaaS Dashboard page ready - SIMPLE TEST');
        console.log('🔧 Page loaded at:', new Date().toISOString());
        
        // Test HTML element access
        const htmlElement = $w('#htmlNLPConsole');
        console.log('🔧 HTML element query result:', htmlElement);
        
        if (!htmlElement) {
            console.error('❌ HTML element #htmlNLPConsole not found!');
            return;
        }
        
        console.log('✅ HTML element found:', htmlElement);
        
        // Set up basic message handler
        htmlElement.onMessage((event) => {
            console.log('📥 Velo received message from HTML:', event);
            console.log('📥 Event data:', event.data);
            
            // Send a simple response back
            try {
                htmlElement.postMessage({
                    success: true,
                    message: 'Test response from Wix page',
                    timestamp: new Date().toISOString()
                });
                console.log('✅ Test response sent to HTML');
            } catch (error) {
                console.error('❌ Error sending response:', error);
            }
        });
        
        console.log('✅ Basic HTML communication setup complete');
        
    } catch (error) {
        console.error('❌ Error in $w.onReady:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
    }
});

console.log('🔧 Page script execution completed');