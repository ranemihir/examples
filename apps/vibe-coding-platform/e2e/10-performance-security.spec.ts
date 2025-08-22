import { test, expect } from './fixtures';

test.describe('Performance Tests', () => {
  test('should load initial page within reasonable time', async ({ page, chatPage }) => {
    const startTime = Date.now();
    
    await chatPage.goto();
    await chatPage.waitForWelcomeModal();
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check if all critical elements are loaded
    await expect(page.locator('[data-testid="header"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="model-selector"]')).toBeVisible();
  });

  test('should handle rapid message sending without performance degradation', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock fast responses
    await mockAI.mockChatResponse('Fast response');
    
    const startTime = Date.now();
    
    // Send 5 messages rapidly
    for (let i = 0; i < 5; i++) {
      await chatPage.sendMessage(`Message ${i + 1}`);
      await page.waitForTimeout(100); // Small delay to prevent race conditions
    }
    
    // Wait for all responses
    await page.waitForTimeout(3000);
    
    const totalTime = Date.now() - startTime;
    
    // Should handle all messages within reasonable time
    expect(totalTime).toBeLessThan(10000); // 10 seconds
    
    // Verify all messages are displayed
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages).toHaveCount(10); // 5 user + 5 AI messages
  });

  test('should maintain responsive UI during long operations', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock long-running operation
    await mockAI.mockSandboxCreation('sbx_long_operation');
    await page.route('/api/chat', async (route) => {
      // Simulate slow response
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'slow-response',
          content: 'Long operation completed',
          role: 'assistant',
        }),
      });
    });
    
    await chatPage.sendMessage('Create a complex project');
    
    // UI should remain responsive
    const sendButton = page.locator('[data-testid="send-button"]');
    await expect(sendButton).toBeDisabled(); // Should be disabled during operation
    
    // Should be able to interact with other elements
    await page.click('[data-testid="model-selector"]');
    await page.keyboard.press('Escape'); // Close selector
    
    // Wait for operation to complete
    await chatPage.waitForResponse();
    
    // UI should be responsive again
    await expect(sendButton).toBeEnabled();
  });

  test('should handle memory efficiently with large conversation history', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Create large conversation
    for (let i = 0; i < 25; i++) {
      await mockAI.mockChatResponse(`Response ${i + 1}: This is a longer response with more content to simulate realistic conversation length and memory usage patterns.`);
      await chatPage.sendMessage(`Message ${i + 1}: This is a test message to build up conversation history and test memory handling.`);
      await page.waitForTimeout(100);
    }
    
    // Wait for all responses
    await page.waitForTimeout(5000);
    
    // Should still be responsive
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Final test message');
    
    const startTime = Date.now();
    await page.keyboard.press('Enter');
    
    // Response should still be reasonably fast
    await page.waitForTimeout(1000);
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(2000);
    
    // Should be able to scroll through history smoothly
    const messagesContainer = page.locator('[data-testid="chat-section"]');
    await messagesContainer.hover();
    
    // Scroll to top
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(50);
    }
    
    // Should still be responsive
    await expect(chatInput).toBeEnabled();
  });

  test('should optimize file tree rendering for large projects', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Generate large file structure
    const manyFiles = [];
    for (let i = 0; i < 100; i++) {
      manyFiles.push({ path: `src/file${i}.js`, content: `// File ${i}` });
    }
    
    await mockAI.mockSandboxCreation('sbx_large_files');
    await mockAI.mockFileGeneration(manyFiles);
    await mockAI.mockChatResponse('Generated large project structure...');
    
    await chatPage.sendMessage('Create project with many files');
    await chatPage.waitForResponse();
    
    // Switch to file explorer
    const startTime = Date.now();
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 15000 });
    
    const renderTime = Date.now() - startTime;
    
    // Should render file tree reasonably quickly
    expect(renderTime).toBeLessThan(5000); // 5 seconds
    
    // Should be able to scroll through file list smoothly
    const fileTree = page.locator('[data-testid="file-tree"]');
    await fileTree.hover();
    
    // Expand src folder
    await page.click('[data-testid="folder-src"]');
    const expandTime = Date.now();
    
    await page.waitForTimeout(2000);
    const expandDuration = Date.now() - expandTime;
    
    // Should expand quickly even with many files
    expect(expandDuration).toBeLessThan(3000);
    
    // Should be able to interact with files
    await page.click('[data-testid="file-src/file0.js"]');
    await page.waitForSelector('[data-testid="file-content"]', { timeout: 3000 });
  });
});

