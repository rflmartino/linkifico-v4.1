// executionController.js - Executes planned actions and processes user responses
// Mirrors Cursor's execution system - processes responses and updates project data

import { getSecret } from 'wix-secrets-backend';
import { askClaude } from 'backend/aiClient';
import { 
    getProjectData,
    saveProjectData,
    PROJECT_FIELDS 
} from 'backend/data/projectData';
import { Logger } from '../utils/logger';
import compromiseSentiment from 'backend/nlp/compromiseSentiment';
import nlpManager from 'backend/nlp/nlpManager';

async function callClaude(prompt, systemPrompt = null) {
    return await askClaude({
        user: prompt,
        system: systemPrompt || "You are an expert project management assistant. Process user responses and extract actionable project information.",
        model: 'claude-3-5-haiku-latest',
        maxTokens: 1000
    });
}

export const executionController = {
    
    // Main execution function
    async executeAction(projectId, userId, userMessage, actionPlan, projectData) {
        try {
            Logger.info('executionController', 'executeAction:start', { projectId, action: actionPlan?.action });
            
            // Step 1: Try NLP first with confidence gate
            const nlpStart = Date.now();
            const nlpResult = await this.tryNLPProcessing(userMessage, actionPlan, projectData);
            Logger.info('executionController', 'timing:nlpProcessingMs', { ms: Date.now() - nlpStart });
            
            if (nlpResult.success) {
                Logger.info('executionController', 'nlpSuccess', { 
                    intent: nlpResult.intent, 
                    confidence: nlpResult.confidence,
                    usedNLP: true 
                });
                
                // Update project data with NLP-extracted information
                const updatedProjectData = await this.updateProjectData(projectId, projectData, nlpResult.extractedInfo);
                
                const result = {
                    message: nlpResult.responseMessage,
                    analysis: {
                        extractedInfo: nlpResult.extractedInfo,
                        updatedProjectData: updatedProjectData,
                        shouldContinue: true,
                        actionExecuted: nlpResult.action,
                        confidence: nlpResult.confidence,
                        usedNLP: true,
                        intent: nlpResult.intent
                    }
                };
                Logger.info('executionController', 'executeAction:end:nlp', { ok: true });
                return result;
            }
            
            // Step 2: Fallback to Haiku for low confidence or unknown intents
            Logger.info('executionController', 'nlpFallback', { 
                reason: nlpResult.reason,
                usedNLP: false 
            });
            
            // Analyze user sentiment to control verbosity
            const sentimentAnalysis = compromiseSentiment.analyzeForHaiku(userMessage);
            Logger.info('executionController', 'sentimentAnalysis', { 
                sentiment: sentimentAnalysis.sentiment, 
                verbosity: sentimentAnalysis.verbosityInstruction,
                confidence: sentimentAnalysis.confidence 
            });
            
            // Process user response and generate response in single API call
            const apiStart = Date.now();
            const { extractedInfo, responseMessage } = await this.extractAndGenerateResponse(userMessage, actionPlan, projectData, sentimentAnalysis);
            Logger.info('executionController', 'timing:haikuCombinedCallMs', { ms: Date.now() - apiStart });
            
            // Update project data with extracted information
            const updatedProjectData = await this.updateProjectData(projectId, projectData, extractedInfo);
            
            // Determine if we should continue or wait
            const shouldContinue = this.shouldContinueConversation(extractedInfo, updatedProjectData);
            
            const result = {
                message: responseMessage,
                analysis: {
                    extractedInfo: extractedInfo,
                    updatedProjectData: updatedProjectData,
                    shouldContinue: shouldContinue,
                    actionExecuted: actionPlan.action,
                    confidence: actionPlan.confidence,
                    usedNLP: false
                }
            };
            Logger.info('executionController', 'executeAction:end:haiku', { ok: true });
            return result;
            
        } catch (error) {
            Logger.error('executionController', 'executeAction:error', error);
            return {
                message: "I understand. Let me help you with that. Could you tell me more about your project?",
                analysis: {
                    extractedInfo: null,
                    updatedProjectData: projectData,
                    shouldContinue: true,
                    actionExecuted: 'fallback',
                    confidence: 0.3
                }
            };
        }
    },
    
    // Try NLP processing first with confidence gate
    async tryNLPProcessing(userMessage, actionPlan, projectData) {
        try {
            const confidenceThreshold = 0.8; // 80% confidence threshold
            
            // Get complete analysis from NLP (includes intent, confidence, and response)
            const nlpResult = await nlpManager.processInput(userMessage);
            
            if (!nlpResult || nlpResult.confidence < confidenceThreshold) {
                return {
                    success: false,
                    reason: `Low confidence: ${nlpResult?.confidence || 0} < ${confidenceThreshold}`,
                    confidence: nlpResult?.confidence || 0
                };
            }
            
            // Check if NLP provided a response
            if (!nlpResult.answer) {
                return {
                    success: false,
                    reason: `No response from NLP for intent: ${nlpResult.intent}`,
                    confidence: nlpResult.confidence
                };
            }
            
            // Extract information based on intent (simplified)
            const extractedInfo = this.extractInfoFromIntent(nlpResult.intent, userMessage, actionPlan);
            
            return {
                success: true,
                intent: nlpResult.intent,
                confidence: nlpResult.confidence,
                responseMessage: nlpResult.answer, // Use the response from NLP
                extractedInfo: extractedInfo,
                action: nlpResult.mappedAction || actionPlan.action // Use mapped action from NLP
            };
            
        } catch (error) {
            Logger.error('executionController', 'tryNLPProcessing:error', error);
            return {
                success: false,
                reason: `NLP error: ${error.message}`,
                confidence: 0
            };
        }
    },
    
    // Extract information from user message based on intent
    extractInfoFromIntent(intent, userMessage, actionPlan) {
        const extractedInfo = {
            confidence: 0.8, // High confidence for NLP
            extractionQuality: 'high',
            additionalInfo: '',
            needsClarification: []
        };
        
        switch (intent) {
            case 'scope.define':
                extractedInfo.extractedFields = {
                    scope: userMessage,
                    timeline: null,
                    budget: null,
                    deliverables: [],
                    dependencies: []
                };
                break;
                
            case 'budget.set':
                // Extract budget numbers from message
                const budgetMatch = userMessage.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
                if (budgetMatch) {
                    extractedInfo.extractedFields = {
                        scope: null,
                        timeline: null,
                        budget: budgetMatch[1],
                        deliverables: [],
                        dependencies: []
                    };
                }
                break;
                
            case 'timeline.set':
                extractedInfo.extractedFields = {
                    scope: null,
                    timeline: userMessage,
                    budget: null,
                    deliverables: [],
                    dependencies: []
                };
                break;
                
            case 'deliverables.define':
                extractedInfo.extractedFields = {
                    scope: null,
                    timeline: null,
                    budget: null,
                    deliverables: [userMessage],
                    dependencies: []
                };
                break;
                
            case 'dependencies.define':
                extractedInfo.extractedFields = {
                    scope: null,
                    timeline: null,
                    budget: null,
                    deliverables: [],
                    dependencies: [userMessage]
                };
                break;
                
            case 'response.positive':
                extractedInfo.extractedFields = {
                    scope: null,
                    timeline: null,
                    budget: null,
                    deliverables: [],
                    dependencies: []
                };
                extractedInfo.confirmation = true;
                break;
                
            case 'response.negative':
                extractedInfo.extractedFields = {
                    scope: null,
                    timeline: null,
                    budget: null,
                    deliverables: [],
                    dependencies: []
                };
                extractedInfo.confirmation = false;
                break;
                
            default:
                // For other intents, try to extract basic info
                extractedInfo.extractedFields = {
                    scope: null,
                    timeline: null,
                    budget: null,
                    deliverables: [],
                    dependencies: []
                };
                extractedInfo.additionalInfo = userMessage;
                break;
        }
        
        return extractedInfo;
    },
    
    // Combined extraction and response generation in single API call
    async extractAndGenerateResponse(userMessage, actionPlan, projectData, sentimentAnalysis) {
        try {
            const verbosityInstruction = sentimentAnalysis?.verbosityInstruction || 'normal';
            const prompt = `User: "${userMessage}"
Action: ${actionPlan.action}
Verbosity: ${verbosityInstruction} (${verbosityInstruction === 'terse' ? 'max 50 words' : verbosityInstruction === 'normal' ? 'max 150 words' : 'max 300 words'})

Respond in JSON:
{
  "extractedInfo": {
    "confidence": 0.8,
    "scope": "extracted scope or null",
    "timeline": "extracted timeline or null", 
    "budget": "extracted budget or null",
    "deliverables": [],
    "dependencies": [],
    "needsClarification": []
  },
  "responseMessage": "Your response following verbosity limits"
}`;

            const response = await askClaude({
                user: prompt,
                system: "Extract project info and generate responses with verbosity control.",
                model: 'claude-3-5-haiku-latest',
                maxTokens: 800
            });

            // Parse the JSON response
            const parsedResponse = JSON.parse(response);
            
            Logger.info('executionController', 'extractAndGenerateResponse:success', { 
                extractedConfidence: parsedResponse.extractedInfo?.confidence,
                responseLength: parsedResponse.responseMessage?.length
            });
            
            return {
                extractedInfo: parsedResponse.extractedInfo,
                responseMessage: parsedResponse.responseMessage
            };
            
        } catch (error) {
            Logger.error('executionController', 'extractAndGenerateResponse:error', error);
            return {
                extractedInfo: { confidence: 0.3, needsClarification: ['Unable to parse response'] },
                responseMessage: "I understand. Let me help you with that. Could you tell me more about your project?"
            };
        }
    },
    
    
    // Update project data with extracted information
    async updateProjectData(projectId, projectData, extractedInfo) {
        try {
            const updatedData = { ...projectData };
            
            if (extractedInfo && extractedInfo.extractedFields) {
                const fields = extractedInfo.extractedFields;
                
                // Update scope
                if (fields.scope && fields.scope !== null) {
                    updatedData.scope = fields.scope;
                }
                
                // Update timeline
                if (fields.timeline && fields.timeline !== null) {
                    updatedData.timeline = fields.timeline;
                }
                
                // Update budget
                if (fields.budget && fields.budget !== null) {
                    updatedData.budget = fields.budget;
                }
                
                // Update deliverables
                if (fields.deliverables && Array.isArray(fields.deliverables)) {
                    updatedData.deliverables = [...(updatedData.deliverables || []), ...fields.deliverables];
                }
                
                // Update dependencies
                if (fields.dependencies && Array.isArray(fields.dependencies)) {
                    updatedData.dependencies = [...(updatedData.dependencies || []), ...fields.dependencies];
                }
                
                // Update timestamp
                updatedData.updatedAt = new Date().toISOString();
            }
            
            // Save updated project data
            await saveProjectData(projectId, updatedData);
            
            return updatedData;
            
        } catch (error) {
            console.error('Error updating project data:', error);
            return projectData;
        }
    },
    
    
    // Determine if conversation should continue
    shouldContinueConversation(extractedInfo, updatedProjectData) {
        try {
            // Check if we have basic project information
            const hasScope = updatedProjectData.scope && updatedProjectData.scope.length > 10;
            const hasTimeline = updatedProjectData.timeline && updatedProjectData.timeline.length > 5;
            const hasBudget = updatedProjectData.budget && updatedProjectData.budget.length > 5;
            
            // If we have all three, we might be ready for more detailed planning
            if (hasScope && hasTimeline && hasBudget) {
                return true; // Continue to deliverables and dependencies
            }
            
            // If we have at least scope, continue
            if (hasScope) {
                return true;
            }
            
            // If extraction was good, continue
            if (extractedInfo && extractedInfo.confidence > 0.6) {
                return true;
            }
            
            // Default to continue
            return true;
            
        } catch (error) {
            console.error('Error determining conversation continuation:', error);
            return true;
        }
    },
    
    // Get execution summary
    async getExecutionSummary(projectId) {
        try {
            const projectData = await getProjectData(projectId);
            if (!projectData) {
                return {
                    status: 'No project data available',
                    recommendations: ['Start project planning']
                };
            }
            
            return {
                projectData: projectData,
                completeness: this.calculateCompleteness(projectData),
                lastUpdated: projectData.updatedAt,
                status: this.getExecutionStatus(projectData),
                recommendations: this.generateExecutionRecommendations(projectData)
            };
            
        } catch (error) {
            console.error('Error getting execution summary:', error);
            return {
                status: 'Execution error',
                recommendations: ['Check system status']
            };
        }
    },
    
    // Calculate project completeness
    calculateCompleteness(projectData) {
        const fields = [PROJECT_FIELDS.SCOPE, PROJECT_FIELDS.TIMELINE, PROJECT_FIELDS.BUDGET];
        const completedFields = fields.filter(field => {
            const value = projectData[field];
            return value !== null && value !== undefined && value.toString().length > 5;
        });
        
        return completedFields.length / fields.length;
    },
    
    // Get execution status
    getExecutionStatus(projectData) {
        const completeness = this.calculateCompleteness(projectData);
        
        if (completeness >= 1.0) {
            return 'Project fully defined - ready for detailed planning';
        } else if (completeness >= 0.67) {
            return 'Project mostly defined - minor gaps remain';
        } else if (completeness >= 0.33) {
            return 'Project partially defined - significant gaps remain';
        } else {
            return 'Project needs definition - basic information missing';
        }
    },
    
    // Generate execution recommendations
    generateExecutionRecommendations(projectData) {
        const recommendations = [];
        const completeness = this.calculateCompleteness(projectData);
        
        if (completeness < 0.33) {
            recommendations.push('Define project scope first');
            recommendations.push('Establish basic timeline and budget');
        } else if (completeness < 0.67) {
            recommendations.push('Complete remaining basic information');
            recommendations.push('Start defining deliverables');
        } else if (completeness < 1.0) {
            recommendations.push('Finalize project definition');
            recommendations.push('Begin detailed planning phase');
        } else {
            recommendations.push('Project definition complete');
            recommendations.push('Move to execution planning');
        }
        
        return recommendations;
    }
};
