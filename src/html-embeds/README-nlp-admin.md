# Node-NLP Admin Console

## Overview
This HTML embed provides a beautiful admin interface for training, testing, and managing your Node-NLP model.

## Setup Instructions

### 1. Copy the HTML Code
Copy the contents of `nlp-admin-console.html` and paste it into your Wix HTML embed element.

### 2. Add HTML Embed Element
In your Wix Editor:
1. Go to the PMaaS Dashboard page
2. Add an HTML embed element
3. Set the element ID to `#htmlNLPConsole`
4. Paste the HTML code from `nlp-admin-console.html`

### 3. Features
- **Model Status**: View current model status, version, and training info
- **Initialize System**: Set up the Node-NLP system
- **Train Model**: Train with minimal data (10 examples)
- **Test Model**: Run automated tests on the model
- **Test Input**: Test individual inputs and see confidence scores
- **Real-time Logging**: See all operations in real-time

### 4. Expected Results
After training, you should see:
- Model Status: "trained"
- Version: "1.0.0"
- Training Examples: 10
- Test Results: 4/4 tests passed

### 5. Test Cases
The model is trained on these intents:
- `project_creation`: "create a new project", "start new project"
- `task_update`: "update task 3", "mark task complete"
- `budget_question`: "what is my budget", "budget range"
- `status_check`: "project status", "show me the timeline"

## Troubleshooting
- If you see "HTML embed not found", make sure the element ID is `#htmlNLPConsole`
- If training fails, check the browser console for errors
- If tests fail, try reinitializing the system

## Next Steps
Once the micro model is working:
1. Add more training data
2. Integrate with the main 5-agent system
3. Implement smart routing based on confidence scores
