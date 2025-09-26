// PMaaS Dashboard - Node-NLP Admin Console
// This page hosts the Node-NLP training and testing interface

$w.onReady(function () {
    console.log('PMaaS Dashboard page ready - Node-NLP Admin Console');
    
    // Initialize the HTML embed for Node-NLP admin console
    const htmlEmbed = $w('#htmlNLPConsole');
    if (htmlEmbed) {
        console.log('HTML embed found - Node-NLP Admin Console ready');
        
        // Set up message handling for the HTML embed
        htmlEmbed.onMessage((event) => {
            console.log('Received message from HTML embed:', event);
        });
    } else {
        console.log('HTML embed not found - please add #htmlNLPConsole element');
    }
});

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