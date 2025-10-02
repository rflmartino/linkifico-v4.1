// projectData.js - PMI-Aligned Project Data Structure with Redis Integration
// PURE STORAGE ONLY - NO CALCULATIONS by AI - controllers handle intelligence

import { createClient } from 'redis';
import { getSecret } from 'wix-secrets-backend';
import { Logger } from '../utils/logger.js';

// Redis client (lazy)
let redisClient = null;
export async function getRedisClient() {
    if (!redisClient) {
        const redisUrl = await getSecret('REDIS_CONNECTION_URL');
        redisClient = createClient({ url: redisUrl });
        await redisClient.connect();
    }
    return redisClient;
}

// No legacy fields/constants – templates drive structure via templateData

// Redis Key Structure
export const REDIS_KEYS = {
    PROJECT: (projectId) => `project:${projectId}`,
    KNOWLEDGE: (projectId) => `knowledge:${projectId}`,
    GAPS: (projectId) => `gaps:${projectId}`,
    LEARNING: (userId) => `learning:${userId}`,
    REFLECTION: (projectId) => `reflection:${projectId}`,
    CHAT_HISTORY: (projectId) => `chat:${projectId}`,
    PROCESSING: (processingId) => `processing:${processingId}`,
    USER_PROJECTS: (userId) => `user:${userId}:projects`
};

// Project Data Structure
export const createProjectData = (projectId, templateName = 'simple_waterfall', initialData = {}) => {
    return {
        id: projectId,
        name: initialData.name || 'Untitled Project',
        templateName: templateName,
        // Reserved for future tier gating (ignored by simple_waterfall)
        maturityLevel: initialData.maturityLevel || 'basic',
        // Template-specific container (e.g., objectives/tasks/budget/people for simple_waterfall)
        templateData: initialData.templateData || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
};

// Knowledge Data Structure
export const createKnowledgeData = (projectId, analysis = {}) => {
    return {
        projectId: projectId,
        confidence: analysis.confidence || 0.0,
        lastAnalyzed: new Date().toISOString(),
        knownFacts: analysis.knownFacts || [],
        uncertainties: analysis.uncertainties || [],
        analysisHistory: analysis.analysisHistory || []
    };
};

// Gap Analysis Data Structure
export const createGapData = (projectId, gaps = {}) => {
    return {
        projectId: projectId,
        criticalGaps: gaps.criticalGaps || [],
        priorityScore: gaps.priorityScore || 0.0,
        nextAction: gaps.nextAction || null,
        reasoning: gaps.reasoning || '',
        todos: gaps.todos || [],
        lastUpdated: new Date().toISOString()
    };
};

// Learning Data Structure
export const createLearningData = (userId, patterns = {}) => {
    return {
        userId: userId,
        userPatterns: {
            responseTime: patterns.responseTime || 'avg_2_hours',
            preferredQuestionStyle: patterns.preferredQuestionStyle || 'direct',
            engagementLevel: patterns.engagementLevel || 'medium',
            projectType: patterns.projectType || 'general'
        },
        questionEffectiveness: patterns.questionEffectiveness || {},
        interactionHistory: patterns.interactionHistory || [],
        lastUpdated: new Date().toISOString()
    };
};

// Reflection Log Data Structure
export const createReflectionData = (projectId, reflection = {}) => {
    return {
        projectId: projectId,
        analysisHistory: reflection.analysisHistory || [],
        decisionLog: reflection.decisionLog || [],
        improvementSuggestions: reflection.improvementSuggestions || [],
        lastReflection: new Date().toISOString()
    };
};

// Redis Operations
export async function saveProjectData(projectId, projectData) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.PROJECT(projectId);
    await client.set(key, JSON.stringify(projectData));
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:saveProjectDataMs', { ms }); } catch {}
}

export async function getProjectData(projectId) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.PROJECT(projectId);
    const data = await client.get(key);
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:getProjectDataMs', { ms }); } catch {}
    return data ? JSON.parse(data) : null;
}

export async function saveKnowledgeData(projectId, knowledgeData) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.KNOWLEDGE(projectId);
    await client.set(key, JSON.stringify(knowledgeData));
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:saveKnowledgeDataMs', { ms }); } catch {}
}

export async function getKnowledgeData(projectId) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.KNOWLEDGE(projectId);
    const data = await client.get(key);
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:getKnowledgeDataMs', { ms }); } catch {}
    return data ? JSON.parse(data) : null;
}

export async function saveGapData(projectId, gapData) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.GAPS(projectId);
    await client.set(key, JSON.stringify(gapData));
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:saveGapDataMs', { ms }); } catch {}
}

export async function getGapData(projectId) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.GAPS(projectId);
    const data = await client.get(key);
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:getGapDataMs', { ms }); } catch {}
    return data ? JSON.parse(data) : null;
}

export async function saveLearningData(userId, learningData) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.LEARNING(userId);
    await client.set(key, JSON.stringify(learningData));
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:saveLearningDataMs', { ms }); } catch {}
}

export async function getLearningData(userId) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.LEARNING(userId);
    const data = await client.get(key);
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:getLearningDataMs', { ms }); } catch {}
    return data ? JSON.parse(data) : null;
}

