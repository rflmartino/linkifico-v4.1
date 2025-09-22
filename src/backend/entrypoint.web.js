// entrypoint.web.js - Main entry point for intelligent project management chat
// Integrates with chat UI and orchestrates the 5-controller intelligence system

import * as projectData from 'backend/projectData';

import { selfAnalysisController } from 'backend/selfAnalysisController';
import { gapDetectionController } from 'backend/gapDetectionController';
import { actionPlanningController } from 'backend/actionPlanningController';
import { executionController } from 'backend/executionController';
import { learningController } from 'backend/learningController';
import { Permissions, webMethod } from 'wix-web-module';
import { Logger } from 'backend/logger';

// Main chat processing function
export const processUserRequest = webMethod(Permissions.Anyone, async (requestData) => {
    Logger.info('entrypoint.web', 'processUserRequest:start', { op: requestData?.op, projectId: requestData?.projectId });
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
        return await processChatMessage(projectId, userId, message, sessionId);
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

async function processChatMessage(projectId, userId, message, sessionId) {
    try {
        Logger.info('entrypoint.web', 'processChatMessage:input', { projectId, userId, sessionId });
        // Get or create project data
        let pData = await projectData.getProjectData(projectId);
        if (!pData) {
            pData = projectData.createProjectData(projectId);
            await projectData.saveProjectData(projectId, pData);
        }

        // Get chat history
        let chatHistory = await projectData.getChatHistory(projectId);
        
        // Add user message to history
        chatHistory.push({
            role: 'user',
            message: message,
            timestamp: new Date().toISOString(),
            sessionId: sessionId
        });

        // Save updated chat history
        await projectData.saveChatHistory(projectId, chatHistory);

        // Process through intelligence controllers
        const response = await processIntelligenceLoop(projectId, userId, message, pData, chatHistory);

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

        // Save final chat history
        await projectData.saveChatHistory(projectId, chatHistory);

        const result = {
            success: true,
            message: finalMessage,
            analysis: response.analysis,
            todos: (response.analysis && response.analysis.gaps && response.analysis.gaps.todos) ? response.analysis.gaps.todos : [],
            projectData: pData
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
async function processIntelligenceLoop(projectId, userId, message, projectData, chatHistory) {
    Logger.info('entrypoint.web', 'processIntelligenceLoop:start', { projectId });
    // 1. Self Analysis - Analyze current project knowledge
    const analysis = await selfAnalysisController.analyzeProject(projectId, projectData, chatHistory);
    
    // 2. Gap Detection - Identify critical missing information
    const gaps = await gapDetectionController.identifyGaps(projectId, analysis, projectData);
    
    // 3. Action Planning - Plan optimal next action
    const actionPlan = await actionPlanningController.planAction(projectId, userId, gaps, analysis, chatHistory);
    
    // 4. Execution - Execute planned action and process user response
    const execution = await executionController.executeAction(projectId, userId, message, actionPlan, projectData);
    // Attach gaps (including todos) into analysis for rendering inline checklist
    execution.analysis = execution.analysis || {};
    execution.analysis.gaps = gaps;
    
    // 5. Learning - Learn from interaction and adapt
    await learningController.learnFromInteraction(projectId, userId, message, execution, chatHistory);
    Logger.info('entrypoint.web', 'processIntelligenceLoop:end', { action: actionPlan?.action });
    
    return execution;
}

// Lightweight polling: start async processing and return processingId immediately
async function startProcessing(projectId, userId, sessionId, message) {
    const processingId = `proc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await projectData.saveProcessing(processingId, { status: 'processing', startedAt: Date.now() });
    
    // Kick off in background (no await)
    (async () => {
        const result = await processChatMessage(projectId, userId, message, sessionId);
        const payload = result.success
            ? { status: 'complete', conversation: [{ type: 'assistant', content: result.message, timestamp: new Date().toISOString() }], projectData: result.projectData, analysis: result.analysis }
            : { status: 'error', error: result.error || 'processing failed' };
        await projectData.saveProcessing(processingId, payload);
    })();
    
    return { success: true, processingId, status: 'processing' };
}

async function getProcessingStatus(processingId) {
    if (!processingId) return { success: false, status: 'error', error: 'missing processingId' };
    const payload = await projectData.getProcessing(processingId);
    if (!payload) return { success: true, status: 'processing' };
    return { success: true, ...payload };
}

// Initialize new project
export async function initializeProject(projectId, userId, initialMessage) {
    try {
        const pData = projectData.createProjectData(projectId, {});
        await projectData.saveProjectData(projectId, pData);
        
        // Initialize empty chat history
        await projectData.saveChatHistory(projectId, []);
        
        // Process initial message
        return await processChatMessage(projectId, userId, initialMessage, `session_${Date.now()}`);
        
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
export async function getProjectStatus(projectId) {
    try {
        const pData = await projectData.getProjectData(projectId);
        const chatHistory = await projectData.getChatHistory(projectId);
        
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
export async function getProjectChatHistory(projectId) {
    try {
        const chatHistory = await projectData.getChatHistory(projectId);
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
export async function updateProjectData(projectId, updates) {
    try {
        const pData = await projectData.getProjectData(projectId);
        if (!pData) {
            return {
                success: false,
                message: "Project not found"
            };
        }
        
        // Update project data
        Object.assign(pData, updates);
        pData.updatedAt = new Date().toISOString();
        
        await projectData.saveProjectData(projectId, pData);
        
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
export async function triggerAnalysis(projectId) {
    try {
        const pData = await projectData.getProjectData(projectId);
        const chatHistory = await projectData.getChatHistory(projectId);
        
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
