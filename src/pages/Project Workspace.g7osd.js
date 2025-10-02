// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/hello-world

import { processUserRequest } from 'backend/entrypoint.web.js';
import { currentMember } from 'wix-members';
import wixLocation from 'wix-location';
import { session } from 'wix-storage';

$w.onReady(async function () {
    const chatEl = $w('#mainChatDisplay');

    const projectId = wixLocation.query.projectId || 'default_project';
    const member = await currentMember.getMember().catch(() => null);
    const userId = member && member._id ? member._id : 'anonymous';

    let sessionId = session.getItem('chatSessionId');
    if (!sessionId) {
        sessionId = `sess_${Date.now()}`;
        session.setItem('chatSessionId', sessionId);
    }

	// Ensure project exists on first load
	try {
		const status = await processUserRequest({ op: 'status', projectId, userId }).catch(() => null);
		if (!status || status.success === false) {
			await processUserRequest({
				op: 'init',
				projectId,
				userId,
				payload: { projectName: 'Project Chat', templateName: 'simple_waterfall', initialMessage: 'Start' }
			}).catch(() => null);
		}
	} catch (e) {}

	chatEl.onMessage(async (event) => {
        const data = (event && event.data) || {};
        const action = data.action;

        if (action === 'ready') {
            chatEl.postMessage({
                action: 'initialize',
                sessionId,
                projectId,
                userId,
                projectName: 'Project Chat'
            });
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
});
