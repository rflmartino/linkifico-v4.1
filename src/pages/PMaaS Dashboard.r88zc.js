// Page Code for NLP Admin (Wix Velo) - ISOLATION TEST
console.log('🔧 PMaaS Dashboard page script loaded at:', new Date().toISOString());

// Test 1: Import Logger first (should work)
console.log('🔧 Test 1: Importing Logger...');
import { Logger } from 'backend/logger.js';
console.log('✅ Logger import completed');

// Test 2: Import just one function from nlpWebMethods
console.log('🔧 Test 2: Importing trainNLPModel only...');
import { trainNLPModel } from 'backend/nlp/nlpWebMethods.web.js';
console.log('✅ trainNLPModel import completed');

console.log('🔧 All imports completed');

$w.onReady(function () {
    console.log('🔧 PMaaS Dashboard page ready - ISOLATION TEST');
    console.log('🔧 Page loaded at:', new Date().toISOString());
    
    // Test if the imported function is available
    if (typeof trainNLPModel === 'function') {
        console.log('✅ trainNLPModel function is available');
    } else {
        console.log('❌ trainNLPModel function is NOT available');
    }
    
    console.log('🔧 Isolation test completed');
});