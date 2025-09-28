// entrypoint.web.js - Main entry point for intelligent project management chat
// Integrates with chat UI and orchestrates the 5-controller intelligence system

import { redisData } from './data/redisData';

import { selfAnalysisController } from './controllers/selfAnalysisController';
import { gapDetectionController } from './controllers/gapDetectionController';
import { actionPlanningController } from './controllers/actionPlanningController';
import { executionController } from './controllers/executionController';
import { learningController } from './controllers/learningController';
import { Permissions, webMethod } from 'wix-web-module';
import { Logger } from './utils/logger';

// Main chat processing function
export const processUserRequest = webMethod(Permissions.Anyone, async (requestData) => {
    if (requestData?.op === 'startProcessing') {
        Logger.info('entrypoint.web', 'processUserRequest:start', { op: requestData?.op, projectId: requestData?.projectId });
    }
    const { op, projectId, userId, sessionId, payload = {} } = requestData || {};
    if (!op || !projectId) {
        return { success: false, message: 'Invalid request' };
    }
    
    if (op === 'startProcessing') {
        return await startProcessing(projectId, userId, sessionId, payload?.message || '');
    }
    if (op === 'getProcessingStatus') {
        return await getProcessingStatus(payload?.processingId);
    }

    if (op === 'sendMessage') {
        const message = (payload && payload.message) || '';
        return await processChatMessage(projectId, userId, message, sessionId, null);
    }
    if (op === 'init') {
        const initialMessage = (payload && payload.initialMessage) || 'Start';
        return await initializeProject(projectId, userId, initialMessage);
    }
    if (op === 'status') {
        return await getProjectStatus(projectId);
    }
    if (op === 'history') {
        return await getProjectChatHistory(projectId);
    }
    if (op === 'update') {
        const updates = (payload && payload.updates) || {};
        return await updateProjectData(projectId, updates);
    }
    if (op === 'analyze') {
        return await triggerAnalysis(projectId);
    }
    
    Logger.warn('entrypoint.web', 'processUserRequest:unknownOp', op);
    return { success: false, message: 'Unknown op' };
});

async function processChatMessage(projectId, userId, message, sessionId, processingId = null) {
    try {
        const totalStart = Date.now();
        Logger.info('entrypoint.web', 'processChatMessage:input', { projectId, userId, sessionId });
        // Get or create project data using data manager
        let allData = await redisData.loadAllData(projectId, userId);
        if (!allData.projectData) {
            allData.projectData = redisData.createDefaultProjectData(projectId);
        }
        
        // Get chat history
        let chatHistory = allData.chatHistory || [];
        
        // Add user message to history
        chatHistory.push({
            role: 'user',
            message: message,
            timestamp: new Date().toISOString(),
            sessionId: sessionId
        });

        // Update chat history in allData
        allData.chatHistory = chatHistory;

        // Process through intelligence controllers
        const response = await processIntelligenceLoop(projectId, userId, message, processingId);

        // Optionally append inline TODO checklist to assistant message
        let finalMessage = response.message;
        if (response.analysis && response.analysis.gaps && response.analysis.gaps.todos && response.analysis.gaps.todos.length) {
            const checklist = response.analysis.gaps.todos
                .slice(0, 5)
                .map(t => `• ${t.title} (${t.priority})`)
                .join('\n');
            finalMessage = `${finalMessage}\n\nNext steps:\n${checklist}`;
        }

        // Add AI response to history
        chatHistory.push({
            role: 'assistant',
            message: response.message,
            timestamp: new Date().toISOString(),
            sessionId: sessionId,
            analysis: response.analysis
        });

        // Save final chat history (will be saved by data manager in processIntelligenceLoop)
        allData.chatHistory = chatHistory;

        const totalMs = Date.now() - totalStart;
        Logger.info('entrypoint.web', 'timing:processChatMessageMs', { ms: totalMs });
        const result = {
            success: true,
            message: finalMessage,
            analysis: response.analysis,
            todos: (response.analysis && response.analysis.gaps && response.analysis.gaps.todos) ? response.analysis.gaps.todos : [],
            projectData: allData.projectData
        };
        Logger.info('entrypoint.web', 'processChatMessage:result', { ok: true, todos: result.todos?.length || 0 });
        return result;

    } catch (error) {
        Logger.error('entrypoint.web', 'processChatMessage:error', error);
        return {
            success: false,
            message: "I encountered an error processing your message. Please try again.",
            error: error.message
        };
    }
}

