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

// Main job queue function - all operations go through job queue
export const processUserRequest = webMethod(Permissions.Anyone, async (requestData) => {
    const { op, projectId, userId, sessionId, payload = {} } = requestData || {};
    if (!op || !projectId) {
        return { success: false, message: 'Invalid request' };
    }
    
    // Essential handshake logging - only for key operations
    if (op === 'startProcessing' || op === 'sendMessage' || op === 'init') {
        Logger.info('entrypoint', 'operation_start', { op, projectId, userId });
    }
    
    // Job queue operations
    if (op === 'submitJob') {
        return await submitJob(projectId, userId, sessionId, payload);
    }
    if (op === 'getJobStatus') {
        return await getJobStatus(payload?.jobId);
    }
    if (op === 'getJobResults') {
        return await getJobResults(payload?.jobId);
    }
    if (op === 'processJobs') {
        return await processQueuedJobs(payload?.limit || 5);
    }
    
    // Legacy operations (for backward compatibility during transition)
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
    
    Logger.warn('entrypoint', 'unknown_operation', { op, projectId, userId });
    return { success: false, message: 'Unknown op' };
});

async function processChatMessage(projectId, userId, message, sessionId, processingId = null) {
    try {
        // Load all data - essential handshake point
        let allData = await redisData.loadAllData(projectId, userId);
        if (!allData.projectData) {
            allData.projectData = redisData.createDefaultProjectData(projectId);
        }
        
        // Add user message to history
        let chatHistory = allData.chatHistory || [];
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

        allData.chatHistory = chatHistory;
        
        // Process through intelligence loop - key handshake point
        const response = await processIntelligenceLoop(projectId, userId, message, processingId, allData);

        // Add AI response to history
        chatHistory.push({
            role: 'assistant',
            message: response.message,
            timestamp: new Date().toISOString(),
            sessionId: sessionId,
            analysis: response.analysis
        });

        allData.chatHistory = chatHistory;
        
        // Save all data - essential handshake point
        await redisData.saveAllData(projectId, userId, allData);
        
        // Extract todos from response
        const todosFromAnalysis = (response.analysis && response.analysis.gaps && response.analysis.gaps.todos) ? response.analysis.gaps.todos : [];
        const todosFromAllData = allData.todos || [];
        const todosFromGaps = (response.analysis && response.analysis.todos) ? response.analysis.todos : [];
        
        const finalTodos = todosFromAnalysis.length > 0 ? todosFromAnalysis :
                          todosFromAllData.length > 0 ? todosFromAllData :
                          todosFromGaps;
        
        const result = {
            success: true,
            message: response.message,
            analysis: response.analysis,
            todos: finalTodos,
            projectData: allData.projectData,
            projectName: allData.projectData?.name || 'Untitled Project',
            projectEmail: allData.projectData?.email || null
        };
        
        // Essential handshake logging - operation complete
        Logger.info('entrypoint', 'operation_complete', { 
            projectId, 
            userId, 
            todos: result.todos?.length || 0,
            messageLength: result.message?.length || 0
        });
        
        return result;

    } catch (error) {
        Logger.error('entrypoint', 'operation_error', { projectId, userId, error: error.message });
        return {
            success: false,
            message: "I encountered an error processing your message. Please try again.",
            error: error.message
        };
    }
}

