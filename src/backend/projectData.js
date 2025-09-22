// projectData.js - PMI-Aligned Project Data Structure with Redis Integration
// PURE STORAGE ONLY - NO CALCULATIONS by AI - controllers handle intelligence

import { createClient } from 'redis';
import { getSecret } from 'wix-secrets-backend';

// Redis client (lazy)
let redisClient = null;
async function getRedisClient() {
    if (!redisClient) {
        const redisUrl = await getSecret('REDIS_CONNECTION_URL');
        redisClient = createClient({ url: redisUrl });
        await redisClient.connect();
    }
    return redisClient;
}

// PMI-Aligned Project Core Fields
export const PROJECT_FIELDS = {
    SCOPE: 'scope',
    TIMELINE: 'timeline',
    BUDGET: 'budget',
    DELIVERABLES: 'deliverables',
    DEPENDENCIES: 'dependencies'
};

// Redis Key Structure
export const REDIS_KEYS = {
    PROJECT: (projectId) => `project:${projectId}`,
    KNOWLEDGE: (projectId) => `knowledge:${projectId}`,
    GAPS: (projectId) => `gaps:${projectId}`,
    LEARNING: (userId) => `learning:${userId}`,
    REFLECTION: (projectId) => `reflection:${projectId}`,
    CHAT_HISTORY: (projectId) => `chat:${projectId}`
};

// Project Data Structure
export const createProjectData = (projectId, initialData = {}) => {
    return {
        id: projectId,
        scope: initialData.scope || null,
        timeline: initialData.timeline || null,
        budget: initialData.budget || null,
        deliverables: initialData.deliverables || [],
        dependencies: initialData.dependencies || [],
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
    const client = await getRedisClient();
    const key = REDIS_KEYS.PROJECT(projectId);
    await client.set(key, JSON.stringify(projectData));
}

export async function getProjectData(projectId) {
    const client = await getRedisClient();
    const key = REDIS_KEYS.PROJECT(projectId);
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
}

export async function saveKnowledgeData(projectId, knowledgeData) {
    const client = await getRedisClient();
    const key = REDIS_KEYS.KNOWLEDGE(projectId);
    await client.set(key, JSON.stringify(knowledgeData));
}

export async function getKnowledgeData(projectId) {
    const client = await getRedisClient();
    const key = REDIS_KEYS.KNOWLEDGE(projectId);
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
}

export async function saveGapData(projectId, gapData) {
    const client = await getRedisClient();
    const key = REDIS_KEYS.GAPS(projectId);
    await client.set(key, JSON.stringify(gapData));
}

export async function getGapData(projectId) {
    const client = await getRedisClient();
    const key = REDIS_KEYS.GAPS(projectId);
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
}

export async function saveLearningData(userId, learningData) {
    const client = await getRedisClient();
    const key = REDIS_KEYS.LEARNING(userId);
    await client.set(key, JSON.stringify(learningData));
}

export async function getLearningData(userId) {
    const client = await getRedisClient();
    const key = REDIS_KEYS.LEARNING(userId);
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
}

export async function saveReflectionData(projectId, reflectionData) {
    const client = await getRedisClient();
    const key = REDIS_KEYS.REFLECTION(projectId);
    await client.set(key, JSON.stringify(reflectionData));
}

export async function getReflectionData(projectId) {
    const client = await getRedisClient();
    const key = REDIS_KEYS.REFLECTION(projectId);
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
}

export async function saveChatHistory(projectId, chatHistory) {
    const client = await getRedisClient();
    const key = REDIS_KEYS.CHAT_HISTORY(projectId);
    await client.set(key, JSON.stringify(chatHistory));
}

export async function getChatHistory(projectId) {
    const client = await getRedisClient();
    const key = REDIS_KEYS.CHAT_HISTORY(projectId);
    const data = await client.get(key);
    return data ? JSON.parse(data) : [];
}

// Utility Functions
export function calculateProjectCompleteness(projectData) {
    const fields = [PROJECT_FIELDS.SCOPE, PROJECT_FIELDS.TIMELINE, PROJECT_FIELDS.BUDGET];
    const completedFields = fields.filter(field => projectData[field] !== null && projectData[field] !== undefined);
    return completedFields.length / fields.length;
}

export function identifyMissingFields(projectData) {
    const missing = [];
    if (!projectData.scope) missing.push(PROJECT_FIELDS.SCOPE);
    if (!projectData.timeline) missing.push(PROJECT_FIELDS.TIMELINE);
    if (!projectData.budget) missing.push(PROJECT_FIELDS.BUDGET);
    if (!projectData.deliverables || projectData.deliverables.length === 0) missing.push(PROJECT_FIELDS.DELIVERABLES);
    if (!projectData.dependencies || projectData.dependencies.length === 0) missing.push(PROJECT_FIELDS.DEPENDENCIES);
    return missing;
}