// Intelligence processing loop
async function processIntelligenceLoop(projectId, userId, message, processingId) {
    Logger.info('entrypoint.web', 'processIntelligenceLoop:start', { projectId });
    const loopStart = Date.now();
    
    // Load all data in a single Redis operation
    const dataLoadStart = Date.now();
    let allData = await redisData.loadAllData(projectId, userId);
    Logger.info('entrypoint.web', 'timing:dataLoadMs', { ms: Date.now() - dataLoadStart });
    
    // Initialize default data structures if needed
    if (!allData.projectData) {
        allData.projectData = redisData.createDefaultProjectData(projectId);
    }
    if (!allData.learningData) {
        allData.learningData = redisData.createDefaultLearningData(userId);
    }
    if (!allData.knowledgeData) {
        allData.knowledgeData = redisData.createDefaultKnowledgeData(projectId);
    }
    if (!allData.gapData) {
        allData.gapData = redisData.createDefaultGapData(projectId);
    }
    if (!allData.reflectionData) {
        allData.reflectionData = redisData.createDefaultReflectionData(projectId);
    }
    
    // 1. Self Analysis - Analyze current project knowledge
    const t1 = Date.now();
    const analysis = await selfAnalysisController.analyzeProject(projectId, allData.projectData, allData.chatHistory, allData.knowledgeData);
    Logger.info('entrypoint.web', 'timing:selfAnalysisMs', { ms: Date.now() - t1 });
    
    // Update knowledge data from analysis
    if (analysis.knowledgeData) {
        allData.knowledgeData = analysis.knowledgeData;
    }
    
    if (processingId) {
        await redisData.saveProcessing(processingId, { 
            status: 'processing', 
            stage: 'analyzing', 
            updatedAt: Date.now(),
            message: "🔍 Analyzing project knowledge...",
            progress: 20
        });
    }
    
    // 2. Gap Detection - Identify critical missing information
    const t2 = Date.now();
    const gaps = await gapDetectionController.identifyGaps(projectId, analysis, allData.projectData, allData.gapData);
    Logger.info('entrypoint.web', 'timing:gapDetectionMs', { ms: Date.now() - t2 });
    
    // Update gap data from analysis
    if (gaps.gapData) {
        allData.gapData = gaps.gapData;
    }
    if (processingId) {
        await redisData.saveProcessing(processingId, { 
            status: 'processing', 
            stage: 'gap_detection', 
            updatedAt: Date.now(),
            message: "🎯 Identifying missing information...",
            progress: 40
        });
    }
    
    // 3. Action Planning - Plan optimal next action
    const t3 = Date.now();
    const actionPlan = await actionPlanningController.planAction(projectId, userId, gaps, analysis, allData.chatHistory, allData.learningData);
    Logger.info('entrypoint.web', 'timing:actionPlanningMs', { ms: Date.now() - t3 });
    
    // Update learning data from action planning
    if (actionPlan.updatedLearningData) {
        allData.learningData = actionPlan.updatedLearningData;
    }
    if (processingId) {
        await redisData.saveProcessing(processingId, { 
            status: 'processing', 
            stage: 'planning', 
            updatedAt: Date.now(),
            message: "📋 Planning next steps...",
            progress: 60
        });
    }
    
    // 4. Execution - Execute planned action and process user response
    const t4 = Date.now();
    const execution = await executionController.executeAction(projectId, userId, message, actionPlan, allData.projectData);
    Logger.info('entrypoint.web', 'timing:executionMs', { ms: Date.now() - t4 });
    // Attach gaps (including todos) into analysis for rendering inline checklist
    execution.analysis = execution.analysis || {};
    execution.analysis.gaps = gaps;
    if (processingId) {
        await redisData.saveProcessing(processingId, { 
            status: 'processing', 
            stage: 'execution', 
            updatedAt: Date.now(),
            message: "💬 Generating response...",
            progress: 90
        });
    }
    
    // 5. Learning - Learn from interaction and adapt (run in background)
    const t5 = Date.now();
    // Run learning in background - don't await, don't block response
    learningController.learnFromInteraction(projectId, userId, message, execution, allData.chatHistory, allData.learningData, allData.reflectionData)
        .then((result) => {
            Logger.info('entrypoint.web', 'timing:learningMs:background', { ms: Date.now() - t5 });
            Logger.info('entrypoint.web', 'backgroundLearning:completed', { projectId, userId });
            
            // Update data with learning results (for next interaction)
            if (result.updatedLearningData) {
                allData.learningData = result.updatedLearningData;
            }
            if (result.updatedReflectionData) {
                allData.reflectionData = result.updatedReflectionData;
            }
            
            // Save updated learning data in background
            redisData.saveAllData(projectId, userId, allData).catch(console.error);
        })
        .catch((error) => {
            Logger.error('entrypoint.web', 'backgroundLearning:error', error);
        });
    
    // Save all updated data in a single Redis operation
    const dataSaveStart = Date.now();
    await redisData.saveAllData(projectId, userId, allData);
    Logger.info('entrypoint.web', 'timing:dataSaveMs', { ms: Date.now() - dataSaveStart });
    
    Logger.info('entrypoint.web', 'processIntelligenceLoop:end', { action: actionPlan?.action });
    Logger.info('entrypoint.web', 'timing:intelligenceLoopMs', { ms: Date.now() - loopStart });
    
    return execution;
}

