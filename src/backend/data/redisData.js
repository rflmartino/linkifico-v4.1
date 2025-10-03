// redisData.js - Centralized data management with batch Redis operations
// Reduces Redis calls from 25+ per interaction to just 2 (load + save)

import { Logger } from '../utils/logger.js';
import { 
    getProjectData, saveProjectData,
    getKnowledgeData, saveKnowledgeData,
    getGapData, saveGapData,
    getLearningData, saveLearningData,
    getReflectionData, saveReflectionData,
    getChatHistory, saveChatHistory,
    getProcessing, saveProcessing,
    createProjectData, createKnowledgeData, createGapData, createLearningData, createReflectionData,
    getRedisClient
} from './projectData.js';

export const redisData = {
    
    // Load all data for a project and user in a single Redis operation
    async loadAllData(projectId, userId) {
        const startTime = Date.now();
        try {
            const [
                projectData,
                chatHistory,
                knowledgeData,
                gapData,
                learningData,
                reflectionData
            ] = await Promise.all([
                getProjectData(projectId),
                getChatHistory(projectId, userId),
                getKnowledgeData(projectId, userId),
                getGapData(projectId, userId),
                getLearningData(userId),
                getReflectionData(projectId, userId)
            ]);
            
            Logger.info('dataManager', 'timing:loadAllDataMs', { ms: Date.now() - startTime });
            
            // Debug logging to see what we're getting from each function
            Logger.info('dataManager', 'loadAllData:debug', {
                projectId,
                userId,
                chatHistoryLength: chatHistory ? chatHistory.length : 0,
                chatHistoryType: typeof chatHistory,
                chatHistorySample: chatHistory && chatHistory.length > 0 ? chatHistory.slice(0, 2) : 'empty'
            });
            
            return {
                projectData: projectData || this.createDefaultProjectData(projectId),
                chatHistory: chatHistory || [],
                knowledgeData: knowledgeData || this.createDefaultKnowledgeData(projectId),
                gapData: gapData || this.createDefaultGapData(projectId),
                learningData: learningData || this.createDefaultLearningData(userId),
                reflectionData: reflectionData || this.createDefaultReflectionData(projectId)
            };
            
        } catch (error) {
            Logger.error('dataManager', 'loadAllData:error', error);
            // Return default data structures on error
            return {
                projectData: this.createDefaultProjectData(projectId),
                chatHistory: [],
                knowledgeData: this.createDefaultKnowledgeData(projectId),
                gapData: this.createDefaultGapData(projectId),
                learningData: this.createDefaultLearningData(userId),
                reflectionData: this.createDefaultReflectionData(projectId)
            };
        }
    },

    // Generate unique project email with collision checking
    async generateUniqueProjectEmail() {
        try {
            let attempts = 0;
            
            while (attempts < 10) {
                const emailId = Math.floor(100000 + Math.random() * 900000).toString();
                const email = `project-${emailId}@linkifico.com`;
                
                // Check if email already exists using email-to-project mapping
                const client = await getRedisClient();
                const existingProjectId = await client.get(`email_to_project:${email}`);
                
                if (!existingProjectId) {
                    Logger.info('redisData', 'generateUniqueProjectEmail:success', { 
                        emailId, 
                        email, 
                        attempts: attempts + 1 
                    });
                    return { emailId, email };
                }
                
                attempts++;
                Logger.warn('redisData', 'generateUniqueProjectEmail:collision', { 
                    emailId, 
                    attempt: attempts 
                });
            }
            
            throw new Error('Unable to generate unique project email after 10 attempts');
            
        } catch (error) {
            Logger.error('redisData', 'generateUniqueProjectEmail:error', error);
            throw error;
        }
    },

    // Get project ID by email address (for future email processing)
    async getProjectIdByEmail(email) {
        try {
            const client = await getRedisClient();
            const projectId = await client.get(`email_to_project:${email}`);
            return projectId;
        } catch (error) {
            Logger.error('redisData', 'getProjectIdByEmail:error', error);
            return null;
        }
    },

    // Save email-to-project mapping
    async saveEmailMapping(email, projectId) {
        try {
            const client = await getRedisClient();
            await client.set(`email_to_project:${email}`, projectId);
            Logger.info('redisData', 'saveEmailMapping:success', { email, projectId });
        } catch (error) {
            Logger.error('redisData', 'saveEmailMapping:error', error);
            throw error;
        }
    },

    // Delete email-to-project mapping (for cleanup)
    async deleteEmailMapping(email) {
        try {
            const client = await getRedisClient();
            await client.del(`email_to_project:${email}`);
            Logger.info('redisData', 'deleteEmailMapping:success', { email });
        } catch (error) {
            Logger.error('redisData', 'deleteEmailMapping:error', error);
            throw error;
        }
    },

    // Save all data for a project and user in a single Redis operation
    async saveAllData(projectId, userId, allData) {
        const startTime = Date.now();
        try {
            
            await Promise.all([
                saveProjectData(projectId, allData.projectData),
                saveChatHistory(projectId, userId, allData.chatHistory),
                saveKnowledgeData(projectId, userId, allData.knowledgeData),
                saveGapData(projectId, userId, allData.gapData),
                saveLearningData(userId, allData.learningData),
                saveReflectionData(projectId, userId, allData.reflectionData)
            ]);
            
            Logger.info('dataManager', 'timing:saveAllDataMs', { ms: Date.now() - startTime });
            
        } catch (error) {
            Logger.error('dataManager', 'saveAllData:error', error);
            throw error;
        }
    },

    // Save processing status for polling
    async saveProcessing(processingId, payload) {
        try {
            await saveProcessing(processingId, payload);
        } catch (error) {
            Logger.error('dataManager', 'saveProcessing:error', error);
        }
    },

    // Get processing status for polling
    async getProcessing(processingId) {
        try {
            return await getProcessing(processingId);
        } catch (error) {
            Logger.error('dataManager', 'getProcessing:error', error);
            return null;
        }
    },

    // Delete project and clean up email mapping
    async deleteProject(projectId, userId) {
        try {
            const client = await getRedisClient();
            
            // Load project data to get email for cleanup
            const allData = await this.loadAllData(projectId, userId);
            const projectEmail = allData.projectData?.email;
            
            // Delete all project data
            await Promise.all([
                client.del(`project:${projectId}:${userId}:data`),
                client.del(`project:${projectId}:${userId}:chatHistory`),
                client.del(`project:${projectId}:${userId}:knowledgeData`),
                client.del(`project:${projectId}:${userId}:gapData`),
                client.del(`project:${projectId}:${userId}:learningData`),
                client.del(`project:${projectId}:${userId}:reflectionData`),
                // Clean up email mapping if email exists
                projectEmail ? this.deleteEmailMapping(projectEmail) : Promise.resolve()
            ]);
            
            Logger.info('redisData', 'deleteProject:success', { 
                projectId, 
                userId, 
                email: projectEmail 
            });
            
        } catch (error) {
            Logger.error('redisData', 'deleteProject:error', error);
            throw error;
        }
    },

    // Helper functions to create default data structures
    createDefaultProjectData(projectId) {
        return createProjectData(projectId, 'simple_waterfall', {
            name: 'Untitled Project',
            email: null, // Will be set during project initialization
            emailId: null, // Will be set during project initialization
            maturityLevel: 'basic',
            templateData: {},
            scope: null,
            budget: null,
            timeline: null,
            phases: [],
            tasks: [],
            team: [],
            risks: [],
            status: 'draft'
        });
    },

    createDefaultKnowledgeData(projectId) {
        return createKnowledgeData(projectId, {
            confidence: 0.0,
            knownFacts: [],
            uncertainties: [],
            analysisHistory: []
        });
    },

    createDefaultGapData(projectId) {
        return createGapData(projectId, {
            criticalGaps: [],
            priorityScore: 0.0,
            nextAction: 'ask_about_scope',
            reasoning: 'Initial analysis needed',
            todos: []
        });
    },

    createDefaultLearningData(userId) {
        return createLearningData(userId, {
            userPatterns: {},
            questionEffectiveness: {},
            interactionHistory: [],
            adaptationHistory: []
        });
    },

    createDefaultReflectionData(projectId) {
        return createReflectionData(projectId, {
            analysisHistory: [],
            decisionLog: [],
            improvementSuggestions: []
        });
    }
};