// nlpTrainingData.js - Training Data for NLP Model
// This file contains all training data for future model versions
// Only loaded when explicitly training the model

// Basic training data for intent recognition
export const trainingData = [
    // Project Management Intents
    { text: 'create a new project', intent: 'project.create' },
    { text: 'start a new project', intent: 'project.create' },
    { text: 'begin project', intent: 'project.create' },
    { text: 'create project', intent: 'project.create' },
    
    { text: 'add tasks to my project', intent: 'tasks.create' },
    { text: 'create tasks', intent: 'tasks.create' },
    { text: 'add new tasks', intent: 'tasks.create' },
    { text: 'create new tasks', intent: 'tasks.create' },
    
    { text: 'set budget to 10000', intent: 'budget.set' },
    { text: 'update budget', intent: 'budget.set' },
    { text: 'change budget', intent: 'budget.set' },
    { text: 'modify budget', intent: 'budget.set' },
    
    { text: 'what is the project status', intent: 'project.status' },
    { text: 'show project status', intent: 'project.status' },
    { text: 'get status', intent: 'project.status' },
    { text: 'project progress', intent: 'project.status' },
    
    // Response Patterns
    { text: 'yes that looks good', intent: 'response.positive' },
    { text: 'yes', intent: 'response.positive' },
    { text: 'good', intent: 'response.positive' },
    { text: 'approve', intent: 'response.positive' },
    { text: 'confirm', intent: 'response.positive' },
    
    { text: 'no change it', intent: 'response.negative' },
    { text: 'no', intent: 'response.negative' },
    { text: 'cancel', intent: 'response.negative' },
    { text: 'reject', intent: 'response.negative' },
    
    // General Help
    { text: 'help me', intent: 'general.help' },
    { text: 'help', intent: 'general.help' },
    { text: 'what can you do', intent: 'general.help' },
    { text: 'how do i', intent: 'general.help' },
    
    { text: 'thanks', intent: 'general.thanks' },
    { text: 'thank you', intent: 'general.thanks' },
    { text: 'appreciate it', intent: 'general.thanks' },
    
    // Timeline and Stakeholders
    { text: 'show timeline', intent: 'timeline.query' },
    { text: 'project timeline', intent: 'timeline.query' },
    { text: 'when is it due', intent: 'timeline.query' },
    
    { text: 'add team member', intent: 'stakeholder.add' },
    { text: 'add member', intent: 'stakeholder.add' },
    { text: 'invite user', intent: 'stakeholder.add' },
];

// Response templates for each intent
export const responseTemplates = {
    'project.create': [
        'I\'ll help you create a new project.',
        'Let\'s set up a new project for you.',
        'Creating a new project now.'
    ],
    'tasks.create': [
        'Let me add tasks to your project.',
        'I\'ll create those tasks for you.',
        'Adding tasks to your project.'
    ],
    'budget.set': [
        'I\'ll set your budget.',
        'Budget updated successfully.',
        'Setting your project budget.'
    ],
    'project.status': [
        'Here\'s your project status.',
        'Current project progress:',
        'Project status overview:'
    ],
    'response.positive': [
        'Great! Let\'s continue.',
        'Perfect! Moving forward.',
        'Excellent! Next steps:'
    ],
    'response.negative': [
        'I\'ll make those changes.',
        'Let me update that for you.',
        'Making the requested changes.'
    ],
    'general.help': [
        'I\'m here to help you with your project management.',
        'I can help you create projects, manage tasks, and more.',
        'What would you like to do with your project?'
    ],
    'general.thanks': [
        'You\'re welcome!',
        'Happy to help!',
        'My pleasure!'
    ],
    'timeline.query': [
        'Here\'s your project timeline.',
        'Timeline overview:',
        'Project schedule:'
    ],
    'stakeholder.add': [
        'I\'ll add a team member.',
        'Adding the new team member.',
        'Team member added successfully.'
    ]
};

// Intent to action mapping
export const intentActionMap = {
    'project.create': 'CREATE_PROJECT',
    'tasks.create': 'CREATE_TASKS',
    'budget.set': 'SET_BUDGET',
    'project.status': 'GET_STATUS',
    'response.positive': 'CONFIRM',
    'response.negative': 'REJECT',
    'general.help': 'SHOW_HELP',
    'general.thanks': 'ACKNOWLEDGE',
    'timeline.query': 'SHOW_TIMELINE',
    'stakeholder.add': 'ADD_STAKEHOLDER'
};

// Future: Sentiment analysis configuration
export const sentimentAnalysis = {
    enabled: false, // Will be enabled in future versions
    thresholds: {
        positive: 0.6,
        negative: -0.6,
        neutral: 0.2
    }
};

// Future: State response patterns
export const stateResponsePatterns = {
    enabled: false, // Will be enabled in future versions
    patterns: []
};

// Future: State response templates
export const stateResponseTemplates = {
    enabled: false, // Will be enabled in future versions
    templates: {}
};