export async function saveReflectionData(projectId, reflectionData) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.REFLECTION(projectId);
    await client.set(key, JSON.stringify(reflectionData));
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:saveReflectionDataMs', { ms }); } catch {}
}

export async function getReflectionData(projectId) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.REFLECTION(projectId);
    const data = await client.get(key);
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:getReflectionDataMs', { ms }); } catch {}
    return data ? JSON.parse(data) : null;
}

export async function saveChatHistory(projectId, chatHistory) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.CHAT_HISTORY(projectId);
    await client.set(key, JSON.stringify(chatHistory));
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:saveChatHistoryMs', { ms }); } catch {}
}

export async function getChatHistory(projectId) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.CHAT_HISTORY(projectId);
    const data = await client.get(key);
    const ms = Date.now() - t;
    
    // Debug logging to see what we're getting from Redis
    try { 
        Logger.info('projectData', 'timing:getChatHistoryMs', { ms }); 
        Logger.info('projectData', 'getChatHistory:debug', {
            projectId,
            redisKey: key,
            hasData: !!data,
            dataLength: data ? data.length : 0,
            dataType: typeof data
        });
    } catch {}
    
    return data ? JSON.parse(data) : [];
}

// Processing storage for polling
export async function saveProcessing(processingId, payload) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.PROCESSING(processingId);
    await client.set(key, JSON.stringify(payload));
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:saveProcessingMs', { ms }); } catch {}
}

export async function getProcessing(processingId) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.PROCESSING(processingId);
    const data = await client.get(key);
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:getProcessingMs', { ms }); } catch {}
    return data ? JSON.parse(data) : null;
}

// User-to-Projects Mapping Functions
export async function getUserProjects(userId) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.USER_PROJECTS(userId);
    const data = await client.get(key);
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:getUserProjectsMs', { ms }); } catch {}
    return data ? JSON.parse(data) : [];
}

export async function addProjectToUser(userId, projectId, status = 'active') {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.USER_PROJECTS(userId);
    
    // Get existing projects
    let userProjects = await getUserProjects(userId);
    
    // Check if project already exists
    const existingIndex = userProjects.findIndex(p => p.projectId === projectId);
    
    if (existingIndex >= 0) {
        // Update existing project status
        userProjects[existingIndex].status = status;
        userProjects[existingIndex].updatedAt = new Date().toISOString();
    } else {
        // Add new project
        userProjects.push({
            projectId: projectId,
            status: status,
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    
    await client.set(key, JSON.stringify(userProjects));
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:addProjectToUserMs', { ms }); } catch {}
}

export async function removeProjectFromUser(userId, projectId) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.USER_PROJECTS(userId);
    
    // Get existing projects
    let userProjects = await getUserProjects(userId);
    
    // Remove project from list
    userProjects = userProjects.filter(p => p.projectId !== projectId);
    
    await client.set(key, JSON.stringify(userProjects));
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:removeProjectFromUserMs', { ms }); } catch {}
}

export async function archiveProjectForUser(userId, projectId) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.USER_PROJECTS(userId);
    
    // Get existing projects
    let userProjects = await getUserProjects(userId);
    
    // Find and update project status
    const projectIndex = userProjects.findIndex(p => p.projectId === projectId);
    if (projectIndex >= 0) {
        userProjects[projectIndex].status = 'archived';
        userProjects[projectIndex].archivedAt = new Date().toISOString();
        userProjects[projectIndex].updatedAt = new Date().toISOString();
        
        await client.set(key, JSON.stringify(userProjects));
    }
    
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:archiveProjectForUserMs', { ms }); } catch {}
}

export async function restoreProjectForUser(userId, projectId) {
    const t = Date.now();
    const client = await getRedisClient();
    const key = REDIS_KEYS.USER_PROJECTS(userId);
    
    // Get existing projects
    let userProjects = await getUserProjects(userId);
    
    // Find and update project status
    const projectIndex = userProjects.findIndex(p => p.projectId === projectId);
    if (projectIndex >= 0) {
        userProjects[projectIndex].status = 'active';
        userProjects[projectIndex].restoredAt = new Date().toISOString();
        userProjects[projectIndex].updatedAt = new Date().toISOString();
        
        await client.set(key, JSON.stringify(userProjects));
    }
    
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:restoreProjectForUserMs', { ms }); } catch {}
}

export async function deleteProjectCompletely(userId, projectId) {
    const t = Date.now();
    const client = await getRedisClient();
    
    // Remove from user's project list
    await removeProjectFromUser(userId, projectId);
    
    // Delete all project data
    await Promise.all([
        client.del(REDIS_KEYS.PROJECT(projectId)),
        client.del(REDIS_KEYS.KNOWLEDGE(projectId)),
        client.del(REDIS_KEYS.GAPS(projectId)),
        client.del(REDIS_KEYS.REFLECTION(projectId)),
        client.del(REDIS_KEYS.CHAT_HISTORY(projectId))
    ]);
    
    const ms = Date.now() - t;
    try { Logger.info('projectData', 'timing:deleteProjectCompletelyMs', { ms }); } catch {}
}

// Utility Functions
// Completeness and gaps are now template-driven and computed in controllers


