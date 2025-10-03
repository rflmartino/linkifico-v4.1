// entrypoint.web.js - Main entry point for intelligent project management chat
// Integrates with chat UI and orchestrates the 5-controller intelligence system

import { redisData } from './data/redisData.js';
import { addProjectToUser } from './data/projectData.js';

import { selfAnalysisController } from './controllers/selfAnalysisController.js';
import { gapDetectionController } from './controllers/gapDetectionController.js';
import { actionPlanningController } from './controllers/actionPlanningController.js';
import { executionController } from './controllers/executionController.js';
import { learningController } from './controllers/learningController.js';
import { portfolioController } from './controllers/portfolioController.js';
import { Permissions, webMethod } from 'wix-web-module';
import { Logger } from './utils/logger.js';
import { getTemplate } from './templates/templatesRegistry.js';

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
        const templateName = (payload && payload.templateName) || 'simple_waterfall';
        return await initializeProject(projectId, userId, initialMessage, templateName, (payload && payload.projectName) || 'Untitled Project');
    }
    if (op === 'status') {
        return await getProjectStatus(projectId);
    }
    if (op === 'history') {
        return await getProjectChatHistory(projectId, userId);
    }
    if (op === 'update') {
        const updates = (payload && payload.updates) || {};
        return await updateProjectData(projectId, updates);
    }
    if (op === 'analyze') {
        return await triggerAnalysis(projectId);
    }
    
    // Portfolio operations
    if (op === 'loadPortfolio') {
        return await portfolioController.getUserPortfolio(userId);
    }
    if (op === 'archiveProject') {
        return await portfolioController.archiveProject(userId, payload?.projectId || projectId);
    }
    if (op === 'restoreProject') {
        return await portfolioController.restoreProject(userId, payload?.projectId || projectId);
    }
    if (op === 'deleteProject') {
        return await portfolioController.deleteProject(userId, payload?.projectId || projectId);
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
        
        // Add user message to history (only if not already present)
        const userMessageExists = chatHistory.some(msg => 
            msg.role === 'user' && 
            msg.message === message && 
            msg.sessionId === sessionId
        );
        
        if (!userMessageExists) {
            chatHistory.push({
                role: 'user',
                message: message,
                timestamp: new Date().toISOString(),
                sessionId: sessionId
            });
        }

        // Update chat history in allData
        allData.chatHistory = chatHistory;

        // CRITICAL: Pass the updated chat history to processIntelligenceLoop
        // so it doesn't get overwritten when loading fresh data from Redis
        Logger.info('entrypoint.web', 'processChatMessage:beforeIntelligenceLoop', {
            projectId,
            userId,
            allDataKeys: Object.keys(allData),
            chatHistoryLength: allData.chatHistory ? allData.chatHistory.length : 0
        });
        
        const response = await processIntelligenceLoop(projectId, userId, message, processingId, allData);
        
        Logger.info('entrypoint.web', 'processChatMessage:afterIntelligenceLoop', {
            projectId,
            userId,
            hasResponse: !!response,
            responseMessage: response ? response.message : 'NO RESPONSE',
            responseMessageLength: response && response.message ? response.message.length : 0
        });

        // Do not inline todos into the assistant message; keep narrative separate from structured todos
        const finalMessage = response.message;

        // CRITICAL DEBUG: Log what AI response we received
        Logger.info('entrypoint.web', 'processChatMessage:aiResponse', {
            projectId,
            userId,
            responseMessage: response.message,
            responseMessageLength: response.message ? response.message.length : 0,
            hasAnalysis: !!response.analysis,
            hasTodos: !!(response.analysis && response.analysis.gaps && response.analysis.gaps.todos),
            todoCount: response.analysis && response.analysis.gaps && response.analysis.gaps.todos ? response.analysis.gaps.todos.length : 0,
            fullResponse: response
        });

        // Add AI response to history
        chatHistory.push({
            role: 'assistant',
            message: response.message,
            timestamp: new Date().toISOString(),
            sessionId: sessionId,
            analysis: response.analysis
        });

        // CRITICAL DEBUG: Log what we're about to save
        Logger.info('entrypoint.web', 'processChatMessage:beforeSave', {
            projectId,
            userId,
            chatHistoryLength: chatHistory.length,
            chatHistoryType: typeof chatHistory,
            chatHistoryIsArray: Array.isArray(chatHistory),
            chatHistoryValue: chatHistory,
            lastMessage: chatHistory[chatHistory.length - 1]
        });

        // Save final chat history with AI response
        allData.chatHistory = chatHistory;
        
        // CRITICAL: Save the updated chat history with AI response
        await redisData.saveAllData(projectId, userId, allData);
        
        Logger.info('entrypoint.web', 'processChatMessage:afterSave', {
            projectId,
            userId,
            chatHistoryLength: chatHistory.length,
            lastMessageRole: chatHistory[chatHistory.length - 1]?.role,
            lastMessageLength: chatHistory[chatHistory.length - 1]?.message?.length
        });

        const totalMs = Date.now() - totalStart;
        Logger.info('entrypoint.web', 'timing:processChatMessageMs', { ms: totalMs });
        // CRITICAL: Extract todos from multiple sources to ensure we don't lose them
        const todosFromAnalysis = (response.analysis && response.analysis.gaps && response.analysis.gaps.todos) ? response.analysis.gaps.todos : [];
        const todosFromAllData = allData.todos || [];
        const todosFromGaps = (response.analysis && response.analysis.todos) ? response.analysis.todos : [];
        
        // Use the first available source
        const finalTodos = todosFromAnalysis.length > 0 ? todosFromAnalysis :
                          todosFromAllData.length > 0 ? todosFromAllData :
                          todosFromGaps;
        
        Logger.info('entrypoint.web', 'processChatMessage:finalTodos', {
            projectId,
            userId,
            todosFromAnalysis: todosFromAnalysis.length,
            todosFromAllData: todosFromAllData.length,
            todosFromGaps: todosFromGaps.length,
            finalTodos: finalTodos.length,
            finalTodosSample: finalTodos.slice(0, 2).map(t => ({ id: t.id, title: t.title, completed: t.completed }))
        });
        
        const result = {
            success: true,
            message: finalMessage,
            analysis: response.analysis,
            todos: finalTodos,
            projectData: allData.projectData,
            projectName: allData.projectData?.name || 'Untitled Project',
            projectEmail: allData.projectData?.email || null
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
async function processIntelligenceLoop(projectId, userId, message, processingId, existingAllData = null) {
    Logger.info('entrypoint.web', 'processIntelligenceLoop:start', { 
        projectId, 
        userId, 
        hasExistingData: !!existingAllData,
        existingDataKeys: existingAllData ? Object.keys(existingAllData) : 'none'
    });
    const loopStart = Date.now();
    
    // Load all data in a single Redis operation (or use existing data if provided)
    const dataLoadStart = Date.now();
    let allData = existingAllData || await redisData.loadAllData(projectId, userId);
    Logger.info('entrypoint.web', 'timing:dataLoadMs', { ms: Date.now() - dataLoadStart });
    
    Logger.info('entrypoint.web', 'processIntelligenceLoop:dataLoaded', {
        projectId,
        userId,
        allDataKeys: Object.keys(allData),
        chatHistoryLength: allData.chatHistory ? allData.chatHistory.length : 0
    });
    
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
    const templateName = allData?.projectData?.templateName || 'simple_waterfall';
    const template = getTemplate(templateName);
    const analysis = await selfAnalysisController.analyzeProject(projectId, allData.projectData, allData.chatHistory, allData.knowledgeData, template);
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
    const gaps = await gapDetectionController.identifyGaps(projectId, analysis, allData.projectData, allData.gapData, template);
    Logger.info('entrypoint.web', 'timing:gapDetectionMs', { ms: Date.now() - t2 });
    
    // CRITICAL DEBUG: Log gaps received from gap detection
    Logger.info('entrypoint.web', 'processIntelligenceLoop:gapsReceived', {
        projectId,
        userId,
        gapsKeys: gaps ? Object.keys(gaps) : [],
        hasTodos: !!(gaps && gaps.todos),
        todosCount: gaps && gaps.todos ? gaps.todos.length : 0
    });
    
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
    const actionPlan = await actionPlanningController.planAction(projectId, userId, gaps, analysis, allData.chatHistory, allData.learningData, template);
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
    const execution = await executionController.executeAction(projectId, userId, message, actionPlan, allData.projectData, template);
    Logger.info('entrypoint.web', 'timing:executionMs', { ms: Date.now() - t4 });
    
    // CRITICAL DEBUG: Log what execution controller generated
    Logger.info('entrypoint.web', 'processIntelligenceLoop:executionResult', {
        projectId,
        userId,
        executionMessage: execution.message,
        executionMessageLength: execution.message ? execution.message.length : 0,
        hasExecutionAnalysis: !!execution.analysis,
        executionAnalysis: execution.analysis,
        fullExecution: execution
    });
    
    // Attach gaps (including todos) into analysis for rendering inline checklist
    // Extract todos from gaps first (outside try-catch for scope)
    const todos = gaps.todos || [];
    
    // CRITICAL DEBUG: Log todos received from gap detection
    Logger.info('entrypoint.web', 'processIntelligenceLoop:todosReceived', {
        projectId,
        userId,
        todosCount: todos.length,
        todosIds: todos.map(t => t.id),
        gapsKeys: gaps ? Object.keys(gaps) : []
    });
    
    try {
        execution.analysis = execution.analysis || {};
        execution.analysis.gaps = gaps;
        
        // Ensure todos are properly attached
        execution.analysis.todos = todos;
        
        // Also ensure todos are in the gaps object for backward compatibility
        if (!execution.analysis.gaps.todos && todos.length > 0) {
            execution.analysis.gaps.todos = todos;
        }
        
        Logger.info('entrypoint.web', 'processIntelligenceLoop:gapsAttached', {
            projectId,
            userId,
            hasGaps: !!gaps,
            gapsKeys: gaps ? Object.keys(gaps) : [],
            todosExtracted: todos.length,
            todosStructure: todos.length > 0 ? todos[0] : null
        });
        
    } catch (error) {
        Logger.error('entrypoint.web', 'processIntelligenceLoop:gapsAttachmentError', error);
        // Continue execution even if gap attachment fails
    }
    
    // CRITICAL DEBUG: Log final execution result with gaps and todos
    Logger.info('entrypoint.web', 'processIntelligenceLoop:finalExecution', {
        projectId,
        userId,
        finalMessage: execution.message,
        finalAnalysis: execution.analysis,
        hasGaps: !!execution.analysis.gaps,
        hasTodos: !!(execution.analysis.gaps && execution.analysis.gaps.todos),
        todoCount: execution.analysis.gaps && execution.analysis.gaps.todos ? execution.analysis.gaps.todos.length : 0,
        todosExtracted: todos.length,
        todosStructure: todos.length > 0 ? todos[0] : null
    });
    
    // DEBUG: Log that we're about to process todos
    Logger.info('entrypoint.web', 'processIntelligenceLoop:aboutToProcessTodos', {
        projectId,
        userId,
        todosLength: todos.length,
        todosExists: !!todos,
        allDataExists: !!allData
    });
    if (processingId) {
        await redisData.saveProcessing(processingId, { 
            status: 'processing', 
            stage: 'execution', 
            updatedAt: Date.now(),
            message: "💬 Generating response...",
            progress: 90
        });
    }
    
    // DEBUG: Log that we're about to save todos
    Logger.info('entrypoint.web', 'processIntelligenceLoop:aboutToSaveTodos', {
        projectId,
        userId,
        todosLength: todos.length,
        todosExists: !!todos,
        allDataExists: !!allData
    });
    
    // Ensure todos are included in allData for Redis storage BEFORE learning phase
    try {
        if (todos && todos.length > 0) {
            allData.todos = todos;
            Logger.info('entrypoint.web', 'todosAddedToAllData', { 
                projectId, 
                userId, 
                todoCount: todos.length,
                todos: todos.map(t => ({ id: t.id, title: t.title, completed: t.completed })),
                allDataKeys: Object.keys(allData),
                allDataTodosAfter: allData.todos ? allData.todos.length : 0
            });
        } else {
            Logger.info('entrypoint.web', 'todosAddedToAllData:noTodos', { 
                projectId, 
                userId, 
                todosVariable: todos,
                todosLength: todos ? todos.length : 'undefined',
                todosType: typeof todos,
                todosIsArray: Array.isArray(todos)
            });
        }
    } catch (error) {
        Logger.error('entrypoint.web', 'todosAddedToAllData:error', error);
    }
    
    // Save all updated data in a single Redis operation BEFORE learning phase
    const dataSaveStart = Date.now();
    await redisData.saveAllData(projectId, userId, allData);
    Logger.info('entrypoint.web', 'timing:dataSaveMs', { ms: Date.now() - dataSaveStart });
    
    // DEBUG: Log that we're about to start learning phase
    Logger.info('entrypoint.web', 'processIntelligenceLoop:aboutToStartLearning', {
        projectId,
        userId,
        todosLength: todos.length
    });
    
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
            ? { 
                status: 'complete', 
                conversation: [{ type: 'assistant', content: result.message, timestamp: new Date().toISOString() }], 
                projectData: result.projectData, 
                analysis: result.analysis, 
                todos: result.todos || (result.analysis && result.analysis.gaps && result.analysis.gaps.todos) ? result.analysis.gaps.todos : []
            }
            : { status: 'error', error: result.error || 'processing failed' };
        
        // CRITICAL DEBUG: Log what we're saving to processing status
        Logger.info('entrypoint.web', 'startProcessing:payload', {
            projectId,
            userId,
            hasTodos: !!(payload.todos && payload.todos.length > 0),
            todoCount: payload.todos ? payload.todos.length : 0,
            todosSample: payload.todos ? payload.todos.slice(0, 2).map(t => ({ id: t.id, title: t.title, completed: t.completed })) : 'none'
        });
        
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
    
    // CRITICAL DEBUG: Log what we're returning from processing status
    Logger.info('entrypoint.web', 'getProcessingStatus:returning', {
        processingId,
        status: payload.status,
        hasTodos: !!(payload.todos && payload.todos.length > 0),
        todoCount: payload.todos ? payload.todos.length : 0,
        todosSample: payload.todos ? payload.todos.slice(0, 2).map(t => ({ id: t.id, title: t.title, completed: t.completed })) : 'none'
    });
    
    return { success: true, ...payload };
}

// Initialize new project
export async function initializeProject(projectId, userId, initialMessage, templateName = 'simple_waterfall', projectName = 'Untitled Project') {
    try {
        // Generate unique project email
        const { emailId, email } = await redisData.generateUniqueProjectEmail();
        
        const allData = {
            projectData: redisData.createDefaultProjectData(projectId),
            chatHistory: [],
            knowledgeData: redisData.createDefaultKnowledgeData(projectId),
            gapData: redisData.createDefaultGapData(projectId),
            learningData: redisData.createDefaultLearningData(userId),
            reflectionData: redisData.createDefaultReflectionData(projectId)
        };
        
        // Ensure templateName, projectName, and email are stored on creation
        allData.projectData.templateName = templateName;
        allData.projectData.name = projectName;
        allData.projectData.email = email;
        allData.projectData.emailId = emailId;
        
        // Try to generate intelligent project name from initial message if it's not just "Start"
        if (initialMessage && initialMessage.trim() !== 'Start' && initialMessage.trim() !== '') {
            try {
                const generatedName = await executionController.generateIntelligentProjectName(
                    initialMessage, 
                    null, 
                    allData.projectData
                );
                
                if (generatedName && generatedName !== 'Untitled Project') {
                    allData.projectData.name = generatedName;
                    Logger.info('entrypoint.web', 'initializeProject:nameGenerated', {
                        projectId,
                        userId,
                        initialMessage: initialMessage.substring(0, 100),
                        generatedName,
                        method: 'initialization'
                    });
                }
            } catch (error) {
                Logger.error('entrypoint.web', 'initializeProject:nameGenerationError', error);
                // Don't fail initialization if name generation fails
            }
        }
        
        // Save project data (including empty chat history), email mapping, and add to user's project list atomically
        await Promise.all([
            redisData.saveAllData(projectId, userId, allData),
            redisData.saveEmailMapping(email, projectId),
            addProjectToUser(userId, projectId, 'active')
        ]);
        
        // CRITICAL: Save user's initial message to Redis immediately so workspace can see it
        const sessionId = `session_${Date.now()}`;
        const userMessage = {
            role: 'user',
            message: initialMessage,
            timestamp: new Date().toISOString(),
            sessionId: sessionId
        };
        
        // Add user message to chat history and save immediately
        allData.chatHistory.push(userMessage);
        
        // CRITICAL DEBUG: Log what we're about to save
        Logger.info('entrypoint.web', 'initializeProject:beforeSave', {
            projectId,
            userId,
            chatHistoryType: typeof allData.chatHistory,
            chatHistoryIsArray: Array.isArray(allData.chatHistory),
            chatHistoryLength: allData.chatHistory.length,
            chatHistoryValue: allData.chatHistory,
            userMessage: userMessage
        });
        
        await redisData.saveAllData(projectId, userId, allData);
        
        // Return success immediately - let frontend handle AI processing via polling
        Logger.info('entrypoint.web', 'initializeProject:success', {
            projectId,
            userId,
            projectName: allData.projectData.name,
            chatHistoryLength: allData.chatHistory.length
        });
        
        return {
            success: true,
            message: "Project initialized successfully. AI processing will begin shortly.",
            projectData: allData.projectData,
            projectName: allData.projectData.name,
            projectEmail: allData.projectData.email
        };
        
    } catch (error) {
        Logger.error('entrypoint.web', 'initializeProject', error);
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
        const gapData = allData.gapData;
        
        if (!pData) {
            return {
                success: false,
                message: "Project not found"
            };
        }
        
        // Extract todos from multiple sources with better debugging
        const gapTodos = gapData?.todos || [];
        const allDataTodos = allData.todos || [];
        const savedTodos = await redisData.getTodos(projectId, userId);
        
        // CRITICAL DEBUG: Log all todo sources
        Logger.info('entrypoint.web', 'getProjectStatus:todoSources', {
            projectId,
            userId,
            gapTodosCount: gapTodos.length,
            allDataTodosCount: allDataTodos.length,
            savedTodosCount: savedTodos.length,
            gapTodosSample: gapTodos.slice(0, 2),
            allDataTodosSample: allDataTodos.slice(0, 2),
            savedTodosSample: savedTodos.slice(0, 2)
        });
        
        // Use the first available source: allData.todos > savedTodos > gapTodos
        const todos = allDataTodos.length > 0 ? allDataTodos : 
                     savedTodos.length > 0 ? savedTodos : gapTodos;
        
        Logger.info('entrypoint.web', 'getProjectStatus:todos', {
            projectId,
            userId,
            gapTodosCount: gapTodos.length,
            allDataTodosCount: allDataTodos.length,
            savedTodosCount: savedTodos.length,
            finalTodosCount: todos.length,
            todosSource: allDataTodos.length > 0 ? 'allData' : 
                        savedTodos.length > 0 ? 'saved' : 'gap'
        });
        
        return {
            success: true,
            projectData: pData,
            projectEmail: pData?.email || null,
            chatHistory: chatHistory,
            messageCount: chatHistory.length,
            todos: todos
        };
        
    } catch (error) {
        Logger.error('entrypoint.web', 'getProjectStatus', error);
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
        
        // Debug logging to see what we're actually getting
        Logger.info('entrypoint.web', 'getProjectChatHistory:debug', {
            projectId,
            userId,
            historyLength: chatHistory ? chatHistory.length : 0,
            historyType: typeof chatHistory,
            historySample: chatHistory && chatHistory.length > 0 ? chatHistory.slice(0, 2) : 'empty'
        });
        
        return {
            success: true,
            chatHistory: chatHistory,
            history: chatHistory // Alias for compatibility
        };
    } catch (error) {
        Logger.error('entrypoint.web', 'getProjectChatHistory', error);
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
        Logger.error('entrypoint.web', 'updateProjectData', error);
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
        Logger.error('entrypoint.web', 'triggerAnalysis', error);
        return {
            success: false,
            message: "Error running analysis",
            error: error.message
        };
    }
}
