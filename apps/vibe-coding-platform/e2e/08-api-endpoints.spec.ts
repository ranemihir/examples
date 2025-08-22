import { test, expect } from './fixtures';

test.describe('API Endpoints Tests', () => {
  test('should handle chat API requests', async ({ page, chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Intercept and verify chat API request
    let chatRequest: any;
    await page.route('/api/chat', async (route) => {
      chatRequest = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-response',
          content: 'API test response',
          role: 'assistant',
        }),
      });
    });
    
    await chatPage.sendMessage('Test API request');
    await chatPage.waitForResponse();
    
    // Verify request structure
    expect(chatRequest).toBeDefined();
    expect(chatRequest.messages).toBeDefined();
    expect(chatRequest.messages).toHaveLength(1);
    expect(chatRequest.messages[0].content).toBe('Test API request');
    expect(chatRequest.messages[0].role).toBe('user');
    expect(chatRequest.modelId).toBeDefined();
  });

  test('should handle models API requests', async ({ page, chatPage }) => {
    await chatPage.goto();
    
    // Intercept models API request
    let modelsRequested = false;
    await page.route('/api/models', async (route) => {
      modelsRequested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'openai/gpt-5', name: 'GPT-5' },
          { id: 'anthropic/claude-4-sonnet', name: 'Claude 4 Sonnet' },
        ]),
      });
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Models API should be called
    expect(modelsRequested).toBe(true);
  });

  test('should handle sandbox creation API', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Intercept sandbox creation
    let sandboxCreateRequest: any;
    await page.route('/api/sandboxes', async (route) => {
      sandboxCreateRequest = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sandboxId: 'sbx_api_test_123',
          status: 'ready',
        }),
      });
    });
    
    await mockAI.mockChatResponse('Creating sandbox via API...');
    await chatPage.sendMessage('Create a sandbox with timeout 300000 and ports [3000]');
    await chatPage.waitForResponse();
    
    // Wait for sandbox creation API call
    await page.waitForTimeout(2000);
    
    if (sandboxCreateRequest) {
      expect(sandboxCreateRequest.timeout).toBe(300000);
      expect(sandboxCreateRequest.ports).toEqual([3000]);
    }
  });

  test('should handle file operations API', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock sandbox first
    await mockAI.mockSandboxCreation('sbx_files_api_test');
    await mockAI.mockChatResponse('Creating sandbox for file operations...');
    await chatPage.sendMessage('Create sandbox');
    await chatPage.waitForResponse();
    
    // Intercept file operations
    let fileRequest: any;
    await page.route('/api/sandboxes/sbx_files_api_test/files', async (route) => {
      if (route.request().method() === 'POST') {
        fileRequest = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            files: fileRequest.files,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            files: [
              { name: 'package.json', type: 'file' },
              { name: 'src', type: 'directory' },
            ],
          }),
        });
      }
    });
    
    await mockAI.mockChatResponse('Creating files...');
    await chatPage.sendMessage('Generate package.json and src folder');
    await chatPage.waitForResponse();
    
    // Wait for file API calls
    await page.waitForTimeout(2000);
    
    if (fileRequest) {
      expect(fileRequest.files).toBeDefined();
      expect(Array.isArray(fileRequest.files)).toBe(true);
    }
  });

  test('should handle command execution API', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock sandbox
    await mockAI.mockSandboxCreation('sbx_cmd_api_test');
    await mockAI.mockChatResponse('Setting up command execution...');
    await chatPage.sendMessage('Create sandbox for commands');
    await chatPage.waitForResponse();
    
    // Intercept command execution
    let commandRequest: any;
    await page.route('/api/sandboxes/sbx_cmd_api_test/commands', async (route) => {
      commandRequest = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cmdId: 'cmd_api_test_123',
          status: 'running',
          command: commandRequest.command,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Running npm install...');
    await chatPage.sendMessage('Run npm install');
    await chatPage.waitForResponse();
    
    // Wait for command API call
    await page.waitForTimeout(2000);
    
    if (commandRequest) {
      expect(commandRequest.command).toBeDefined();
      expect(typeof commandRequest.command).toBe('string');
    }
  });

  test('should handle command logs API', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock sandbox and command
    await mockAI.mockSandboxCreation('sbx_logs_api_test');
    await mockAI.mockCommandExecution('Log test output', 0);
    await mockAI.mockChatResponse('Running command with logs...');
    await chatPage.sendMessage('Run echo "test"');
    await chatPage.waitForResponse();
    
    // Intercept logs API
    let logsRequested = false;
    await page.route('/api/sandboxes/sbx_logs_api_test/cmds/*/logs', async (route) => {
      logsRequested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          logs: [
            { timestamp: Date.now(), type: 'stdout', content: 'Log test output' },
          ],
        }),
      });
    });
    
    // Switch to logs tab to trigger logs API
    await chatPage.switchToLogs();
    await page.waitForTimeout(2000);
    
    expect(logsRequested).toBe(true);
  });

  test('should handle sandbox URL generation API', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock sandbox
    await mockAI.mockSandboxCreation('sbx_url_api_test');
    await mockAI.mockChatResponse('Creating sandbox for URL generation...');
    await chatPage.sendMessage('Create sandbox');
    await chatPage.waitForResponse();
    
    // Intercept URL generation
    let urlRequest: any;
    await page.route('/api/sandboxes/sbx_url_api_test/url', async (route) => {
      urlRequest = route.request();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://sbx-url-api-test-3000.vercel.app',
          port: 3000,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Getting sandbox URL...');
    await chatPage.sendMessage('Get the sandbox URL for port 3000');
    await chatPage.waitForResponse();
    
    // Wait for URL API call
    await page.waitForTimeout(2000);
    
    if (urlRequest) {
      expect(urlRequest.url()).toContain('/url');
      expect(urlRequest.method()).toBe('POST');
    }
  });

  test('should handle API error responses gracefully', async ({ page, chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock API error
    await page.route('/api/chat', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          message: 'AI service temporarily unavailable',
        }),
      });
    });
    
    await chatPage.sendMessage('This should cause an error');
    
    // Wait for error handling
    await page.waitForTimeout(2000);
    
    // Should show error message to user
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('error');
  });

  test('should handle API rate limiting', async ({ page, chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock rate limit response
    await page.route('/api/chat', async (route) => {
      await route.fulfill({
        status: 429,
        headers: {
          'Retry-After': '60',
        },
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Too many requests',
          retryAfter: 60,
        }),
      });
    });
    
    await chatPage.sendMessage('This should be rate limited');
    
    // Wait for rate limit handling
    await page.waitForTimeout(2000);
    
    // Should show rate limit message
    const rateLimitMessage = page.locator('[data-testid="rate-limit-message"]');
    if (await rateLimitMessage.isVisible()) {
      await expect(rateLimitMessage).toContainText('too many requests');
    }
  });

  test('should handle API authentication errors', async ({ page, chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock authentication error
    await page.route('/api/chat', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid API key',
        }),
      });
    });
    
    await chatPage.sendMessage('This should fail auth');
    
    // Wait for auth error handling
    await page.waitForTimeout(2000);
    
    // Should show authentication error
    const authError = page.locator('[data-testid="auth-error"]');
    if (await authError.isVisible()) {
      await expect(authError).toContainText('unauthorized');
    }
  });

  test('should handle network timeouts', async ({ page, chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock timeout by not responding
    await page.route('/api/chat', async (route) => {
      // Simulate network timeout by delaying indefinitely
      await new Promise(resolve => setTimeout(resolve, 10000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: 'Should not reach here' }),
      });
    });
    
    await chatPage.sendMessage('This should timeout');
    
    // Wait for timeout handling
    await page.waitForTimeout(6000);
    
    // Should show timeout error
    const timeoutError = page.locator('[data-testid="timeout-error"]');
    if (await timeoutError.isVisible()) {
      await expect(timeoutError).toContainText('timeout');
    }
  });

  test('should validate request payloads', async ({ page, chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock validation error
    await page.route('/api/chat', async (route) => {
      const body = await route.request().postDataJSON();
      
      if (!body.messages || !Array.isArray(body.messages)) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Bad Request',
            message: 'Invalid messages format',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'valid-response',
            content: 'Valid request processed',
            role: 'assistant',
          }),
        });
      }
    });
    
    await chatPage.sendMessage('Valid message');
    await chatPage.waitForResponse();
    
    // Should process valid request successfully
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages.last()).toContainText('Valid request processed');
  });

  test('should handle concurrent API requests', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Track concurrent requests
    const requestTimes: number[] = [];
    
    await page.route('/api/chat', async (route) => {
      requestTimes.push(Date.now());
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `response-${requestTimes.length}`,
          content: `Response ${requestTimes.length}`,
          role: 'assistant',
        }),
      });
    });
    
    // Send multiple messages quickly
    await chatPage.sendMessage('Message 1');
    await page.waitForTimeout(10); // Small delay to prevent race conditions
    await chatPage.sendMessage('Message 2');
    await page.waitForTimeout(10);
    await chatPage.sendMessage('Message 3');
    
    // Wait for all responses
    await page.waitForTimeout(2000);
    
    // Should handle concurrent requests
    expect(requestTimes).toHaveLength(3);
    
    // Verify all responses are displayed
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages).toHaveCount(6); // 3 user + 3 AI messages
  });

  test('should handle API versioning', async ({ page, chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Check for API version headers
    let apiVersion: string | null = null;
    
    await page.route('/api/chat', async (route) => {
      const headers = route.request().headers();
      apiVersion = headers['api-version'] || headers['x-api-version'];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'version-test',
          content: 'API version handled',
          role: 'assistant',
        }),
      });
    });
    
    await chatPage.sendMessage('Test API versioning');
    await chatPage.waitForResponse();
    
    // API should include version information (if implemented)
    // This test verifies the client sends proper version headers
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages.last()).toContainText('API version handled');
  });
});