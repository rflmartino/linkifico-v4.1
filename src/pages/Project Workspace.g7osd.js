// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/hello-world

import { processUserRequest } from 'backend/entrypoint.web';
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
        const start = await processUserRequest({
            op: 'startProcessing',
            projectId,
            userId,
            sessionId,
            payload: { message: userMessage }
        }).catch(() => ({ success: false }));

        if (!start || !start.success) {
            chatEl.postMessage({ action: 'displayMessage', type: 'assistant', content: 'Sorry, something went wrong.', timestamp: new Date().toISOString() });
            chatEl.postMessage({ action: 'updateStatus', status: 'error' });
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
                chatEl.postMessage({ action: 'displayMessage', type: 'assistant', content: 'Sorry, something went wrong.', timestamp: new Date().toISOString() });
                chatEl.postMessage({ action: 'updateStatus', status: 'error' });
                return;
            }
            // complete
            const msgs = status.conversation?.messages || status.conversation || [];
            (msgs || []).forEach((m) => {
                if (!m || !m.content) return;
                const type = m.type === 'system' ? 'system' : 'assistant';
                chatEl.postMessage({ action: 'displayMessage', type, content: m.content, timestamp: m.timestamp || new Date().toISOString() });
            });
            // If todos present, append quick checklist line
            if (Array.isArray(status.todos) && status.todos.length) {
                const checklist = status.todos.slice(0, 5).map(t => `• ${t.title} (${t.priority})`).join('\n');
                chatEl.postMessage({ action: 'displayMessage', type: 'assistant', content: `Next steps:\n${checklist}`, timestamp: new Date().toISOString() });
            }
            chatEl.postMessage({ action: 'updateStatus', status: 'ready' });
        };

        setTimeout(poll, intervalMs);
        }
    });
});
