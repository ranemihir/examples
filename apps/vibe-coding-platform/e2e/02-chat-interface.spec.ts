import { test, expect } from './fixtures';

test.describe('Chat Interface Tests', () => {
  test.beforeEach(async ({ chatPage }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
  });

  test('should send and receive messages', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockChatResponse('Hello! This is a test response from the AI.');
    
    // Send a message
    await chatPage.sendMessage('Hello, AI assistant!');
    
    // Wait for response
    await chatPage.waitForResponse();
    
    // Verify messages are displayed
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages).toHaveCount(2); // User message + AI response
    
    // Verify message content
    const userMessage = messages.first();
    await expect(userMessage).toContainText('Hello, AI assistant!');
    
    const aiMessage = messages.last();
    await expect(aiMessage).toContainText('Hello! This is a test response from the AI.');
  });

  test('should handle message streaming', async ({ page, chatPage }) => {
    // Mock streaming response
    await page.route('/api/chat', async (route) => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const chunks = [
            'Hello',
            ' this',
            ' is',
            ' a',
            ' streaming',
            ' response!'
          ];
          
          chunks.forEach((chunk, index) => {
            setTimeout(() => {
              controller.enqueue(encoder.encode(`data: {"content":"${chunk}"}\n\n`));
              if (index === chunks.length - 1) {
                controller.close();
              }
            }, index * 100);
          });
        }
      });

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: stream,
      });
    });

    await chatPage.sendMessage('Test streaming');
    
    // Wait for streaming to complete
    await page.waitForTimeout(1000);
    
    // Verify final message content
    const messages = page.locator('[data-testid="chat-message"]');
    const aiMessage = messages.last();
    await expect(aiMessage).toContainText('Hello this is a streaming response!');
  });

  test('should show loading state during message sending', async ({ page, chatPage }) => {
    // Delay the API response
    await page.route('/api/chat', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-response',
          content: 'Delayed response',
          role: 'assistant',
        }),
      });
    });

    await chatPage.sendMessage('Test loading state');
    
    // Check loading state
    const sendButton = page.locator('[data-testid="send-button"]');
    await expect(sendButton).toBeDisabled();
    
    // Check loading spinner
    const spinner = page.locator('[data-testid="loading-spinner"]');
    await expect(spinner).toBeVisible();
    
    // Wait for response
    await chatPage.waitForResponse();
    
    // Verify loading state is cleared
    await expect(sendButton).toBeEnabled();
    await expect(spinner).toBeHidden();
  });

  test('should handle empty messages gracefully', async ({ page, chatPage }) => {
    const sendButton = page.locator('[data-testid="send-button"]');
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    // Send button should be disabled for empty input
    await expect(sendButton).toBeDisabled();
    
    // Try to send empty message
    await chatInput.fill('');
    await sendButton.click({ force: true });
    
    // No message should be added
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages).toHaveCount(0);
    
    // Add some text and verify button is enabled
    await chatInput.fill('Test message');
    await expect(sendButton).toBeEnabled();
  });

  test('should persist messages across page reloads', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockChatResponse('Persistent response');
    
    // Send a message
    await chatPage.sendMessage('This message should persist');
    await chatPage.waitForResponse();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await chatPage.dismissWelcomeModal();
    
    // Verify messages are still there
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages).toHaveCount(2);
    await expect(messages.first()).toContainText('This message should persist');
  });

  test('should scroll to latest message automatically', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockChatResponse('Response ');
    
    // Send multiple messages to trigger scrolling
    for (let i = 1; i <= 10; i++) {
      await mockAI.mockChatResponse(`Response ${i}`);
      await chatPage.sendMessage(`Message ${i}`);
      await page.waitForTimeout(100);
    }
    
    // Wait for all responses
    await page.waitForTimeout(1000);
    
    // Check that the latest message is visible
    const messages = page.locator('[data-testid="chat-message"]');
    const lastMessage = messages.last();
    await expect(lastMessage).toBeInViewport();
  });

  test('should handle long messages with proper formatting', async ({ page, chatPage, mockAI }) => {
    const longMessage = 'This is a very long message '.repeat(50);
    await mockAI.mockChatResponse(longMessage);
    
    await chatPage.sendMessage('Send me a long response');
    await chatPage.waitForResponse();
    
    const messages = page.locator('[data-testid="chat-message"]');
    const aiMessage = messages.last();
    
    // Verify message is displayed and properly wrapped
    await expect(aiMessage).toBeVisible();
    await expect(aiMessage).toContainText('This is a very long message');
    
    // Check that message doesn't overflow
    const messageBox = await aiMessage.boundingBox();
    const chatContainer = await page.locator('[data-testid="chat-section"]').boundingBox();
    
    if (messageBox && chatContainer) {
      expect(messageBox.width).toBeLessThanOrEqual(chatContainer.width);
    }
  });

  test('should handle code blocks in messages', async ({ page, chatPage, mockAI }) => {
    const codeResponse = `Here's some code:

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

And some inline \`code\` as well.`;

    await mockAI.mockChatResponse(codeResponse);
    
    await chatPage.sendMessage('Show me some code');
    await chatPage.waitForResponse();
    
    const messages = page.locator('[data-testid="chat-message"]');
    const aiMessage = messages.last();
    
    // Verify code block is rendered
    await expect(aiMessage.locator('pre')).toBeVisible();
    await expect(aiMessage.locator('code')).toHaveCount(2); // Block + inline
    
    // Verify syntax highlighting is applied
    const codeBlock = aiMessage.locator('pre code');
    await expect(codeBlock).toHaveClass(/language-javascript/);
  });

  test('should handle markdown formatting in messages', async ({ page, chatPage, mockAI }) => {
    const markdownResponse = `# Heading 1

This is **bold text** and this is *italic text*.

- List item 1
- List item 2
- List item 3

[This is a link](https://example.com)`;

    await mockAI.mockChatResponse(markdownResponse);
    
    await chatPage.sendMessage('Show me markdown');
    await chatPage.waitForResponse();
    
    const messages = page.locator('[data-testid="chat-message"]');
    const aiMessage = messages.last();
    
    // Verify markdown is rendered
    await expect(aiMessage.locator('h1')).toBeVisible();
    await expect(aiMessage.locator('strong')).toBeVisible();
    await expect(aiMessage.locator('em')).toBeVisible();
    await expect(aiMessage.locator('ul')).toBeVisible();
    await expect(aiMessage.locator('li')).toHaveCount(3);
    await expect(aiMessage.locator('a')).toHaveAttribute('href', 'https://example.com');
  });

  test('should clear input after sending message', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockChatResponse('Input cleared response');
    
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    // Type and send message
    await chatInput.fill('Test message for input clearing');
    await page.keyboard.press('Enter');
    
    // Wait for response
    await chatPage.waitForResponse();
    
    // Verify input is cleared
    await expect(chatInput).toHaveValue('');
  });

  test('should support keyboard shortcuts for sending', async ({ page, chatPage, mockAI }) => {
    await mockAI.mockChatResponse('Keyboard shortcut response');
    
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    // Type message and use Enter to send
    await chatInput.fill('Sent with Enter key');
    await page.keyboard.press('Enter');
    
    await chatPage.waitForResponse();
    
    const messages = page.locator('[data-testid="chat-message"]');
    await expect(messages).toHaveCount(2);
    await expect(messages.first()).toContainText('Sent with Enter key');
    
    // Test Ctrl+Enter (if supported)
    await chatInput.fill('Sent with Ctrl+Enter');
    await page.keyboard.press('Control+Enter');
    
    await page.waitForTimeout(500);
    await expect(messages).toHaveCount(4);
  });

  test('should handle network errors gracefully', async ({ page, chatPage }) => {
    // Mock network error
    await page.route('/api/chat', async (route) => {
      await route.abort('failed');
    });

    await chatPage.sendMessage('This should fail');
    
    // Wait for error handling
    await page.waitForTimeout(1000);
    
    // Check for error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('error');
  });
});