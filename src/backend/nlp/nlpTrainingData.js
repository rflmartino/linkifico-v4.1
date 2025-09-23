// Minimal, focused sentiment training to drive brevity/tone only

export const SENTIMENT_LABELS = [
    'sentiment.engaged',
    'sentiment.frustrated',
    'sentiment.confused',
    'sentiment.impatient',
    'sentiment.professional',
    'sentiment.casual',
    'sentiment.thoughtful',
    'sentiment.skeptical',
    'sentiment.grateful',
    'sentiment.neutral'
];

// Compact examples per class; keep fast to train
export const sentimentTraining = {
    engaged: [
        'yes perfect let\'s do that',
        'looks good to me',
        'great let\'s continue',
        'awesome thanks',
        'sounds good proceed'
    ],
    frustrated: [
        'this is not working',
        'why do you keep asking',
        'this is so annoying',
        'i\'m getting frustrated',
        'this is taking too long'
    ],
    confused: [
        'i don\'t understand',
        'what do you mean',
        'i\'m not sure what you want',
        'can you explain better',
        'that doesn\'t make sense'
    ],
    impatient: [
        'skip all that',
        'just use the defaults',
        'hurry up please',
        'make it quick',
        'no time for details'
    ],
    professional: [
        'please proceed with the next step',
        'kindly continue with the process',
        'thank you for the clarification',
        'please confirm the details',
        'i would appreciate more information'
    ],
    casual: [
        'yeah sure whatever',
        'ok cool',
        'all good',
        'no worries',
        'your call'
    ],
    thoughtful: [
        'let me think about that',
        'hmm that\'s interesting',
        'i need to consider this',
        'give me a moment',
        'i\'m weighing options'
    ],
    skeptical: [
        'are you sure about that',
        'that doesn\'t sound right',
        'i\'m not convinced',
        'i doubt that will work',
        'how do you know that'
    ],
    grateful: [
        'thank you so much',
        'really appreciate your help',
        'thanks this is helpful',
        'you\'ve been very helpful',
        'much appreciated'
    ],
    neutral: [
        'okay',
        'fine',
        'understood',
        'noted',
        'continue'
    ]
};

// Map to brevity/tone guidance
export const sentimentToGuidance = {
    'sentiment.frustrated': { brevity: 'brief', tone: 'direct' },
    'sentiment.impatient': { brevity: 'brief', tone: 'direct' },
    'sentiment.confused': { brevity: 'brief', tone: 'clarifying' },
    'sentiment.professional': { brevity: 'brief', tone: 'formal' },
    'sentiment.engaged': { brevity: 'normal', tone: 'friendly' },
    'sentiment.casual': { brevity: 'brief', tone: 'friendly' },
    'sentiment.thoughtful': { brevity: 'normal', tone: 'neutral' },
    'sentiment.skeptical': { brevity: 'brief', tone: 'direct' },
    'sentiment.grateful': { brevity: 'brief', tone: 'friendly' },
    'sentiment.neutral': { brevity: 'normal', tone: 'neutral' }
};


