// Test file to check if node-nlp is available
console.log('Testing node-nlp import...');

try {
    const { NlpManager } = require('node-nlp');
    console.log('✅ node-nlp import successful');
    console.log('NlpManager type:', typeof NlpManager);
} catch (error) {
    console.log('❌ node-nlp import failed:', error.message);
}

console.log('Test completed');
