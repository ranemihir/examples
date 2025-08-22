import { test as base, Page } from '@playwright/test';

// Define the fixture types
type TestFixtures = {
  chatPage: ChatPage;
  mockAI: MockAIService;
};

// Chat page object model
class ChatPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async waitForWelcomeModal() {
    await this.page.waitForSelector('[data-testid="welcome-modal"]', { timeout: 5000 });
  }

  async dismissWelcomeModal() {
    const modal = this.page.locator('[data-testid="welcome-modal"]');
    if (await modal.isVisible()) {
      await this.page.click('[data-testid="dismiss-welcome"]');
    }
  }

  async selectModel(modelId: string) {
    await this.page.click('[data-testid="model-selector"]');
    await this.page.click(`[data-testid="model-option-${modelId}"]`);
  }

  async sendMessage(message: string) {
    await this.page.fill('[data-testid="chat-input"]', message);
    await this.page.click('[data-testid="send-button"]');
  }

  async waitForResponse() {
    await this.page.waitForSelector('[data-testid="message-response"]', { timeout: 10000 });
  }

  async getLastMessage() {
    const messages = this.page.locator('[data-testid="chat-message"]');
    const lastMessage = messages.last();
    return await lastMessage.textContent();
  }

  async clickTestPrompt(index: number) {
    await this.page.click(`[data-testid="test-prompt-${index}"]`);
  }

  // Navigation methods
  async switchToPreview() {
    await this.page.click('[data-testid="tab-preview"]');
  }

  async switchToFileExplorer() {
    await this.page.click('[data-testid="tab-file-explorer"]');
  }

  async switchToLogs() {
    await this.page.click('[data-testid="tab-logs"]');
  }

  // File explorer interactions
  async openFile(filename: string) {
    await this.page.click(`[data-testid="file-${filename}"]`);
  }

  async getFileContent() {
    return await this.page.textContent('[data-testid="file-content"]');
  }

  // Preview interactions
  async getPreviewUrl() {
    const iframe = this.page.locator('[data-testid="preview-iframe"]');
    return await iframe.getAttribute('src');
  }

  async waitForPreviewLoad() {
    await this.page.waitForSelector('[data-testid="preview-iframe"]');
  }

  // Command logs
  async getCommandLogs() {
    const logs = this.page.locator('[data-testid="command-log"]');
    return await logs.allTextContents();
  }

  async waitForCommandComplete(cmdId: string) {
    await this.page.waitForSelector(`[data-testid="command-${cmdId}-complete"]`, { timeout: 30000 });
  }
}

// Mock AI service for testing
class MockAIService {
  constructor(private page: Page) {}

  async mockChatResponse(response: string) {
    await this.page.route('/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-response',
          content: response,
          role: 'assistant',
        }),
      });
    });
  }

  async mockSandboxCreation(sandboxId: string) {
    await this.page.route('/api/sandboxes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sandboxId,
          status: 'ready',
          url: `https://${sandboxId}.vercel.app`,
        }),
      });
    });
  }

  async mockFileGeneration(files: { path: string; content: string }[]) {
    await this.page.route('/api/sandboxes/*/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ files }),
      });
    });
  }

  async mockCommandExecution(output: string, exitCode = 0) {
    await this.page.route('/api/sandboxes/*/commands', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cmdId: 'test-cmd-123',
          status: 'completed',
          output,
          exitCode,
        }),
      });
    });
  }
}

// Extend the base test with our fixtures
export const test = base.extend<TestFixtures>({
  chatPage: async ({ page }, use) => {
    const chatPage = new ChatPage(page);
    await use(chatPage);
  },

  mockAI: async ({ page }, use) => {
    const mockAI = new MockAIService(page);
    await use(mockAI);
  },
});

export { expect } from '@playwright/test';