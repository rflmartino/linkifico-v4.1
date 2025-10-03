// Project Workspace Page - Velo Frontend
// Handles project workspace functionality - receives userId and projectId from URL

import { processUserRequest } from 'backend/entrypoint.web.js';
import wixLocation from 'wix-location';
import { session } from 'wix-storage';
import { logToBackend } from 'backend/utils/webLogger.web.js';

// Essential logging function - only for key handshake points
function logHandshake(operation, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] 🔧 ${operation}`, data || '');
    logToBackend('Project-Workspace', operation, data);
}

$w.onReady(async function () {
    const chatEl = $w('#mainChatDisplay');

    // Get projectId and userId from URL parameters
    const projectId = wixLocation.query.projectId || generateNewProjectId();
    const userId = wixLocation.query.userId;
    
    // Validate required parameters
    if (!userId) {
        logHandshake('navigation_error', 'Missing userId parameter');
        wixLocation.to('/project-portfolio');
        return;
    }
    
    logHandshake('page_load', { projectId, userId, isNewProject: !wixLocation.query.projectId });

    let sessionId = session.getItem('chatSessionId');
    if (!sessionId) {
        sessionId = `sess_${Date.now()}`;
        session.setItem('chatSessionId', sessionId);
    }

	// Check for existing project and chat history
	let isNewSession = false;
	let existingHistory = [];
	let isNewProject = false;
	
	try {
		// Get project status and history
		const status = await processUserRequest({ op: 'status', projectId, userId }).catch(() => null);
		const historyResult = await processUserRequest({ op: 'history', projectId, userId }).catch(() => null);
		
		existingHistory = historyResult?.history || [];
		isNewSession = existingHistory.length === 0;
		
        const projectJustCreated = isProjectJustCreated();
        isNewProject = !status || status.success === false || (existingHistory.length <= 2 && projectJustCreated);
        
        // Update page elements for returning users
        if (!isNewSession && status?.success && !isNewProject) {
            await updatePageElements(status);
        }
	} catch (e) {
		logHandshake('backend_check_error', { error: e.message });
	}

	chatEl.onMessage(async (event) => {
        const data = (event && event.data) || {};
        const action = data.action;

        if (action === 'ready') {
            // Get current project info
            let currentProjectName = 'Project Chat';
            let currentProjectEmail = null;
            try {
                const status = await processUserRequest({ op: 'status', projectId, userId }).catch(() => null);
                
                if (status?.projectData?.name) {
                    currentProjectName = status.projectData.name;
                }
                if (status?.projectEmail) {
                    currentProjectEmail = status.projectEmail;
                }
            } catch (e) {
                logHandshake('project_info_error', { error: e.message });
            }
            
            chatEl.postMessage({
                action: 'initialize',
                sessionId,
                projectId,
                userId,
                projectName: currentProjectName
            });
            
            // Send project email if available
            if (currentProjectEmail) {
                setTimeout(() => {
                    chatEl.postMessage({ action: 'updateProjectEmail', projectEmail: currentProjectEmail });
                }, 100);
            }
            
            // Send appropriate content based on session type
            setTimeout(async () => {
                if (isNewProject) {
                    // Handle new project - show user message if exists
                    if (existingHistory.length > 0) {
                        const userMessage = existingHistory.find(msg => msg.role === 'user');
                        if (userMessage) {
                            chatEl.postMessage({
                                action: 'displayMessage',
                                type: 'user',
                                content: userMessage.message,
                                timestamp: userMessage.timestamp
                            });
                        }
                    }
                    
                    chatEl.postMessage({ action: 'updateStatus', status: 'processing' });
                    
                    // Start polling for AI response
                    setTimeout(() => {
                        pollForNewProjectResponse();
                    }, 1000);
                } else if (isNewSession) {
                    // Send welcome message for new sessions
                    chatEl.postMessage({
                        action: 'displayMessage',
                        type: 'assistant',
                        content: '👋 **Welcome to your AI Project Assistant!**\n\nI\'ll help you create a comprehensive project plan by asking about your objectives, budget, timeline, and team.\n\n💡 **Just tell me about your project** - for example: "I need a plan for opening a coffee shop" or "Help me plan a website redesign"',
                        timestamp: new Date().toISOString()
                    });
                } else {
                    // Load existing chat history for returning users
                    chatEl.postMessage({
                        action: 'loadHistory',
                        history: existingHistory
                    });
                    
                    // Extract and display todos from chat history
                    setTimeout(async () => {
                        try {
                            const todosFromHistory = [];
                            
                            existingHistory.forEach(msg => {
                                if (msg.role === 'assistant' && msg.analysis && msg.analysis.todos) {
                                    todosFromHistory.push(...msg.analysis.todos);
                                }
                                if (msg.role === 'assistant' && msg.analysis && msg.analysis.gaps && msg.analysis.gaps.todos) {
                                    todosFromHistory.push(...msg.analysis.gaps.todos);
                                }
                            });
                            
                            const uniqueTodos = todosFromHistory.filter((todo, index, self) => 
                                index === self.findIndex(t => t.id === todo.id)
                            );
                            
                            if (uniqueTodos.length > 0) {
                                chatEl.postMessage({
                                    action: 'displayTodos',
                                    todos: uniqueTodos
                                });
                            }
                        } catch (error) {
                            logHandshake('todos_extraction_error', { error: error.message });
                        }
                    }, 500);
                }
            }, 300);
            return;
        }

        if (action === 'typing') {
            chatEl.postMessage({ action: 'updateStatus', status: 'typing' });
            return;
        }

        if (action === 'stopTyping') {
            chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
            return;
        }

		if (action === 'sendMessage') {
            const userMessage = (data.message || '').trim();
            if (!userMessage) return;

            chatEl.postMessage({
                action: 'displayMessage',
                type: 'user',
                content: userMessage,
                timestamp: new Date().toISOString()
            });

            chatEl.postMessage({ action: 'updateStatus', status: 'processing' });

            // Start processing and poll for completion
            let start = await processUserRequest({
                op: 'startProcessing',
                projectId,
                userId,
                sessionId,
                payload: { message: userMessage }
            }).catch(() => ({ success: false }));

            // Retry once if start failed
            if (!start || !start.success) {
                await new Promise(r => setTimeout(r, 1000));
                start = await processUserRequest({
                    op: 'startProcessing',
                    projectId,
                    userId,
                    sessionId,
                    payload: { message: userMessage }
                }).catch(() => ({ success: false }));
            }

            // If still failing, fallback to direct sendMessage
            if (!start || !start.success) {
                const direct = await processUserRequest({
                    op: 'sendMessage',
                    projectId,
                    userId,
                    sessionId,
                    payload: { message: userMessage }
                }).catch(() => null);
                
                if (direct && direct.success) {
                    chatEl.postMessage({ 
                        action: 'displayMessage', 
                        type: 'assistant', 
                        content: direct.message || 'Done.', 
                        timestamp: new Date().toISOString() 
                    });
                    
                    if (Array.isArray(direct.todos) && direct.todos.length) {
                        chatEl.postMessage({ 
                            action: 'displayTodos', 
                            todos: direct.todos 
                        });
                    }
                    
                    if (direct.projectName && direct.projectName !== 'Project Chat') {
                        chatEl.postMessage({ action: 'updateProjectName', projectName: direct.projectName });
                        await updatePageTitle(direct.projectName);
                    }
                    
                    if (direct.projectEmail) {
                        chatEl.postMessage({ action: 'updateProjectEmail', projectEmail: direct.projectEmail });
                    }
                    
                    chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
                    return;
                }
                
                chatEl.postMessage({ 
                    action: 'displayMessage', 
                    type: 'system', 
                    content: 'Still working on it, please try again.', 
                    timestamp: new Date().toISOString() 
                });
                chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
                return;
            }

            const processingId = start.processingId;
            const startedAt = Date.now();
            const intervalMs = 2000;
            const timeoutMs = 90000;

            const poll = async () => {
                const status = await processUserRequest({ 
                    op: 'getProcessingStatus', 
                    projectId, 
                    userId, 
                    sessionId, 
                    payload: { processingId } 
                }).catch(() => null);
                
                if (!status) {
                    if (Date.now() - startedAt > timeoutMs) {
                        chatEl.postMessage({ 
                            action: 'displayMessage', 
                            type: 'system', 
                            content: 'Processing timed out. Please try again.', 
                            timestamp: new Date().toISOString() 
                        });
                        chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
                        return;
                    }
                    setTimeout(poll, intervalMs);
                    return;
                }
                
                if (status.status === 'processing') {
                    if (status.message) {
                        chatEl.postMessage({ 
                            action: 'displayMessage', 
                            type: 'system', 
                            content: status.message, 
                            timestamp: new Date().toISOString() 
                        });
                    }
                    if (Date.now() - startedAt > timeoutMs) {
                        chatEl.postMessage({ 
                            action: 'displayMessage', 
                            type: 'system', 
                            content: 'Processing timed out. Please try again.', 
                            timestamp: new Date().toISOString() 
                        });
                        chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
                        return;
                    }
                    setTimeout(poll, intervalMs);
                    return;
                }
                
                if (status.status === 'error') {
                    chatEl.postMessage({ 
                        action: 'displayMessage', 
                        type: 'assistant', 
                        content: (status.error ? `Error: ${status.error}` : 'Sorry, something went wrong.'), 
                        timestamp: new Date().toISOString() 
                    });
                    chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
                    return;
                }
                
                // Complete - display messages and todos
                const msgs = status.conversation?.messages || status.conversation || [];
                (msgs || []).forEach((m) => {
                    if (!m || !m.content) return;
                    const type = m.type === 'system' ? 'system' : 'assistant';
                    chatEl.postMessage({ 
                        action: 'displayMessage', 
                        type, 
                        content: m.content, 
                        timestamp: m.timestamp || new Date().toISOString() 
                    });
                });
                
                if (Array.isArray(status.todos) && status.todos.length) {
                    chatEl.postMessage({ 
                        action: 'displayTodos', 
                        todos: status.todos 
                    });
                }
                
                chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
            };

            setTimeout(poll, intervalMs);
        }
    });


    // Generate new project ID for new projects
    function generateNewProjectId() {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        return `proj_${timestamp}_${randomId}`;
    }

    // Function to update page title with project name
    async function updatePageTitle(projectName) {
        try {
            if (projectName && projectName !== 'Project Chat' && projectName !== 'Untitled Project') {
                if (typeof document !== 'undefined') {
                    document.title = `${projectName} - PMaaS`;
                }
            }
        } catch (error) {
            logHandshake('page_title_error', { error: error.message });
        }
    }

    // Function to update page elements for returning users
    async function updatePageElements(projectStatus) {
        try {
            if (projectStatus?.projectData?.name) {
                await updatePageTitle(projectStatus.projectData.name);
            }
        } catch (error) {
            logHandshake('page_elements_error', { error: error.message });
        }
    }

    // Helper function to determine if project was just created
    function isProjectJustCreated() {
        // Check if projectId has recent timestamp (within last 30 seconds)
        const projectTimestamp = projectId.split('_')[1]; // Extract timestamp from proj_TIMESTAMP_randomId
        if (projectTimestamp) {
            const timeDiff = Date.now() - parseInt(projectTimestamp);
            return timeDiff < 30000; // Less than 30 seconds ago
        }
        return false;
    }

    // Poll for AI response on new projects
    async function pollForNewProjectResponse() {
        const maxAttempts = 30; // 30 attempts = 60 seconds max
        let attempts = 0;
        
        const poll = async () => {
            attempts++;
            
            try {
                // Get updated chat history
                const historyResult = await processUserRequest({ op: 'history', projectId, userId }).catch(() => null);
                const currentHistory = historyResult?.history || [];
                
                // Check if we have an AI response
                const aiResponses = currentHistory.filter(msg => msg.role === 'assistant');
                
                if (aiResponses.length > 0) {
                    // Display AI responses
                    aiResponses.forEach((response) => {
                        chatEl.postMessage({
                            action: 'displayMessage',
                            type: 'assistant',
                            content: response.message,
                            timestamp: response.timestamp
                        });
                    });
                    
                    // Extract and display todos
                    const todosFromHistory = [];
                    currentHistory.forEach(msg => {
                        if (msg.role === 'assistant' && msg.analysis && msg.analysis.todos) {
                            todosFromHistory.push(...msg.analysis.todos);
                        }
                        if (msg.role === 'assistant' && msg.analysis && msg.analysis.gaps && msg.analysis.gaps.todos) {
                            todosFromHistory.push(...msg.analysis.gaps.todos);
                        }
                    });
                    
                    const uniqueTodos = todosFromHistory.filter((todo, index, self) => 
                        index === self.findIndex(t => t.id === todo.id)
                    );
                    
                    if (uniqueTodos.length > 0) {
                        chatEl.postMessage({
                            action: 'displayTodos',
                            todos: uniqueTodos
                        });
                    }
                    
                    // Update project name if it changed
                    const hasProjectName = currentHistory.some(msg => 
                        msg.role === 'assistant' && msg.analysis && msg.analysis.updatedProjectData && 
                        msg.analysis.updatedProjectData.name && msg.analysis.updatedProjectData.name !== 'Untitled Project'
                    );
                    
                    if (hasProjectName) {
                        const projectNameMessage = currentHistory.find(msg => 
                            msg.role === 'assistant' && msg.analysis && msg.analysis.updatedProjectData && 
                            msg.analysis.updatedProjectData.name && msg.analysis.updatedProjectData.name !== 'Untitled Project'
                        );
                        const newProjectName = projectNameMessage?.analysis?.updatedProjectData?.name;
                        
                        chatEl.postMessage({ 
                            action: 'updateProjectName', 
                            projectName: newProjectName 
                        });
                        await updatePageTitle(newProjectName);
                    }
                    
                    chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
                    return;
                }
                
                // No response yet, continue polling if we haven't exceeded max attempts
                if (attempts < maxAttempts) {
                    setTimeout(poll, 2000); // Poll every 2 seconds
                } else {
                    // Timeout
                    chatEl.postMessage({
                        action: 'displayMessage',
                        type: 'system',
                        content: 'Processing is taking longer than expected. Please refresh the page or try again.',
                        timestamp: new Date().toISOString()
                    });
                    chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
                }
                
            } catch (error) {
                logHandshake('polling_error', { error: error.message, attempts });
                chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
            }
        };
        
        // Start polling
        poll();
    }
});
