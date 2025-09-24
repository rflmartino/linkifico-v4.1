// executionController.js - Executes planned actions and processes user responses
// Mirrors Cursor's execution system - processes responses and updates project data

import { getSecret } from 'wix-secrets-backend';
import { askClaude, askClaudeJSON } from 'backend/aiClient';
import { 
    getProjectData,
    saveProjectData,
    PROJECT_FIELDS 
} from 'backend/projectData';
import { Logger } from 'backend/logger';
import compromiseSentiment from 'backend/nlp/compromiseSentiment';

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
            
            // Analyze user sentiment to control verbosity
            const sentimentAnalysis = compromiseSentiment.analyzeForHaiku(userMessage);
            Logger.info('executionController', 'sentimentAnalysis', { 
                sentiment: sentimentAnalysis.sentiment, 
                verbosity: sentimentAnalysis.verbosityInstruction,
                confidence: sentimentAnalysis.confidence 
            });
            
            // Process user response to extract information
            const extractedInfo = await this.extractProjectInformation(userMessage, actionPlan, projectData);
            
            // Update project data with extracted information
            const updatedProjectData = await this.updateProjectData(projectId, projectData, extractedInfo);
            
            // Generate response message with sentiment-controlled verbosity
            const responseMessage = await this.generateResponseMessage(extractedInfo, actionPlan, updatedProjectData, sentimentAnalysis);
            
            // Determine if we should continue or wait
            const shouldContinue = this.shouldContinueConversation(extractedInfo, updatedProjectData);
            
            const result = {
                message: responseMessage,
                analysis: {
                    extractedInfo: extractedInfo,
                    updatedProjectData: updatedProjectData,
                    shouldContinue: shouldContinue,
                    actionExecuted: actionPlan.action,
                    confidence: actionPlan.confidence
                }
            };
            Logger.info('executionController', 'executeAction:end', { ok: true });
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
    
    // Extract project information from user response
    async extractProjectInformation(userMessage, actionPlan, projectData) {
        try {
            const prompt = `Extract project information from this user response:

User Message: "${userMessage}"
Action Plan: ${JSON.stringify(actionPlan, null, 2)}
Current Project Data: ${JSON.stringify(projectData, null, 2)}

Extract relevant information and respond in JSON format:
{
    "extractedFields": {
        "scope": "extracted scope or null",
        "timeline": "extracted timeline or null", 
        "budget": "extracted budget or null",
        "deliverables": ["deliverable1", "deliverable2"],
        "dependencies": ["dependency1", "dependency2"]
    },
    "confidence": 0.0-1.0,
    "extractionQuality": "high|medium|low",
    "additionalInfo": "any other relevant information",
    "needsClarification": ["what needs clarification"]
}`;

            const parsed = await askClaudeJSON({
                user: prompt,
                system: "You are an information extraction assistant. Return ONLY valid JSON with the requested fields.",
                model: 'claude-3-5-haiku-latest',
                maxTokens: 1000
            });

            if (parsed && parsed.extractedFields) {
                return parsed;
            }

            return this.fallbackExtraction(userMessage, actionPlan);
            
        } catch (error) {
            console.error('Error extracting project information:', error);
            return this.fallbackExtraction(userMessage, actionPlan);
        }
    },
    
    // Fallback extraction when AI fails
    fallbackExtraction(userMessage, actionPlan) {
        const extractedFields = {};
        let confidence = 0.5;
        
        // Simple keyword-based extraction
        const message = userMessage.toLowerCase();
        
        // Extract scope
        if (message.includes('project') || message.includes('build') || message.includes('create')) {
            extractedFields.scope = userMessage;
            confidence = 0.6;
        }
        
        // Extract timeline
        if (message.includes('month') || message.includes('week') || message.includes('day') || message.includes('deadline')) {
            extractedFields.timeline = userMessage;
            confidence = 0.6;
        }
        
        // Extract budget
        if (message.includes('$') || message.includes('budget') || message.includes('cost') || message.includes('money')) {
            extractedFields.budget = userMessage;
            confidence = 0.6;
        }
        
        return {
            extractedFields: extractedFields,
            confidence: confidence,
            extractionQuality: confidence > 0.7 ? 'high' : confidence > 0.5 ? 'medium' : 'low',
            additionalInfo: null,
            needsClarification: []
        };
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
    
    // Generate response message
    async generateResponseMessage(extractedInfo, actionPlan, updatedProjectData, sentimentAnalysis) {
        try {
            // If we extracted good information, acknowledge and continue
            if (extractedInfo && extractedInfo.confidence > 0.6) {
                return await this.generateAcknowledgmentMessage(extractedInfo, updatedProjectData, sentimentAnalysis);
            }
            
            // If extraction was poor, ask for clarification
            if (extractedInfo && extractedInfo.needsClarification && extractedInfo.needsClarification.length > 0) {
                return await this.generateClarificationMessage(extractedInfo, actionPlan, sentimentAnalysis);
            }
            
            // Default response
            return await this.generateDefaultResponse(actionPlan, updatedProjectData, sentimentAnalysis);
            
        } catch (error) {
            console.error('Error generating response message:', error);
            return "Thank you for that information. Let me help you plan your project further.";
        }
    },
    
    // Generate acknowledgment message
    async generateAcknowledgmentMessage(extractedInfo, updatedProjectData, sentimentAnalysis) {
        try {
            const verbosityInstruction = sentimentAnalysis?.verbosityInstruction || 'normal';
            const prompt = `Generate an acknowledgment message for this extracted information:

Extracted Info: ${JSON.stringify(extractedInfo, null, 2)}
Updated Project Data: ${JSON.stringify(updatedProjectData, null, 2)}

VERBOSITY INSTRUCTION: ${verbosityInstruction}
- If "terse": Keep response very brief and direct
- If "normal": Use standard professional length
- If "detailed": Provide comprehensive explanation

User sentiment: ${sentimentAnalysis?.sentiment || 'neutral'} (confidence: ${sentimentAnalysis?.confidence || 0.5})

Generate a response that:
1. Acknowledges what was provided
2. Shows understanding
3. Suggests next steps
4. Is encouraging and helpful

Keep it concise and natural.`;

            const text = await askClaude({
                user: prompt,
                system: "Generate a concise acknowledgment for the user.",
                model: 'claude-3-5-haiku-latest',
                maxTokens: 300
            });
            return (text || '').trim();
            
        } catch (error) {
            console.error('Error generating acknowledgment message:', error);
            return "Great! I've noted that information. Let's continue planning your project.";
        }
    },
    
    // Generate clarification message
    async generateClarificationMessage(extractedInfo, actionPlan, sentimentAnalysis) {
        try {
            const verbosityInstruction = sentimentAnalysis?.verbosityInstruction || 'normal';
            const prompt = `Generate a clarification message for this situation:

Extracted Info: ${JSON.stringify(extractedInfo, null, 2)}
Action Plan: ${JSON.stringify(actionPlan, null, 2)}

VERBOSITY INSTRUCTION: ${verbosityInstruction}
- If "terse": Keep response very brief and direct
- If "normal": Use standard professional length
- If "detailed": Provide comprehensive explanation

User sentiment: ${sentimentAnalysis?.sentiment || 'neutral'} (confidence: ${sentimentAnalysis?.confidence || 0.5})

Generate a response that:
1. Acknowledges the attempt to provide information
2. Asks for specific clarification
3. Is helpful and not frustrating
4. Guides toward the needed information

Keep it concise and natural.`;

            const text = await askClaude({
                user: prompt,
                system: "Generate a concise clarification request for the user.",
                model: 'claude-3-5-haiku-latest',
                maxTokens: 300
            });
            return (text || '').trim();
            
        } catch (error) {
            console.error('Error generating clarification message:', error);
            return "I want to make sure I understand correctly. Could you provide a bit more detail?";
        }
    },
    
    // Generate default response
    async generateDefaultResponse(actionPlan, updatedProjectData, sentimentAnalysis) {
        try {
            const verbosityInstruction = sentimentAnalysis?.verbosityInstruction || 'normal';
            const prompt = `Generate a default response for this project planning situation:

Action Plan: ${JSON.stringify(actionPlan, null, 2)}
Project Data: ${JSON.stringify(updatedProjectData, null, 2)}

VERBOSITY INSTRUCTION: ${verbosityInstruction}
- If "terse": Keep response very brief and direct
- If "normal": Use standard professional length
- If "detailed": Provide comprehensive explanation

User sentiment: ${sentimentAnalysis?.sentiment || 'neutral'} (confidence: ${sentimentAnalysis?.confidence || 0.5})

Generate a response that:
1. Is helpful and encouraging
2. Moves the conversation forward
3. Asks a relevant follow-up question
4. Shows progress understanding

Keep it concise and natural.`;

            const text = await askClaude({
                user: prompt,
                system: "Generate a concise helpful default response.",
                model: 'claude-3-5-haiku-latest',
                maxTokens: 300
            });
            return (text || '').trim();
            
        } catch (error) {
            console.error('Error generating default response:', error);
            return "I understand. Let's continue building your project plan. What's the next important aspect to consider?";
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
