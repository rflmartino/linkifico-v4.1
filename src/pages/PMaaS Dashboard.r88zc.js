// Page Code for NLP Admin (Wix Velo) - TESTING WEB METHODS
console.log('🔧 PMaaS Dashboard page script loaded at:', new Date().toISOString());

// Test importing from nlpWebMethods now that we removed the problematic imports
console.log('🔧 Testing nlpWebMethods import...');
import { trainNLPModel } from 'backend/nlp/nlpWebMethods.web.js';
console.log('✅ nlpWebMethods import completed');

$w.onReady(function () {
    console.log('🔧 PMaaS Dashboard page ready - WEB METHODS TEST');
    console.log('🔧 Page loaded at:', new Date().toISOString());
    
    if (typeof trainNLPModel === 'function') {
        console.log('✅ trainNLPModel function is available');
    } else {
        console.log('❌ trainNLPModel function is NOT available');
    }
    
    console.log('🔧 Web methods test completed');
});