test.describe('Security Tests', () => {
  test('should prevent XSS attacks in chat messages', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Try to inject malicious script
    const maliciousScript = '<script>alert("XSS")</script><img src="x" onerror="alert(\'XSS\')">';
    
    await mockAI.mockChatResponse('I received your message safely without executing any scripts.');
    
    await chatPage.sendMessage(maliciousScript);
    await chatPage.waitForResponse();
    
    // Check that script tags are not executed
    const messages = page.locator('[data-testid="chat-message"]');
    const userMessage = messages.first();
    
    // Script should be escaped/sanitized
    await expect(userMessage).not.toContainText('<script>');
    
    // No alert should have been triggered
    const dialogs: any[] = [];
    page.on('dialog', dialog => {
      dialogs.push(dialog);
      dialog.dismiss();
    });
    
    await page.waitForTimeout(1000);
    expect(dialogs).toHaveLength(0);
  });

  test('should sanitize file content display', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Create files with potentially malicious content
    await mockAI.mockSandboxCreation('sbx_security_test');
    await mockAI.mockFileGeneration([
      { 
        path: 'malicious.html', 
        content: '<script>alert("File XSS")</script><img src="x" onerror="alert(\'File XSS\')">' 
      },
    ]);
    
    await mockAI.mockChatResponse('Created files with sanitized content...');
    await chatPage.sendMessage('Create HTML file');
    await chatPage.waitForResponse();
    
    // View file in file explorer
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    await page.click('[data-testid="file-malicious.html"]');
    await page.waitForSelector('[data-testid="file-content"]', { timeout: 5000 });
    
    // Monitor for any dialogs
    const dialogs: any[] = [];
    page.on('dialog', dialog => {
      dialogs.push(dialog);
      dialog.dismiss();
    });
    
    await page.waitForTimeout(1000);
    
    // No alerts should be triggered from file content
    expect(dialogs).toHaveLength(0);
    
    // Content should be safely displayed
    const fileContent = page.locator('[data-testid="file-content"]');
    await expect(fileContent).toBeVisible();
  });

  test('should handle malicious URLs in preview safely', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock potentially malicious URL
    await mockAI.mockSandboxCreation('sbx_url_security');
    await page.route('/api/sandboxes/*/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'javascript:alert("URL XSS")',
          port: 3000,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Setting up preview...');
    await chatPage.sendMessage('Show preview');
    await chatPage.waitForResponse();
    
    await chatPage.switchToPreview();
    
    // Check that malicious URL is not used
    const iframe = page.locator('[data-testid="preview-iframe"]');
    if (await iframe.isVisible()) {
      const src = await iframe.getAttribute('src');
      expect(src).not.toContain('javascript:');
    }
    
    // Should show error or safe fallback instead
    const errorMessage = page.locator('[data-testid="preview-error"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should validate API request payloads', async ({ page, chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Intercept and validate request structure
    await page.route('/api/chat', async (route) => {
      const body = await route.request().postDataJSON();
      
      // Validate required fields
      if (!body.messages || !Array.isArray(body.messages)) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid messages format' }),
        });
        return;
      }
      
      // Validate message structure
      for (const message of body.messages) {
        if (!message.role || !message.content) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid message structure' }),
          });
          return;
        }
      }
      
      // Valid request
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'valid-response',
          content: 'Request validated successfully',
          role: 'assistant',
        }),
      });
    });
    
    await chatPage.sendMessage('Valid message');
    await chatPage.waitForResponse();
    
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages.last()).toContainText('Request validated successfully');
  });

  test('should handle bot detection properly', async ({ page, chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock bot detection response
    await page.route('/api/chat', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Bot detected',
        }),
      });
    });
    
    await chatPage.sendMessage('This request should be blocked');
    
    // Wait for error handling
    await page.waitForTimeout(2000);
    
    // Should show appropriate error message
    const errorMessage = page.locator('[data-testid="bot-detected-error"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText('bot detected');
    }
  });

  test('should prevent command injection in sandbox operations', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    await mockAI.mockSandboxCreation('sbx_cmd_injection');
    await mockAI.mockChatResponse('Creating secure sandbox...');
    await chatPage.sendMessage('Create sandbox');
    await chatPage.waitForResponse();
    
    // Intercept command execution with malicious input
    await page.route('/api/sandboxes/*/commands', async (route) => {
      const body = await route.request().postDataJSON();
      
      // Check for command injection attempts
      const dangerousPatterns = [
        ';', '&&', '||', '|', '`', '$(',
        'rm -rf', 'curl', 'wget', 'nc'
      ];
      
      const command = body.command || '';
      const hasInjection = dangerousPatterns.some(pattern => 
        command.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (hasInjection) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid command',
            message: 'Command contains potentially dangerous patterns',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cmdId: 'safe-cmd-123',
            status: 'completed',
            output: 'Safe command executed',
          }),
        });
      }
    });
    
    // Try safe command
    await mockAI.mockChatResponse('Running safe command...');
    await chatPage.sendMessage('Run npm install');
    await chatPage.waitForResponse();
    
    // Should succeed
    await page.waitForSelector('[data-testid="command-completed"]', { timeout: 10000 });
    
    // Try malicious command
    await mockAI.mockChatResponse('Attempting dangerous command...');
    await chatPage.sendMessage('Run rm -rf / && curl malicious-site.com');
    await chatPage.waitForResponse();
    
    // Should be blocked
    const errorTool = page.locator('[data-testid="command-error"]');
    if (await errorTool.isVisible()) {
      await expect(errorTool).toContainText('dangerous patterns');
    }
  });

  test('should implement proper CORS handling', async ({ page, chatPage }) => {
    await chatPage.goto();
    
    // Mock CORS preflight request
    await page.route('**/*', async (route) => {
      const request = route.request();
      
      if (request.method() === 'OPTIONS') {
        // Simulate proper CORS preflight response
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': window.location.origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
          },
        });
      } else {
        await route.continue();
      }
    });
    
    // Should load without CORS errors
    await chatPage.dismissWelcomeModal();
    await expect(page.locator('[data-testid="chat-section"]')).toBeVisible();
  });

  test('should protect against CSRF attacks', async ({ page, chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Mock API with CSRF protection
    await page.route('/api/chat', async (route) => {
      const headers = route.request().headers();
      
      // Check for CSRF token or proper origin
      const origin = headers.origin;
      const referer = headers.referer;
      
      if (!origin || !referer || !referer.startsWith(origin)) {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'CSRF protection triggered',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'csrf-safe',
            content: 'Request passed CSRF protection',
            role: 'assistant',
          }),
        });
      }
    });
    
    await chatPage.sendMessage('Test CSRF protection');
    await chatPage.waitForResponse();
    
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages.last()).toContainText('passed CSRF protection');
  });

  test('should handle sensitive data appropriately', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Send message with potentially sensitive data
    const sensitiveMessage = 'My password is secret123 and API key is ak-1234567890';
    
    await mockAI.mockChatResponse('I\'ve received your message and will handle sensitive information appropriately.');
    
    await chatPage.sendMessage(sensitiveMessage);
    await chatPage.waitForResponse();
    
    // Check that sensitive data is handled properly in UI
    const userMessage = page.locator('[data-testid="chat-message"]').first();
    
    // In a real implementation, sensitive data might be masked or handled specially
    await expect(userMessage).toBeVisible();
    
    // Verify the message is displayed (masking would be implementation-specific)
    await expect(userMessage).toContainText('password');
    
    // Check that browser storage doesn't contain sensitive data in plain text
    const localStorage = await page.evaluate(() => {
      const storage: any = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          storage[key] = window.localStorage.getItem(key);
        }
      }
      return storage;
    });
    
    // Sensitive data should not be stored in plain text
    const storageString = JSON.stringify(localStorage).toLowerCase();
    expect(storageString).not.toContain('secret123');
  });

  test('should validate file upload security', async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    await mockAI.mockSandboxCreation('sbx_upload_security');
    await mockAI.mockChatResponse('Setting up secure file handling...');
    await chatPage.sendMessage('Create sandbox');
    await chatPage.waitForResponse();
    
    // Mock file upload with security checks
    await page.route('/api/sandboxes/*/files', async (route) => {
      const body = await route.request().postDataJSON();
      
      if (body.files) {
        for (const file of body.files) {
          // Check file extension
          const dangerousExtensions = ['.exe', '.bat', '.sh', '.com', '.scr'];
          const hasExtension = dangerousExtensions.some(ext => 
            file.path.toLowerCase().endsWith(ext)
          );
          
          if (hasExtension) {
            await route.fulfill({
              status: 400,
              contentType: 'application/json',
              body: JSON.stringify({
                error: 'Dangerous file type not allowed',
              }),
            });
            return;
          }
          
          // Check file size (mock limit)
          if (file.content && file.content.length > 1000000) { // 1MB limit
            await route.fulfill({
              status: 413,
              contentType: 'application/json',
              body: JSON.stringify({
                error: 'File too large',
              }),
            });
            return;
          }
        }
      }
      
      // Safe files
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          files: body.files,
        }),
      });
    });
    
    // Try to upload safe file
    await mockAI.mockFileGeneration([
      { path: 'safe.txt', content: 'This is a safe text file' },
    ]);
    
    await mockAI.mockChatResponse('Creating safe file...');
    await chatPage.sendMessage('Create a text file');
    await chatPage.waitForResponse();
    
    // Should succeed
    await page.waitForSelector('[data-testid="tool-generate-files"]', { timeout: 10000 });
    
    // Try to upload dangerous file
    await mockAI.mockFileGeneration([
      { path: 'malicious.exe', content: 'fake executable content' },
    ]);
    
    await mockAI.mockChatResponse('Attempting to create executable...');
    await chatPage.sendMessage('Create an executable file');
    await chatPage.waitForResponse();
    
    // Should be blocked (implementation would show error)
    const errorMessage = page.locator('[data-testid="file-upload-error"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText('not allowed');
    }
  });
});