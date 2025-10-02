// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/hello-world

import { processUserRequest } from 'backend/entrypoint.web.js';
import { currentMember } from 'wix-members';
import wixLocation from 'wix-location';
import { session } from 'wix-storage';

$w.onReady(async function () {
    const chatEl = $w('#mainChatDisplay');

    const projectId = wixLocation.query.projectId || 'default_project';
    
    // User switching system for testing
    const { userId, isTestUser } = await initializeUserSystem();
    
    // Display current user mode (for debugging/testing)
    console.log(`🔧 User Mode: ${isTestUser ? 'TEST' : 'REAL'} | User ID: ${userId}`);
    
    // Add user mode indicator to page title for easy identification
    if (isTestUser) {
        document.title = `[TEST] ${document.title}`;
    }
    
    // Make user switching functions available globally for console access
    window.switchToTestUser = () => switchUserMode('test');
    window.switchToRealUser = () => switchUserMode('real');
    window.createNewTestUser = () => switchUserMode('newTest');
    window.getCurrentUserInfo = () => ({ userId, isTestUser, mode: isTestUser ? 'TEST' : 'REAL' });
    window.showUserCommands = () => {
        console.log(`
🔧 USER SWITCHING COMMANDS:
• switchToTestUser()     - Switch to existing test user
• createNewTestUser()    - Create and switch to new test user  
• switchToRealUser()     - Switch back to real user
• getCurrentUserInfo()   - Show current user info

📋 URL PARAMETERS:
• ?testUser=true         - Use existing test user
• ?newTestUser=true      - Create new test user
• ?testUser=false        - Use real user

Current: ${isTestUser ? 'TEST' : 'REAL'} | ID: ${userId}
        `);
    };
    
    // Show commands on load for easy access
    setTimeout(() => {
        console.log('🔧 Type showUserCommands() in console for user switching options');
    }, 1000);

    let sessionId = session.getItem('chatSessionId');
    if (!sessionId) {
        sessionId = `sess_${Date.now()}`;
        session.setItem('chatSessionId', sessionId);
    }

	// Check for existing project and chat history on page load
	let isNewSession = false;
	let existingHistory = [];
	
	try {
		// First check if project exists and get status
		const status = await processUserRequest({ op: 'status', projectId, userId }).catch(() => null);
		
		// Get chat history to determine if this is a new session
		const historyResult = await processUserRequest({ op: 'history', projectId, userId }).catch(() => null);
		existingHistory = historyResult?.history || [];
		isNewSession = existingHistory.length === 0;
		
		// If no project exists, initialize it
		if (!status || status.success === false) {
			await processUserRequest({
				op: 'init',
				projectId,
				userId,
				payload: { projectName: 'Project Chat', templateName: 'simple_waterfall', initialMessage: 'Start' }
			}).catch(() => null);
		}
		
		// Update page elements based on project status (if returning user)
		if (!isNewSession && status?.success) {
			updatePageElements(status);
		}
	} catch (e) {
		console.error('Error checking project status:', e);
	}

	chatEl.onMessage(async (event) => {
        const data = (event && event.data) || {};
        const action = data.action;

        if (action === 'ready') {
            // Get current project info from status if available
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
            } catch (e) {}
            
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
                if (isNewSession) {
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
                            console.error('Error loading existing todos:', error);
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

    // User switching system for testing
    async function initializeUserSystem() {
        try {
            // Check URL parameters for user mode switching
            const urlTestMode = wixLocation.query.testUser;
            const urlNewTestUser = wixLocation.query.newTestUser;
            
            // Check session storage for current mode
            let currentMode = session.getItem('userMode') || 'real';
            let testUserId = session.getItem('testUserId');
            
            // Handle URL parameter overrides
            if (urlTestMode === 'true' || urlTestMode === '1') {
                currentMode = 'test';
                session.setItem('userMode', 'test');
            } else if (urlTestMode === 'false' || urlTestMode === '0') {
                currentMode = 'real';
                session.setItem('userMode', 'real');
            }
            
            // Handle new test user creation
            if (urlNewTestUser === 'true' || urlNewTestUser === '1') {
                const timestamp = Date.now();
                const randomId = Math.random().toString(36).substring(2, 8);
                testUserId = `test_user_${timestamp}_${randomId}`;
                session.setItem('testUserId', testUserId);
                session.setItem('userMode', 'test');
                currentMode = 'test';
                console.log(`🆕 Created new test user: ${testUserId}`);
            }
            
            // Determine final user ID
            let finalUserId;
            let isTestUser = false;
            
            if (currentMode === 'test') {
                // Ensure we have a test user ID
                if (!testUserId) {
                    const timestamp = Date.now();
                    const randomId = Math.random().toString(36).substring(2, 8);
                    testUserId = `test_user_${timestamp}_${randomId}`;
                    session.setItem('testUserId', testUserId);
                }
                finalUserId = testUserId;
                isTestUser = true;
            } else {
                // Use real user ID
                const member = await currentMember.getMember().catch(() => null);
                finalUserId = member && member._id ? member._id : 'anonymous';
                isTestUser = false;
            }
            
            return { userId: finalUserId, isTestUser };
            
        } catch (error) {
            console.error('Error in user switching system:', error);
            // Fallback to real user
            const member = await currentMember.getMember().catch(() => null);
            return { userId: member && member._id ? member._id : 'anonymous', isTestUser: false };
        }
    }

    // Function to switch user modes
    function switchUserMode(mode) {
        const currentUrl = wixLocation.url;
        const url = new URL(currentUrl);
        
        // Remove existing user-related parameters
        url.searchParams.delete('testUser');
        url.searchParams.delete('newTestUser');
        
        if (mode === 'test') {
            url.searchParams.set('testUser', 'true');
            console.log('🔄 Switching to existing test user...');
        } else if (mode === 'newTest') {
            url.searchParams.set('newTestUser', 'true');
            console.log('🆕 Creating new test user...');
        } else if (mode === 'real') {
            url.searchParams.set('testUser', 'false');
            console.log('🔄 Switching to real user...');
        }
        
        // Reload page with new parameters
        wixLocation.to(url.toString());
    }

    // Function to update page title with project name
    function updatePageTitle(projectName) {
        try {
            if (projectName && projectName !== 'Project Chat' && projectName !== 'Untitled Project') {
                const isTest = isTestUser ? '[TEST] ' : '';
                document.title = `${isTest}${projectName} - PMaaS`;
            }
        } catch (error) {
            console.error('Error updating page title:', error);
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
            
            console.log('Project status for page updates:', projectStatus);
            
            // This is where we'll add more HTML element updates
        } catch (error) {
            console.error('Error updating page elements:', error);
        }
    }
});
