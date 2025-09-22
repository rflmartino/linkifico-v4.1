import { Permissions, webMethod } from 'wix-web-module';
import { Logger } from 'backend/logger';

export const logToBackend = webMethod(Permissions.Anyone, async (file, functionName, data = null, error = null) => {
    try {
        Logger.log(file, functionName, data, error);
        return { success: true };
    } catch (e) {
        console.error('Backend logging failed:', e);
        return { success: false, error: e.message };
    }
});


