// nlpTrainingData.js - Training Data for NLP Model
// This file contains all training data for future model versions
// Only loaded when explicitly training the model

// Comprehensive training data for intent recognition
export const trainingData = [
    // Project Creation Intents
    { text: 'create a new project', intent: 'project.create' },
    { text: 'start a new project', intent: 'project.create' },
    { text: 'begin project', intent: 'project.create' },
    { text: 'create project', intent: 'project.create' },
    { text: 'i want to start a project', intent: 'project.create' },
    { text: 'let\'s create a project', intent: 'project.create' },
    { text: 'new project', intent: 'project.create' },
    { text: 'i need a project plan', intent: 'project.create' },
    { text: 'project planning', intent: 'project.create' },
    { text: 'help me plan a project', intent: 'project.create' },
    
    // Scope Definition Intents
    { text: 'i want a project plan for a new hardware store', intent: 'scope.define' },
    { text: 'build a mobile app', intent: 'scope.define' },
    { text: 'create a website', intent: 'scope.define' },
    { text: 'launch a business', intent: 'scope.define' },
    { text: 'organize an event', intent: 'scope.define' },
    { text: 'develop software', intent: 'scope.define' },
    { text: 'marketing campaign', intent: 'scope.define' },
    { text: 'product launch', intent: 'scope.define' },
    { text: 'renovation project', intent: 'scope.define' },
    { text: 'research project', intent: 'scope.define' },
    
    // Budget Intents
    { text: 'set budget to 10000', intent: 'budget.set' },
    { text: 'update budget', intent: 'budget.set' },
    { text: 'change budget', intent: 'budget.set' },
    { text: 'modify budget', intent: 'budget.set' },
    { text: 'budget is 5000', intent: 'budget.set' },
    { text: 'i have 20000 dollars', intent: 'budget.set' },
    { text: 'cost around 15000', intent: 'budget.set' },
    { text: 'spending limit 8000', intent: 'budget.set' },
    { text: 'budget of 25000', intent: 'budget.set' },
    { text: 'can spend up to 30000', intent: 'budget.set' },
    
    // Timeline Intents
    { text: 'need it done in 3 months', intent: 'timeline.set' },
    { text: 'deadline is december', intent: 'timeline.set' },
    { text: 'due in 6 weeks', intent: 'timeline.set' },
    { text: 'finish by march', intent: 'timeline.set' },
    { text: '2 month timeline', intent: 'timeline.set' },
    { text: 'urgent deadline', intent: 'timeline.set' },
    { text: 'no rush on this', intent: 'timeline.set' },
    { text: 'flexible timeline', intent: 'timeline.set' },
    { text: 'timeline of 1 year', intent: 'timeline.set' },
    { text: 'complete by q2', intent: 'timeline.set' },
    
    // Task Management Intents
    { text: 'add tasks to my project', intent: 'tasks.create' },
    { text: 'create tasks', intent: 'tasks.create' },
    { text: 'add new tasks', intent: 'tasks.create' },
    { text: 'create new tasks', intent: 'tasks.create' },
    { text: 'list the tasks', intent: 'tasks.list' },
    { text: 'show me tasks', intent: 'tasks.list' },
    { text: 'what tasks do i have', intent: 'tasks.list' },
    { text: 'mark task complete', intent: 'tasks.complete' },
    { text: 'task is done', intent: 'tasks.complete' },
    { text: 'finished that task', intent: 'tasks.complete' },
    
    // Deliverables Intents
    { text: 'deliverables include app and website', intent: 'deliverables.define' },
    { text: 'need to produce reports', intent: 'deliverables.define' },
    { text: 'final deliverable is presentation', intent: 'deliverables.define' },
    { text: 'main output is prototype', intent: 'deliverables.define' },
    { text: 'deliver software package', intent: 'deliverables.define' },
    { text: 'create documentation', intent: 'deliverables.define' },
    { text: 'build mobile app', intent: 'deliverables.define' },
    { text: 'develop api', intent: 'deliverables.define' },
    { text: 'design mockups', intent: 'deliverables.define' },
    { text: 'write user manual', intent: 'deliverables.define' },
    
    // Dependencies Intents
    { text: 'depends on user research', intent: 'dependencies.define' },
    { text: 'need design approval first', intent: 'dependencies.define' },
    { text: 'waiting for budget approval', intent: 'dependencies.define' },
    { text: 'blocked by legal review', intent: 'dependencies.define' },
    { text: 'requires third party api', intent: 'dependencies.define' },
    { text: 'need external resources', intent: 'dependencies.define' },
    { text: 'depends on client feedback', intent: 'dependencies.define' },
    { text: 'waiting for materials', intent: 'dependencies.define' },
    { text: 'requires vendor approval', intent: 'dependencies.define' },
    { text: 'blocked by technical issues', intent: 'dependencies.define' },
    
    // Response Patterns
    { text: 'yes that looks good', intent: 'response.positive' },
    { text: 'yes', intent: 'response.positive' },
    { text: 'good', intent: 'response.positive' },
    { text: 'approve', intent: 'response.positive' },
    { text: 'confirm', intent: 'response.positive' },
    { text: 'correct', intent: 'response.positive' },
    { text: 'perfect', intent: 'response.positive' },
    { text: 'exactly', intent: 'response.positive' },
    { text: 'sounds good', intent: 'response.positive' },
    { text: 'looks good', intent: 'response.positive' },
    { text: 'that works', intent: 'response.positive' },
    { text: 'agreed', intent: 'response.positive' },
    
    { text: 'no change it', intent: 'response.negative' },
    { text: 'no', intent: 'response.negative' },
    { text: 'cancel', intent: 'response.negative' },
    { text: 'reject', intent: 'response.negative' },
    { text: 'wrong', intent: 'response.negative' },
    { text: 'incorrect', intent: 'response.negative' },
    { text: 'not right', intent: 'response.negative' },
    { text: 'that\'s not what i meant', intent: 'response.negative' },
    { text: 'different approach', intent: 'response.negative' },
    { text: 'try again', intent: 'response.negative' },
    { text: 'redo that', intent: 'response.negative' },
    { text: 'start over', intent: 'response.negative' },
    
    // Clarification Intents
    { text: 'can you explain more', intent: 'general.clarify' },
    { text: 'what do you mean', intent: 'general.clarify' },
    { text: 'i don\'t understand', intent: 'general.clarify' },
    { text: 'need more details', intent: 'general.clarify' },
    { text: 'explain that', intent: 'general.clarify' },
    { text: 'clarify please', intent: 'general.clarify' },
    { text: 'more information', intent: 'general.clarify' },
    { text: 'give me details', intent: 'general.clarify' },
    { text: 'elaborate', intent: 'general.clarify' },
    { text: 'can you be more specific', intent: 'general.clarify' },
    
    // General Help
    { text: 'help me', intent: 'general.help' },
    { text: 'help', intent: 'general.help' },
    { text: 'what can you do', intent: 'general.help' },
    { text: 'how do i', intent: 'general.help' },
    { text: 'guide me', intent: 'general.help' },
    { text: 'show me how', intent: 'general.help' },
    { text: 'instructions', intent: 'general.help' },
    { text: 'tutorial', intent: 'general.help' },
    { text: 'how to', intent: 'general.help' },
    { text: 'what should i do', intent: 'general.help' },
    
    // Thanks
    { text: 'thanks', intent: 'general.thanks' },
    { text: 'thank you', intent: 'general.thanks' },
    { text: 'appreciate it', intent: 'general.thanks' },
    { text: 'much appreciated', intent: 'general.thanks' },
    { text: 'grateful', intent: 'general.thanks' },
    { text: 'awesome thanks', intent: 'general.thanks' },
    { text: 'great help', intent: 'general.thanks' },
    { text: 'perfect thanks', intent: 'general.thanks' },
    
    // Status Queries
    { text: 'what is the project status', intent: 'project.status' },
    { text: 'show project status', intent: 'project.status' },
    { text: 'get status', intent: 'project.status' },
    { text: 'project progress', intent: 'project.status' },
    { text: 'how is the project going', intent: 'project.status' },
    { text: 'project update', intent: 'project.status' },
    { text: 'current status', intent: 'project.status' },
    { text: 'progress report', intent: 'project.status' },
    { text: 'where are we', intent: 'project.status' },
    { text: 'status check', intent: 'project.status' },
    
    // Timeline Queries
    { text: 'show timeline', intent: 'timeline.query' },
    { text: 'project timeline', intent: 'timeline.query' },
    { text: 'when is it due', intent: 'timeline.query' },
    { text: 'what\'s the schedule', intent: 'timeline.query' },
    { text: 'timeline overview', intent: 'timeline.query' },
    { text: 'project schedule', intent: 'timeline.query' },
    { text: 'when will it be done', intent: 'timeline.query' },
    { text: 'delivery date', intent: 'timeline.query' },
    { text: 'project dates', intent: 'timeline.query' },
    { text: 'milestones', intent: 'timeline.query' },
    
    // Stakeholders
    { text: 'add team member', intent: 'stakeholder.add' },
    { text: 'add member', intent: 'stakeholder.add' },
    { text: 'invite user', intent: 'stakeholder.add' },
    { text: 'include john in project', intent: 'stakeholder.add' },
    { text: 'add stakeholder', intent: 'stakeholder.add' },
    { text: 'team member', intent: 'stakeholder.add' },
    { text: 'collaborator', intent: 'stakeholder.add' },
    { text: 'project member', intent: 'stakeholder.add' },
];