// Lightweight polling: start async processing and return processingId immediately
async function startProcessing(projectId, userId, sessionId, message) {
    const processingId = `proc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    // Save initial processing status
    await redisData.saveProcessing(processingId, { 
        status: 'processing', 
        stage: 'queued', 
        startedAt: Date.now(),
        message: "🤔 Analyzing your project...",
        progress: 10
    });
    
    // Kick off in background (no await)
    (async () => {
        const result = await processChatMessage(projectId, userId, message, sessionId, processingId);
        const payload = result.success
            ? { status: 'complete', conversation: [{ type: 'assistant', content: result.message, timestamp: new Date().toISOString() }], projectData: result.projectData, analysis: result.analysis, todos: (result.analysis && result.analysis.gaps && result.analysis.gaps.todos) ? result.analysis.gaps.todos : [] }
            : { status: 'error', error: result.error || 'processing failed' };
        
        await redisData.saveProcessing(processingId, payload);
    })();
    
    return { 
        success: true, 
        processingId, 
        status: 'processing',
        message: "🤔 Analyzing your project...",
        progress: 10
    };
}

async function getProcessingStatus(processingId) {
    if (!processingId) return { success: false, status: 'error', error: 'missing processingId' };
    const payload = await redisData.getProcessing(processingId);
    if (!payload) return { success: true, status: 'processing' };
    return { success: true, ...payload };
}

// Initialize new project
export async function initializeProject(projectId, userId, initialMessage) {
    try {
        const allData = {
            projectData: redisData.createDefaultProjectData(projectId),
            chatHistory: [],
            knowledgeData: redisData.createDefaultKnowledgeData(projectId),
            gapData: redisData.createDefaultGapData(projectId),
            learningData: redisData.createDefaultLearningData(userId),
            reflectionData: redisData.createDefaultReflectionData(projectId)
        };
        
        await redisData.saveAllData(projectId, userId, allData);
        
        // Process initial message
        return await processChatMessage(projectId, userId, initialMessage, `session_${Date.now()}`, null);
        
    } catch (error) {
        console.error('Error initializing project:', error);
        return {
            success: false,
            message: "I encountered an error initializing your project. Please try again.",
            error: error.message
        };
    }
}

// Get project status
export async function getProjectStatus(projectId, userId) {
    try {
        const allData = await redisData.loadAllData(projectId, userId);
        const pData = allData.projectData;
        const chatHistory = allData.chatHistory;
        
        if (!pData) {
            return {
                success: false,
                message: "Project not found"
            };
        }
        
        return {
            success: true,
            projectData: pData,
            chatHistory: chatHistory,
            messageCount: chatHistory.length
        };
        
    } catch (error) {
        console.error('Error getting project status:', error);
        return {
            success: false,
            message: "Error retrieving project status",
            error: error.message
        };
    }
}

// Get chat history
export async function getProjectChatHistory(projectId, userId) {
    try {
        const allData = await redisData.loadAllData(projectId, userId);
        const chatHistory = allData.chatHistory;
        return {
            success: true,
            chatHistory: chatHistory
        };
    } catch (error) {
        console.error('Error getting chat history:', error);
        return {
            success: false,
            message: "Error retrieving chat history",
            error: error.message
        };
    }
}

// Update project data manually
export async function updateProjectData(projectId, userId, updates) {
    try {
        const allData = await redisData.loadAllData(projectId, userId);
        const pData = allData.projectData;
        if (!pData) {
            return {
                success: false,
                message: "Project not found"
            };
        }
        
        // Update project data
        Object.assign(pData, updates);
        pData.updatedAt = new Date().toISOString();
        
        await redisData.saveAllData(projectId, userId, allData);
        
        return {
            success: true,
            projectData: pData,
            message: "Project data updated successfully"
        };
        
    } catch (error) {
        console.error('Error updating project data:', error);
        return {
            success: false,
            message: "Error updating project data",
            error: error.message
        };
    }
}

// Trigger intelligence analysis
export async function triggerAnalysis(projectId, userId) {
    try {
        const allData = await redisData.loadAllData(projectId, userId);
        const pData = allData.projectData;
        const chatHistory = allData.chatHistory;
        
        if (!pData) {
            return {
                success: false,
                message: "Project not found"
            };
        }
        
        // Run analysis without user input
        const analysis = await selfAnalysisController.analyzeProject(projectId, pData, chatHistory);
        const gaps = await gapDetectionController.identifyGaps(projectId, analysis, pData);
        
        return {
            success: true,
            analysis: analysis,
            gaps: gaps,
            message: "Analysis completed"
        };
        
    } catch (error) {
        console.error('Error triggering analysis:', error);
        return {
            success: false,
            message: "Error running analysis",
            error: error.message
        };
    }
}
