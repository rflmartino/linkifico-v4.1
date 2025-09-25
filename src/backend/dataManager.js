// dataManager.js - Centralized data management with batch Redis operations
// Reduces Redis calls from 25+ per interaction to just 2 (load + save)

import { getRedisClient } from 'backend/redis';
import { Logger } from 'backend/logger';

const REDIS_KEYS = {
    PROJECT: (projectId) => `project:${projectId}`,
    CHAT_HISTORY: (projectId) => `chat:${projectId}`,
    KNOWLEDGE: (projectId) => `knowledge:${projectId}`,
    GAPS: (projectId) => `gaps:${projectId}`,
    LEARNING: (userId) => `learning:${userId}`,
    REFLECTION: (projectId) => `reflection:${projectId}`,
    PROCESSING: (processingId) => `processing:${processingId}`
};

export class DataManager {
    
    // Load all data for a project and user in a single Redis operation
    async loadAllData(projectId, userId) {
        const startTime = Date.now();
        try {
            const client = await getRedisClient();
            
            // Get all keys we need
            const keys = [
                REDIS_KEYS.PROJECT(projectId),
                REDIS_KEYS.CHAT_HISTORY(projectId),
                REDIS_KEYS.KNOWLEDGE(projectId),
                REDIS_KEYS.GAPS(projectId),
                REDIS_KEYS.LEARNING(userId),
                REDIS_KEYS.REFLECTION(projectId)
            ];
            
            // Batch get all data
            const values = await client.mget(keys);
            
            // Parse and structure the data
            const data = {
                projectData: values[0] ? JSON.parse(values[0]) : null,
                chatHistory: values[1] ? JSON.parse(values[1]) : [],
                knowledgeData: values[2] ? JSON.parse(values[2]) : null,
                gapData: values[3] ? JSON.parse(values[3]) : null,
                learningData: values[4] ? JSON.parse(values[4]) : null,
                reflectionData: values[5] ? JSON.parse(values[5]) : null
            };
            
            Logger.info('dataManager', 'timing:loadAllDataMs', { ms: Date.now() - startTime });
            Logger.info('dataManager', 'loadAllData:success', { 
                projectId, 
                userId, 
                hasProjectData: !!data.projectData,
                hasChatHistory: data.chatHistory.length > 0,
                hasLearningData: !!data.learningData
            });
            
            return data;
            
        } catch (error) {
            Logger.error('dataManager', 'loadAllData:error', error);
            // Return empty data structure on error
            return {
                projectData: null,
                chatHistory: [],
                knowledgeData: null,
                gapData: null,
                learningData: null,
                reflectionData: null
            };
        }
    }
    
    // Save all data for a project and user in a single Redis operation
    async saveAllData(projectId, userId, data) {
        const startTime = Date.now();
        try {
            const client = await getRedisClient();
            
            // Prepare all key-value pairs for batch save
            const pipeline = client.pipeline();
            
            if (data.projectData) {
                pipeline.set(REDIS_KEYS.PROJECT(projectId), JSON.stringify(data.projectData));
            }
            
            if (data.chatHistory) {
                pipeline.set(REDIS_KEYS.CHAT_HISTORY(projectId), JSON.stringify(data.chatHistory));
            }
            
            if (data.knowledgeData) {
                pipeline.set(REDIS_KEYS.KNOWLEDGE(projectId), JSON.stringify(data.knowledgeData));
            }
            
            if (data.gapData) {
                pipeline.set(REDIS_KEYS.GAPS(projectId), JSON.stringify(data.gapData));
            }
            
            if (data.learningData) {
                pipeline.set(REDIS_KEYS.LEARNING(userId), JSON.stringify(data.learningData));
            }
            
            if (data.reflectionData) {
                pipeline.set(REDIS_KEYS.REFLECTION(projectId), JSON.stringify(data.reflectionData));
            }
            
            // Execute all saves in a single pipeline
            await pipeline.exec();
            
            Logger.info('dataManager', 'timing:saveAllDataMs', { ms: Date.now() - startTime });
            Logger.info('dataManager', 'saveAllData:success', { 
                projectId, 
                userId,
                savedFields: Object.keys(data).filter(key => data[key] !== null)
            });
            
            return true;
            
        } catch (error) {
            Logger.error('dataManager', 'saveAllData:error', error);
            return false;
        }
    }
    
    // Save processing status (still individual for real-time updates)
    async saveProcessing(processingId, status) {
        const startTime = Date.now();
        try {
            const client = await getRedisClient();
            await client.set(REDIS_KEYS.PROCESSING(processingId), JSON.stringify(status));
            Logger.info('dataManager', 'timing:saveProcessingMs', { ms: Date.now() - startTime });
            return true;
        } catch (error) {
            Logger.error('dataManager', 'saveProcessing:error', error);
            return false;
        }
    }
    
    // Get processing status (still individual for real-time polling)
    async getProcessing(processingId) {
        const startTime = Date.now();
        try {
            const client = await getRedisClient();
            const data = await client.get(REDIS_KEYS.PROCESSING(processingId));
            Logger.info('dataManager', 'timing:getProcessingMs', { ms: Date.now() - startTime });
            return data ? JSON.parse(data) : null;
        } catch (error) {
            Logger.error('dataManager', 'getProcessing:error', error);
            return null;
        }
    }
    
    // Create default data structures
    createDefaultProjectData(projectId) {
        return {
            id: projectId,
            scope: null,
            timeline: null,
            budget: null,
            deliverables: [],
            dependencies: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
    
    createDefaultLearningData(userId) {
        return {
            userId: userId,
            userPatterns: {},
            questionEffectiveness: {},
            interactionHistory: [],
            lastUpdated: new Date().toISOString()
        };
    }
    
    createDefaultKnowledgeData(projectId) {
        return {
            projectId: projectId,
            analysis: null,
            confidence: 0,
            completeness: 0,
            lastUpdated: new Date().toISOString()
        };
    }
    
    createDefaultGapData(projectId) {
        return {
            projectId: projectId,
            criticalGaps: [],
            priorityScore: 0,
            nextAction: null,
            reasoning: null,
            todos: [],
            lastUpdated: new Date().toISOString()
        };
    }
    
    createDefaultReflectionData(projectId) {
        return {
            projectId: projectId,
            analysisHistory: [],
            decisionLog: [],
            improvementSuggestions: [],
            lastReflection: new Date().toISOString()
        };
    }
}

// Export singleton instance
export const dataManager = new DataManager();