// Response templates for each intent
export const responseTemplates = {
    'project.create': [
        'I\'ll help you create a new project.',
        'Let\'s set up a new project for you.',
        'Creating a new project now.'
    ],
    'scope.define': [
        'Great! I understand you want to work on this project.',
        'Perfect! Let\'s define the scope for your project.',
        'Excellent! I\'ll help you plan this project.'
    ],
    'budget.set': [
        'I\'ll set your budget.',
        'Budget updated successfully.',
        'Setting your project budget.'
    ],
    'timeline.set': [
        'I\'ll set your project timeline.',
        'Timeline updated successfully.',
        'Setting your project schedule.'
    ],
    'tasks.create': [
        'Let me add tasks to your project.',
        'I\'ll create those tasks for you.',
        'Adding tasks to your project.'
    ],
    'tasks.list': [
        'Here are your project tasks.',
        'Current tasks overview:',
        'Let me show you the tasks.'
    ],
    'tasks.complete': [
        'Great! I\'ll mark that task as complete.',
        'Task completed successfully.',
        'Excellent work! Task marked as done.'
    ],
    'deliverables.define': [
        'I\'ll add those deliverables to your project.',
        'Deliverables updated successfully.',
        'Setting your project deliverables.'
    ],
    'dependencies.define': [
        'I\'ll note those dependencies.',
        'Dependencies updated successfully.',
        'Recording project dependencies.'
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
    'general.clarify': [
        'I\'d be happy to explain more.',
        'Let me provide more details.',
        'I\'ll clarify that for you.'
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
    'project.status': [
        'Here\'s your project status.',
        'Current project progress:',
        'Project status overview:'
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
    'scope.define': 'DEFINE_SCOPE',
    'budget.set': 'SET_BUDGET',
    'timeline.set': 'SET_TIMELINE',
    'tasks.create': 'CREATE_TASKS',
    'tasks.list': 'LIST_TASKS',
    'tasks.complete': 'COMPLETE_TASK',
    'deliverables.define': 'DEFINE_DELIVERABLES',
    'dependencies.define': 'DEFINE_DEPENDENCIES',
    'response.positive': 'CONFIRM',
    'response.negative': 'REJECT',
    'general.clarify': 'CLARIFY',
    'general.help': 'SHOW_HELP',
    'general.thanks': 'ACKNOWLEDGE',
    'project.status': 'GET_STATUS',
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
