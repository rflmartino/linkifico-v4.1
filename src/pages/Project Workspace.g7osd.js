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

            const result = await processUserRequest({
                op: 'sendMessage',
                projectId,
                userId,
                sessionId,
                payload: { message: userMessage }
            }).catch((e) => ({ success: false, message: 'Sorry, something went wrong.' }));

            chatEl.postMessage({
                action: 'displayMessage',
                type: 'assistant',
                content: (result && result.message) || 'Sorry, something went wrong.',
                timestamp: new Date().toISOString()
            });

            chatEl.postMessage({ action: 'updateStatus', status: (result && result.success) ? 'ready' : 'error' });
        }
    });
});
