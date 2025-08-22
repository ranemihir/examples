import { test, expect } from './fixtures';

test.describe('Integration Tests - End-to-End User Journeys', () => {
  test('should complete full development workflow: create → code → test → preview', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Step 1: Create sandbox
    await mockAI.mockSandboxCreation('sbx_integration_full');
    await mockAI.mockChatResponse('Creating a new development environment...');
    
    await chatPage.sendMessage('Create a sandbox for a React todo app');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="sandbox-ready"]', { timeout: 15000 });
    
    // Step 2: Generate files
    await mockAI.mockFileGeneration([
      { path: 'package.json', content: '{"name": "todo-app", "scripts": {"dev": "next dev", "build": "next build", "test": "jest"}}' },
      { path: 'src/components/TodoList.jsx', content: 'export default function TodoList() { return <div>Todo List</div>; }' },
      { path: 'src/pages/index.js', content: 'import TodoList from "../components/TodoList"; export default function Home() { return <TodoList />; }' },
      { path: 'tests/TodoList.test.js', content: 'test("renders todo list", () => { expect(true).toBe(true); });' },
    ]);
    
    await mockAI.mockChatResponse('Generating React components and tests...');
    await chatPage.sendMessage('Generate todo app components with tests');
    await chatPage.waitForResponse();
    
    // Verify files in file explorer
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    await expect(page.locator('[data-testid="file-package.json"]')).toBeVisible();
    await expect(page.locator('[data-testid="folder-src"]')).toBeVisible();
    await expect(page.locator('[data-testid="folder-tests"]')).toBeVisible();
    
    // Step 3: Install dependencies
    await mockAI.mockCommandExecution('npm install completed\ninstalled 50 packages', 0);
    await mockAI.mockChatResponse('Installing project dependencies...');
    
    await chatPage.sendMessage('Install dependencies');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="command-completed"]', { timeout: 15000 });
    
    // Step 4: Run tests
    await mockAI.mockCommandExecution('Tests passed\n1 test suite passed', 0);
    await mockAI.mockChatResponse('Running test suite...');
    
    await chatPage.sendMessage('Run tests');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="command-completed"]', { timeout: 15000 });
    
    // Step 5: Start development server and preview
    await mockAI.mockCommandExecution('Development server started on http://localhost:3000', 0);
    await page.route('/api/sandboxes/*/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://sbx-integration-full-3000.vercel.app',
          port: 3000,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Starting development server and preview...');
    
    await chatPage.sendMessage('Start dev server and show preview');
    await chatPage.waitForResponse();
    
    // Verify preview is available
    await chatPage.switchToPreview();
    await page.waitForSelector('[data-testid="preview-iframe"]', { timeout: 15000 });
    
    const iframe = page.locator('[data-testid="preview-iframe"]');
    await expect(iframe).toHaveAttribute('src', 'https://sbx-integration-full-3000.vercel.app');
    
    // Step 6: Check logs
    await chatPage.switchToLogs();
    
    const commandLogs = page.locator('[data-testid="command-logs"]');
    await expect(commandLogs).toContainText('npm install completed');
    await expect(commandLogs).toContainText('Tests passed');
    await expect(commandLogs).toContainText('Development server started');
  });

  test('should handle complex multi-step AI interactions', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Complex request requiring multiple tools
    await mockAI.mockSandboxCreation('sbx_complex_interaction');
    await mockAI.mockFileGeneration([
      { path: 'backend/server.js', content: 'const express = require("express"); const app = express(); app.listen(8080);' },
      { path: 'frontend/package.json', content: '{"name": "frontend", "scripts": {"dev": "vite"}}' },
      { path: 'frontend/src/App.jsx', content: 'export default function App() { return <h1>Full Stack App</h1>; }' },
    ]);
    await mockAI.mockCommandExecution('Installing backend dependencies...', 0);
    await mockAI.mockCommandExecution('Installing frontend dependencies...', 0);
    
    await mockAI.mockChatResponse('Creating full-stack application with separate backend and frontend...');
    
    await chatPage.sendMessage('Create a full-stack app with Express backend on port 8080 and React frontend on port 3000');
    await chatPage.waitForResponse();
    
    // Should execute multiple tools in sequence
    await page.waitForSelector('[data-testid="tool-create-sandbox"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="tool-generate-files"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="tool-run-command"]', { timeout: 10000 });
    
    // Verify file structure
    await chatPage.switchToFileExplorer();
    await page.waitForTimeout(2000);
    
    await expect(page.locator('[data-testid="folder-backend"]')).toBeVisible();
    await expect(page.locator('[data-testid="folder-frontend"]')).toBeVisible();
    
    // Verify commands were executed
    await chatPage.switchToLogs();
    const logs = page.locator('[data-testid="command-logs"]');
    await expect(logs).toContainText('Installing backend dependencies');
    await expect(logs).toContainText('Installing frontend dependencies');
  });

  test('should maintain state consistency across components', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Create project with state that affects multiple components
    await mockAI.mockSandboxCreation('sbx_state_consistency');
    await mockAI.mockFileGeneration([
      { path: 'src/App.js', content: 'function App() { return <div>State Test App</div>; }' },
      { path: 'package.json', content: '{"name": "state-app"}' },
    ]);
    
    await mockAI.mockChatResponse('Setting up application...');
    await chatPage.sendMessage('Create a React app');
    await chatPage.waitForResponse();
    
    // File Explorer should reflect the generated files
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    const appFile = page.locator('[data-testid="file-src/App.js"]');
    const packageFile = page.locator('[data-testid="file-package.json"]');
    
    // Expand src folder
    await page.click('[data-testid="folder-src"]');
    await page.waitForTimeout(500);
    
    await expect(appFile).toBeVisible();
    await expect(packageFile).toBeVisible();
    
    // Click on App.js
    await appFile.click();
    await page.waitForSelector('[data-testid="file-content"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="file-content"]')).toContainText('State Test App');
    
    // Generate additional file
    await mockAI.mockFileGeneration([
      { path: 'src/components/Header.js', content: 'export default function Header() { return <h1>Header</h1>; }' },
    ]);
    
    await mockAI.mockChatResponse('Adding header component...');
    await chatPage.sendMessage('Add a header component');
    await chatPage.waitForResponse();
    
    // File tree should update
    await page.waitForTimeout(2000);
    const headerFile = page.locator('[data-testid="file-src/components/Header.js"]');
    
    // Expand components folder
    await page.click('[data-testid="folder-src/components"]');
    await page.waitForTimeout(500);
    
    await expect(headerFile).toBeVisible();
    
    // Switch tabs and verify state persistence
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile view
    await page.click('[data-testid="tab-chat"]');
    await page.waitForTimeout(500);
    await chatPage.switchToFileExplorer();
    
    // Previously expanded folders should still be expanded
    await expect(headerFile).toBeVisible();
    await expect(appFile).toBeVisible();
  });

  test('should handle error recovery and continuation', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Start with successful operations
    await mockAI.mockSandboxCreation('sbx_error_recovery');
    await mockAI.mockChatResponse('Creating sandbox...');
    await chatPage.sendMessage('Create a sandbox');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="sandbox-ready"]', { timeout: 15000 });
    
    // Introduce an error (failed command)
    await mockAI.mockCommandExecution('npm ERR! Missing package.json', 1);
    await mockAI.mockChatResponse('Attempting to install packages...');
    
    await chatPage.sendMessage('Install packages');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="command-error"]', { timeout: 10000 });
    
    // Verify error is displayed
    const commandTool = page.locator('[data-testid="tool-run-command"]');
    await expect(commandTool).toContainText('Missing package.json');
    
    // Recovery: Generate package.json and try again
    await mockAI.mockFileGeneration([
      { path: 'package.json', content: '{"name": "recovery-app", "dependencies": {}}' },
    ]);
    await mockAI.mockCommandExecution('npm install completed successfully', 0);
    await mockAI.mockChatResponse('Let me create package.json first and then install...');
    
    await chatPage.sendMessage('Create package.json and install dependencies');
    await chatPage.waitForResponse();
    
    // Should show both file generation and successful command
    await page.waitForSelector('[data-testid="tool-generate-files"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="command-completed"]', { timeout: 15000 });
    
    // Verify recovery was successful
    const latestCommandTool = page.locator('[data-testid="tool-run-command"]').last();
    await expect(latestCommandTool).toContainText('completed successfully');
    
    // File explorer should show the generated package.json
    await chatPage.switchToFileExplorer();
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="file-package.json"]')).toBeVisible();
  });

  test('should support collaborative-style interactions', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Simulate a conversation where user builds up a project iteratively
    
    // Step 1: Initial request
    await mockAI.mockSandboxCreation('sbx_collaborative');
    await mockAI.mockFileGeneration([
      { path: 'index.html', content: '<!DOCTYPE html><html><body><h1>Hello</h1></body></html>' },
    ]);
    await mockAI.mockChatResponse('I\'ve created a basic HTML file for you...');
    
    await chatPage.sendMessage('Create a simple HTML page');
    await chatPage.waitForResponse();
    
    // Step 2: Add styling
    await mockAI.mockFileGeneration([
      { path: 'styles.css', content: 'h1 { color: blue; font-size: 2em; }' },
    ]);
    await mockAI.mockChatResponse('I\'ve added CSS styling...');
    
    await chatPage.sendMessage('Add some CSS to make it look better');
    await chatPage.waitForResponse();
    
    // Step 3: Add interactivity
    await mockAI.mockFileGeneration([
      { path: 'script.js', content: 'document.addEventListener("DOMContentLoaded", () => { console.log("Page loaded"); });' },
    ]);
    await mockAI.mockChatResponse('I\'ve added JavaScript for interactivity...');
    
    await chatPage.sendMessage('Add some JavaScript');
    await chatPage.waitForResponse();
    
    // Step 4: Update HTML to include CSS and JS
    await mockAI.mockFileGeneration([
      { path: 'index.html', content: '<!DOCTYPE html><html><head><link rel="stylesheet" href="styles.css"></head><body><h1>Hello</h1><script src="script.js"></script></body></html>' },
    ]);
    await mockAI.mockChatResponse('I\'ve updated the HTML to include the CSS and JavaScript files...');
    
    await chatPage.sendMessage('Update the HTML to include the CSS and JS files');
    await chatPage.waitForResponse();
    
    // Verify all files are present
    await chatPage.switchToFileExplorer();
    await page.waitForTimeout(2000);
    
    await expect(page.locator('[data-testid="file-index.html"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-styles.css"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-script.js"]')).toBeVisible();
    
    // Check final HTML content
    await page.click('[data-testid="file-index.html"]');
    await page.waitForSelector('[data-testid="file-content"]', { timeout: 5000 });
    
    const fileContent = page.locator('[data-testid="file-content"]');
    await expect(fileContent).toContainText('styles.css');
    await expect(fileContent).toContainText('script.js');
  });

  test('should handle mixed content types and tools', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Request that involves multiple content types
    await mockAI.mockSandboxCreation('sbx_mixed_content');
    await mockAI.mockFileGeneration([
      { path: 'README.md', content: '# Mixed Content Project\n\nThis project demonstrates various file types.' },
      { path: 'config.json', content: '{"env": "development", "port": 3000}' },
      { path: 'src/main.py', content: 'print("Hello from Python")' },
      { path: 'src/app.js', content: 'console.log("Hello from JavaScript");' },
      { path: 'docker/Dockerfile', content: 'FROM node:16\nWORKDIR /app\nCOPY . .\nRUN npm install' },
    ]);
    
    await mockAI.mockCommandExecution('Python script executed\nHello from Python', 0);
    await mockAI.mockCommandExecution('JavaScript executed\nHello from JavaScript', 0);
    
    await mockAI.mockChatResponse('Creating a multi-language project with documentation and configuration...');
    
    await chatPage.sendMessage('Create a project with Python, JavaScript, Docker configuration, and documentation');
    await chatPage.waitForResponse();
    
    // Verify diverse file structure
    await chatPage.switchToFileExplorer();
    await page.waitForTimeout(2000);
    
    await expect(page.locator('[data-testid="file-README.md"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-config.json"]')).toBeVisible();
    await expect(page.locator('[data-testid="folder-src"]')).toBeVisible();
    await expect(page.locator('[data-testid="folder-docker"]')).toBeVisible();
    
    // Verify file contents with different syntax highlighting
    await page.click('[data-testid="folder-src"]');
    await page.waitForTimeout(500);
    
    // Check Python file
    await page.click('[data-testid="file-src/main.py"]');
    await page.waitForSelector('[data-testid="file-content"]', { timeout: 5000 });
    
    const pythonContent = page.locator('[data-testid="file-content"] code');
    await expect(pythonContent).toHaveClass(/language-python|hljs/);
    
    // Check JavaScript file
    await page.click('[data-testid="file-src/app.js"]');
    await page.waitForTimeout(500);
    
    const jsContent = page.locator('[data-testid="file-content"] code');
    await expect(jsContent).toHaveClass(/language-javascript|hljs/);
    
    // Check if commands were executed
    await chatPage.switchToLogs();
    const logs = page.locator('[data-testid="command-logs"]');
    await expect(logs).toContainText('Hello from Python');
    await expect(logs).toContainText('Hello from JavaScript');
  });

  test('should maintain performance with large projects', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Generate a large project structure
    const manyFiles = [];
    for (let i = 0; i < 20; i++) {
      manyFiles.push({ path: `src/components/Component${i}.jsx`, content: `export default function Component${i}() { return <div>Component ${i}</div>; }` });
      manyFiles.push({ path: `src/utils/util${i}.js`, content: `export const util${i} = () => ${i};` });
      manyFiles.push({ path: `tests/Component${i}.test.js`, content: `test('Component${i} renders', () => {});` });
    }
    
    await mockAI.mockSandboxCreation('sbx_large_project');
    await mockAI.mockFileGeneration(manyFiles);
    await mockAI.mockCommandExecution('Large project build completed', 0);
    
    await mockAI.mockChatResponse('Creating a large React project with many components...');
    
    const startTime = Date.now();
    
    await chatPage.sendMessage('Create a large React project with 20 components');
    await chatPage.waitForResponse();
    
    const responseTime = Date.now() - startTime;
    
    // Should complete within reasonable time (adjust as needed)
    expect(responseTime).toBeLessThan(30000); // 30 seconds
    
    // File explorer should handle large file list
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 15000 });
    
    // Expand src folder
    await page.click('[data-testid="folder-src"]');
    await page.waitForTimeout(2000);
    
    // Should be able to navigate large file structure
    await page.click('[data-testid="folder-src/components"]');
    await page.waitForTimeout(2000);
    
    // Should have many component files
    const componentFiles = page.locator('[data-testid^="file-src/components/Component"]');
    const componentCount = await componentFiles.count();
    
    expect(componentCount).toBe(20);
    
    // Should be able to open files without performance issues
    await page.click('[data-testid="file-src/components/Component0.jsx"]');
    await page.waitForSelector('[data-testid="file-content"]', { timeout: 5000 });
    
    const fileContent = page.locator('[data-testid="file-content"]');
    await expect(fileContent).toContainText('Component 0');
  });

  test('should support undo/redo-like behavior through conversation', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Initial setup
    await mockAI.mockSandboxCreation('sbx_undo_redo');
    await mockAI.mockFileGeneration([
      { path: 'src/App.js', content: 'function App() { return <div>Original App</div>; }' },
    ]);
    await mockAI.mockChatResponse('Created initial App component...');
    
    await chatPage.sendMessage('Create a React app');
    await chatPage.waitForResponse();
    
    // Make a change
    await mockAI.mockFileGeneration([
      { path: 'src/App.js', content: 'function App() { return <div>Modified App</div>; }' },
    ]);
    await mockAI.mockChatResponse('Modified the App component...');
    
    await chatPage.sendMessage('Change the text to "Modified App"');
    await chatPage.waitForResponse();
    
    // Verify change
    await chatPage.switchToFileExplorer();
    await page.click('[data-testid="folder-src"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="file-src/App.js"]');
    await page.waitForSelector('[data-testid="file-content"]', { timeout: 5000 });
    
    await expect(page.locator('[data-testid="file-content"]')).toContainText('Modified App');
    
    // "Undo" by reverting to original
    await mockAI.mockFileGeneration([
      { path: 'src/App.js', content: 'function App() { return <div>Original App</div>; }' },
    ]);
    await mockAI.mockChatResponse('Reverted to original App component...');
    
    await chatPage.sendMessage('Actually, change it back to the original text');
    await chatPage.waitForResponse();
    
    // Verify reversion
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="file-content"]')).toContainText('Original App');
    
    // The conversation history should show the progression
    await page.click('[data-testid="tab-chat"]');
    
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages).toHaveCount(6); // 3 user + 3 AI messages
    
    // Should be able to see the conversation flow
    await expect(messages.nth(1)).toContainText('Created initial App');
    await expect(messages.nth(3)).toContainText('Modified the App');
    await expect(messages.nth(5)).toContainText('Reverted to original');
  });
});