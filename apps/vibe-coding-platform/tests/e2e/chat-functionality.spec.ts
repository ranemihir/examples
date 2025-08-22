import { test, expect } from '@playwright/test'

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    // Wait for the page to load and dismiss welcome modal if present
    await page.waitForLoadState('networkidle')

    // Close welcome modal if it appears
    const welcomeModal = page.locator(
      '[data-testid="welcome-modal"], .modal, [role="dialog"]'
    )
    if (await welcomeModal.isVisible()) {
      const closeButton = welcomeModal.locator('button').first()
      await closeButton.click()
    }
  })

  test('should display chat interface correctly', async ({ page }) => {
    // Verify chat panel is visible
    await expect(page.locator('text=Chat')).toBeVisible()

    // Verify input field is present
    const inputField = page.locator(
      'input[placeholder*="message"], input[placeholder*="Type"]'
    )
    await expect(inputField).toBeVisible()

    // Verify send button is present
    const sendButton = page.locator(
      'button[type="submit"], button:has-text("Send")'
    )
    await expect(sendButton).toBeVisible()

    // Verify model selector is present
    const modelSelector = page.locator(
      '[data-testid="model-selector"], select, button:has-text("gpt"), button:has-text("claude")'
    )
    await expect(modelSelector.first()).toBeVisible()
  })

  test('should show test prompts when no messages exist', async ({ page }) => {
    // Look for test prompts or getting started content
    const testPrompts = page.locator(
      'text*="Click and try", text*="prompt", li[class*="cursor-pointer"]'
    )

    // At least one should be visible
    await expect(testPrompts.first()).toBeVisible({ timeout: 10000 })
  })

  test('should enable send button when input has text', async ({ page }) => {
    const inputField = page
      .locator('input[placeholder*="message"], input[placeholder*="Type"]')
      .first()
    const sendButton = page
      .locator('button[type="submit"], button:has-text("Send")')
      .first()

    // Initially button should be disabled (if empty input)
    await expect(inputField).toBeEmpty()

    // Type a message
    await inputField.fill('Hello, this is a test message')

    // Send button should be enabled
    await expect(sendButton).not.toBeDisabled()

    // Clear input
    await inputField.fill('')

    // Button should be disabled again
    await expect(sendButton).toBeDisabled()
  })

  test('should display loading state when message is sent', async ({
    page,
  }) => {
    const inputField = page
      .locator('input[placeholder*="message"], input[placeholder*="Type"]')
      .first()
    const sendButton = page
      .locator('button[type="submit"], button:has-text("Send")')
      .first()

    // Type a message
    await inputField.fill('Create a simple HTML page')

    // Send the message
    await sendButton.click()

    // Check for loading indicators
    const loadingIndicators = page.locator(
      'text*="streaming", text*="submitted", [class*="loader"], [class*="spinner"]'
    )

    // At least one loading indicator should appear
    await expect(loadingIndicators.first()).toBeVisible({ timeout: 5000 })

    // Input should be cleared
    await expect(inputField).toBeEmpty()
  })

  test('should handle clicking on test prompts', async ({ page }) => {
    // Look for clickable test prompts
    const testPrompt = page
      .locator(
        'li[class*="cursor-pointer"], [class*="cursor-pointer"]:has-text("Next.js"), [class*="cursor-pointer"]:has-text("golang")'
      )
      .first()

    if (await testPrompt.isVisible()) {
      // Click on a test prompt
      await testPrompt.click()

      // Should show loading state or processing
      const loadingStates = page.locator(
        'text*="streaming", text*="submitted", [class*="loader"]'
      )
      await expect(loadingStates.first()).toBeVisible({ timeout: 5000 })
    } else {
      // If no test prompts, manually send a message
      const inputField = page
        .locator('input[placeholder*="message"], input[placeholder*="Type"]')
        .first()
      await inputField.fill(
        'Generate a Next.js app that allows to list and search Pokemons'
      )

      const sendButton = page.locator('button[type="submit"]').first()
      await sendButton.click()

      // Should show loading state
      const loadingStates = page.locator(
        'text*="streaming", text*="submitted"]'
      )
      await expect(loadingStates.first()).toBeVisible({ timeout: 5000 })
    }
  })
})
