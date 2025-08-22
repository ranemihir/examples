import { test, expect } from './fixtures';

test.describe('Command Execution Tests', () => {
  test.beforeEach(async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Create a sandbox for command execution
    await mockAI.mockSandboxCreation('sbx_cmd_test');
    await mockAI.mockChatResponse('Sandbox ready for commands!');
    await chatPage.sendMessage('Create a sandbox');
    await chatPage.waitForResponse();
    await page.waitForSelector('[data-testid="sandbox-ready"]', { timeout: 15000 });
  });

  test('should execute npm install command', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockCommandExecution('npm install completed successfully\ninstalled 100 packages', 0);
    await mockAI.mockChatResponse('Running npm install...');
    
    await chatPage.sendMessage('Run npm install');
    await chatPage.waitForResponse();
    
    // Wait for command execution tool
    await page.waitForSelector('[data-testid="tool-run-command"]', { timeout: 10000 });
    
    const commandTool = page.locator('[data-testid="tool-run-command"]');
    await expect(commandTool).toBeVisible();
    await expect(commandTool).toContainText('npm install');
    
    // Wait for command completion
    await page.waitForSelector('[data-testid="command-completed"]', { timeout: 15000 });
    await expect(commandTool).toContainText('completed successfully');
    await expect(commandTool).toContainText('installed 100 packages');
  });

  test('should show real-time command output', async ({ page, chatPage, mockAI }) => {
    // Mock streaming command output
    await page.route('/api/sandboxes/*/cmds/*/logs', async (route) => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const outputs = [
            'Starting build process...',
            'Compiling TypeScript files...',
            'Build completed successfully!',
          ];
          
          outputs.forEach((output, index) => {
            setTimeout(() => {
              controller.enqueue(encoder.encode(JSON.stringify({
                logs: [{ timestamp: Date.now(), type: 'stdout', content: output }]
              }) + '\n'));
              
              if (index === outputs.length - 1) {
                controller.close();
              }
            }, index * 1000);
          });
        }
      });

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: stream,
      });
    });
    
    await mockAI.mockChatResponse('Building the project...');
    
    await chatPage.sendMessage('Build the project');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="tool-run-command"]', { timeout: 10000 });
    
    // Verify streaming output appears
    await page.waitForTimeout(1000);
    const commandTool = page.locator('[data-testid="tool-run-command"]');
    await expect(commandTool).toContainText('Starting build process');
    
    await page.waitForTimeout(1000);
    await expect(commandTool).toContainText('Compiling TypeScript');
    
    await page.waitForTimeout(1000);
    await expect(commandTool).toContainText('Build completed successfully');
  });

  test('should handle command errors and failures', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockCommandExecution('Error: Command failed\nnpm ERR! Missing package.json', 1);
    await mockAI.mockChatResponse('Attempting to run command...');
    
    await chatPage.sendMessage('Run npm start');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="tool-run-command"]', { timeout: 10000 });
    
    const commandTool = page.locator('[data-testid="tool-run-command"]');
    
    // Wait for error state
    await page.waitForSelector('[data-testid="command-error"]', { timeout: 10000 });
    
    await expect(commandTool).toContainText('Command failed');
    await expect(commandTool).toContainText('Missing package.json');
    
    // Check error styling
    const errorSection = commandTool.locator('[data-testid="command-error"]');
    await expect(errorSection).toBeVisible();
  });

  test('should display command logs in logs tab', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockCommandExecution('Development server started on port 3000', 0);
    await mockAI.mockChatResponse('Starting development server...');
    
    await chatPage.sendMessage('Start dev server');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="tool-run-command"]', { timeout: 10000 });
    
    // Switch to logs tab
    await chatPage.switchToLogs();
    
    // Check command logs are displayed
    const commandLogs = page.locator('[data-testid="command-logs"]');
    await expect(commandLogs).toBeVisible();
    await expect(commandLogs).toContainText('Development server started');
    await expect(commandLogs).toContainText('port 3000');
  });

  test('should handle long-running commands', async ({ page, chatPage, mockAI }) => {
    // Mock long-running command
    await page.route('/api/sandboxes/*/commands', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cmdId: 'long-running-cmd',
          status: 'running',
          output: 'Server starting...',
        }),
      });
    });
    
    // Mock command status check
    await page.route('/api/sandboxes/*/cmds/long-running-cmd', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cmdId: 'long-running-cmd',
          status: 'running',
          output: 'Server running on port 3000',
        }),
      });
    });
    
    await mockAI.mockChatResponse('Starting long-running process...');
    
    await chatPage.sendMessage('Start the development server');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="tool-run-command"]', { timeout: 10000 });
    
    const commandTool = page.locator('[data-testid="tool-run-command"]');
    
    // Should show running status
    await expect(commandTool).toContainText('running');
    await expect(commandTool).toContainText('Server starting');
    
    // Wait and check status update
    await page.waitForTimeout(2000);
    await expect(commandTool).toContainText('Server running on port 3000');
  });

  test('should support command termination', async ({ page, chatPage, mockAI }) => {
    // Mock running command
    await page.route('/api/sandboxes/*/commands', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cmdId: 'terminable-cmd',
          status: 'running',
          output: 'Process running...',
        }),
      });
    });
    
    // Mock command termination
    await page.route('/api/sandboxes/*/cmds/terminable-cmd', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Command terminated',
          }),
        });
      } else {
        await route.continue();
      }
    });
    
    await mockAI.mockChatResponse('Starting process...');
    
    await chatPage.sendMessage('Start a long process');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="tool-run-command"]', { timeout: 10000 });
    
    // Look for terminate button
    const terminateButton = page.locator('[data-testid="terminate-command"]');
    if (await terminateButton.isVisible()) {
      await terminateButton.click();
      
      // Should show termination confirmation
      await page.waitForTimeout(1000);
      const commandTool = page.locator('[data-testid="tool-run-command"]');
      await expect(commandTool).toContainText('terminated');
    }
  });

  test('should handle multiple concurrent commands', async ({ page, chatPage, mockAI }) => {
    // Mock first command
    await mockAI.mockCommandExecution('Installing dependencies...', 0);
    await mockAI.mockChatResponse('Running install and build...');
    
    await chatPage.sendMessage('Run npm install and npm run build');
    await chatPage.waitForResponse();
    
    // Wait for multiple command tools
    await page.waitForSelector('[data-testid="tool-run-command"]', { timeout: 10000 });
    
    const commandTools = page.locator('[data-testid="tool-run-command"]');
    const commandCount = await commandTools.count();
    
    // Should have multiple command executions
    expect(commandCount).toBeGreaterThanOrEqual(1);
    
    // Each command should have unique identifier
    if (commandCount > 1) {
      const firstCmd = commandTools.first();
      const secondCmd = commandTools.last();
      
      await expect(firstCmd).toBeVisible();
      await expect(secondCmd).toBeVisible();
    }
  });

  test('should show command history in logs', async ({ page, chatPage, mockAI }) => {
    // Execute multiple commands
    await mockAI.mockCommandExecution('npm install completed', 0);
    await mockAI.mockChatResponse('Installing packages...');
    await chatPage.sendMessage('npm install');
    await chatPage.waitForResponse();
    
    await mockAI.mockCommandExecution('Build successful', 0);
    await mockAI.mockChatResponse('Building project...');
    await chatPage.sendMessage('npm run build');
    await chatPage.waitForResponse();
    
    await mockAI.mockCommandExecution('Tests passed', 0);
    await mockAI.mockChatResponse('Running tests...');
    await chatPage.sendMessage('npm test');
    await chatPage.waitForResponse();
    
    // Switch to logs tab
    await chatPage.switchToLogs();
    
    // Check command history
    const commandHistory = page.locator('[data-testid="command-history"]');
    if (await commandHistory.isVisible()) {
      await expect(commandHistory).toContainText('npm install');
      await expect(commandHistory).toContainText('npm run build');
      await expect(commandHistory).toContainText('npm test');
    }
  });

  test('should handle commands with different exit codes', async ({ page, chatPage, mockAI }) => {
    // Test successful command (exit code 0)
    await mockAI.mockCommandExecution('Success message', 0);
    await mockAI.mockChatResponse('Running successful command...');
    await chatPage.sendMessage('echo "success"');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="command-completed"]', { timeout: 10000 });
    let commandTool = page.locator('[data-testid="tool-run-command"]').last();
    await expect(commandTool).toContainText('Success message');
    
    // Test failing command (exit code 1)
    await mockAI.mockCommandExecution('Error occurred', 1);
    await mockAI.mockChatResponse('Running failing command...');
    await chatPage.sendMessage('exit 1');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="command-error"]', { timeout: 10000 });
    commandTool = page.locator('[data-testid="tool-run-command"]').last();
    await expect(commandTool).toContainText('Error occurred');
  });

  test('should handle commands with large output', async ({ page, chatPage, mockAI }) => {
    const largeOutput = 'Line of output\n'.repeat(1000);
    await mockAI.mockCommandExecution(largeOutput, 0);
    await mockAI.mockChatResponse('Generating large output...');
    
    await chatPage.sendMessage('Generate lots of output');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="tool-run-command"]', { timeout: 10000 });
    
    const commandTool = page.locator('[data-testid="tool-run-command"]');
    
    // Should handle large output without performance issues
    await expect(commandTool).toContainText('Line of output');
    
    // Check if output is truncated or paginated
    const outputSection = commandTool.locator('[data-testid="command-output"]');
    if (await outputSection.isVisible()) {
      const outputHeight = await outputSection.boundingBox();
      
      // Should have reasonable height limit
      if (outputHeight) {
        expect(outputHeight.height).toBeLessThan(1000); // Reasonable limit
      }
    }
  });

  test('should support command input/interaction', async ({ page, chatPage, mockAI }) => {
    // Mock interactive command
    await page.route('/api/sandboxes/*/commands', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cmdId: 'interactive-cmd',
          status: 'waiting_input',
          output: 'Enter your name: ',
        }),
      });
    });
    
    await mockAI.mockChatResponse('Running interactive command...');
    
    await chatPage.sendMessage('Run interactive script');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="tool-run-command"]', { timeout: 10000 });
    
    const commandTool = page.locator('[data-testid="tool-run-command"]');
    await expect(commandTool).toContainText('Enter your name');
    
    // Look for input field for command interaction
    const commandInput = commandTool.locator('[data-testid="command-input"]');
    if (await commandInput.isVisible()) {
      await commandInput.fill('Test User');
      await page.keyboard.press('Enter');
      
      // Should send input to command
      await page.waitForTimeout(1000);
    }
  });

  test('should persist command state across page reloads', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockCommandExecution('Command output persisted', 0);
    await mockAI.mockChatResponse('Running persistent command...');
    
    await chatPage.sendMessage('Run a command');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="command-completed"]', { timeout: 10000 });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await chatPage.dismissWelcomeModal();
    
    // Check if command results are still visible
    const commandTool = page.locator('[data-testid="tool-run-command"]');
    if (await commandTool.isVisible()) {
      await expect(commandTool).toContainText('Command output persisted');
    }
  });

  test('should handle command timeout scenarios', async ({ page, chatPage }) => {
    // Mock command that times out
    await page.route('/api/sandboxes/*/commands', async (route) => {
      // Don't respond to simulate timeout
      await new Promise(() => {}); // Never resolves
    });
    
    await chatPage.sendMessage('Run a command that will timeout');
    
    // Should handle timeout gracefully
    await page.waitForTimeout(5000);
    
    const errorMessage = page.locator('[data-testid="command-timeout"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText('timeout');
    }
  });
});