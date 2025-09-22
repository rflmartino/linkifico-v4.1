// gapDetectionController.js - Identifies critical missing information
// Mirrors Cursor's gap analysis - finds what's blocking progress

import { getSecret } from 'wix-secrets-backend';
import { askClaude, askClaudeJSON } from 'backend/aiClient';
import { 
    createGapData, 
    saveGapData, 
    getGapData,
    identifyMissingFields,
    PROJECT_FIELDS 
} from 'backend/projectData';

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
    async identifyGaps(projectId, analysis, projectData) {
        try {
            // Get basic missing fields
            const missingFields = identifyMissingFields(projectData);
            
            // Analyze gap criticality using AI
            const gapAnalysis = await this.analyzeGapCriticality(projectData, analysis, missingFields);
            
            // Prioritize gaps by impact
            const prioritizedGaps = await this.prioritizeGaps(gapAnalysis, projectData, analysis);
            
            // Determine next action
            const nextAction = await this.determineNextAction(prioritizedGaps, projectData, analysis);
            
            // Build todos from prioritized gaps
            const todos = this.buildTodosFromGaps(prioritizedGaps, gapAnalysis, nextAction);

            // Create gap data structure
            const gapData = createGapData(projectId, {
                criticalGaps: prioritizedGaps,
                priorityScore: this.calculatePriorityScore(prioritizedGaps),
                nextAction: nextAction.action,
                reasoning: nextAction.reasoning,
                todos: todos
            });
            
            // Save gap data
            await saveGapData(projectId, gapData);
            
            return {
                criticalGaps: prioritizedGaps,
                priorityScore: gapData.priorityScore,
                nextAction: nextAction.action,
                reasoning: nextAction.reasoning,
                gapAnalysis: gapAnalysis,
                todos: todos
            };
            
        } catch (error) {
            console.error('Error in gap detection:', error);
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
    
    // Analyze gap criticality using AI
    async analyzeGapCriticality(projectData, analysis, missingFields) {
        try {
            const prompt = `Analyze these project gaps and determine their criticality:

Project Data: ${JSON.stringify(projectData, null, 2)}
Analysis: ${JSON.stringify(analysis, null, 2)}
Missing Fields: ${JSON.stringify(missingFields, null, 2)}

For each missing field, provide:
1. Criticality level (critical|high|medium|low)
2. Impact on project success (blocks_everything|blocks_planning|blocks_execution|minor_impact)
3. Dependencies (what other gaps this depends on)
4. Reasoning (why this gap matters)

Respond in JSON format:
{
    "gaps": [
        {
            "field": "scope",
            "criticality": "critical",
            "impact": "blocks_everything",
            "dependencies": [],
            "reasoning": "Without scope, cannot plan timeline, budget, or deliverables"
        }
    ]
}`;

            const response = await callClaude(prompt);
            
            // Parse JSON response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback analysis
            return this.getFallbackGapAnalysis(missingFields);
            
        } catch (error) {
            console.error('Error analyzing gap criticality:', error);
            return this.getFallbackGapAnalysis(missingFields);
        }
    },
    
    // Fallback gap analysis when AI fails
    getFallbackGapAnalysis(missingFields) {
        const gaps = [];
        
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
                    break;
                case PROJECT_FIELDS.TIMELINE:
                    gaps.push({
                        field: 'timeline',
                        criticality: 'high',
                        impact: 'blocks_planning',
                        dependencies: ['scope'],
                        reasoning: 'Timeline drives all project planning and resource allocation'
                    });
                    break;
                case PROJECT_FIELDS.BUDGET:
                    gaps.push({
                        field: 'budget',
                        criticality: 'high',
                        impact: 'blocks_planning',
                        dependencies: ['scope'],
                        reasoning: 'Budget constraints affect scope and resource decisions'
                    });
                    break;
                case PROJECT_FIELDS.DELIVERABLES:
                    gaps.push({
                        field: 'deliverables',
                        criticality: 'medium',
                        impact: 'blocks_execution',
                        dependencies: ['scope', 'timeline'],
                        reasoning: 'Deliverables define what needs to be produced'
                    });
                    break;
                case PROJECT_FIELDS.DEPENDENCIES:
                    gaps.push({
                        field: 'dependencies',
                        criticality: 'medium',
                        impact: 'blocks_execution',
                        dependencies: ['scope', 'timeline'],
                        reasoning: 'Dependencies identify what blocks project progress'
                    });
                    break;
            }
        });
        
        return { gaps: gaps };
    },
    
    // Prioritize gaps by impact and dependencies
    async prioritizeGaps(gapAnalysis, projectData, analysis) {
        try {
            if (!gapAnalysis || !gapAnalysis.gaps) {
                return Object.values(PROJECT_FIELDS);
            }
            
            // Sort gaps by criticality and dependencies
            const sortedGaps = gapAnalysis.gaps.sort((a, b) => {
                // Criticality priority
                const criticalityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
                const aCrit = criticalityOrder[a.criticality] || 0;
                const bCrit = criticalityOrder[b.criticality] || 0;
                
                if (aCrit !== bCrit) {
                    return bCrit - aCrit;
                }
                
                // Dependency priority (fewer dependencies = higher priority)
                return a.dependencies.length - b.dependencies.length;
            });
            
            return sortedGaps.map(gap => gap.field);
            
        } catch (error) {
            console.error('Error prioritizing gaps:', error);
            return Object.values(PROJECT_FIELDS);
        }
    },
    
    // Determine next optimal action
    async determineNextAction(prioritizedGaps, projectData, analysis) {
        try {
            if (!prioritizedGaps || prioritizedGaps.length === 0) {
                return {
                    action: 'project_complete',
                    reasoning: 'All critical gaps have been addressed'
                };
            }
            
            const topGap = prioritizedGaps[0];
            
            // Generate specific action based on gap
            const action = await this.generateSpecificAction(topGap, projectData, analysis);
            
            return action;
            
        } catch (error) {
            console.error('Error determining next action:', error);
            return {
                action: 'ask_about_scope',
                reasoning: 'Error in action planning - defaulting to scope question'
            };
        }
    },
    
    // Generate specific action for a gap
    async generateSpecificAction(gap, projectData, analysis) {
        try {
            const prompt = `Generate a specific, targeted question to address this project gap:

Gap: ${gap}
Project Data: ${JSON.stringify(projectData, null, 2)}
Analysis: ${JSON.stringify(analysis, null, 2)}

Generate a question that:
1. Is specific and actionable
2. Addresses the exact gap
3. Is appropriate for the project context
4. Helps gather the most critical missing information

Respond with JSON:
{
    "action": "ask_about_[gap]",
    "question": "Specific question to ask",
    "reasoning": "Why this question is most important now"
}`;

            const response = await callClaude(prompt);
            
            // Parse JSON response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback actions
            return this.getFallbackAction(gap);
            
        } catch (error) {
            console.error('Error generating specific action:', error);
            return this.getFallbackAction(gap);
        }
    },
    
    // Fallback actions when AI fails
    getFallbackAction(gap) {
        switch (gap) {
            case PROJECT_FIELDS.SCOPE:
                return {
                    action: 'ask_about_scope',
                    question: 'What exactly are you trying to accomplish with this project?',
                    reasoning: 'Project scope is fundamental - need to understand the goal'
                };
            case PROJECT_FIELDS.TIMELINE:
                return {
                    action: 'ask_about_timeline',
                    question: 'When do you need this project completed?',
                    reasoning: 'Timeline drives all planning and resource allocation'
                };
            case PROJECT_FIELDS.BUDGET:
                return {
                    action: 'ask_about_budget',
                    question: 'What budget do you have available for this project?',
                    reasoning: 'Budget constraints affect scope and approach decisions'
                };
            case PROJECT_FIELDS.DELIVERABLES:
                return {
                    action: 'ask_about_deliverables',
                    question: 'What specific outputs or results do you need from this project?',
                    reasoning: 'Deliverables define what needs to be produced'
                };
            case PROJECT_FIELDS.DEPENDENCIES:
                return {
                    action: 'ask_about_dependencies',
                    question: 'What external factors or resources does this project depend on?',
                    reasoning: 'Dependencies identify potential blockers and requirements'
                };
            default:
                return {
                    action: 'ask_about_scope',
                    question: 'What exactly are you trying to accomplish with this project?',
                    reasoning: 'Default to scope question for unknown gaps'
                };
        }
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
