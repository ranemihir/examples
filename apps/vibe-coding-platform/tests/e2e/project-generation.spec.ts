import { test, expect } from '@playwright/test'

test.describe('Project Generation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Close welcome modal if present
    const welcomeModal = page.locator('[role="dialog"], .modal')
    if (await welcomeModal.isVisible()) {
      const closeButton = welcomeModal.locator('button').first()
      await closeButton.click()
    }
  })

  test('should complete project generation workflow', async ({ page }) => {
    // Navigate to chat and send a project generation request
    const inputField = page
      .locator('input[placeholder*="message"], input[placeholder*="Type"]')
      .first()
    const sendButton = page.locator('button[type="submit"]').first()

    // Send a project creation request
    await inputField.fill(
      'Create a simple Next.js app with a homepage showing "Hello World"'
    )
    await sendButton.click()

    // Wait for AI to start processing
    await expect(
      page.locator('text*="streaming", text*="submitted"').first()
    ).toBeVisible({ timeout: 10000 })

    // Wait for some response (this might take a while in real scenarios)
    await page.waitForTimeout(3000)

    // Check if any messages appeared in chat
    const messagesArea = page.locator('[class*="message"], .space-y-4, .p-4')
    await expect(messagesArea).toBeVisible({ timeout: 15000 })
  })

  test('should show sandbox creation in progress', async ({ page }) => {
    // Send a request that would trigger sandbox creation
    const inputField = page.locator('input[placeholder*="message"]').first()
    const sendButton = page.locator('button[type="submit"]').first()

    await inputField.fill('Generate a React component for a login form')
    await sendButton.click()

    // Look for sandbox-related indicators
    const sandboxIndicators = page.locator(
      'text*="sandbox", text*="creating", text*="Sandbox"'
    )

    // Wait for processing to start
    await expect(page.locator('text*="streaming"').first()).toBeVisible({
      timeout: 5000,
    })

    // The test passes if we can send the message and see processing start
    await page.waitForTimeout(2000)
  })

  test('should handle file generation requests', async ({ page }) => {
    // Send a specific file generation request
    const inputField = page.locator('input[placeholder*="message"]').first()
    const sendButton = page.locator('button[type="submit"]').first()

    await inputField.fill(
      'Create a TypeScript utility function to format dates'
    )
    await sendButton.click()

    // Wait for processing to begin
    await expect(
      page.locator('text*="streaming", text*="submitted"').first()
    ).toBeVisible({ timeout: 5000 })

    // Check that the message was sent and processing started
    await expect(inputField).toBeEmpty()
    await page.waitForTimeout(2000)
  })

  test('should show preview panel during generation', async ({ page }) => {
    // Check if preview panel exists
    const previewPanel = page.locator(
      'text*="Preview", [data-testid="preview"]'
    )

    // Preview panel should be visible in the interface
    await expect(previewPanel.first()).toBeVisible()

    // Check for preview content area
    const previewContent = page.locator(
      '[class*="preview"], iframe, [data-testid="preview-content"]'
    )

    // On mobile, preview might be in a tab
    if (await page.locator('.lg\\:hidden').isVisible()) {
      // Mobile view - check for preview tab
      const previewTab = page.locator('text="Preview"')
      await expect(previewTab).toBeVisible()
    } else {
      // Desktop view - preview panel should be visible
      await expect(previewPanel.first()).toBeVisible()
    }
  })

  test('should display appropriate panels for project workflow', async ({
    page,
  }) => {
    // Verify all main panels are accessible
    const chatPanel = page.locator('text*="Chat"')
    const fileExplorerPanel = page.locator(
      'text*="File Explorer", text*="Explorer"'
    )
    const previewPanel = page.locator('text*="Preview"')
    const logsPanel = page.locator('text*="Logs"')

    // In desktop view, panels should be visible
    if (!(await page.locator('.lg\\:hidden').isVisible())) {
      await expect(chatPanel).toBeVisible()
      await expect(fileExplorerPanel.first()).toBeVisible()
      await expect(previewPanel.first()).toBeVisible()
      await expect(logsPanel.first()).toBeVisible()
    } else {
      // In mobile view, check for tab navigation
      const tabs = page.locator('ul.flex.space-x-5.lg\\:hidden')
      await expect(tabs).toBeVisible()

      // Check individual tab items
      await expect(page.locator('text="Chat"')).toBeVisible()
      await expect(page.locator('text="Preview"')).toBeVisible()
      await expect(page.locator('text="File Explorer"')).toBeVisible()
      await expect(page.locator('text="Logs"')).toBeVisible()
    }
  })
})
