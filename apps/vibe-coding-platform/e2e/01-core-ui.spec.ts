import { test, expect } from './fixtures';

test.describe('Core UI Tests', () => {
  test.beforeEach(async ({ chatPage }) => {
    await chatPage.goto();
  });

  test('should display welcome modal on first visit', async ({ page, chatPage }) => {
    await chatPage.waitForWelcomeModal();
    const modal = page.locator('[data-testid="welcome-modal"]');
    await expect(modal).toBeVisible();
    
    // Check modal content
    await expect(modal).toContainText('Welcome');
    await expect(page.locator('[data-testid="dismiss-welcome"]')).toBeVisible();
  });

  test('should dismiss welcome modal and hide banner', async ({ page, chatPage }) => {
    await chatPage.waitForWelcomeModal();
    await chatPage.dismissWelcomeModal();
    
    // Modal should be hidden
    const modal = page.locator('[data-testid="welcome-modal"]');
    await expect(modal).toBeHidden();
    
    // Reload page to verify banner stays hidden
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(modal).toBeHidden();
  });

  test('should display main layout with all sections', async ({ page, chatPage }) => {
    await chatPage.dismissWelcomeModal();
    
    // Check header
    await expect(page.locator('[data-testid="header"]')).toBeVisible();
    
    // Check chat section
    await expect(page.locator('[data-testid="chat-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
    
    // Check model selector
    await expect(page.locator('[data-testid="model-selector"]')).toBeVisible();
  });

  test('should show test prompts when no messages', async ({ page, chatPage }) => {
    await chatPage.dismissWelcomeModal();
    
    // Check test prompts are visible
    await expect(page.locator('[data-testid="test-prompts"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-prompt-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-prompt-1"]')).toBeVisible();
    
    // Verify prompt content
    const prompt1 = page.locator('[data-testid="test-prompt-0"]');
    await expect(prompt1).toContainText('Pokemon');
    
    const prompt2 = page.locator('[data-testid="test-prompt-1"]');
    await expect(prompt2).toContainText('golang');
  });

  test('should handle mobile responsive design', async ({ page, chatPage }) => {
    await chatPage.dismissWelcomeModal();
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile tab navigation is visible
    await expect(page.locator('[data-testid="mobile-tabs"]')).toBeVisible();
    
    // Verify tabs are clickable
    await expect(page.locator('[data-testid="tab-chat"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-file-explorer"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-logs"]')).toBeVisible();
  });

  test('should navigate between tabs on mobile', async ({ page, chatPage }) => {
    await chatPage.dismissWelcomeModal();
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Switch to preview tab
    await chatPage.switchToPreview();
    await expect(page.locator('[data-testid="preview-section"]')).toBeVisible();
    
    // Switch to file explorer
    await chatPage.switchToFileExplorer();
    await expect(page.locator('[data-testid="file-explorer-section"]')).toBeVisible();
    
    // Switch to logs
    await chatPage.switchToLogs();
    await expect(page.locator('[data-testid="logs-section"]')).toBeVisible();
    
    // Switch back to chat
    await page.click('[data-testid="tab-chat"]');
    await expect(page.locator('[data-testid="chat-section"]')).toBeVisible();
  });

  test('should handle desktop layout correctly', async ({ page, chatPage }) => {
    await chatPage.dismissWelcomeModal();
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Check desktop layout - chat should be visible alongside other panels
    await expect(page.locator('[data-testid="chat-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-explorer-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="logs-section"]')).toBeVisible();
    
    // Mobile tabs should be hidden on desktop
    await expect(page.locator('[data-testid="mobile-tabs"]')).toBeHidden();
  });

  test('should maintain state across tab switches', async ({ page, chatPage, mockAI }) => {
    await chatPage.dismissWelcomeModal();
    await mockAI.mockChatResponse('Test response for state persistence');
    
    // Send a message in chat
    await chatPage.sendMessage('Test message for state');
    await chatPage.waitForResponse();
    
    // Switch to preview tab (mobile)
    await page.setViewportSize({ width: 375, height: 667 });
    await chatPage.switchToPreview();
    
    // Switch back to chat
    await page.click('[data-testid="tab-chat"]');
    
    // Verify message is still there
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages).toHaveCount(2); // User message + AI response
    
    // Verify input state is preserved
    await chatPage.sendMessage('Another test message');
    await chatPage.waitForResponse();
    await expect(messages).toHaveCount(4);
  });

  test('should handle theme switching', async ({ page, chatPage }) => {
    await chatPage.dismissWelcomeModal();
    
    // Check if theme toggle exists (assuming it's in the header)
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      // Test theme switching
      await themeToggle.click();
      
      // Wait for theme change
      await page.waitForTimeout(100);
      
      // Verify theme change by checking body class or data attribute
      const body = page.locator('body');
      await expect(body).toHaveAttribute('class', /light|dark/);
    }
  });
});

test.describe('Accessibility Tests', () => {
  test('should be accessible with keyboard navigation', async ({ page, chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Tab through interface
    await page.keyboard.press('Tab'); // Should focus first interactive element
    await page.keyboard.press('Tab'); // Move to next element
    
    // Verify focused element is visible and has focus indicators
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper ARIA labels and roles', async ({ page, chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Check chat input has proper labels
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toHaveAttribute('aria-label');
    
    // Check send button has accessible name
    const sendButton = page.locator('[data-testid="send-button"]');
    await expect(sendButton).toHaveAttribute('aria-label');
    
    // Check model selector has proper role
    const modelSelector = page.locator('[data-testid="model-selector"]');
    await expect(modelSelector).toHaveAttribute('role');
  });

  test('should work with screen reader simulation', async ({ page, chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Verify main landmarks exist
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('[role="banner"]')).toBeVisible(); // Header
    
    // Check if content is properly structured
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    await expect(headings.first()).toBeVisible();
  });
});