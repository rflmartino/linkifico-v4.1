// Project Portfolio Page - Velo Frontend
// Manages user project portfolio with HTML embed integration

import { webMethod } from 'wix-web-module';
import wixUsers from 'wix-users';
import wixLocation from 'wix-location';
import { processUserRequest } from 'backend/entrypoint.web.js';
import { logToBackend } from 'backend/utils/webLogger.web.js';

// ========================================
// TEST MODE CONFIGURATION
// ========================================
// Set to true for development/testing with hardcoded users
// Set to false for production with real Wix users
const TEST_MODE = true;

// Test user profiles (no scenario constraints - they use real backend data)
const TEST_USERS = {
    'test_user_001': {
        id: 'test_user_001',
        email: 'test.user@linkifico.com',
        loggedIn: true
    },
    'test_user_002': {
        id: 'test_user_002', 
        email: 'new.user@linkifico.com',
        loggedIn: true
    },
    'test_user_003': {
        id: 'test_user_003',
        email: 'premium.user@linkifico.com',
        loggedIn: true
    }
};

// Current active test user (change this to test different users)
const ACTIVE_TEST_USER = 'test_user_001';
// ========================================

let currentUser = null;
let portfolioHtmlElement = null;

$w.onReady(async function () {
    logToBackend('Project-Portfolio', 'onReady', { message: 'Page loading...' });
    
    // Initialize user authentication
    await initializeUser();
    
    // Initialize HTML embed
    await initializePortfolioEmbed();
    
    // Load portfolio data automatically after HTML embed is ready
    setTimeout(async () => {
        await handleLoadPortfolio();
    }, 1000);
    
    logToBackend('Project-Portfolio', 'onReady', { message: 'Page ready' });
});

// Initialize user authentication
async function initializeUser() {
    try {
        if (TEST_MODE) {
            // Use hardcoded test user
            const testUser = TEST_USERS[ACTIVE_TEST_USER];
            if (!testUser) {
                throw new Error(`Test user '${ACTIVE_TEST_USER}' not found in TEST_USERS`);
            }
            
            currentUser = testUser;
            
            logToBackend('Project-Portfolio', 'initializeUser', {
                message: 'TEST MODE: Using hardcoded test user',
                testMode: true,
                userId: currentUser.id,
                email: currentUser.email
            });
            
        } else {
            // Use real Wix user authentication
            currentUser = wixUsers.currentUser;
            
            if (!currentUser.loggedIn) {
                logToBackend('Project-Portfolio', 'initializeUser', { message: 'User not logged in, redirecting...' });
                wixLocation.to('/login');
                return;
            }
            
            logToBackend('Project-Portfolio', 'initializeUser', {
                message: 'PRODUCTION MODE: User authenticated',
                testMode: false,
                userId: currentUser.id,
                email: currentUser.email
            });
        }
        
    } catch (error) {
        logToBackend('Project-Portfolio', 'initializeUser', null, error);
        if (!TEST_MODE) {
            wixLocation.to('/login');
        }
    }
}

// Initialize the HTML embed for portfolio view
async function initializePortfolioEmbed() {
    try {
        portfolioHtmlElement = $w('#htmlPortfolioView');
        
        if (!portfolioHtmlElement) {
            logToBackend('Project-Portfolio', 'initializePortfolioEmbed', null, new Error('HTML element #htmlPortfolioView not found'));
            return;
        }
        
        logToBackend('Project-Portfolio', 'initializePortfolioEmbed', { 
            message: 'HTML element found, setting up communication',
            elementType: portfolioHtmlElement.type
        });
        
        // Set up message listener for HTML embed communication
        portfolioHtmlElement.onMessage((event) => {
            handlePortfolioMessage(event);
        });
        
        // Set HTML content directly (alternative approach)
        // portfolioHtmlElement.html = `your HTML content here`;
        
        logToBackend('Project-Portfolio', 'initializePortfolioEmbed', { 
            message: 'HTML embed communication setup complete'
        });
        
    } catch (error) {
        logToBackend('Project-Portfolio', 'initializePortfolioEmbed', null, error);
    }
}

// Handle messages from the HTML embed
async function handlePortfolioMessage(event) {
    const { type, data } = event.data;
    
    logToBackend('Project-Portfolio', 'handlePortfolioMessage', { type: type, message: 'Received message from embed' });
    
    try {
        switch (type) {
            case 'LOAD_PORTFOLIO':
                await handleLoadPortfolio();
                break;
                
            case 'NEW_PROJECT':
                await handleNewProject();
                break;
                
            case 'CREATE_PROJECT':
                await handleCreateProject(data.templateName, data.userInput);
                break;
                
            case 'OPEN_PROJECT':
                await handleOpenProject(data.projectId);
                break;
                
            case 'ARCHIVE_PROJECT':
                await handleArchiveProject(data.projectId);
                break;
                
            case 'RESTORE_PROJECT':
                await handleRestoreProject(data.projectId);
                break;
                
            case 'DELETE_PROJECT':
                await handleDeleteProject(data.projectId);
                break;
                
            default:
                console.warn(`⚠️ Project Portfolio: Unknown message type - ${type}`);
        }
        
    } catch (error) {
        logToBackend('Project-Portfolio', 'handlePortfolioMessage', { type: type }, error);
        sendToEmbed('ERROR', null, error.message);
    }
}

