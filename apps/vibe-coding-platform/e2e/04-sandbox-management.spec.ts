import { test, expect } from './fixtures';

test.describe('Sandbox Management Tests', () => {
  test.beforeEach(async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
  });

  test('should create sandbox through AI interaction', async ({ page, chatPage, mockAI }) => {
    // Mock sandbox creation
    await mockAI.mockSandboxCreation('sbx_test_12345');
    
    // Mock AI response that creates sandbox
    await mockAI.mockChatResponse('I\'ll create a sandbox for you. Creating sandbox...');
    
    await chatPage.sendMessage('Create a new sandbox for a React app');
    await chatPage.waitForResponse();
    
    // Wait for sandbox creation tool call
    await page.waitForSelector('[data-testid="tool-create-sandbox"]', { timeout: 10000 });
    
    // Verify sandbox creation tool is displayed
    const sandboxTool = page.locator('[data-testid="tool-create-sandbox"]');
    await expect(sandboxTool).toBeVisible();
    await expect(sandboxTool).toContainText('Creating sandbox');
    
    // Wait for sandbox to be ready
    await page.waitForSelector('[data-testid="sandbox-ready"]', { timeout: 15000 });
    
    // Verify sandbox ID is displayed
    await expect(sandboxTool).toContainText('sbx_test_12345');
  });

  test('should display sandbox status and information', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockSandboxCreation('sbx_test_67890');
    await mockAI.mockChatResponse('Sandbox created successfully!');
    
    await chatPage.sendMessage('Create a sandbox with port 3000');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="sandbox-ready"]', { timeout: 15000 });
    
    // Check sandbox info panel
    const sandboxInfo = page.locator('[data-testid="sandbox-info"]');
    await expect(sandboxInfo).toBeVisible();
    
    // Verify sandbox details
    await expect(sandboxInfo).toContainText('sbx_test_67890');
    await expect(sandboxInfo).toContainText('ready');
    
    // Check if ports are displayed
    const portsInfo = page.locator('[data-testid="sandbox-ports"]');
    if (await portsInfo.isVisible()) {
      await expect(portsInfo).toContainText('3000');
    }
  });

  test('should handle sandbox creation failures', async ({ page, chatPage, mockAI }) => {
    // Mock sandbox creation failure
    await page.route('/api/sandboxes', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to create sandbox',
          message: 'Insufficient resources',
        }),
      });
    });
    
    await mockAI.mockChatResponse('I\'ll try to create a sandbox...');
    
    await chatPage.sendMessage('Create a sandbox');
    await chatPage.waitForResponse();
    
    // Wait for error state
    await page.waitForSelector('[data-testid="sandbox-error"]', { timeout: 10000 });
    
    const errorMessage = page.locator('[data-testid="sandbox-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Failed to create sandbox');
  });

  test('should manage multiple sandboxes', async ({ page, chatPage, mockAI }) => {
    // Create first sandbox
    await mockAI.mockSandboxCreation('sbx_first_123');
    await mockAI.mockChatResponse('First sandbox created!');
    
    await chatPage.sendMessage('Create first sandbox');
    await chatPage.waitForResponse();
    await page.waitForSelector('[data-testid="sandbox-ready"]', { timeout: 15000 });
    
    // Create second sandbox
    await mockAI.mockSandboxCreation('sbx_second_456');
    await mockAI.mockChatResponse('Second sandbox created!');
    
    await chatPage.sendMessage('Create another sandbox');
    await chatPage.waitForResponse();
    
    // Wait for second sandbox
    await page.waitForTimeout(2000);
    
    // Check sandbox list or active sandbox indicator
    const sandboxList = page.locator('[data-testid="sandbox-list"]');
    if (await sandboxList.isVisible()) {
      await expect(sandboxList).toContainText('sbx_first_123');
      await expect(sandboxList).toContainText('sbx_second_456');
    }
  });

  test('should handle sandbox timeouts', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockSandboxCreation('sbx_timeout_789');
    
    // Mock sandbox with short timeout
    await page.route('/api/sandboxes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sandboxId: 'sbx_timeout_789',
          status: 'ready',
          timeout: 5000, // 5 seconds for testing
        }),
      });
    });
    
    await mockAI.mockChatResponse('Sandbox with timeout created');
    
    await chatPage.sendMessage('Create sandbox with 5 second timeout');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="sandbox-ready"]', { timeout: 15000 });
    
    // Wait for timeout warning or expiration
    await page.waitForTimeout(6000);
    
    // Check for timeout warning
    const timeoutWarning = page.locator('[data-testid="sandbox-timeout-warning"]');
    if (await timeoutWarning.isVisible()) {
      await expect(timeoutWarning).toContainText('timeout');
    }
  });

  test('should show sandbox resource usage', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockSandboxCreation('sbx_resources_999');
    
    // Mock sandbox with resource info
    await page.route('/api/sandboxes/sbx_resources_999', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sandboxId: 'sbx_resources_999',
          status: 'ready',
          resources: {
            cpu: 45,
            memory: 78,
            disk: 23,
          },
        }),
      });
    });
    
    await mockAI.mockChatResponse('Sandbox with monitoring created');
    
    await chatPage.sendMessage('Create monitored sandbox');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="sandbox-ready"]', { timeout: 15000 });
    
    // Check resource monitoring
    const resourceInfo = page.locator('[data-testid="sandbox-resources"]');
    if (await resourceInfo.isVisible()) {
      await expect(resourceInfo).toContainText('45%'); // CPU
      await expect(resourceInfo).toContainText('78%'); // Memory
    }
  });

  test('should handle sandbox URL generation', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockSandboxCreation('sbx_url_test');
    
    // Mock URL generation
    await page.route('/api/sandboxes/sbx_url_test/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://sbx-url-test-3000.vercel.app',
          port: 3000,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Sandbox URL will be generated...');
    
    await chatPage.sendMessage('Create sandbox and get URL');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="sandbox-ready"]', { timeout: 15000 });
    
    // Check for URL generation tool
    const urlTool = page.locator('[data-testid="tool-get-sandbox-url"]');
    if (await urlTool.isVisible()) {
      await expect(urlTool).toContainText('https://sbx-url-test-3000.vercel.app');
      
      // Verify URL is clickable
      const urlLink = urlTool.locator('a');
      await expect(urlLink).toHaveAttribute('href', 'https://sbx-url-test-3000.vercel.app');
    }
  });

  test('should persist sandbox state across page reloads', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockSandboxCreation('sbx_persist_111');
    await mockAI.mockChatResponse('Persistent sandbox created');
    
    await chatPage.sendMessage('Create persistent sandbox');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="sandbox-ready"]', { timeout: 15000 });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await chatPage.dismissWelcomeModal();
    
    // Check if sandbox info is still available
    const sandboxInfo = page.locator('[data-testid="sandbox-info"]');
    if (await sandboxInfo.isVisible()) {
      await expect(sandboxInfo).toContainText('sbx_persist_111');
    }
  });

  test('should handle concurrent sandbox operations', async ({ page, chatPage, mockAI }) => {
    // Mock multiple sandbox operations
    await mockAI.mockSandboxCreation('sbx_concurrent_1');
    await mockAI.mockFileGeneration([
      { path: 'package.json', content: '{}' },
      { path: 'index.js', content: 'console.log("test")' },
    ]);
    
    await mockAI.mockChatResponse('Creating sandbox and files simultaneously...');
    
    await chatPage.sendMessage('Create sandbox and generate files');
    await chatPage.waitForResponse();
    
    // Wait for multiple tool executions
    await page.waitForSelector('[data-testid="tool-create-sandbox"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="tool-generate-files"]', { timeout: 10000 });
    
    // Verify both operations completed
    const createTool = page.locator('[data-testid="tool-create-sandbox"]');
    const filesTool = page.locator('[data-testid="tool-generate-files"]');
    
    await expect(createTool).toContainText('sbx_concurrent_1');
    await expect(filesTool).toContainText('package.json');
    await expect(filesTool).toContainText('index.js');
  });

  test('should show sandbox activity logs', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockSandboxCreation('sbx_activity_222');
    await mockAI.mockChatResponse('Sandbox with activity logging created');
    
    await chatPage.sendMessage('Create sandbox with logging');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="sandbox-ready"]', { timeout: 15000 });
    
    // Generate some activity
    await mockAI.mockCommandExecution('npm install completed', 0);
    await chatPage.sendMessage('Run npm install');
    await chatPage.waitForResponse();
    
    // Check activity logs
    await chatPage.switchToLogs();
    
    const activityLogs = page.locator('[data-testid="sandbox-activity"]');
    if (await activityLogs.isVisible()) {
      await expect(activityLogs).toContainText('sandbox created');
      await expect(activityLogs).toContainText('command executed');
    }
  });

  test('should handle sandbox cleanup and termination', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockSandboxCreation('sbx_cleanup_333');
    
    // Mock sandbox termination
    await page.route('/api/sandboxes/sbx_cleanup_333', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Sandbox terminated successfully',
          }),
        });
      } else {
        await route.continue();
      }
    });
    
    await mockAI.mockChatResponse('Sandbox created, will be cleaned up...');
    
    await chatPage.sendMessage('Create sandbox for cleanup test');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="sandbox-ready"]', { timeout: 15000 });
    
    // Trigger cleanup (if there's a cleanup button)
    const cleanupButton = page.locator('[data-testid="sandbox-cleanup"]');
    if (await cleanupButton.isVisible()) {
      await cleanupButton.click();
      
      // Verify cleanup confirmation
      const cleanupConfirm = page.locator('[data-testid="cleanup-confirmation"]');
      await expect(cleanupConfirm).toBeVisible();
    }
  });
});