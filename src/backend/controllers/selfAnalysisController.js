// selfAnalysisController.js - Analyzes current project knowledge and confidence levels
// Mirrors Cursor's codebase analysis - continuously evaluates what the system knows

import { getSecret } from 'wix-secrets-backend';
import { askClaude, askClaudeJSON } from 'backend/aiClient';
import { Logger } from '../utils/logger';
import { 
    createKnowledgeData, 
    saveKnowledgeData, 
    getKnowledgeData,
    calculateProjectCompleteness,
    identifyMissingFields,
    PROJECT_FIELDS 
} from 'backend/data/projectData';

// AI wrapper
async function callClaude(prompt, systemPrompt = null) {
    return await askClaude({
        user: prompt,
        system: systemPrompt || "You are an intelligent project management assistant. Analyze project information and provide structured insights.",
        model: 'claude-3-5-haiku-latest',
        maxTokens: 1000
    });
}

export const selfAnalysisController = {
    
    // Main analysis function
    async analyzeProject(projectId, projectData, chatHistory, existingKnowledgeData = null) {
        try {
            Logger.info('selfAnalysisController', 'analyzeProject:start', { projectId });
            // Calculate basic completeness metrics
            const completeness = calculateProjectCompleteness(projectData);
            const missingFields = identifyMissingFields(projectData);
            
            // Analyze project context from chat history
            const contextAnalysis = await this.analyzeProjectContext(projectData, chatHistory);
            
            // Determine confidence levels
            const confidence = await this.calculateConfidence(projectData, contextAnalysis, completeness);
            
            // Identify known facts and uncertainties
            const knowledgeAssessment = await this.assessKnowledge(projectData, contextAnalysis, missingFields);
            
            // Create or update knowledge data structure
            const knowledgeData = existingKnowledgeData || createKnowledgeData(projectId, {
                confidence: confidence,
                knownFacts: knowledgeAssessment.knownFacts,
                uncertainties: knowledgeAssessment.uncertainties,
                analysisHistory: []
            });
            
            // Update knowledge data with new analysis
            knowledgeData.confidence = confidence;
            knowledgeData.knownFacts = knowledgeAssessment.knownFacts;
            knowledgeData.uncertainties = knowledgeAssessment.uncertainties;
            knowledgeData.completeness = completeness;
            knowledgeData.missingFields = missingFields;
            knowledgeData.contextAnalysis = contextAnalysis;
            knowledgeData.lastUpdated = new Date().toISOString();
            
            // Add to analysis history
            knowledgeData.analysisHistory.push({
                timestamp: new Date().toISOString(),
                completeness: completeness,
                confidence: confidence,
                missingFields: missingFields
            });
            
            Logger.info('selfAnalysisController', 'analyzeProject:end', { confidence, completeness });
            return {
                confidence: confidence,
                completeness: completeness,
                knownFacts: knowledgeAssessment.knownFacts,
                uncertainties: knowledgeAssessment.uncertainties,
                missingFields: missingFields,
                contextAnalysis: contextAnalysis,
                knowledgeData: knowledgeData
            };
            
        } catch (error) {
            Logger.error('selfAnalysisController', 'analyzeProject:error', error);
            return {
                confidence: 0.0,
                completeness: 0.0,
                knownFacts: [],
                uncertainties: ['Analysis failed'],
                missingFields: Object.values(PROJECT_FIELDS),
                contextAnalysis: null
            };
        }
    },
    
    // Analyze project context from chat history
    async analyzeProjectContext(projectData, chatHistory) {
        try {
            if (!chatHistory || chatHistory.length === 0) {
                return {
                    projectType: 'unknown',
                    complexity: 'low',
                    urgency: 'medium',
                    userEngagement: 'low'
                };
            }
            
            // Extract recent context (last 10 messages)
            const recentMessages = chatHistory.slice(-10);
            const contextText = recentMessages.map(msg => `${msg.role}: ${msg.message}`).join('\n');
            
            const prompt = `Analyze this project conversation context and provide insights:

Project Data: ${JSON.stringify(projectData, null, 2)}
Recent Chat Context: ${contextText}

Provide analysis in JSON format:
{
    "projectType": "business|personal|technical|creative|other",
    "complexity": "low|medium|high",
    "urgency": "low|medium|high",
    "userEngagement": "low|medium|high",
    "keyThemes": ["theme1", "theme2"],
    "progressIndicators": ["indicator1", "indicator2"]
}`;

            const response = await callClaude(prompt);
            
            // Parse JSON response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback analysis
            return {
                projectType: 'general',
                complexity: 'medium',
                urgency: 'medium',
                userEngagement: 'medium',
                keyThemes: [],
                progressIndicators: []
            };
            
        } catch (error) {
            console.error('Error analyzing project context:', error);
            return {
                projectType: 'unknown',
                complexity: 'medium',
                urgency: 'medium',
                userEngagement: 'medium',
                keyThemes: [],
                progressIndicators: []
            };
        }
    },
    
    // Calculate confidence in project knowledge
    async calculateConfidence(projectData, contextAnalysis, completeness) {
        try {
            let confidence = 0.0;
            
            // Base confidence from completeness
            confidence += completeness * 0.4;
            
            // Boost confidence for defined scope
            if (projectData.scope && projectData.scope.length > 10) {
                confidence += 0.2;
            }
            
            // Boost confidence for timeline
            if (projectData.timeline) {
                confidence += 0.2;
            }
            
            // Boost confidence for budget
            if (projectData.budget) {
                confidence += 0.1;
            }
            
            // Boost confidence for deliverables
            if (projectData.deliverables && projectData.deliverables.length > 0) {
                confidence += 0.1;
            }
            
            // Adjust based on context analysis
            if (contextAnalysis) {
                if (contextAnalysis.complexity === 'high') {
                    confidence *= 0.9; // Reduce confidence for complex projects
                }
                if (contextAnalysis.userEngagement === 'high') {
                    confidence += 0.05; // Boost confidence for engaged users
                }
            }
            
            return Math.min(Math.max(confidence, 0.0), 1.0);
            
        } catch (error) {
            console.error('Error calculating confidence:', error);
            return 0.0;
        }
    },
    
    // Assess what we know and don't know
    async assessKnowledge(projectData, contextAnalysis, missingFields) {
        try {
            const knownFacts = [];
            const uncertainties = [];
            
            // Analyze known facts
            if (projectData.scope) {
                knownFacts.push(`Project scope: ${projectData.scope}`);
            }
            if (projectData.timeline) {
                knownFacts.push(`Timeline: ${projectData.timeline}`);
            }
            if (projectData.budget) {
                knownFacts.push(`Budget: ${projectData.budget}`);
            }
            if (projectData.deliverables && projectData.deliverables.length > 0) {
                knownFacts.push(`Deliverables: ${projectData.deliverables.join(', ')}`);
            }
            if (projectData.dependencies && projectData.dependencies.length > 0) {
                knownFacts.push(`Dependencies: ${projectData.dependencies.join(', ')}`);
            }
            
            // Analyze uncertainties
            missingFields.forEach(field => {
                switch (field) {
                    case PROJECT_FIELDS.SCOPE:
                        uncertainties.push('Project scope is undefined');
                        break;
                    case PROJECT_FIELDS.TIMELINE:
                        uncertainties.push('Timeline is unclear');
                        break;
                    case PROJECT_FIELDS.BUDGET:
                        uncertainties.push('Budget constraints unknown');
                        break;
                    case PROJECT_FIELDS.DELIVERABLES:
                        uncertainties.push('Deliverables not specified');
                        break;
                    case PROJECT_FIELDS.DEPENDENCIES:
                        uncertainties.push('Dependencies not identified');
                        break;
                }
            });
            
            // Add context-based uncertainties
            if (contextAnalysis) {
                if (contextAnalysis.complexity === 'high') {
                    uncertainties.push('High complexity project - may need detailed planning');
                }
                if (contextAnalysis.urgency === 'high') {
                    uncertainties.push('High urgency - timeline critical');
                }
            }
            
            return {
                knownFacts: knownFacts,
                uncertainties: uncertainties
            };
            
        } catch (error) {
            console.error('Error assessing knowledge:', error);
            return {
                knownFacts: [],
                uncertainties: ['Knowledge assessment failed']
            };
        }
    },
    
    // Get analysis summary
    async getAnalysisSummary(projectId) {
        try {
            const knowledgeData = await getKnowledgeData(projectId);
            if (!knowledgeData) {
                return {
                    confidence: 0.0,
                    status: 'No analysis available',
                    recommendations: ['Run initial analysis']
                };
            }
            
            return {
                confidence: knowledgeData.confidence,
                status: this.getConfidenceStatus(knowledgeData.confidence),
                knownFacts: knowledgeData.knownFacts,
                uncertainties: knowledgeData.uncertainties,
                lastAnalyzed: knowledgeData.lastAnalyzed,
                recommendations: this.generateRecommendations(knowledgeData)
            };
            
        } catch (error) {
            console.error('Error getting analysis summary:', error);
            return {
                confidence: 0.0,
                status: 'Analysis error',
                recommendations: ['Check system status']
            };
        }
    },
    
    // Get confidence status description
    getConfidenceStatus(confidence) {
        if (confidence >= 0.8) return 'High confidence - well-defined project';
        if (confidence >= 0.6) return 'Medium confidence - some gaps remain';
        if (confidence >= 0.4) return 'Low confidence - significant gaps';
        return 'Very low confidence - project needs definition';
    },
    
    // Generate recommendations based on analysis
    generateRecommendations(knowledgeData) {
        const recommendations = [];
        
        if (knowledgeData.confidence < 0.3) {
            recommendations.push('Define project scope first');
            recommendations.push('Establish timeline and budget');
        } else if (knowledgeData.confidence < 0.6) {
            recommendations.push('Clarify remaining uncertainties');
            recommendations.push('Define deliverables and dependencies');
        } else {
            recommendations.push('Project well-defined - ready for execution');
            recommendations.push('Consider risk assessment and detailed planning');
        }
        
        return recommendations;
    }
};