// Load user's portfolio data
async function handleLoadPortfolio() {
    try {
        logToBackend('Project-Portfolio', 'handleLoadPortfolio', { 
            message: 'Loading portfolio data...',
            testMode: TEST_MODE,
            userId: currentUser.id
        });
        
        // Always call real backend (test mode only affects user authentication)
        const response = await processUserRequest({
            op: 'loadPortfolio',
            projectId: 'portfolio', // Dummy projectId for portfolio operations
            userId: currentUser.id,
            sessionId: `portfolio_${Date.now()}`,
            payload: {}
        });
        
        logToBackend('Project-Portfolio', 'handleLoadPortfolio', { 
            message: TEST_MODE ? 'TEST MODE: Portfolio loaded from backend with test user' : 'PRODUCTION MODE: Portfolio loaded from backend',
            testMode: TEST_MODE,
            totalProjects: response.data?.totalProjects || 0
        });
        
        if (response.success) {
            sendToEmbed('PORTFOLIO_DATA', response);
        } else {
            logToBackend('Project-Portfolio', 'handleLoadPortfolio', null, new Error('Failed to load portfolio: ' + (response.error || 'Unknown error')));
            sendToEmbed('PORTFOLIO_ERROR', null, response.error || 'Failed to load portfolio');
        }
        
    } catch (error) {
        logToBackend('Project-Portfolio', 'handleLoadPortfolio', null, error);
        sendToEmbed('PORTFOLIO_ERROR', null, error.message);
    }
}

// Handle new project creation (legacy - opens modal)
async function handleNewProject() {
    try {
        logToBackend('Project-Portfolio', 'handleNewProject', { 
            message: 'Opening new project modal...',
            testMode: TEST_MODE
        });
        
        // The HTML embed will handle showing the modal
        // This function is kept for compatibility
        
    } catch (error) {
        logToBackend('Project-Portfolio', 'handleNewProject', null, error);
        sendToEmbed('ERROR', null, error.message);
    }
}

// Handle project creation with template and user input
async function handleCreateProject(templateName, userInput) {
    const transitionStartTime = Date.now();
    
    try {
        logToBackend('Project-Portfolio', 'handleCreateProject', { 
            message: 'TRANSITION START: Creating project with template',
            templateName: templateName,
            inputLength: userInput.length,
            testMode: TEST_MODE,
            transitionId: transitionStartTime
        });
        
        // Generate new project ID
        const newProjectId = generateNewProjectId();
        
        logToBackend('Project-Portfolio', 'handleCreateProject', { 
            message: 'BACKEND CALL START: Calling processUserRequest init',
            projectId: newProjectId,
            transitionId: transitionStartTime
        });
        
        // Call backend to initialize project with user input
        const backendStartTime = Date.now();
        const response = await processUserRequest({
            op: 'init',
            projectId: newProjectId,
            userId: currentUser.id,
            sessionId: `create_${Date.now()}`,
            payload: { 
                templateName: templateName,
                projectName: 'Untitled Project', // AI will rename based on input
                initialMessage: userInput 
            }
        });
        
        const backendDuration = Date.now() - backendStartTime;
        
        if (response.success) {
            logToBackend('Project-Portfolio', 'handleCreateProject', { 
                message: 'BACKEND CALL SUCCESS: Project created, preparing navigation',
                projectId: newProjectId,
                backendDurationMs: backendDuration,
                transitionId: transitionStartTime
            });
            
            // Log navigation attempt
            logToBackend('Project-Portfolio', 'handleCreateProject', { 
                message: 'NAVIGATION START: Redirecting to workspace',
                projectId: newProjectId,
                userId: currentUser.id,
                targetUrl: `/project-workspace?projectId=${newProjectId}&userId=${currentUser.id}`,
                transitionId: transitionStartTime,
                totalTransitionTimeMs: Date.now() - transitionStartTime
            });
            
            // Navigate to workspace with the new project
            wixLocation.to(`/project-workspace?projectId=${newProjectId}&userId=${currentUser.id}`);
            
        } else {
            logToBackend('Project-Portfolio', 'handleCreateProject', null, new Error(`BACKEND CALL FAILED: ${response.error || 'Unknown error'} (Duration: ${backendDuration}ms, TransitionId: ${transitionStartTime})`));
            sendToEmbed('ERROR', null, response.error || 'Failed to create project');
        }
        
    } catch (error) {
        logToBackend('Project-Portfolio', 'handleCreateProject', null, new Error(`TRANSITION ERROR: ${error.message} (TransitionId: ${transitionStartTime}, Duration: ${Date.now() - transitionStartTime}ms)`));
        sendToEmbed('ERROR', null, error.message);
    }
}

