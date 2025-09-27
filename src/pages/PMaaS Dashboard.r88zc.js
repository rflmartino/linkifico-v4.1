// Page Code for NLP Admin (Wix Velo) - TESTING VERSION
console.log('🔧 PMaaS Dashboard page script loaded at:', new Date().toISOString());

// Test import one function at a time
console.log('🔧 Testing basic import...');
try {
    const { Logger } = await import('backend/logger.js');
    console.log('🔧 Logger import successful');
} catch (error) {
    console.error('❌ Logger import failed:', error);
}

console.log('🔧 Testing nlpWebMethods import...');
try {
    const nlpMethods = await import('backend/nlp/nlpWebMethods.web.js');
    console.log('🔧 nlpWebMethods import successful');
    console.log('🔧 Available exports:', Object.keys(nlpMethods));
} catch (error) {
    console.error('❌ nlpWebMethods import failed:', error);
}

console.log('🔧 Testing individual function imports...');
try {
    const { trainNLPModel } = await import('backend/nlp/nlpWebMethods.web.js');
    console.log('🔧 trainNLPModel import successful');
} catch (error) {
    console.error('❌ trainNLPModel import failed:', error);
}

try {
    const { getNLPModelStatus } = await import('backend/nlp/nlpWebMethods.web.js');
    console.log('🔧 getNLPModelStatus import successful');
} catch (error) {
    console.error('❌ getNLPModelStatus import failed:', error);
}

try {
    const { testNLPModel } = await import('backend/nlp/nlpWebMethods.web.js');
    console.log('🔧 testNLPModel import successful');
} catch (error) {
    console.error('❌ testNLPModel import failed:', error);
}

try {
    const { initializeNLP } = await import('backend/nlp/nlpWebMethods.web.js');
    console.log('🔧 initializeNLP import successful');
} catch (error) {
    console.error('❌ initializeNLP import failed:', error);
}

console.log('🔧 All import tests completed');

$w.onReady(function () {
    console.log('🔧 PMaaS Dashboard page ready - TESTING MODE');
    console.log('🔧 Page loaded at:', new Date().toISOString());
    
    // Simple test without HTML communication for now
    console.log('🔧 Testing basic page functionality...');
    
    const htmlElement = $w('#htmlNLPConsole');
    if (htmlElement) {
        console.log('✅ HTML element found:', htmlElement);
    } else {
        console.error('❌ HTML element #htmlNLPConsole not found!');
    }
    
    console.log('🔧 Basic page test completed');
});