// Intelligence processing loop
async function processIntelligenceLoop(projectId, userId, message, processingId, existingAllData = null) {
    try {
        // Load or use existing data
        let allData = existingAllData || await redisData.loadAllData(projectId, userId);
        
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
    
        // 1. Self Analysis - Essential handshake point
        const templateName = allData?.projectData?.templateName || 'simple_waterfall';
        const template = getTemplate(templateName);
        const analysis = await selfAnalysisController.analyzeProject(projectId, allData.projectData, allData.chatHistory, allData.knowledgeData, template);
        
        if (analysis.knowledgeData) {
            allData.knowledgeData = analysis.knowledgeData;
        }
        
        // 2. Gap Detection - Essential handshake point  
        const gaps = await gapDetectionController.identifyGaps(projectId, analysis, allData.projectData, allData.gapData, template);
        
        if (gaps.gapData) {
            allData.gapData = gaps.gapData;
        }
        
        // 3. Action Planning - Essential handshake point
        const actionPlan = await actionPlanningController.planAction(projectId, userId, gaps, analysis, allData.chatHistory, allData.learningData, template);
        
        if (actionPlan.updatedLearningData) {
            allData.learningData = actionPlan.updatedLearningData;
        }
        
        // 4. Execution - Essential handshake point
        const execution = await executionController.executeAction(projectId, userId, message, actionPlan, allData.projectData, template);
        
        // Attach gaps and todos to execution result
        const todos = gaps.todos || [];
        execution.analysis = execution.analysis || {};
        execution.analysis.gaps = gaps;
        execution.analysis.todos = todos;
        
        if (!execution.analysis.gaps.todos && todos.length > 0) {
            execution.analysis.gaps.todos = todos;
        }
        
        // Save todos to allData for Redis storage
        if (todos && todos.length > 0) {
            allData.todos = todos;
        }
        
        // Save all data - essential handshake point
        await redisData.saveAllData(projectId, userId, allData);
        
        // 5. Learning - Run in background (non-blocking)
        learningController.learnFromInteraction(projectId, userId, message, execution, allData.chatHistory, allData.learningData, allData.reflectionData)
            .then((result) => {
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
                Logger.error('entrypoint', 'learning_error', { projectId, userId, error: error.message });
            });
        
        return execution;
        
    } catch (error) {
        Logger.error('entrypoint', 'intelligence_loop_error', { projectId, userId, error: error.message });
        
        // Return a fallback response so the system doesn't completely break
        return {
            message: "I encountered an error while processing your request. Please try again.",
            analysis: null
        };
    }
}

