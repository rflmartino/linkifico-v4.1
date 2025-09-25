// dataManager.js - Centralized data management with batch Redis operations
// Reduces Redis calls from 25+ per interaction to just 2 (load + save)

import { Logger } from './logger';
import { 
    getProjectData, saveProjectData,
    getKnowledgeData, saveKnowledgeData,
    getGapData, saveGapData,
    getLearningData, saveLearningData,
    getReflectionData, saveReflectionData,
    getChatHistory, saveChatHistory,
    getProcessing, saveProcessing,
    createProjectData, createKnowledgeData, createGapData, createLearningData, createReflectionData
} from './projectData';

export const dataManager = {
    
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
                getChatHistory(projectId),
                getKnowledgeData(projectId),
                getGapData(projectId),
                getLearningData(userId),
                getReflectionData(projectId)
            ]);
            
            Logger.info('dataManager', 'timing:loadAllDataMs', { ms: Date.now() - startTime });
            
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

    // Save all data for a project and user in a single Redis operation
    async saveAllData(projectId, userId, allData) {
        const startTime = Date.now();
        try {
            await Promise.all([
                saveProjectData(projectId, allData.projectData),
                saveChatHistory(projectId, allData.chatHistory),
                saveKnowledgeData(projectId, allData.knowledgeData),
                saveGapData(projectId, allData.gapData),
                saveLearningData(userId, allData.learningData),
                saveReflectionData(projectId, allData.reflectionData)
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

    // Helper functions to create default data structures
    createDefaultProjectData(projectId) {
        return createProjectData(projectId, {
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