// Generate new project ID
function generateNewProjectId() {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    return `proj_${timestamp}_${randomId}`;
}

// Handle opening a project
async function handleOpenProject(projectId) {
    const transitionStartTime = Date.now();
    
    try {
        logToBackend('Project-Portfolio', 'handleOpenProject', { 
            message: 'TRANSITION START: Opening existing project',
            projectId: projectId, 
            testMode: TEST_MODE,
            transitionId: transitionStartTime
        });
        
        // Log navigation attempt
        logToBackend('Project-Portfolio', 'handleOpenProject', { 
            message: 'NAVIGATION START: Redirecting to workspace for existing project',
            projectId: projectId,
            userId: currentUser.id,
            targetUrl: `/project-workspace?projectId=${projectId}&userId=${currentUser.id}`,
            transitionId: transitionStartTime
        });
        
        // Navigate to project workspace with userId parameter
        wixLocation.to(`/project-workspace?projectId=${projectId}&userId=${currentUser.id}`);
        
    } catch (error) {
        logToBackend('Project-Portfolio', 'handleOpenProject', null, new Error(`TRANSITION ERROR: ${error.message} (ProjectId: ${projectId}, TransitionId: ${transitionStartTime})`));
        sendToEmbed('ERROR', null, error.message);
    }
}

// Handle archiving a project
async function handleArchiveProject(projectId) {
    try {
        logToBackend('Project-Portfolio', 'handleArchiveProject', { 
            projectId: projectId, 
            message: 'Archiving project',
            testMode: TEST_MODE
        });
        
        // Always call real backend (test mode only affects user authentication)
        const response = await processUserRequest({
            op: 'archiveProject',
            projectId: 'portfolio',
            userId: currentUser.id,
            sessionId: `archive_${Date.now()}`,
            payload: { projectId }
        });
        
        sendToEmbed('ARCHIVE_RESPONSE', response);
        
    } catch (error) {
        logToBackend('Project-Portfolio', 'handleArchiveProject', { projectId: projectId }, error);
        sendToEmbed('ERROR', null, error.message);
    }
}

// Handle restoring a project
async function handleRestoreProject(projectId) {
    try {
        logToBackend('Project-Portfolio', 'handleRestoreProject', { 
            projectId: projectId, 
            message: 'Restoring project',
            testMode: TEST_MODE
        });
        
        // Always call real backend (test mode only affects user authentication)
        const response = await processUserRequest({
            op: 'restoreProject',
            projectId: 'portfolio',
            userId: currentUser.id,
            sessionId: `restore_${Date.now()}`,
            payload: { projectId }
        });
        
        sendToEmbed('RESTORE_RESPONSE', response);
        
    } catch (error) {
        logToBackend('Project-Portfolio', 'handleRestoreProject', { projectId: projectId }, error);
        sendToEmbed('ERROR', null, error.message);
    }
}

// Handle deleting a project
async function handleDeleteProject(projectId) {
    try {
        logToBackend('Project-Portfolio', 'handleDeleteProject', { 
            projectId: projectId, 
            message: 'Deleting project',
            testMode: TEST_MODE
        });
        
        // Always call real backend (test mode only affects user authentication)
        const response = await processUserRequest({
            op: 'deleteProject',
            projectId: 'portfolio',
            userId: currentUser.id,
            sessionId: `delete_${Date.now()}`,
            payload: { projectId }
        });
        
        sendToEmbed('DELETE_RESPONSE', response);
        
    } catch (error) {
        logToBackend('Project-Portfolio', 'handleDeleteProject', { projectId: projectId }, error);
        sendToEmbed('ERROR', null, error.message);
    }
}

// Send message to HTML embed
function sendToEmbed(type, data, error = null) {
    try {
        if (!portfolioHtmlElement) {
            logToBackend('Project-Portfolio', 'sendToEmbed', null, new Error('Cannot send message - HTML element not initialized'));
            return;
        }
        
        const message = {
            type: type,
            data: data,
            error: error
        };
        
        logToBackend('Project-Portfolio', 'sendToEmbed', { type: type, message: 'Sending to embed' });
        portfolioHtmlElement.postMessage(message);
        
    } catch (error) {
        logToBackend('Project-Portfolio', 'sendToEmbed', null, error);
    }
}


// Export functions for potential external access
export { handleLoadPortfolio, handleNewProject };