// Lightweight polling: start async processing and return processingId immediately
async function startProcessing(projectId, userId, sessionId, message) {
    const processingId = `proc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    // Save initial processing status
    await redisData.saveProcessingStatus(processingId, { 
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
        
        await redisData.saveProcessingStatus(processingId, payload);
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
    const payload = await redisData.getProcessingStatus(processingId);
    if (!payload) return { success: true, status: 'processing' };
    
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
        Logger.error('entrypoint', 'triggerAnalysis_error', { projectId, userId, error: error.message });
        return {
            success: false,
            message: "Error running analysis",
            error: error.message
        };
    }
}

// ============================================================================
// JOB QUEUE FUNCTIONS - New architecture for predictable processing
// ============================================================================

// Submit a job to the queue - returns jobId immediately
async function submitJob(projectId, userId, sessionId, payload) {
    try {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        
        // Create job in queue
        const job = {
            id: jobId,
            type: payload.jobType || 'sendMessage',
            projectId: projectId,
            userId: userId,
            sessionId: sessionId,
            input: payload,
            status: 'queued',
            createdAt: Date.now(),
            progress: 0
        };
        
        await redisData.saveJob(job);
        
        Logger.info('entrypoint', 'job_submitted', { jobId, projectId, userId, jobType: job.type });
        
        return {
            success: true,
            jobId: jobId,
            status: 'queued',
            message: 'Job submitted successfully'
        };
        
    } catch (error) {
        Logger.error('entrypoint', 'submitJob_error', { projectId, userId, error: error.message });
        return {
            success: false,
            message: 'Failed to submit job',
            error: error.message
        };
    }
}

// Get job status - for polling
async function getJobStatus(jobId) {
    try {
        if (!jobId) {
            return { success: false, message: 'Job ID required' };
        }
        
        const job = await redisData.getJob(jobId);
        
        if (!job) {
            return { success: false, message: 'Job not found' };
        }
        
        return {
            success: true,
            jobId: jobId,
            status: job.status,
            progress: job.progress || 0,
            message: job.message || 'Processing...',
            createdAt: job.createdAt
        };
        
    } catch (error) {
        Logger.error('entrypoint', 'getJobStatus_error', { jobId, error: error.message });
        return {
            success: false,
            message: 'Failed to get job status',
            error: error.message
        };
    }
}

// Get job results - only returns results when job is 100% complete
async function getJobResults(jobId) {
    try {
        if (!jobId) {
            return { success: false, message: 'Job ID required' };
        }
        
        const job = await redisData.getJob(jobId);
        
        if (!job) {
            return { success: false, message: 'Job not found' };
        }
        
        // If job is queued, process it now (on-demand processing)
        if (job.status === 'queued') {
            await processJob(jobId);
            // Refresh job data after processing
            const updatedJob = await redisData.getJob(jobId);
            if (updatedJob.status !== 'completed') {
                return {
                    success: true,
                    jobId: jobId,
                    status: updatedJob.status,
                    progress: updatedJob.progress || 0,
                    message: updatedJob.status === 'failed' ? updatedJob.error : 'Job processing...'
                };
            }
        }
        
        // Only return results if job is 100% complete
        if (job.status !== 'completed') {
            return {
                success: true,
                jobId: jobId,
                status: job.status,
                progress: job.progress || 0,
                message: job.status === 'failed' ? job.error : 'Job not yet complete'
            };
        }
        
        // Get complete results
        const results = await redisData.getJobResults(jobId);
        
        return {
            success: true,
            jobId: jobId,
            status: 'completed',
            results: results,
            completedAt: job.completedAt
        };
        
    } catch (error) {
        Logger.error('entrypoint', 'getJobResults_error', { jobId, error: error.message });
        return {
            success: false,
            message: 'Failed to get job results',
            error: error.message
        };
    }
}

// Process a single job - called by background worker
export async function processJob(jobId) {
    try {
        const job = await redisData.getJob(jobId);
        
        if (!job) {
            Logger.error('entrypoint', 'processJob_jobNotFound', { jobId });
            return;
        }
        
        // Mark job as processing
        await redisData.updateJobStatus(jobId, 'processing', 10, 'Starting processing...');
        
        let result;
        
        // Route to appropriate processor based on job type
        switch (job.type) {
            case 'sendMessage':
                result = await processJobMessage(job);
                break;
            case 'init':
                result = await processJobInit(job);
                break;
            case 'analyze':
                result = await processJobAnalyze(job);
                break;
            default:
                throw new Error(`Unknown job type: ${job.type}`);
        }
        
        // Save complete results
        await redisData.saveJobResults(jobId, result);
        
        // Mark job as completed
        await redisData.updateJobStatus(jobId, 'completed', 100, 'Processing complete');
        
        Logger.info('entrypoint', 'job_completed', { jobId, jobType: job.type });
        
    } catch (error) {
        Logger.error('entrypoint', 'processJob_error', { jobId, error: error.message });
        
        // Mark job as failed
        await redisData.updateJobStatus(jobId, 'failed', 0, `Processing failed: ${error.message}`);
    }
}

// Process message job
async function processJobMessage(job) {
    const { projectId, userId, sessionId, input } = job;
    
    // Update progress
    await redisData.updateJobStatus(job.id, 'processing', 20, 'Loading project data...');
    
    // Load all data
    let allData = await redisData.loadAllData(projectId, userId);
    if (!allData.projectData) {
        allData.projectData = redisData.createDefaultProjectData(projectId);
    }
    
    // Add user message to history
    let chatHistory = allData.chatHistory || [];
    const userMessageExists = chatHistory.some(msg => 
        msg.role === 'user' && 
        msg.message === input.message && 
        msg.sessionId === sessionId
    );
    
    if (!userMessageExists) {
        chatHistory.push({
            role: 'user',
            message: input.message,
            timestamp: new Date().toISOString(),
            sessionId: sessionId
        });
    }
    
    allData.chatHistory = chatHistory;
    
    // Update progress
    await redisData.updateJobStatus(job.id, 'processing', 40, 'Running intelligence analysis...');
    
    // Process through intelligence loop
    const response = await processIntelligenceLoop(projectId, userId, input.message, job.id, allData);
    
    // Update progress
    await redisData.updateJobStatus(job.id, 'processing', 80, 'Generating response...');
    
    // Add AI response to history
    chatHistory.push({
        role: 'assistant',
        message: response.message,
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        analysis: response.analysis
    });
    
    allData.chatHistory = chatHistory;
    
    // Save all data
    await redisData.saveAllData(projectId, userId, allData);
    
    // Update progress
    await redisData.updateJobStatus(job.id, 'processing', 90, 'Finalizing results...');
    
    // Extract todos
    const todosFromAnalysis = (response.analysis && response.analysis.gaps && response.analysis.gaps.todos) ? response.analysis.gaps.todos : [];
    const todosFromAllData = allData.todos || [];
    const todosFromGaps = (response.analysis && response.analysis.todos) ? response.analysis.todos : [];
    
    const finalTodos = todosFromAnalysis.length > 0 ? todosFromAnalysis :
                      todosFromAllData.length > 0 ? todosFromAllData :
                      todosFromGaps;
    
    // Return complete results
    return {
        aiResponse: response.message,
        todos: finalTodos,
        projectData: allData.projectData,
        analysis: response.analysis,
        chatHistory: chatHistory
    };
}

// Process init job
async function processJobInit(job) {
    const { projectId, userId, input } = job;
    
    await redisData.updateJobStatus(job.id, 'processing', 30, 'Initializing project...');
    
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
    
    // Set project details
    allData.projectData.templateName = input.templateName || 'simple_waterfall';
    allData.projectData.name = input.projectName || 'Untitled Project';
    allData.projectData.email = email;
    allData.projectData.emailId = emailId;
    
    await redisData.updateJobStatus(job.id, 'processing', 60, 'Saving project data...');
    
    // Save project data and add to user's project list
    await Promise.all([
        redisData.saveAllData(projectId, userId, allData),
        redisData.saveEmailMapping(email, projectId),
        addProjectToUser(userId, projectId, 'active')
    ]);
    
    // Add user message to chat history
    const userMessage = {
        role: 'user',
        message: input.initialMessage || 'Start',
        timestamp: new Date().toISOString(),
        sessionId: `session_${Date.now()}`
    };
    
    allData.chatHistory.push(userMessage);
    await redisData.saveAllData(projectId, userId, allData);
    
    return {
        projectData: allData.projectData,
        projectName: allData.projectData.name,
        projectEmail: allData.projectData.email,
        chatHistory: allData.chatHistory
    };
}

// Process analyze job
async function processJobAnalyze(job) {
    const { projectId, userId } = job;
    
    await redisData.updateJobStatus(job.id, 'processing', 50, 'Running analysis...');
    
    const allData = await redisData.loadAllData(projectId, userId);
    const pData = allData.projectData;
    const chatHistory = allData.chatHistory;
    
    if (!pData) {
        throw new Error('Project not found');
    }
    
    // Run analysis
    const analysis = await selfAnalysisController.analyzeProject(projectId, pData, chatHistory);
    const gaps = await gapDetectionController.identifyGaps(projectId, analysis, pData);
    
    return {
        analysis: analysis,
        gaps: gaps,
        message: 'Analysis completed'
    };
}

// Process queued jobs - can be called internally or externally
async function processQueuedJobs(limit = 5) {
    try {
        // Get queued jobs
        const queuedJobs = await redisData.getQueuedJobs(limit);
        
        if (queuedJobs.length === 0) {
            return { 
                success: true, 
                message: 'No jobs to process',
                processed: 0
            };
        }
        
        Logger.info('entrypoint', 'processing_jobs', { 
            jobCount: queuedJobs.length,
            jobIds: queuedJobs.map(j => j.id)
        });
        
        // Process jobs in parallel
        const processingPromises = queuedJobs.map(job => processJob(job.id));
        const results = await Promise.allSettled(processingPromises);
        
        // Count successful and failed jobs
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        // Clean up old completed jobs (run occasionally)
        if (Math.random() < 0.1) { // 10% chance
            await redisData.cleanupOldJobs();
        }
        
        return {
            success: true,
            processed: queuedJobs.length,
            successful: successful,
            failed: failed,
            jobIds: queuedJobs.map(j => j.id)
        };
        
    } catch (error) {
        Logger.error('entrypoint', 'processQueuedJobs_error', { error: error.message });
        return {
            success: false,
            error: error.message
        };
    }
}
