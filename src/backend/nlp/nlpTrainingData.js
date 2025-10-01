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
    
    // Action Planning Intents - Gap-based planning
    { text: 'objectives missing budget set tasks incomplete', intent: 'action.ask_objectives' },
    { text: 'critical gap objectives no goals defined', intent: 'action.ask_objectives' },
    { text: 'objectives empty scope undefined', intent: 'action.ask_objectives' },
    { text: 'no objectives defined project goals missing', intent: 'action.ask_objectives' },
    { text: 'objectives gap critical priority', intent: 'action.ask_objectives' },
    { text: 'objectives missing high priority gap', intent: 'action.ask_objectives' },
    { text: 'objectives undefined need clarification', intent: 'action.ask_objectives' },
    { text: 'objectives area empty template incomplete', intent: 'action.ask_objectives' },
    { text: 'objectives missing blocks planning', intent: 'action.ask_objectives' },
    { text: 'objectives critical gap immediate attention', intent: 'action.ask_objectives' },
    
    { text: 'budget missing objectives set tasks incomplete', intent: 'action.ask_budget' },
    { text: 'budget gap high priority no financial plan', intent: 'action.ask_budget' },
    { text: 'budget undefined cost planning needed', intent: 'action.ask_budget' },
    { text: 'budget missing medium priority gap', intent: 'action.ask_budget' },
    { text: 'budget area empty financial planning', intent: 'action.ask_budget' },
    { text: 'budget gap blocks execution planning', intent: 'action.ask_budget' },
    { text: 'budget missing cost estimation needed', intent: 'action.ask_budget' },
    { text: 'budget undefined spending plan required', intent: 'action.ask_budget' },
    { text: 'budget gap medium priority impact', intent: 'action.ask_budget' },
    { text: 'budget missing financial resources unclear', intent: 'action.ask_budget' },
    
    { text: 'tasks missing objectives set budget set', intent: 'action.ask_tasks' },
    { text: 'tasks gap high priority timeline unclear', intent: 'action.ask_tasks' },
    { text: 'tasks undefined deliverables missing', intent: 'action.ask_tasks' },
    { text: 'tasks missing deadline planning needed', intent: 'action.ask_tasks' },
    { text: 'tasks gap medium priority execution plan', intent: 'action.ask_tasks' },
    { text: 'tasks area empty work breakdown needed', intent: 'action.ask_tasks' },
    { text: 'tasks missing schedule planning required', intent: 'action.ask_tasks' },
    { text: 'tasks undefined timeline planning needed', intent: 'action.ask_tasks' },
    { text: 'tasks gap blocks execution delivery', intent: 'action.ask_tasks' },
    { text: 'tasks missing work plan undefined', intent: 'action.ask_tasks' },
    
    { text: 'people missing objectives set budget set tasks set', intent: 'action.ask_people' },
    { text: 'people gap low priority stakeholders unclear', intent: 'action.ask_people' },
    { text: 'people undefined team planning needed', intent: 'action.ask_people' },
    { text: 'people missing stakeholder identification', intent: 'action.ask_people' },
    { text: 'people gap team composition planning', intent: 'action.ask_people' },
    { text: 'people area empty role assignment needed', intent: 'action.ask_people' },
    { text: 'people missing resource allocation unclear', intent: 'action.ask_people' },
    { text: 'people undefined responsibility planning', intent: 'action.ask_people' },
    { text: 'people gap minor impact team structure', intent: 'action.ask_people' },
    { text: 'people missing collaboration planning needed', intent: 'action.ask_people' },
    
    // Conversation stage planning
    { text: 'initial conversation 2 messages low engagement', intent: 'action.ask_objectives' },
    { text: 'early stage 5 messages exploration phase', intent: 'action.ask_objectives' },
    { text: 'beginning conversation 3 messages basic info', intent: 'action.ask_objectives' },
    { text: 'startup phase 4 messages foundation needed', intent: 'action.ask_objectives' },
    { text: 'introductory stage 1 message new user', intent: 'action.ask_objectives' },
    { text: 'initial contact 2 messages scope definition', intent: 'action.ask_objectives' },
    { text: 'early planning 3 messages basic requirements', intent: 'action.ask_objectives' },
    { text: 'conversation start 4 messages project initiation', intent: 'action.ask_objectives' },
    { text: 'new project 1 message fresh start', intent: 'action.ask_objectives' },
    { text: 'project beginning 2 messages initial planning', intent: 'action.ask_objectives' },
    
    { text: 'planning stage 10 messages detailed planning', intent: 'action.ask_budget' },
    { text: 'development phase 12 messages execution planning', intent: 'action.ask_tasks' },
    { text: 'detailed conversation 15 messages comprehensive planning', intent: 'action.ask_people' },
    { text: 'advanced stage 18 messages final planning', intent: 'action.provide_recommendation' },
    { text: 'mature conversation 20 messages optimization', intent: 'action.provide_recommendation' },
    { text: 'established project 25 messages maintenance', intent: 'action.provide_recommendation' },
    { text: 'ongoing project 30 messages monitoring', intent: 'action.provide_recommendation' },
    { text: 'active project 35 messages continuous improvement', intent: 'action.provide_recommendation' },
    { text: 'stable project 40 messages refinement', intent: 'action.provide_recommendation' },
    { text: 'long running project 50 messages evolution', intent: 'action.provide_recommendation' },
    
    // User engagement adaptation
    { text: 'high engagement detailed responses 100 word average', intent: 'action.ask_detailed' },
    { text: 'high engagement comprehensive answers thorough planning', intent: 'action.ask_detailed' },
    { text: 'high engagement detailed communication style', intent: 'action.ask_detailed' },
    { text: 'high engagement comprehensive responses', intent: 'action.ask_detailed' },
    { text: 'high engagement thorough communication', intent: 'action.ask_detailed' },
    { text: 'high engagement detailed interaction pattern', intent: 'action.ask_detailed' },
    { text: 'high engagement comprehensive planning style', intent: 'action.ask_detailed' },
    { text: 'high engagement thorough response pattern', intent: 'action.ask_detailed' },
    { text: 'high engagement detailed question style', intent: 'action.ask_detailed' },
    { text: 'high engagement comprehensive approach', intent: 'action.ask_detailed' },
    
    { text: 'low engagement brief responses 20 word average', intent: 'action.ask_direct' },
    { text: 'low engagement short answers minimal planning', intent: 'action.ask_direct' },
    { text: 'low engagement brief communication style', intent: 'action.ask_direct' },
    { text: 'low engagement concise responses', intent: 'action.ask_direct' },
    { text: 'low engagement minimal communication', intent: 'action.ask_direct' },
    { text: 'low engagement brief interaction pattern', intent: 'action.ask_direct' },
    { text: 'low engagement concise planning style', intent: 'action.ask_direct' },
    { text: 'low engagement minimal response pattern', intent: 'action.ask_direct' },
    { text: 'low engagement brief question style', intent: 'action.ask_direct' },
    { text: 'low engagement concise approach', intent: 'action.ask_direct' },
    
    { text: 'medium engagement mixed responses 50 word average', intent: 'action.ask_balanced' },
    { text: 'medium engagement moderate answers balanced planning', intent: 'action.ask_balanced' },
    { text: 'medium engagement mixed communication style', intent: 'action.ask_balanced' },
    { text: 'medium engagement moderate responses', intent: 'action.ask_balanced' },
    { text: 'medium engagement balanced communication', intent: 'action.ask_balanced' },
    { text: 'medium engagement mixed interaction pattern', intent: 'action.ask_balanced' },
    { text: 'medium engagement moderate planning style', intent: 'action.ask_balanced' },
    { text: 'medium engagement balanced response pattern', intent: 'action.ask_balanced' },
    { text: 'medium engagement mixed question style', intent: 'action.ask_balanced' },
    { text: 'medium engagement moderate approach', intent: 'action.ask_balanced' },
    
    // Project complexity planning
    { text: 'high complexity project multiple stakeholders complex requirements', intent: 'action.escalate_complexity' },
    { text: 'complex project intricate dependencies advanced planning', intent: 'action.escalate_complexity' },
    { text: 'high complexity multiple phases complex deliverables', intent: 'action.escalate_complexity' },
    { text: 'complex project advanced requirements sophisticated planning', intent: 'action.escalate_complexity' },
    { text: 'high complexity intricate project detailed planning needed', intent: 'action.escalate_complexity' },
    { text: 'complex project multiple teams advanced coordination', intent: 'action.escalate_complexity' },
    { text: 'high complexity sophisticated requirements detailed analysis', intent: 'action.escalate_complexity' },
    { text: 'complex project intricate workflow advanced management', intent: 'action.escalate_complexity' },
    { text: 'high complexity multiple components sophisticated planning', intent: 'action.escalate_complexity' },
    { text: 'complex project advanced coordination detailed planning', intent: 'action.escalate_complexity' },
    
    { text: 'low complexity simple project basic requirements', intent: 'action.simplify_approach' },
    { text: 'simple project minimal stakeholders basic planning', intent: 'action.simplify_approach' },
    { text: 'low complexity straightforward requirements simple planning', intent: 'action.simplify_approach' },
    { text: 'simple project basic deliverables minimal complexity', intent: 'action.simplify_approach' },
    { text: 'low complexity uncomplicated project basic approach', intent: 'action.simplify_approach' },
    { text: 'simple project minimal dependencies straightforward planning', intent: 'action.simplify_approach' },
    { text: 'low complexity basic requirements simple coordination', intent: 'action.simplify_approach' },
    { text: 'simple project straightforward workflow basic management', intent: 'action.simplify_approach' },
    { text: 'low complexity minimal components basic planning', intent: 'action.simplify_approach' },
    { text: 'simple project basic coordination straightforward approach', intent: 'action.simplify_approach' },
    
    // Urgency planning
    { text: 'high urgency immediate deadline critical timeline', intent: 'action.ask_direct' },
    { text: 'urgent project tight deadline immediate action', intent: 'action.ask_direct' },
    { text: 'high urgency critical timeline fast execution', intent: 'action.ask_direct' },
    { text: 'urgent project immediate requirements quick planning', intent: 'action.ask_direct' },
    { text: 'high urgency time sensitive critical delivery', intent: 'action.ask_direct' },
    { text: 'urgent project fast timeline immediate response', intent: 'action.ask_direct' },
    { text: 'high urgency critical deadline immediate planning', intent: 'action.ask_direct' },
    { text: 'urgent project time critical fast execution', intent: 'action.ask_direct' },
    { text: 'high urgency immediate action critical timeline', intent: 'action.ask_direct' },
    { text: 'urgent project critical urgency fast delivery', intent: 'action.ask_direct' },
    
    { text: 'low urgency flexible timeline relaxed planning', intent: 'action.ask_exploratory' },
    { text: 'relaxed project flexible deadline thoughtful planning', intent: 'action.ask_exploratory' },
    { text: 'low urgency comfortable timeline exploratory approach', intent: 'action.ask_exploratory' },
    { text: 'flexible project relaxed requirements thoughtful approach', intent: 'action.ask_exploratory' },
    { text: 'low urgency comfortable timeline exploratory planning', intent: 'action.ask_exploratory' },
    { text: 'relaxed project flexible schedule thoughtful execution', intent: 'action.ask_exploratory' },
    { text: 'low urgency comfortable deadline exploratory approach', intent: 'action.ask_exploratory' },
    { text: 'flexible project relaxed timeline thoughtful planning', intent: 'action.ask_exploratory' },
    { text: 'low urgency comfortable schedule exploratory delivery', intent: 'action.ask_exploratory' },
    { text: 'relaxed project flexible requirements thoughtful execution', intent: 'action.ask_exploratory' },
    
    // Recommendation scenarios
    { text: 'objectives complete budget set tasks defined people assigned', intent: 'action.provide_recommendation' },
    { text: 'all areas complete project well defined comprehensive planning', intent: 'action.provide_recommendation' },
    { text: 'objectives set budget defined tasks planned people identified', intent: 'action.provide_recommendation' },
    { text: 'project fully defined comprehensive information complete planning', intent: 'action.provide_recommendation' },
    { text: 'all gaps resolved project information complete', intent: 'action.provide_recommendation' },
    { text: 'objectives clear budget set tasks planned stakeholders identified', intent: 'action.provide_recommendation' },
    { text: 'project well defined all areas complete comprehensive planning', intent: 'action.provide_recommendation' },
    { text: 'objectives defined budget set tasks clear people assigned', intent: 'action.provide_recommendation' },
    { text: 'project information complete all areas defined', intent: 'action.provide_recommendation' },
    { text: 'objectives set budget planned tasks defined team assigned', intent: 'action.provide_recommendation' },
    
    // Clarification scenarios
    { text: 'unclear response ambiguous answer need clarification', intent: 'action.request_clarification' },
    { text: 'confusing response unclear meaning clarification needed', intent: 'action.request_clarification' },
    { text: 'ambiguous answer unclear intent need more info', intent: 'action.request_clarification' },
    { text: 'unclear response confusing message clarification required', intent: 'action.request_clarification' },
    { text: 'ambiguous answer unclear meaning need clarification', intent: 'action.request_clarification' },
    { text: 'confusing response unclear intent clarification needed', intent: 'action.request_clarification' },
    { text: 'unclear answer ambiguous message need more details', intent: 'action.request_clarification' },
    { text: 'confusing response unclear meaning clarification required', intent: 'action.request_clarification' },
    { text: 'ambiguous answer unclear intent need clarification', intent: 'action.request_clarification' },
    { text: 'unclear response confusing meaning clarification needed', intent: 'action.request_clarification' },
    
    // Continue planning scenarios
    { text: 'objectives partial budget missing tasks incomplete', intent: 'action.continue_planning' },
    { text: 'partial information some gaps remain planning continues', intent: 'action.continue_planning' },
    { text: 'objectives set budget partial tasks incomplete', intent: 'action.continue_planning' },
    { text: 'some areas complete others need attention continue planning', intent: 'action.continue_planning' },
    { text: 'objectives clear budget missing tasks partial', intent: 'action.continue_planning' },
    { text: 'partial completion some gaps resolved continue planning', intent: 'action.continue_planning' },
    { text: 'objectives defined budget unclear tasks incomplete', intent: 'action.continue_planning' },
    { text: 'mixed completion some areas done others need work', intent: 'action.continue_planning' },
    { text: 'objectives set budget partial tasks undefined', intent: 'action.continue_planning' },
    { text: 'partial information gaps remain continue planning', intent: 'action.continue_planning' },
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
    ],
    
    // Action Planning Response Templates
    'action.ask_objectives': [
        'What are your main objectives for this project?',
        'Could you describe the goals you want to achieve?',
        'What do you hope to accomplish with this project?'
    ],
    'action.ask_budget': [
        'What budget do you have available for this project?',
        'What financial resources are allocated for this work?',
        'What\'s your budget range for this project?'
    ],
    'action.ask_tasks': [
        'What specific tasks or deliverables do you need?',
        'What are the key activities for this project?',
        'What work needs to be completed?'
    ],
    'action.ask_people': [
        'Who will be involved in this project?',
        'What team members or stakeholders need to be included?',
        'Who are the key people for this project?'
    ],
    'action.ask_detailed': [
        'Could you provide more detailed information about this?',
        'I\'d like to understand this better - can you elaborate?',
        'Let me get a comprehensive understanding of your needs.'
    ],
    'action.ask_direct': [
        'What\'s your budget?',
        'When do you need this completed?',
        'Who\'s involved?'
    ],
    'action.ask_balanced': [
        'Tell me about your project requirements.',
        'What are the key details I should know?',
        'Help me understand your project needs.'
    ],
    'action.ask_exploratory': [
        'Let\'s explore this together - what\'s your vision?',
        'I\'d love to understand more about your goals.',
        'Tell me more about what you\'re thinking.'
    ],
    'action.provide_recommendation': [
        'Based on what we\'ve discussed, here are my recommendations.',
        'Your project looks well-defined. Here\'s what I suggest.',
        'Great progress! Here\'s my recommended next steps.'
    ],
    'action.request_clarification': [
        'I want to make sure I understand correctly - could you clarify?',
        'Let me make sure I have this right - can you explain more?',
        'I need a bit more clarity on this - could you elaborate?'
    ],
    'action.continue_planning': [
        'Let\'s continue building your project plan.',
        'We\'re making good progress - let\'s keep going.',
        'Let\'s work on the next part of your project.'
    ],
    'action.escalate_complexity': [
        'This looks like a complex project - let\'s plan it thoroughly.',
        'Given the complexity, we\'ll need a detailed approach.',
        'This requires advanced planning - let\'s break it down systematically.'
    ],
    'action.simplify_approach': [
        'This looks straightforward - let\'s keep it simple.',
        'For this project, we can use a streamlined approach.',
        'Let\'s plan this with a simple, effective strategy.'
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
    'stakeholder.add': 'ADD_STAKEHOLDER',
    
    // Action Planning Intent Mappings
    'action.ask_objectives': 'ASK_ABOUT_OBJECTIVES',
    'action.ask_budget': 'ASK_ABOUT_BUDGET',
    'action.ask_tasks': 'ASK_ABOUT_TASKS',
    'action.ask_people': 'ASK_ABOUT_PEOPLE',
    'action.ask_detailed': 'ASK_DETAILED_QUESTION',
    'action.ask_direct': 'ASK_DIRECT_QUESTION',
    'action.ask_balanced': 'ASK_BALANCED_QUESTION',
    'action.ask_exploratory': 'ASK_EXPLORATORY_QUESTION',
    'action.provide_recommendation': 'PROVIDE_RECOMMENDATION',
    'action.request_clarification': 'REQUEST_CLARIFICATION',
    'action.continue_planning': 'CONTINUE_PLANNING',
    'action.escalate_complexity': 'ESCALATE_COMPLEXITY',
    'action.simplify_approach': 'SIMPLIFY_APPROACH'
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
