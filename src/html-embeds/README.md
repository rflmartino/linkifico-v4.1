# HTML Embeds for Wix

This directory contains HTML code for Wix HTML embed elements.

## Files

- `chat-ui-v2.html` - Updated chat UI with system message updates and fixed typing indicator
- `chat-ui-v1.html` - Original chat UI (backup)

## How to Use

1. Open the HTML file you want to use
2. Copy the entire content (Ctrl+A, Ctrl+C)
3. In Wix Editor:
   - Go to your page
   - Add an HTML Embed element
   - Paste the code into the HTML embed
   - Save and publish

## Chat UI v2 Changes

### ✅ Fixed Issues:

1. **System Message Updates**: Progress messages now update in place instead of stacking up
   - "🤔 Analyzing your project..." updates to "🔍 Analyzing project knowledge..." in the same message
   - Final response clears the system message and shows the actual response

2. **Typing Indicator Logic**: Typing dots now only show when AI is processing, not when user is typing
   - User typing: No visual indicator (just notifies parent)
   - AI processing: Shows typing dots + system message updates

### 🎨 Visual Improvements:

- System messages have a subtle blue background with pulse animation
- Better visual distinction between system updates and final responses
- Smoother transitions between different processing stages

### 🔧 Technical Improvements:

- `lastSystemMessageId` tracks the current system message for updates
- `updateSystemMessage()` method handles in-place updates
- `clearSystemMessage()` removes system message when showing final response
- Improved status handling for typing indicators

## Version History

- **v2**: Fixed system message stacking and typing indicator logic
- **v1**: Original implementation with basic functionality
