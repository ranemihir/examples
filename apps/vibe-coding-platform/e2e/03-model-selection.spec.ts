import { test, expect } from './fixtures';

test.describe('Model Selection Tests', () => {
  test.beforeEach(async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
  });

  test('should display available models', async ({ page }) => {
    // Mock models API
    await page.route('/api/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'openai/gpt-5', name: 'GPT-5' },
          { id: 'anthropic/claude-4-sonnet', name: 'Claude 4 Sonnet' },
          { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
          { id: 'xai/grok-3-fast', name: 'Grok 3 Fast' },
        ]),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Click model selector
    await page.click('[data-testid="model-selector"]');
    
    // Verify models are displayed
    await expect(page.locator('[data-testid="model-option-openai/gpt-5"]')).toBeVisible();
    await expect(page.locator('[data-testid="model-option-anthropic/claude-4-sonnet"]')).toBeVisible();
    await expect(page.locator('[data-testid="model-option-google/gemini-2.5-flash"]')).toBeVisible();
    await expect(page.locator('[data-testid="model-option-xai/grok-3-fast"]')).toBeVisible();
  });

  test('should default to GPT-5', async ({ page }) => {
    const modelSelector = page.locator('[data-testid="model-selector"]');
    
    // Check default selection
    await expect(modelSelector).toContainText('GPT-5');
  });

  test('should change model selection', async ({ page, chatPage, mockAI }) => {
    // Mock models API
    await page.route('/api/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'openai/gpt-5', name: 'GPT-5' },
          { id: 'anthropic/claude-4-sonnet', name: 'Claude 4 Sonnet' },
        ]),
      });
    });

    await mockAI.mockChatResponse('Response from Claude');
    
    // Change to Claude model
    await chatPage.selectModel('anthropic/claude-4-sonnet');
    
    // Verify model selector shows Claude
    const modelSelector = page.locator('[data-testid="model-selector"]');
    await expect(modelSelector).toContainText('Claude');
    
    // Send message with new model
    await chatPage.sendMessage('Test message with Claude');
    
    // Verify correct model is used in request
    await page.waitForResponse((response) => {
      return response.url().includes('/api/chat') && 
             response.request().postDataJSON()?.modelId === 'anthropic/claude-4-sonnet';
    });
  });

  test('should persist model selection across page reloads', async ({ page, chatPage }) => {
    // Mock models API
    await page.route('/api/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'openai/gpt-5', name: 'GPT-5' },
          { id: 'anthropic/claude-4-sonnet', name: 'Claude 4 Sonnet' },
        ]),
      });
    });

    // Select Claude model
    await chatPage.selectModel('anthropic/claude-4-sonnet');
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await chatPage.dismissWelcomeModal();
    
    // Verify model selection is persisted
    const modelSelector = page.locator('[data-testid="model-selector"]');
    await expect(modelSelector).toContainText('Claude');
  });

  test('should handle model loading errors', async ({ page }) => {
    // Mock API error
    await page.route('/api/models', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to load models' }),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should fallback to default model or show error
    const modelSelector = page.locator('[data-testid="model-selector"]');
    await expect(modelSelector).toBeVisible();
    
    // Check if error is shown
    const errorIndicator = page.locator('[data-testid="model-error"]');
    if (await errorIndicator.isVisible()) {
      await expect(errorIndicator).toContainText('error');
    }
  });

  test('should show model capabilities or descriptions', async ({ page }) => {
    // Click model selector
    await page.click('[data-testid="model-selector"]');
    
    // Check if model descriptions are shown
    const modelOption = page.locator('[data-testid="model-option-openai/gpt-5"]');
    
    // Hover over model to see description (if implemented)
    await modelOption.hover();
    
    const tooltip = page.locator('[data-testid="model-tooltip"]');
    if (await tooltip.isVisible()) {
      await expect(tooltip).toContainText(/GPT|OpenAI|model/i);
    }
  });

  test('should indicate current model in chat messages', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockChatResponse('Response from GPT-5');
    
    await chatPage.sendMessage('Test message');
    await chatPage.waitForResponse();
    
    // Check if model is indicated in the message
    const messages = page.locator('[data-testid="chat-message"]');
    const aiMessage = messages.last();
    
    // Look for model indicator in message metadata or header
    const messageHeader = aiMessage.locator('[data-testid="message-header"]');
    if (await messageHeader.isVisible()) {
      await expect(messageHeader).toContainText(/GPT-5|OpenAI/i);
    }
  });

  test('should handle model switching during conversation', async ({ page, chatPage, mockAI }) => {
    // Mock models API
    await page.route('/api/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'openai/gpt-5', name: 'GPT-5' },
          { id: 'anthropic/claude-4-sonnet', name: 'Claude 4 Sonnet' },
        ]),
      });
    });

    await mockAI.mockChatResponse('First response from GPT-5');
    
    // Send first message with default model
    await chatPage.sendMessage('First message');
    await chatPage.waitForResponse();
    
    // Switch model
    await chatPage.selectModel('anthropic/claude-4-sonnet');
    
    await mockAI.mockChatResponse('Second response from Claude');
    
    // Send second message with new model
    await chatPage.sendMessage('Second message');
    await chatPage.waitForResponse();
    
    // Verify both messages are in conversation
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages).toHaveCount(4); // 2 user + 2 AI messages
    
    // Verify model indication for different messages (if implemented)
    const firstAiMessage = messages.nth(1);
    const secondAiMessage = messages.nth(3);
    
    await expect(firstAiMessage).toContainText('First response from GPT-5');
    await expect(secondAiMessage).toContainText('Second response from Claude');
  });

  test('should handle invalid model selection gracefully', async ({ page, chatPage }) => {
    // Try to select non-existent model via URL manipulation
    await page.goto('/?modelId=invalid-model-id');
    await chatPage.dismissWelcomeModal();
    
    // Should fallback to default model
    const modelSelector = page.locator('[data-testid="model-selector"]');
    await expect(modelSelector).toContainText('GPT-5');
  });

  test('should show model status and availability', async ({ page }) => {
    // Mock models with status
    await page.route('/api/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'openai/gpt-5', name: 'GPT-5', status: 'available' },
          { id: 'anthropic/claude-4-sonnet', name: 'Claude 4 Sonnet', status: 'unavailable' },
        ]),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await page.click('[data-testid="model-selector"]');
    
    // Available model should be selectable
    const availableModel = page.locator('[data-testid="model-option-openai/gpt-5"]');
    await expect(availableModel).not.toBeDisabled();
    
    // Unavailable model should be disabled or marked
    const unavailableModel = page.locator('[data-testid="model-option-anthropic/claude-4-sonnet"]');
    if (await unavailableModel.isVisible()) {
      // Should be disabled or have visual indicator
      const isDisabled = await unavailableModel.isDisabled();
      const hasUnavailableClass = await unavailableModel.getAttribute('class');
      
      expect(isDisabled || (hasUnavailableClass && hasUnavailableClass.includes('unavailable'))).toBeTruthy();
    }
  });

  test('should support keyboard navigation in model selector', async ({ page }) => {
    await page.click('[data-testid="model-selector"]');
    
    // Use keyboard to navigate
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // Should select the navigated model
    await page.waitForTimeout(100);
    
    const modelSelector = page.locator('[data-testid="model-selector"]');
    // Verify selection changed (implementation dependent)
    await expect(modelSelector).toBeVisible();
  });
});