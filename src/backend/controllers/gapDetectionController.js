// gapDetectionController.js - Identifies critical missing information
// Mirrors Cursor's gap analysis - finds what's blocking progress

import { getSecret } from 'wix-secrets-backend';
import { askClaude, askClaudeJSON } from 'backend/aiClient';
import { Logger } from '../utils/logger';
import { 
    createGapData, 
    saveGapData, 
    getGapData,
    identifyMissingFields,
    PROJECT_FIELDS 
} from 'backend/data/projectData';

async function callClaude(prompt, systemPrompt = null) {
    return await askClaude({
        user: prompt,
        system: systemPrompt || "You are an expert project management analyst. Identify critical gaps and prioritize them by impact on project success.",
        model: 'claude-3-5-haiku-latest',
        maxTokens: 1000
    });
}

export const gapDetectionController = {
    
    // Main gap identification function
    async identifyGaps(projectId, analysis, projectData, existingGapData = null) {
        try {
            Logger.info('gapDetectionController', 'identifyGaps:start', { projectId });
            // Get basic missing fields
            const missingFields = identifyMissingFields(projectData);
            
            // Analyze gaps and determine next action in one API call
            const gapAnalysisAndAction = await this.analyzeGapsAndDetermineAction(projectData, analysis, missingFields);
            
            // Extract results
            const gapAnalysis = gapAnalysisAndAction.gapAnalysis;
            const prioritizedGaps = gapAnalysisAndAction.prioritizedGaps;
            const nextAction = gapAnalysisAndAction.nextAction;
            
            // Build todos from prioritized gaps
            const todos = this.buildTodosFromGaps(prioritizedGaps, gapAnalysis, nextAction);

            // Create or update gap data structure
            const gapData = existingGapData || createGapData(projectId, {
                criticalGaps: prioritizedGaps,
                priorityScore: this.calculatePriorityScore(prioritizedGaps),
                nextAction: nextAction.action,
                reasoning: nextAction.reasoning,
                todos: todos
            });
            
            // Update gap data with new analysis
            gapData.criticalGaps = prioritizedGaps;
            gapData.priorityScore = this.calculatePriorityScore(prioritizedGaps);
            gapData.nextAction = nextAction.action;
            gapData.reasoning = nextAction.reasoning;
            gapData.todos = todos;
            gapData.lastUpdated = new Date().toISOString();
            
            Logger.info('gapDetectionController', 'identifyGaps:end', { next: nextAction.action, gaps: prioritizedGaps.length });
            return {
                criticalGaps: prioritizedGaps,
                priorityScore: gapData.priorityScore,
                nextAction: nextAction.action,
                reasoning: nextAction.reasoning,
                gapAnalysis: gapAnalysis,
                todos: todos,
                gapData: gapData
            };
            
        } catch (error) {
            Logger.error('gapDetectionController', 'identifyGaps:error', error);
            return {
                criticalGaps: Object.values(PROJECT_FIELDS),
                priorityScore: 1.0,
                nextAction: 'ask_about_scope',
                reasoning: 'Gap analysis failed - need basic project information',
                gapAnalysis: null
            };
        }
    },
    
    // Build a simple TODO checklist from prioritized gaps
    buildTodosFromGaps(prioritizedGaps, gapAnalysis, nextAction) {
        const byField = new Map();
        if (gapAnalysis && gapAnalysis.gaps) {
            gapAnalysis.gaps.forEach(g => byField.set(g.field, g));
        }
        const priorityMap = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };
        const titleMap = {
            scope: 'Define project scope',
            timeline: 'Set project timeline',
            budget: 'Confirm project budget',
            deliverables: 'List project deliverables',
            dependencies: 'Identify dependencies/blockers'
        };
        
        return prioritizedGaps.map(field => {
            const gap = byField.get(field) || { criticality: 'high', reasoning: '' };
            const action = field === 'scope' ? 'ask_about_scope'
                : field === 'timeline' ? 'ask_about_timeline'
                : field === 'budget' ? 'ask_about_budget'
                : field === 'deliverables' ? 'ask_about_deliverables'
                : 'ask_about_dependencies';
            return {
                id: `todo_${field}`,
                title: titleMap[field] || `Clarify ${field}`,
                reason: gap.reasoning || `Clarify ${field} to progress`,
                priority: priorityMap[gap.criticality] || 'high',
                action: action,
                isNext: nextAction && nextAction.action === action
            };
        });
    },
    
    // Combined method: Analyze gaps and determine next action in one API call
    async analyzeGapsAndDetermineAction(projectData, analysis, missingFields) {
        try {
            const prompt = `Analyze these project gaps, determine their criticality, prioritize them, and determine the next action:

Project Data: ${JSON.stringify(projectData, null, 2)}
Analysis: ${JSON.stringify(analysis, null, 2)}
Missing Fields: ${JSON.stringify(missingFields, null, 2)}

For each missing field, provide:
1. Criticality level (critical|high|medium|low)
2. Impact on project success (blocks_everything|blocks_planning|blocks_execution|minor_impact)
3. Dependencies (what other gaps this depends on)
4. Reasoning (why this gap matters)

Then prioritize the gaps and determine the next action.

Respond in JSON format:
{
    "gapAnalysis": {
        "gaps": [
            {
                "field": "scope",
                "criticality": "critical",
                "impact": "blocks_everything",
                "dependencies": [],
                "reasoning": "Without scope, cannot plan timeline, budget, or deliverables"
            }
        ]
    },
    "prioritizedGaps": ["scope", "budget", "timeline"],
    "nextAction": {
        "action": "ask_about_scope",
        "question": "What is the scope of your project?",
        "reasoning": "Scope is critical and blocks all other planning"
    }
}`;

            const parsed = await askClaudeJSON({
                user: prompt,
                system: "You are an expert project management analyst. Return ONLY valid JSON with the requested structure.",
                model: 'claude-3-5-haiku-latest',
                maxTokens: 1200
            });

            if (parsed && parsed.gapAnalysis && parsed.prioritizedGaps && parsed.nextAction) {
                return parsed;
            }

            // Fallback to simple logic if combined call fails
            return this.getFallbackGapAnalysisAndAction(missingFields);
            
        } catch (error) {
            console.error('Error in combined gap analysis:', error);
            // Fallback to simple logic
            return this.getFallbackGapAnalysisAndAction(missingFields);
        }
    },
    
    // Fallback gap analysis and action when AI fails
    getFallbackGapAnalysisAndAction(missingFields) {
        const gaps = [];
        const prioritizedGaps = [];
        
        missingFields.forEach(field => {
            switch (field) {
                case PROJECT_FIELDS.SCOPE:
                    gaps.push({
                        field: 'scope',
                        criticality: 'critical',
                        impact: 'blocks_everything',
                        dependencies: [],
                        reasoning: 'Project scope is fundamental - cannot plan without it'
                    });
                    prioritizedGaps.push('scope');
                    break;
                case PROJECT_FIELDS.TIMELINE:
                    gaps.push({
                        field: 'timeline',
                        criticality: 'high',
                        impact: 'blocks_planning',
                        dependencies: ['scope'],
                        reasoning: 'Timeline drives all project planning and resource allocation'
                    });
                    prioritizedGaps.push('timeline');
                    break;
                case PROJECT_FIELDS.BUDGET:
                    gaps.push({
                        field: 'budget',
                        criticality: 'high',
                        impact: 'blocks_planning',
                        dependencies: ['scope'],
                        reasoning: 'Budget constraints affect scope and resource decisions'
                    });
                    prioritizedGaps.push('budget');
                    break;
                case PROJECT_FIELDS.DELIVERABLES:
                    gaps.push({
                        field: 'deliverables',
                        criticality: 'medium',
                        impact: 'blocks_execution',
                        dependencies: ['scope', 'timeline'],
                        reasoning: 'Deliverables define what needs to be produced'
                    });
                    prioritizedGaps.push('deliverables');
                    break;
                case PROJECT_FIELDS.DEPENDENCIES:
                    gaps.push({
                        field: 'dependencies',
                        criticality: 'medium',
                        impact: 'blocks_execution',
                        dependencies: ['scope', 'timeline'],
                        reasoning: 'Dependencies identify what blocks project progress'
                    });
                    prioritizedGaps.push('dependencies');
                    break;
            }
        });
        
        // Determine next action based on top priority gap
        const topGap = prioritizedGaps[0];
        let nextAction;
        
        switch (topGap) {
            case 'scope':
                nextAction = {
                    action: 'ask_about_scope',
                    question: 'What exactly are you trying to accomplish with this project?',
                    reasoning: 'Project scope is fundamental - need to understand the goal'
                };
                break;
            case 'timeline':
                nextAction = {
                    action: 'ask_about_timeline',
                    question: 'When do you need this project completed?',
                    reasoning: 'Timeline drives all planning and resource allocation'
                };
                break;
            case 'budget':
                nextAction = {
                    action: 'ask_about_budget',
                    question: 'What budget do you have available for this project?',
                    reasoning: 'Budget constraints affect scope and approach decisions'
                };
                break;
            case 'deliverables':
                nextAction = {
                    action: 'ask_about_deliverables',
                    question: 'What specific outputs or results do you need from this project?',
                    reasoning: 'Deliverables define what needs to be produced'
                };
                break;
            case 'dependencies':
                nextAction = {
                    action: 'ask_about_dependencies',
                    question: 'What external factors or resources does this project depend on?',
                    reasoning: 'Dependencies identify potential blockers and requirements'
                };
                break;
            default:
                nextAction = {
                    action: 'ask_about_scope',
                    question: 'What exactly are you trying to accomplish with this project?',
                    reasoning: 'Default to scope question for unknown gaps'
                };
        }
        
        return {
            gapAnalysis: { gaps: gaps },
            prioritizedGaps: prioritizedGaps,
            nextAction: nextAction
        };
    },
    
    
    // Calculate overall priority score
    calculatePriorityScore(prioritizedGaps) {
        if (!prioritizedGaps || prioritizedGaps.length === 0) {
            return 0.0;
        }
        
        // Higher score = more critical gaps remain
        const criticalityScores = { 'critical': 1.0, 'high': 0.8, 'medium': 0.6, 'low': 0.4 };
        let totalScore = 0.0;
        
        prioritizedGaps.forEach((gap, index) => {
            // Weight by position (first gap is most critical)
            const positionWeight = 1.0 - (index * 0.1);
            const gapScore = criticalityScores['critical'] || 0.5; // Default to critical
            totalScore += gapScore * positionWeight;
        });
        
        return Math.min(totalScore, 1.0);
    },
    
    // Get gap summary
    async getGapSummary(projectId) {
        try {
            const gapData = await getGapData(projectId);
            if (!gapData) {
                return {
                    criticalGaps: [],
                    priorityScore: 0.0,
                    status: 'No gap analysis available',
                    recommendations: ['Run gap analysis']
                };
            }
            
            return {
                criticalGaps: gapData.criticalGaps,
                priorityScore: gapData.priorityScore,
                nextAction: gapData.nextAction,
                reasoning: gapData.reasoning,
                lastUpdated: gapData.lastUpdated,
                status: this.getGapStatus(gapData.priorityScore),
                recommendations: this.generateGapRecommendations(gapData)
            };
            
        } catch (error) {
            console.error('Error getting gap summary:', error);
            return {
                criticalGaps: [],
                priorityScore: 1.0,
                status: 'Gap analysis error',
                recommendations: ['Check system status']
            };
        }
    },
    
    // Get gap status description
    getGapStatus(priorityScore) {
        if (priorityScore >= 0.8) return 'Critical gaps - immediate attention needed';
        if (priorityScore >= 0.6) return 'High priority gaps - plan to address soon';
        if (priorityScore >= 0.4) return 'Medium priority gaps - schedule for resolution';
        if (priorityScore >= 0.2) return 'Low priority gaps - monitor and address as needed';
        return 'Minimal gaps - project well-defined';
    },
    
    // Generate gap recommendations
    generateGapRecommendations(gapData) {
        const recommendations = [];
        
        if (gapData.priorityScore >= 0.8) {
            recommendations.push('Address critical gaps immediately');
            recommendations.push('Focus on ' + gapData.criticalGaps[0] + ' first');
        } else if (gapData.priorityScore >= 0.6) {
            recommendations.push('Plan to address high-priority gaps');
            recommendations.push('Consider impact on project timeline');
        } else if (gapData.priorityScore >= 0.4) {
            recommendations.push('Schedule gap resolution activities');
            recommendations.push('Monitor for new gaps as project progresses');
        } else {
            recommendations.push('Project gaps are manageable');
            recommendations.push('Continue with current planning approach');
        }
        
        return recommendations;
    }
};
