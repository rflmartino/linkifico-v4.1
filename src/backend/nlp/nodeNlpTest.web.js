// nodeNlpTest.web.js - Simple test to verify Node-NLP works
import { webMethod, Permissions } from 'wix-web-module';
import { Logger } from '../logger';

// Simple test without Node-NLP
export const testBasicFunction = webMethod(Permissions.Anyone, async () => {
    try {
        Logger.info('nodeNlpTest', 'testBasicFunction', 'Testing basic function');
        return {
            success: true,
            message: 'Basic function works',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        Logger.error('nodeNlpTest', 'testBasicFunction', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
});

// Test Node-NLP import
export const testNodeNlpImport = webMethod(Permissions.Anyone, async () => {
    try {
        Logger.info('nodeNlpTest', 'testNodeNlpImport', 'Testing Node-NLP import');
        
        // Try to import Node-NLP
        const { NlpManager } = await import('node-nlp');
        Logger.info('nodeNlpTest', 'testNodeNlpImport', 'Node-NLP imported successfully');
        
        // Try to create a simple manager
        const manager = new NlpManager({ languages: ['en'] });
        Logger.info('nodeNlpTest', 'testNodeNlpImport', 'Node-NLP manager created successfully');
        
        return {
            success: true,
            message: 'Node-NLP import and creation successful',
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        Logger.error('nodeNlpTest', 'testNodeNlpImport', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
});
