// actionPlanningController.js - Plans optimal next actions based on gaps and user patterns
// Mirrors Cursor's suggestion system - determines best next step

import { getSecret } from 'wix-secrets-backend';
import { askClaude, askClaudeJSON } from '../utils/aiClient';
import { Logger } from '../utils/logger';
import { 
    getLearningData,
    saveLearningData,
    createLearningData 
} from 'backend/data/projectData';

async function callClaude(prompt, systemPrompt = null) {
    return await askClaude({
        user: prompt,
        system: systemPrompt || "You are an expert project management strategist. Plan optimal actions based on gaps, user patterns, and project context.",
        model: 'claude-3-5-haiku-latest',
        maxTokens: 1000
    });
}

export const actionPlanningController = {
    
    // Main action planning function
    async planAction(projectId, userId, gaps, analysis, chatHistory, learningData) {
        try {
            Logger.info('actionPlanningController', 'planAction:start', { projectId, userId });
            // Use provided learning data instead of fetching
            
            // Analyze conversation context
            const conversationContext = await this.analyzeConversationContext(chatHistory, analysis);
            
            // Plan optimal action based on gaps and user patterns
            const actionPlan = await this.generateActionPlan(gaps, learningData, conversationContext, analysis);
            
            // Update learning data with planning decision (don't save, just update in memory)
            this.updateLearningFromPlanning(userId, actionPlan, learningData);
            
            Logger.info('actionPlanningController', 'planAction:end', { action: actionPlan?.action });
            return {
                ...actionPlan,
                updatedLearningData: learningData
            };
            
        } catch (error) {
            Logger.error('actionPlanningController', 'planAction:error', error);
            return {
                action: 'ask_about_scope',
                question: 'What exactly are you trying to accomplish with this project?',
                reasoning: 'Action planning failed - defaulting to scope question',
                timing: 'immediate',
                confidence: 0.5
            };
        }
    },
    
    // Analyze conversation context
    async analyzeConversationContext(chatHistory, analysis) {
        try {
            if (!chatHistory || chatHistory.length === 0) {
                return {
                    conversationStage: 'initial',
                    userEngagement: 'unknown',
                    questionFrequency: 0,
                    responsePattern: 'unknown'
                };
            }
            
            // Analyze recent conversation patterns
            const recentMessages = chatHistory.slice(-10);
            const userMessages = recentMessages.filter(msg => msg.role === 'user');
            const assistantMessages = recentMessages.filter(msg => msg.role === 'assistant');
            
            // Calculate engagement metrics
            const questionFrequency = assistantMessages.length / Math.max(userMessages.length, 1);
            const avgResponseLength = userMessages.reduce((sum, msg) => sum + msg.message.length, 0) / Math.max(userMessages.length, 1);
            
            // Determine conversation stage
            let conversationStage = 'initial';
            if (chatHistory.length > 20) {
                conversationStage = 'detailed';
            } else if (chatHistory.length > 10) {
                conversationStage = 'planning';
            } else if (chatHistory.length > 5) {
                conversationStage = 'exploration';
            }
            
            // Determine user engagement level
            let userEngagement = 'medium';
            if (avgResponseLength > 100) {
                userEngagement = 'high';
            } else if (avgResponseLength < 30) {
                userEngagement = 'low';
            }
            
            return {
                conversationStage: conversationStage,
                userEngagement: userEngagement,
                questionFrequency: questionFrequency,
                responsePattern: this.analyzeResponsePattern(userMessages),
                avgResponseLength: avgResponseLength,
                totalMessages: chatHistory.length
            };
            
        } catch (error) {
            console.error('Error analyzing conversation context:', error);
            return {
                conversationStage: 'initial',
                userEngagement: 'medium',
                questionFrequency: 1.0,
                responsePattern: 'unknown'
            };
        }
    },
    
    // Analyze user response patterns
    analyzeResponsePattern(userMessages) {
        if (!userMessages || userMessages.length === 0) {
            return 'unknown';
        }
        
        const patterns = {
            detailed: 0,
            brief: 0,
            questions: 0,
            statements: 0
        };
        
        userMessages.forEach(msg => {
            if (msg.message.length > 100) patterns.detailed++;
            else patterns.brief++;
            
            if (msg.message.includes('?')) patterns.questions++;
            else patterns.statements++;
        });
        
        // Determine dominant pattern
        if (patterns.detailed > patterns.brief) {
            return patterns.questions > patterns.statements ? 'detailed_questions' : 'detailed_statements';
        } else {
            return patterns.questions > patterns.statements ? 'brief_questions' : 'brief_statements';
        }
    },
    
    // Generate action plan using AI
    async generateActionPlan(gaps, learningData, conversationContext, analysis) {
        try {
            const prompt = `Plan the optimal next action for this project management conversation:

Gap Analysis: ${JSON.stringify(gaps, null, 2)}
User Learning Patterns: ${JSON.stringify(learningData, null, 2)}
Conversation Context: ${JSON.stringify(conversationContext, null, 2)}
Project Analysis: ${JSON.stringify(analysis, null, 2)}

Consider:
1. What's the most critical gap to address?
2. What's the user's preferred communication style?
3. What's the appropriate timing for this question?
4. How can we maintain engagement without overwhelming?

Generate an action plan in JSON format:
{
    "action": "ask_about_[field]",
    "question": "Specific, targeted question",
    "reasoning": "Why this action is optimal now",
    "timing": "immediate|delayed|contextual",
    "confidence": 0.0-1.0,
    "alternativeActions": ["alternative1", "alternative2"],
    "expectedResponse": "What kind of response we expect"
}`;
            const parsed = await askClaudeJSON({
                user: prompt,
                system: "You are an expert project management strategist. Return ONLY valid JSON with the requested fields.",
                model: 'claude-3-5-haiku-latest',
                maxTokens: 1000
            });

            if (parsed && parsed.action && parsed.question) {
                return parsed;
            }

            // Fallback action plan if parsing failed
            return this.getFallbackActionPlan(gaps, learningData, conversationContext);
            
        } catch (error) {
            // Soft-fail to fallback without noisy logs
            return this.getFallbackActionPlan(gaps, learningData, conversationContext);
        }
    },
    
    // Fallback action plan when AI fails
    getFallbackActionPlan(gaps, learningData, conversationContext) {
        const topGap = gaps.criticalGaps && gaps.criticalGaps.length > 0 ? gaps.criticalGaps[0] : 'scope';
        
        // Adapt question style based on user patterns
        let questionStyle = 'direct';
        if (learningData && learningData.userPatterns) {
            questionStyle = learningData.userPatterns.preferredQuestionStyle || 'direct';
        }
        
        // Adapt timing based on conversation context
        let timing = 'immediate';
        if (conversationContext && conversationContext.userEngagement === 'low') {
            timing = 'delayed';
        }
        
        const questions = {
            scope: {
                direct: "What exactly are you trying to accomplish with this project?",
                detailed: "Could you describe in detail what you want to achieve with this project?",
                exploratory: "Tell me about your project - what's the main goal you're working towards?"
            },
            timeline: {
                direct: "When do you need this project completed?",
                detailed: "What's your target completion date, and are there any important milestones along the way?",
                exploratory: "How does the timeline look for this project?"
            },
            budget: {
                direct: "What budget do you have available for this project?",
                detailed: "What financial resources are allocated for this project, and are there any budget constraints?",
                exploratory: "What's the budget situation for this project?"
            },
            deliverables: {
                direct: "What specific outputs do you need from this project?",
                detailed: "What are the key deliverables and outcomes you expect from this project?",
                exploratory: "What results are you hoping to achieve?"
            },
            dependencies: {
                direct: "What external factors does this project depend on?",
                detailed: "What resources, approvals, or external dependencies are required for this project?",
                exploratory: "What might block or delay this project?"
            }
        };
        
        const question = questions[topGap] && questions[topGap][questionStyle] 
            ? questions[topGap][questionStyle] 
            : questions[topGap] && questions[topGap]['direct']
            ? questions[topGap]['direct']
            : "What exactly are you trying to accomplish with this project?";
        
        return {
            action: `ask_about_${topGap}`,
            question: question,
            reasoning: `Addressing most critical gap: ${topGap}`,
            timing: timing,
            confidence: 0.7,
            alternativeActions: [`ask_about_${topGap}_detailed`, `ask_about_${topGap}_exploratory`],
            expectedResponse: 'Specific information about ' + topGap
        };
    },
    
    // Update learning data from planning decisions
    async updateLearningFromPlanning(userId, actionPlan, learningData) {
        try {
            if (!learningData) {
                learningData = createLearningData(userId);
            }
            
            // Update question effectiveness tracking
            if (!learningData.questionEffectiveness) {
                learningData.questionEffectiveness = {};
            }
            
            // Track this planning decision
            if (!learningData.interactionHistory) {
                learningData.interactionHistory = [];
            }
            
            learningData.interactionHistory.push({
                timestamp: new Date().toISOString(),
                action: actionPlan.action,
                confidence: actionPlan.confidence,
                reasoning: actionPlan.reasoning
            });
            
            // Keep only last 50 interactions
            if (learningData.interactionHistory.length > 50) {
                learningData.interactionHistory = learningData.interactionHistory.slice(-50);
            }
            
            // Update user patterns based on recent interactions
            learningData.userPatterns = this.updateUserPatterns(learningData);
            
            // Save updated learning data
            await saveLearningData(userId, learningData);
            
        } catch (error) {
            console.error('Error updating learning from planning:', error);
        }
    },
    
    // Update user patterns based on interaction history
    updateUserPatterns(learningData) {
        const patterns = learningData.userPatterns || {};
        
        if (learningData.interactionHistory && learningData.interactionHistory.length > 0) {
            // Analyze recent interaction patterns
            const recentInteractions = learningData.interactionHistory.slice(-10);
            
            // Calculate average confidence
            const avgConfidence = recentInteractions.reduce((sum, interaction) => sum + interaction.confidence, 0) / recentInteractions.length;
            
            // Update engagement level based on confidence
            if (avgConfidence > 0.8) {
                patterns.engagementLevel = 'high';
            } else if (avgConfidence < 0.5) {
                patterns.engagementLevel = 'low';
            } else {
                patterns.engagementLevel = 'medium';
            }
            
            // Update response time based on interaction frequency
            const timeSpan = recentInteractions.length > 1 
                ? new Date(recentInteractions[recentInteractions.length - 1].timestamp) - new Date(recentInteractions[0].timestamp)
                : 0;
            
            if (timeSpan > 0) {
                const avgTimeBetweenInteractions = timeSpan / (recentInteractions.length - 1);
                if (avgTimeBetweenInteractions < 3600000) { // Less than 1 hour
                    patterns.responseTime = 'avg_30_minutes';
                } else if (avgTimeBetweenInteractions < 7200000) { // Less than 2 hours
                    patterns.responseTime = 'avg_1_hour';
                } else {
                    patterns.responseTime = 'avg_2_hours';
                }
            }
        }
        
        return patterns;
    },
    
    // Get action plan summary
    async getActionPlanSummary(userId) {
        try {
            const learningData = await getLearningData(userId);
            if (!learningData) {
                return {
                    status: 'No learning data available',
                    recommendations: ['Start project planning to build user patterns']
                };
            }
            
            return {
                userPatterns: learningData.userPatterns,
                interactionCount: learningData.interactionHistory ? learningData.interactionHistory.length : 0,
                lastInteraction: learningData.interactionHistory && learningData.interactionHistory.length > 0 
                    ? learningData.interactionHistory[learningData.interactionHistory.length - 1].timestamp 
                    : null,
                status: this.getPlanningStatus(learningData),
                recommendations: this.generatePlanningRecommendations(learningData)
            };
            
        } catch (error) {
            console.error('Error getting action plan summary:', error);
            return {
                status: 'Action planning error',
                recommendations: ['Check system status']
            };
        }
    },
    
    // Get planning status description
    getPlanningStatus(learningData) {
        if (!learningData || !learningData.interactionHistory) {
            return 'No planning history - new user';
        }
        
        const interactionCount = learningData.interactionHistory.length;
        if (interactionCount < 5) {
            return 'Learning user patterns - building profile';
        } else if (interactionCount < 20) {
            return 'Developing user understanding - adapting approach';
        } else {
            return 'Well-established patterns - optimized planning';
        }
    },
    
    // Generate planning recommendations
    generatePlanningRecommendations(learningData) {
        const recommendations = [];
        
        if (!learningData || !learningData.interactionHistory) {
            recommendations.push('Start with basic project questions');
            recommendations.push('Observe user response patterns');
        } else {
            const interactionCount = learningData.interactionHistory.length;
            if (interactionCount < 5) {
                recommendations.push('Continue gathering user preferences');
                recommendations.push('Test different question styles');
            } else if (interactionCount < 20) {
                recommendations.push('Refine question timing and style');
                recommendations.push('Optimize based on user engagement');
            } else {
                recommendations.push('Maintain optimized approach');
                recommendations.push('Monitor for pattern changes');
            }
        }
        
        return recommendations;
    }
};
