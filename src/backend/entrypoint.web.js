// entrypoint.web.js - Main entry point for intelligent project management chat
// Integrates with chat UI and orchestrates the 5-controller intelligence system

import { 
    createProjectData, 
    getProjectData, 
    saveProjectData,
    getChatHistory,
    saveChatHistory,
    REDIS_KEYS 
} from 'backend/projectData';

import { selfAnalysisController } from 'backend/selfAnalysisController';
import { gapDetectionController } from 'backend/gapDetectionController';
import { actionPlanningController } from 'backend/actionPlanningController';
import { executionController } from 'backend/executionController';
import { learningController } from 'backend/learningController';
import { Permissions, webMethod } from 'wix-web-module';

// Main chat processing function
export const processUserRequest = webMethod(Permissions.Anyone, async (requestData) => {
    const { op, projectId, userId, sessionId, payload = {} } = requestData || {};
    if (!op || !projectId) {
        return { success: false, message: 'Invalid request' };
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
    
    return { success: false, message: 'Unknown op' };
});

async function processChatMessage(projectId, userId, message, sessionId) {
    try {
        // Get or create project data
        let projectData = await getProjectData(projectId);
        if (!projectData) {
            projectData = createProjectData(projectId);
            await saveProjectData(projectId, projectData);
        }

        // Get chat history
        let chatHistory = await getChatHistory(projectId);
        
        // Add user message to history
        chatHistory.push({
            role: 'user',
            message: message,
            timestamp: new Date().toISOString(),
            sessionId: sessionId
        });

        // Save updated chat history
        await saveChatHistory(projectId, chatHistory);

        // Process through intelligence controllers
        const response = await processIntelligenceLoop(projectId, userId, message, projectData, chatHistory);

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
        await saveChatHistory(projectId, chatHistory);

        return {
            success: true,
            message: finalMessage,
            analysis: response.analysis,
            todos: (response.analysis && response.analysis.gaps && response.analysis.gaps.todos) ? response.analysis.gaps.todos : [],
            projectData: projectData
        };

    } catch (error) {
        console.error('Error processing chat message:', error);
        return {
            success: false,
            message: "I encountered an error processing your message. Please try again.",
            error: error.message
        };
    }
}

// Intelligence processing loop
async function processIntelligenceLoop(projectId, userId, message, projectData, chatHistory) {
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
    
    return execution;
}

// Initialize new project
export async function initializeProject(projectId, userId, initialMessage) {
    try {
        const projectData = createProjectData(projectId, {});
        await saveProjectData(projectId, projectData);
        
        // Initialize empty chat history
        await saveChatHistory(projectId, []);
        
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
        const projectData = await getProjectData(projectId);
        const chatHistory = await getChatHistory(projectId);
        
        if (!projectData) {
            return {
                success: false,
                message: "Project not found"
            };
        }
        
        return {
            success: true,
            projectData: projectData,
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
        const chatHistory = await getChatHistory(projectId);
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
        const projectData = await getProjectData(projectId);
        if (!projectData) {
            return {
                success: false,
                message: "Project not found"
            };
        }
        
        // Update project data
        Object.assign(projectData, updates);
        projectData.updatedAt = new Date().toISOString();
        
        await saveProjectData(projectId, projectData);
        
        return {
            success: true,
            projectData: projectData,
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
        const projectData = await getProjectData(projectId);
        const chatHistory = await getChatHistory(projectId);
        
        if (!projectData) {
            return {
                success: false,
                message: "Project not found"
            };
        }
        
        // Run analysis without user input
        const analysis = await selfAnalysisController.analyzeProject(projectId, projectData, chatHistory);
        const gaps = await gapDetectionController.identifyGaps(projectId, analysis, projectData);
        
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
