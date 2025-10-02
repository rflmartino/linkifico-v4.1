// Project Workspace Page - Velo Frontend
// Handles project workspace functionality - receives userId and projectId from URL

import { processUserRequest } from 'backend/entrypoint.web.js';
import wixLocation from 'wix-location';
import { session } from 'wix-storage';
import { logToBackend } from 'backend/utils/webLogger.web.js';

$w.onReady(async function () {
    const pageLoadStartTime = Date.now();
    const chatEl = $w('#mainChatDisplay');

    // Extract transition ID from URL if available (for tracking)
    const urlParams = new URLSearchParams(window.location.search);
    const referrerTransitionId = document.referrer.includes('project-portfolio') ? Date.now() : null;

    logToBackend('Project-Workspace', 'onReady', {
        message: 'PAGE LOAD START: Project Workspace initializing',
        pageLoadStartTime: pageLoadStartTime,
        referrer: document.referrer,
        referrerTransitionId: referrerTransitionId,
        urlParams: Object.fromEntries(urlParams)
    });

    // Get projectId and userId from URL parameters
    const projectId = wixLocation.query.projectId || generateNewProjectId();
    const userId = wixLocation.query.userId;
    
    // Validate required parameters
    if (!userId) {
        logToBackend('Project-Workspace', 'onReady', null, new Error('NAVIGATION ERROR: Missing userId parameter in URL'));
        wixLocation.to('/project-portfolio'); // Redirect back to portfolio
        return;
    }
    
    logToBackend('Project-Workspace', 'onReady', {
        message: 'PAGE LOAD: Parameters validated, starting initialization',
        projectId: projectId,
        userId: userId,
        isNewProject: !wixLocation.query.projectId,
        pageLoadStartTime: pageLoadStartTime,
        referrerTransitionId: referrerTransitionId
    });

    let sessionId = session.getItem('chatSessionId');
    if (!sessionId) {
        sessionId = `sess_${Date.now()}`;
        session.setItem('chatSessionId', sessionId);
    }

	// Check for existing project and chat history on page load
	let isNewSession = false;
	let existingHistory = [];
	let isNewProject = false;
	
	try {
		logToBackend('Project-Workspace', 'checkProjectStatus', {
			message: 'BACKEND CHECK START: Checking project status and history',
			projectId: projectId,
			pageLoadStartTime: pageLoadStartTime
		});
		
		// First check if project exists and get status
		const statusStartTime = Date.now();
		const status = await processUserRequest({ op: 'status', projectId, userId }).catch(() => null);
		const statusDuration = Date.now() - statusStartTime;
		
		// Get chat history to determine if this is a new session
		const historyStartTime = Date.now();
		const historyResult = await processUserRequest({ op: 'history', projectId, userId }).catch(() => null);
		const historyDuration = Date.now() - historyStartTime;
		
		existingHistory = historyResult?.history || [];
		isNewSession = existingHistory.length === 0;
		
		// Determine if this is a newly created project (from portfolio)
		isNewProject = !status || status.success === false || (existingHistory.length <= 2 && isProjectJustCreated());
		
		logToBackend('Project-Workspace', 'checkProjectStatus', {
			message: 'BACKEND CHECK COMPLETE: Project status and history retrieved',
			projectExists: !!status?.success,
			historyLength: existingHistory.length,
			isNewProject: isNewProject,
			isNewSession: isNewSession,
			statusCheckDurationMs: statusDuration,
			historyCheckDurationMs: historyDuration,
			totalBackendCheckMs: statusDuration + historyDuration,
			pageLoadStartTime: pageLoadStartTime,
			referrerTransitionId: referrerTransitionId
		});
		
		// Update page elements based on project status (if returning user)
		if (!isNewSession && status?.success && !isNewProject) {
			logToBackend('Project-Workspace', 'updatePageElements', {
				message: 'EXISTING PROJECT: Updating page elements for returning user',
				projectId: projectId
			});
			updatePageElements(status);
		}
	} catch (e) {
		logToBackend('Project-Workspace', 'checkProjectStatus', null, new Error(`BACKEND CHECK ERROR: ${e.message} (PageLoadTime: ${Date.now() - pageLoadStartTime}ms)`));
	}

	chatEl.onMessage(async (event) => {
        const data = (event && event.data) || {};
        const action = data.action;

        if (action === 'ready') {
            const chatInitStartTime = Date.now();
            
            logToBackend('Project-Workspace', 'chatInitialize', {
                message: 'CHAT INIT START: Chat UI ready, initializing project data',
                projectId: projectId,
                pageLoadStartTime: pageLoadStartTime,
                chatInitStartTime: chatInitStartTime,
                totalPageLoadTimeMs: chatInitStartTime - pageLoadStartTime
            });
            
            // Get current project info from status if available
            let currentProjectName = 'Project Chat';
            let currentProjectEmail = null;
            try {
                const projectInfoStartTime = Date.now();
                const status = await processUserRequest({ op: 'status', projectId, userId }).catch(() => null);
                const projectInfoDuration = Date.now() - projectInfoStartTime;
                
                if (status?.projectData?.name) {
                    currentProjectName = status.projectData.name;
                }
                if (status?.projectEmail) {
                    currentProjectEmail = status.projectEmail;
                }
                
                logToBackend('Project-Workspace', 'chatInitialize', {
                    message: 'CHAT INIT: Project info retrieved',
                    projectName: currentProjectName,
                    hasEmail: !!currentProjectEmail,
                    projectInfoDurationMs: projectInfoDuration
                });
                
            } catch (e) {
                logToBackend('Project-Workspace', 'getProjectInfo', null, e);
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
            
            // Send appropriate content based on session type (determined on page load)
            setTimeout(() => {
                if (isNewProject) {
                    // Handle new project created from portfolio
                    logToBackend('Project-Workspace', 'chatInitialize', { 
                        message: 'NEW PROJECT FLOW: Initializing new project from portfolio',
                        historyLength: existingHistory.length,
                        pageLoadStartTime: pageLoadStartTime,
                        totalTransitionTimeMs: Date.now() - pageLoadStartTime
                    });
                    
                    // Show user input and processing state
                    if (existingHistory.length > 0) {
                        // Show the user's initial message and set processing state
                        const userMessage = existingHistory.find(msg => msg.role === 'user');
                        if (userMessage) {
                            logToBackend('Project-Workspace', 'chatInitialize', { 
                                message: 'NEW PROJECT FLOW: Displaying user input message',
                                userMessageLength: userMessage.message.length
                            });
                            
                            chatEl.postMessage({
                                action: 'displayMessage',
                                type: 'user',
                                content: userMessage.message,
                                timestamp: userMessage.timestamp
                            });
                        }
                        
                        // Set processing state and start polling for AI response
                        logToBackend('Project-Workspace', 'chatInitialize', { 
                            message: 'NEW PROJECT FLOW: Setting processing state and starting polling'
                        });
                        
                        chatEl.postMessage({ action: 'updateStatus', status: 'processing' });
                        
                        // Start polling for the AI response
                        setTimeout(() => {
                            pollForNewProjectResponse();
                        }, 1000);
                    } else {
                        logToBackend('Project-Workspace', 'chatInitialize', { 
                            message: 'NEW PROJECT FLOW: No history found, may need to wait for backend processing'
                        });
                    }
                } else if (isNewSession) {
                    // Send welcome message for completely new sessions
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
                    
                    // Also load existing todos if available
                    setTimeout(async () => {
                        try {
                            const currentStatus = await processUserRequest({ op: 'status', projectId, userId }).catch(() => null);
                            if (currentStatus?.todos && currentStatus.todos.length > 0) {
                                chatEl.postMessage({
                                    action: 'displayTodos',
                                    todos: currentStatus.todos
                                });
                            }
                        } catch (error) {
                            logToBackend('Project-Workspace', 'loadExistingTodos', null, error);
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

		// Start processing (immediate return) and poll for completion
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

		// If still failing, fallback to direct sendMessage (synchronous path)
		if (!start || !start.success) {
			const direct = await processUserRequest({
				op: 'sendMessage',
				projectId,
				userId,
				sessionId,
				payload: { message: userMessage }
			}).catch(() => null);
			if (direct && direct.success) {
				chatEl.postMessage({ action: 'displayMessage', type: 'assistant', content: direct.message || 'Done.', timestamp: new Date().toISOString() });
				if (Array.isArray(direct.todos) && direct.todos.length) {
					chatEl.postMessage({ action: 'displayTodos', todos: direct.todos });
				}
				// Update project name if it changed
				if (direct.projectName && direct.projectName !== 'Project Chat') {
					chatEl.postMessage({ action: 'updateProjectName', projectName: direct.projectName });
					updatePageTitle(direct.projectName);
				}
				// Update project email if available
				if (direct.projectEmail) {
					chatEl.postMessage({ action: 'updateProjectEmail', projectEmail: direct.projectEmail });
				}
				chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
				return;
			}
			// As a last resort, show a softer system update and stop
			chatEl.postMessage({ action: 'displayMessage', type: 'system', content: 'Still working on it, please try again.', timestamp: new Date().toISOString() });
			chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
			return;
		}

        const processingId = start.processingId;
        const startedAt = Date.now();
        const intervalMs = 2000;
        const timeoutMs = 90000;

		const poll = async () => {
			const status = await processUserRequest({ op: 'getProcessingStatus', projectId, userId, sessionId, payload: { processingId } }).catch(() => null);
			if (!status) {
				if (Date.now() - startedAt > timeoutMs) {
					chatEl.postMessage({ action: 'displayMessage', type: 'system', content: 'Processing timed out. Please try again.', timestamp: new Date().toISOString() });
					chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
					return;
				}
				setTimeout(poll, intervalMs);
				return;
			}
            if (status.status === 'processing') {
                // Update progress from backend stage if available
                if (status.stage) {
                    chatEl.postMessage({ action: 'updateStatus', status: 'processing' });
                }
                // Display progress message if available
                if (status.message) {
                    chatEl.postMessage({ 
                        action: 'displayMessage', 
                        type: 'system', 
                        content: status.message, 
                        timestamp: new Date().toISOString() 
                    });
                }
                if (Date.now() - startedAt > timeoutMs) {
                    chatEl.postMessage({ action: 'displayMessage', type: 'system', content: 'Processing timed out. Please try again.', timestamp: new Date().toISOString() });
                    chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
                    return;
                }
                setTimeout(poll, intervalMs);
                return;
            }
			if (status.status === 'error') {
				// Only show a hard error if backend explicitly reports error
				chatEl.postMessage({ action: 'displayMessage', type: 'assistant', content: (status.error ? `Error: ${status.error}` : 'Sorry, something went wrong.'), timestamp: new Date().toISOString() });
				chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
				return;
			}
            // complete
            const msgs = status.conversation?.messages || status.conversation || [];
            (msgs || []).forEach((m) => {
                if (!m || !m.content) return;
                const type = m.type === 'system' ? 'system' : 'assistant';
                chatEl.postMessage({ action: 'displayMessage', type, content: m.content, timestamp: m.timestamp || new Date().toISOString() });
            });
            // If todos present, send them to the sidebar
            if (Array.isArray(status.todos) && status.todos.length) {
                chatEl.postMessage({ action: 'displayTodos', todos: status.todos });
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
    function updatePageTitle(projectName) {
        try {
            if (projectName && projectName !== 'Project Chat' && projectName !== 'Untitled Project') {
                const isTest = TEST_MODE ? '[TEST] ' : '';
                document.title = `${isTest}${projectName} - PMaaS`;
            }
        } catch (error) {
            logToBackend('Project-Workspace', 'updatePageTitle', null, error);
        }
    }

    // Function to update page elements for returning users
    function updatePageElements(projectStatus) {
        try {
            // Update project name/title if available
            if (projectStatus?.projectData?.name) {
                updatePageTitle(projectStatus.projectData.name);
            }
            
            // TODO: Update other HTML elements based on project status
            // Examples:
            // - Show project progress indicators
            // - Display current project phase
            // - Update any status badges or indicators
            
            logToBackend('Project-Workspace', 'updatePageElements', { 
                message: 'Project status for page updates',
                projectStatus: projectStatus
            });
            
            // This is where we'll add more HTML element updates
        } catch (error) {
            logToBackend('Project-Workspace', 'updatePageElements', null, error);
        }
    }

    // Helper function to determine if project was just created
    function isProjectJustCreated() {
        // Check if we arrived here recently (within last 30 seconds)
        const referrer = document.referrer;
        const isFromPortfolio = referrer.includes('project-portfolio');
        const hasRecentTimestamp = projectId.includes(Date.now().toString().substring(0, 10)); // Check if projectId has recent timestamp
        
        return isFromPortfolio || hasRecentTimestamp;
    }

    // Poll for AI response on new projects
    async function pollForNewProjectResponse() {
        const maxAttempts = 30; // 30 attempts = 60 seconds max
        let attempts = 0;
        const pollStartTime = Date.now();
        
        logToBackend('Project-Workspace', 'pollForNewProjectResponse', {
            message: 'POLLING START: Starting to poll for AI response',
            maxAttempts: maxAttempts,
            pollStartTime: pollStartTime,
            projectId: projectId
        });
        
        const poll = async () => {
            attempts++;
            const pollAttemptStartTime = Date.now();
            
            try {
                // Get updated chat history
                const historyResult = await processUserRequest({ op: 'history', projectId, userId }).catch(() => null);
                const currentHistory = historyResult?.history || [];
                
                // Check if we have an AI response (more than just the user message)
                const aiResponses = currentHistory.filter(msg => msg.role === 'assistant');
                
                logToBackend('Project-Workspace', 'pollForNewProjectResponse', {
                    message: `POLLING ATTEMPT ${attempts}: Checking for AI response`,
                    historyLength: currentHistory.length,
                    aiResponseCount: aiResponses.length,
                    attemptDurationMs: Date.now() - pollAttemptStartTime,
                    totalPollingTimeMs: Date.now() - pollStartTime
                });
                
                if (aiResponses.length > 0) {
                    // We have AI response(s), display them
                    logToBackend('Project-Workspace', 'pollForNewProjectResponse', { 
                        message: 'POLLING SUCCESS: AI response received, displaying content',
                        responseCount: aiResponses.length,
                        totalPollingTimeMs: Date.now() - pollStartTime,
                        totalAttempts: attempts
                    });
                    
                    // Display the AI response(s)
                    aiResponses.forEach(response => {
                        chatEl.postMessage({
                            action: 'displayMessage',
                            type: 'assistant',
                            content: response.message,
                            timestamp: response.timestamp
                        });
                    });
                    
                    // Load todos if available
                    const currentStatus = await processUserRequest({ op: 'status', projectId, userId }).catch(() => null);
                    if (currentStatus?.todos && currentStatus.todos.length > 0) {
                        logToBackend('Project-Workspace', 'pollForNewProjectResponse', { 
                            message: 'POLLING SUCCESS: Displaying todos',
                            todoCount: currentStatus.todos.length
                        });
                        chatEl.postMessage({
                            action: 'displayTodos',
                            todos: currentStatus.todos
                        });
                    }
                    
                    // Update project name if it changed
                    if (currentStatus?.projectData?.name && currentStatus.projectData.name !== 'Untitled Project') {
                        logToBackend('Project-Workspace', 'pollForNewProjectResponse', { 
                            message: 'POLLING SUCCESS: Updating project name',
                            newProjectName: currentStatus.projectData.name
                        });
                        chatEl.postMessage({ 
                            action: 'updateProjectName', 
                            projectName: currentStatus.projectData.name 
                        });
                        updatePageTitle(currentStatus.projectData.name);
                    }
                    
                    // Set status to ready
                    chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
                    
                    logToBackend('Project-Workspace', 'pollForNewProjectResponse', { 
                        message: 'POLLING COMPLETE: New project initialization finished successfully',
                        totalTransitionTimeMs: Date.now() - pageLoadStartTime,
                        totalPollingTimeMs: Date.now() - pollStartTime
                    });
                    return;
                }
                
                // No response yet, continue polling if we haven't exceeded max attempts
                if (attempts < maxAttempts) {
                    setTimeout(poll, 2000); // Poll every 2 seconds
                } else {
                    // Timeout
                    logToBackend('Project-Workspace', 'pollForNewProjectResponse', null, new Error(`POLLING TIMEOUT: No AI response after ${attempts} attempts (${Date.now() - pollStartTime}ms)`));
                    chatEl.postMessage({
                        action: 'displayMessage',
                        type: 'system',
                        content: 'Processing is taking longer than expected. Please refresh the page or try again.',
                        timestamp: new Date().toISOString()
                    });
                    chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
                }
                
            } catch (error) {
                logToBackend('Project-Workspace', 'pollForNewProjectResponse', null, new Error(`POLLING ERROR: ${error.message} (Attempt ${attempts}, TotalTime: ${Date.now() - pollStartTime}ms)`));
                chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
            }
        };
        
        // Start polling
        poll();
    }
});
