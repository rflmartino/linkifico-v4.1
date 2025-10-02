// executionController.js - Executes planned actions and processes user responses
// Mirrors Cursor's execution system - processes responses and updates project data

import { getSecret } from 'wix-secrets-backend';
import { askClaude } from '../utils/aiClient.js';
import { 
    getProjectData,
    saveProjectData
} from 'backend/data/projectData.js';
import { redisData } from '../data/redisData.js';
import { Logger } from '../utils/logger.js';
import compromiseSentiment from 'backend/nlp/compromiseSentiment.js';
import nlpManager from 'backend/nlp/nlpManager.js';

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
    async executeAction(projectId, userId, userMessage, actionPlan, projectData, template = null) {
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
                const updatedProjectData = await this.updateProjectData(projectId, projectData, nlpResult.extractedInfo, template, actionPlan);
                
                // Generate intelligent project name if still using default
                await this.updateProjectNameIfNeeded(projectId, updatedProjectData, userMessage, nlpResult.extractedInfo);
                
                // Generate action-aware response for NLP path
                const actionAwareMessage = this.generateActionAwareResponse(nlpResult.responseMessage, actionPlan.action, userMessage);
                
                const result = {
                    message: actionAwareMessage,
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
                
                // CRITICAL DEBUG: Log what NLP path is returning
                Logger.info('executionController', 'executeAction:nlpResult', {
                    projectId,
                    userId,
                    message: result.message,
                    messageLength: result.message ? result.message.length : 0,
                    hasAnalysis: !!result.analysis,
                    analysis: result.analysis,
                    fullResult: result
                });
                
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
            const updatedProjectData = await this.updateProjectData(projectId, projectData, extractedInfo, template, actionPlan);
            
            // Generate intelligent project name if still using default
            await this.updateProjectNameIfNeeded(projectId, updatedProjectData, userMessage, extractedInfo);
            
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
            
            // CRITICAL DEBUG: Log what Haiku fallback path is returning
            Logger.info('executionController', 'executeAction:haikuResult', {
                projectId,
                userId,
                message: result.message,
                messageLength: result.message ? result.message.length : 0,
                hasAnalysis: !!result.analysis,
                analysis: result.analysis,
                fullResult: result
            });
            
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
                extractedInfo.extractedFields = { templateArea: 'objectives', objectives: { description: userMessage } };
                break;
                
            case 'project.rename':
                // Extract new project name from message
                const newProjectName = this.extractProjectNameFromMessage(userMessage);
                if (newProjectName) {
                    extractedInfo.extractedFields = { templateArea: 'project_name', projectName: newProjectName };
                }
                break;
                
            case 'budget.set':
                // Extract budget numbers from message
                const budgetMatch = userMessage.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
                if (budgetMatch) {
                    extractedInfo.extractedFields = { templateArea: 'budget', budget: { total: budgetMatch[1] } };
                }
                break;
                
            case 'timeline.set':
                extractedInfo.extractedFields = { templateArea: 'tasks', tasks: { deadline: userMessage } };
                break;
                
            case 'deliverables.define':
                extractedInfo.extractedFields = { templateArea: 'tasks', tasks: { tasks: [userMessage] } };
                break;
                
            case 'dependencies.define':
                extractedInfo.extractedFields = { templateArea: 'tasks', tasks: { dependencies: [userMessage] } };
                break;
                
            case 'response.positive':
                extractedInfo.extractedFields = {};
                extractedInfo.confirmation = true;
                break;
                
            case 'response.negative':
                extractedInfo.extractedFields = {};
                extractedInfo.confirmation = false;
                break;
                
            default:
                // For other intents, leave to template-aware combined extraction
                extractedInfo.extractedFields = {};
                extractedInfo.additionalInfo = userMessage;
                break;
        }
        
        return extractedInfo;
    },
    
    // Extract project name from user message
    extractProjectNameFromMessage(userMessage) {
        try {
            // Common patterns for project name requests
            const patterns = [
                /(?:change|rename|set|update).*(?:project\s+)?name\s+to\s+(.+?)(?:\.|$)/i,
                /(?:call|name)\s+(?:this\s+project|it)\s+(.+?)(?:\.|$)/i,
                /(?:let'?s\s+)?(?:call|name)\s+(?:this|it)\s+(.+?)(?:\.|$)/i,
                /project\s+name\s+should\s+be\s+(.+?)(?:\.|$)/i,
                /(?:rename|change)\s+(?:to|it\s+to)\s+(.+?)(?:\.|$)/i
            ];
            
            for (const pattern of patterns) {
                const match = userMessage.match(pattern);
                if (match && match[1]) {
                    let extractedName = match[1].trim();
                    
                    // Clean up the extracted name
                    extractedName = extractedName
                        .replace(/['"]/g, '') // Remove quotes
                        .replace(/\s+/g, ' ') // Normalize spaces
                        .trim();
                    
                    // Validate the name
                    if (extractedName.length > 0 && extractedName.length <= 100) {
                        return extractedName;
                    }
                }
            }
            
            return null;
        } catch (error) {
            Logger.error('executionController', 'extractProjectNameFromMessage:error', error);
            return null;
        }
    },
    
    // Update project name if still using default name
    async updateProjectNameIfNeeded(projectId, projectData, userMessage, extractedInfo) {
        try {
            // Skip if user explicitly requested a name change (handled elsewhere)
            if (extractedInfo?.extractedFields?.projectName) {
                return; // User explicitly set a name
            }
            
            // Only update if using default name or empty name
            const currentName = projectData.name || '';
            const isDefaultName = currentName === 'Untitled Project' || currentName === '' || currentName.startsWith('Project Chat');
            
            if (!isDefaultName) {
                return; // User has already set a custom name
            }
            
            // Generate intelligent name from conversation context
            const generatedName = await this.generateIntelligentProjectName(userMessage, extractedInfo, projectData);
            
            if (generatedName && generatedName !== currentName) {
                // Update project data
                projectData.name = generatedName;
                
                // Save to Redis
                await saveProjectData(projectId, projectData);
                
                Logger.info('executionController', 'projectNameGenerated', { 
                    projectId, 
                    oldName: currentName, 
                    newName: generatedName 
                });
            }
            
        } catch (error) {
            Logger.error('executionController', 'updateProjectNameIfNeeded:error', error);
            // Don't fail the whole process if name generation fails
        }
    },
    
    // Generate intelligent project name from context
    async generateIntelligentProjectName(userMessage, extractedInfo, projectData) {
        try {
            // First try to extract from objectives/scope
            const objectives = extractedInfo?.objectives?.description || projectData?.templateData?.objectives?.description || '';
            const scope = projectData?.scope || '';
            
            // Combine relevant context
            const context = [userMessage, objectives, scope].filter(Boolean).join(' ').substring(0, 500);
            
            if (!context.trim()) {
                return null; // Not enough context yet
            }
            
            const prompt = `Based on this project description, generate a concise, professional project name (2-4 words max):

"${context}"

Requirements:
- Professional and clear
- 2-4 words maximum
- No generic words like "project", "plan", "new"
- Focus on the business/goal type
- Examples: "Downtown Coffee Shop", "E-commerce Platform", "Marketing Campaign"

Project name:`;

            const response = await askClaude({
                user: prompt,
                system: "Generate concise, professional project names. Return only the name, no quotes or explanation.",
                model: 'claude-3-5-haiku-latest',
                maxTokens: 50
            });

            // Clean up the response
            const cleanName = response.trim()
                .replace(/['"]/g, '') // Remove quotes
                .replace(/^Project:\s*/i, '') // Remove "Project:" prefix
                .replace(/\.$/, '') // Remove trailing period
                .trim();

            // Validate the name
            if (cleanName.length > 0 && cleanName.length <= 50 && !cleanName.toLowerCase().includes('untitled')) {
                return cleanName;
            }
            
            return null;
            
        } catch (error) {
            Logger.error('executionController', 'generateIntelligentProjectName:error', error);
            return null;
        }
    },
    
    // Generate action-aware response for NLP path
    generateActionAwareResponse(nlpResponse, action, userMessage) {
        const actionQuestions = {
            'ask_about_objectives': [
                "What specific goals do you want to achieve with this project?",
                "What are your main objectives for this venture?", 
                "What do you hope to accomplish with this project?",
                "What are the key outcomes you're looking for?"
            ],
            'ask_about_budget': [
                "What budget do you have available for this project?",
                "What financial resources can you allocate to this?",
                "Do you have a budget range in mind?",
                "What's your investment capacity for this project?"
            ],
            'ask_about_tasks': [
                "What are the key tasks or milestones you need to complete?",
                "What's your timeline for getting this done?",
                "What deliverables do you need to produce?",
                "When do you need this project completed?"
            ],
            'ask_about_people': [
                "Who will be involved in this project?",
                "Do you have a team in place, or will you need to build one?",
                "Who are the key stakeholders for this project?",
                "What expertise will you need on your team?"
            ]
        };
        
        const questions = actionQuestions[action];
        if (questions && questions.length > 0) {
            // Pick a random question for variety
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
            return `${nlpResponse} ${randomQuestion}`;
        }
        
        return nlpResponse; // Return original if no specific action question
    },
    
    // Get specific instructions for each action type
    getActionInstructions(action) {
        const instructions = {
            'ask_about_objectives': 'IMPORTANT: After acknowledging their project, ask a specific follow-up question about their objectives, goals, or what they want to achieve. Be conversational and helpful.',
            'ask_about_budget': 'IMPORTANT: After acknowledging their input, ask a specific follow-up question about their budget, funding, or financial resources available.',
            'ask_about_tasks': 'IMPORTANT: After acknowledging their input, ask a specific follow-up question about their tasks, timeline, deliverables, or what work needs to be done.',
            'ask_about_people': 'IMPORTANT: After acknowledging their input, ask a specific follow-up question about their team, stakeholders, or who will be involved.',
            'request_clarification': 'IMPORTANT: Ask for clarification about something specific that was unclear or ambiguous in their message.',
            'provide_recommendation': 'IMPORTANT: Provide specific recommendations or next steps based on the information they\'ve provided.',
            'continue_planning': 'IMPORTANT: Continue the planning conversation by building on what they\'ve shared and asking about the next logical step.'
        };
        
        return instructions[action] || 'IMPORTANT: Acknowledge their input and ask a helpful follow-up question to continue the project planning conversation.';
    },
    
    // Combined extraction and response generation in single API call
    async extractAndGenerateResponse(userMessage, actionPlan, projectData, sentimentAnalysis) {
        try {
            const verbosityInstruction = sentimentAnalysis?.verbosityInstruction || 'normal';
            const actionInstructions = this.getActionInstructions(actionPlan.action);
            const prompt = `User: "${userMessage}"
Action: ${actionPlan.action}
Verbosity: ${verbosityInstruction} (${verbosityInstruction === 'terse' ? 'max 50 words' : verbosityInstruction === 'normal' ? 'max 150 words' : 'max 300 words'})

${actionInstructions}

Respond in JSON with template-aware fields (simple_waterfall):
{
  "extractedInfo": {
    "confidence": 0.8,
    "templateArea": "objectives|tasks|budget|people|unknown",
    "objectives": { "description": "...", "goals": [], "acceptanceCriteria": [] },
    "tasks": { "tasks": [], "deadline": null, "dependencies": [] },
    "budget": { "total": null, "spent": null, "lineItems": [] },
    "people": { "stakeholders": [], "team": [] },
    "needsClarification": []
  },
  "responseMessage": "Your response following verbosity limits"
}`;

            const response = await askClaude({
                user: prompt,
                system: "Extract project info and generate action-aware responses. Follow the action instructions to ask the right follow-up questions.",
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
    async updateProjectData(projectId, projectData, extractedInfo, template = null, actionPlan = null) {
        try {
            const updatedData = { ...projectData };
            updatedData.templateData = { ...(updatedData.templateData || {}) };
            
            if (extractedInfo && extractedInfo.extractedFields) {
                const fields = extractedInfo.extractedFields;
                const areaId = fields.templateArea || (actionPlan?.targetArea) || null;
                
                // Handle project name changes directly
                if (fields.projectName) {
                    updatedData.name = fields.projectName;
                    Logger.info('executionController', 'projectNameChanged', { 
                        projectId, 
                        oldName: projectData.name, 
                        newName: fields.projectName 
                    });
                }
                
                if (areaId && areaId !== 'project_name') {
                    const areaUpdate = {};
                    // Merge known area payloads
                    if (fields.objectives) areaUpdate.objectives = { ...(updatedData.templateData.objectives || {}), ...fields.objectives };
                    if (fields.tasks) areaUpdate.tasks = { ...(updatedData.templateData.tasks || {}), ...fields.tasks };
                    if (fields.budget) areaUpdate.budget = { ...(updatedData.templateData.budget || {}), ...fields.budget };
                    if (fields.people) areaUpdate.people = { ...(updatedData.templateData.people || {}), ...fields.people };
                    // Fallback: if no structured area object but areaId exists, attach additionalInfo minimally
                    if (Object.keys(areaUpdate).length === 0) {
                        updatedData.templateData[areaId] = { ...(updatedData.templateData[areaId] || {}), note: extractedInfo.additionalInfo || '' };
                    } else {
                        Object.assign(updatedData.templateData, areaUpdate);
                    }
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
        const td = projectData?.templateData || {};
        const areas = ['objectives','tasks','budget','people'];
        const total = areas.length;
        const filled = areas.filter(a => td[a] && Object.keys(td[a]).length > 0).length;
        return total ? filled / total : 0;
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
