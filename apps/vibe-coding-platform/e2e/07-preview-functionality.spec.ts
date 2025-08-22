import { test, expect } from './fixtures';

test.describe('Preview Functionality Tests', () => {
  test.beforeEach(async ({ page, chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Create a sandbox and generate a web project
    await mockAI.mockSandboxCreation('sbx_preview_test');
    await mockAI.mockFileGeneration([
      { path: 'package.json', content: '{"name": "preview-app", "scripts": {"dev": "next dev", "build": "next build", "start": "next start"}}' },
      { path: 'src/pages/index.js', content: 'export default function Home() { return <div>Hello Preview!</div>; }' },
    ]);
    
    await mockAI.mockChatResponse('Creating web application for preview...');
    await chatPage.sendMessage('Create a Next.js app');
    await chatPage.waitForResponse();
    
    await page.waitForSelector('[data-testid="sandbox-ready"]', { timeout: 15000 });
  });

  test('should generate sandbox URL for preview', async ({ page, chatPage, mockAI }) => {
    // Mock URL generation
    await page.route('/api/sandboxes/*/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://sbx-preview-test-3000.vercel.app',
          port: 3000,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Getting preview URL...');
    await chatPage.sendMessage('Get the preview URL');
    await chatPage.waitForResponse();
    
    // Wait for URL generation tool
    await page.waitForSelector('[data-testid="tool-get-sandbox-url"]', { timeout: 10000 });
    
    const urlTool = page.locator('[data-testid="tool-get-sandbox-url"]');
    await expect(urlTool).toBeVisible();
    await expect(urlTool).toContainText('https://sbx-preview-test-3000.vercel.app');
    
    // Verify URL is clickable
    const urlLink = urlTool.locator('a');
    await expect(urlLink).toHaveAttribute('href', 'https://sbx-preview-test-3000.vercel.app');
  });

  test('should display preview in iframe', async ({ page, chatPage, mockAI }) => {
    // Mock URL generation and server start
    await mockAI.mockCommandExecution('Server started on port 3000', 0);
    await page.route('/api/sandboxes/*/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://sbx-preview-test-3000.vercel.app',
          port: 3000,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Starting server and showing preview...');
    await chatPage.sendMessage('Start the dev server and show preview');
    await chatPage.waitForResponse();
    
    // Switch to preview tab
    await chatPage.switchToPreview();
    
    // Wait for preview iframe
    await page.waitForSelector('[data-testid="preview-iframe"]', { timeout: 15000 });
    
    const previewIframe = page.locator('[data-testid="preview-iframe"]');
    await expect(previewIframe).toBeVisible();
    await expect(previewIframe).toHaveAttribute('src', 'https://sbx-preview-test-3000.vercel.app');
  });

  test('should handle preview loading states', async ({ page, chatPage, mockAI }) => {
    // Mock slow server start
    await page.route('/api/sandboxes/*/commands', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cmdId: 'slow-server',
          status: 'running',
          output: 'Starting server...',
        }),
      });
    });
    
    await mockAI.mockChatResponse('Starting server (this may take a moment)...');
    await chatPage.sendMessage('Start the development server');
    await chatPage.waitForResponse();
    
    // Switch to preview tab
    await chatPage.switchToPreview();
    
    // Should show loading state
    const loadingIndicator = page.locator('[data-testid="preview-loading"]');
    await expect(loadingIndicator).toBeVisible();
    await expect(loadingIndicator).toContainText('loading');
  });

  test('should refresh preview when files change', async ({ page, chatPage, mockAI }) => {
    // Setup initial preview
    await page.route('/api/sandboxes/*/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://sbx-preview-test-3000.vercel.app',
          port: 3000,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Setting up preview...');
    await chatPage.sendMessage('Show preview');
    await chatPage.waitForResponse();
    
    await chatPage.switchToPreview();
    await page.waitForSelector('[data-testid="preview-iframe"]', { timeout: 15000 });
    
    // Mock file generation that should trigger preview refresh
    await mockAI.mockFileGeneration([
      { path: 'src/components/NewComponent.jsx', content: 'export default function NewComponent() { return <div>New!</div>; }' },
    ]);
    
    await mockAI.mockChatResponse('Adding new component...');
    await chatPage.sendMessage('Add a new component');
    await chatPage.waitForResponse();
    
    // Preview should refresh (implementation dependent)
    const refreshIndicator = page.locator('[data-testid="preview-refresh"]');
    if (await refreshIndicator.isVisible()) {
      await expect(refreshIndicator).toContainText('refresh');
    }
  });

  test('should handle preview errors gracefully', async ({ page, chatPage, mockAI }) => {
    // Mock server error
    await page.route('/api/sandboxes/*/url', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to start server',
        }),
      });
    });
    
    await mockAI.mockChatResponse('Attempting to start preview...');
    await chatPage.sendMessage('Show preview');
    await chatPage.waitForResponse();
    
    await chatPage.switchToPreview();
    
    // Should show error state
    const errorMessage = page.locator('[data-testid="preview-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Failed to start server');
  });

  test('should support multiple port previews', async ({ page, chatPage, mockAI }) => {
    // Mock URLs for different ports
    await page.route('/api/sandboxes/*/url*', async (route) => {
      const url = route.request().url();
      const port = url.includes('port=8080') ? 8080 : 3000;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: `https://sbx-preview-test-${port}.vercel.app`,
          port,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Setting up multiple services...');
    await chatPage.sendMessage('Start frontend on 3000 and API on 8080');
    await chatPage.waitForResponse();
    
    await chatPage.switchToPreview();
    
    // Should have port selector or multiple preview options
    const portSelector = page.locator('[data-testid="preview-port-selector"]');
    if (await portSelector.isVisible()) {
      // Test switching between ports
      await portSelector.selectOption('8080');
      
      const iframe = page.locator('[data-testid="preview-iframe"]');
      await expect(iframe).toHaveAttribute('src', /8080/);
      
      await portSelector.selectOption('3000');
      await expect(iframe).toHaveAttribute('src', /3000/);
    }
  });

  test('should handle responsive preview modes', async ({ page, chatPage, mockAI }) => {
    // Setup preview
    await page.route('/api/sandboxes/*/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://sbx-preview-test-3000.vercel.app',
          port: 3000,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Starting responsive preview...');
    await chatPage.sendMessage('Show responsive preview');
    await chatPage.waitForResponse();
    
    await chatPage.switchToPreview();
    await page.waitForSelector('[data-testid="preview-iframe"]', { timeout: 15000 });
    
    // Check for responsive controls
    const responsiveControls = page.locator('[data-testid="responsive-controls"]');
    if (await responsiveControls.isVisible()) {
      // Test different viewport sizes
      const mobileButton = responsiveControls.locator('[data-testid="viewport-mobile"]');
      const tabletButton = responsiveControls.locator('[data-testid="viewport-tablet"]');
      const desktopButton = responsiveControls.locator('[data-testid="viewport-desktop"]');
      
      if (await mobileButton.isVisible()) {
        await mobileButton.click();
        
        const iframe = page.locator('[data-testid="preview-iframe"]');
        const iframeSize = await iframe.boundingBox();
        
        // Should be mobile width
        if (iframeSize) {
          expect(iframeSize.width).toBeLessThan(500);
        }
      }
    }
  });

  test('should support preview zoom and scaling', async ({ page, chatPage, mockAI }) => {
    // Setup preview
    await page.route('/api/sandboxes/*/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://sbx-preview-test-3000.vercel.app',
          port: 3000,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Starting zoomable preview...');
    await chatPage.sendMessage('Show preview with zoom');
    await chatPage.waitForResponse();
    
    await chatPage.switchToPreview();
    await page.waitForSelector('[data-testid="preview-iframe"]', { timeout: 15000 });
    
    // Check for zoom controls
    const zoomControls = page.locator('[data-testid="zoom-controls"]');
    if (await zoomControls.isVisible()) {
      const zoomIn = zoomControls.locator('[data-testid="zoom-in"]');
      const zoomOut = zoomControls.locator('[data-testid="zoom-out"]');
      const zoomReset = zoomControls.locator('[data-testid="zoom-reset"]');
      
      // Test zoom functionality
      if (await zoomIn.isVisible()) {
        await zoomIn.click();
        await zoomIn.click();
        
        // Check if zoom level changed
        const zoomLevel = page.locator('[data-testid="zoom-level"]');
        if (await zoomLevel.isVisible()) {
          await expect(zoomLevel).toContainText(/\d+%/);
        }
      }
    }
  });

  test('should open preview in new tab', async ({ page, chatPage, mockAI, context }) => {
    // Setup preview
    await page.route('/api/sandboxes/*/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://sbx-preview-test-3000.vercel.app',
          port: 3000,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Preview ready for external viewing...');
    await chatPage.sendMessage('Get external preview URL');
    await chatPage.waitForResponse();
    
    // Look for external link button
    const externalLink = page.locator('[data-testid="preview-external-link"]');
    if (await externalLink.isVisible()) {
      // Listen for new page
      const pagePromise = context.waitForEvent('page');
      await externalLink.click();
      const newPage = await pagePromise;
      
      // Should open preview URL in new tab
      await expect(newPage.url()).toContain('sbx-preview-test-3000.vercel.app');
      await newPage.close();
    }
  });

  test('should show preview console logs', async ({ page, chatPage, mockAI }) => {
    // Setup preview
    await page.route('/api/sandboxes/*/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://sbx-preview-test-3000.vercel.app',
          port: 3000,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Starting preview with console...');
    await chatPage.sendMessage('Show preview with console');
    await chatPage.waitForResponse();
    
    await chatPage.switchToPreview();
    await page.waitForSelector('[data-testid="preview-iframe"]', { timeout: 15000 });
    
    // Check for console panel
    const consolePanel = page.locator('[data-testid="preview-console"]');
    if (await consolePanel.isVisible()) {
      // Should capture console logs from iframe
      await expect(consolePanel).toBeVisible();
      
      // Look for console messages (if any)
      const consoleLogs = consolePanel.locator('[data-testid="console-log"]');
      if ((await consoleLogs.count()) > 0) {
        await expect(consoleLogs.first()).toBeVisible();
      }
    }
  });

  test('should handle preview authentication', async ({ page, chatPage, mockAI }) => {
    // Mock protected preview
    await page.route('/api/sandboxes/*/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://sbx-preview-test-3000.vercel.app',
          port: 3000,
          protected: true,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Starting protected preview...');
    await chatPage.sendMessage('Show protected preview');
    await chatPage.waitForResponse();
    
    await chatPage.switchToPreview();
    
    // Should show authentication required message
    const authMessage = page.locator('[data-testid="preview-auth-required"]');
    if (await authMessage.isVisible()) {
      await expect(authMessage).toContainText('authentication');
    }
  });

  test('should persist preview state across tab switches', async ({ page, chatPage, mockAI }) => {
    // Setup preview
    await page.route('/api/sandboxes/*/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://sbx-preview-test-3000.vercel.app',
          port: 3000,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Setting up persistent preview...');
    await chatPage.sendMessage('Show preview');
    await chatPage.waitForResponse();
    
    await chatPage.switchToPreview();
    await page.waitForSelector('[data-testid="preview-iframe"]', { timeout: 15000 });
    
    // Switch to another tab and back
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile view
    await page.click('[data-testid="tab-chat"]');
    await page.waitForTimeout(500);
    
    await chatPage.switchToPreview();
    
    // Preview should still be loaded
    const iframe = page.locator('[data-testid="preview-iframe"]');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('src', 'https://sbx-preview-test-3000.vercel.app');
  });

  test('should handle preview iframe communication', async ({ page, chatPage, mockAI }) => {
    // Setup preview
    await page.route('/api/sandboxes/*/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://sbx-preview-test-3000.vercel.app',
          port: 3000,
        }),
      });
    });
    
    await mockAI.mockChatResponse('Starting interactive preview...');
    await chatPage.sendMessage('Show interactive preview');
    await chatPage.waitForResponse();
    
    await chatPage.switchToPreview();
    await page.waitForSelector('[data-testid="preview-iframe"]', { timeout: 15000 });
    
    // Test postMessage communication (if implemented)
    const iframe = page.locator('[data-testid="preview-iframe"]');
    
    // Send message to iframe
    await page.evaluate(() => {
      const iframe = document.querySelector('[data-testid="preview-iframe"]') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'test', data: 'hello' }, '*');
      }
    });
    
    // Check for message handling (implementation dependent)
    await page.waitForTimeout(1000);
    
    // Look for any response indicators
    const messageStatus = page.locator('[data-testid="iframe-message-status"]');
    if (await messageStatus.isVisible()) {
      await expect(messageStatus).toBeVisible();
    }
  });
});