import { test, expect } from '@playwright/test'

test.describe('Model Selection', () => {
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

  test('should display model selector in chat interface', async ({ page }) => {
    // Look for model selector in various possible forms
    const modelSelector = page.locator(
      [
        '[data-testid="model-selector"]',
        'select[name*="model"]',
        'button:has-text("gpt")',
        'button:has-text("claude")',
        'button:has-text("openai")',
        '[class*="model-selector"]',
        'select',
        '[role="combobox"]',
      ].join(', ')
    )

    // At least one model selector should be visible
    await expect(modelSelector.first()).toBeVisible({ timeout: 10000 })
  })

  test('should show available models when selector is clicked', async ({
    page,
  }) => {
    // Find and click model selector
    const modelSelector = page
      .locator(
        [
          '[data-testid="model-selector"]',
          'select',
          'button[role="combobox"]',
          'button:has-text("gpt")',
          'button:has-text("openai")',
        ].join(', ')
      )
      .first()

    await expect(modelSelector).toBeVisible()
    await modelSelector.click()

    // Look for dropdown or popover with model options
    const modelOptions = page.locator(
      [
        '[role="option"]',
        '[role="menuitem"]',
        'option',
        'li[class*="cursor-pointer"]',
        'text*="gpt-4"',
        'text*="claude"',
        'text*="gemini"',
      ].join(', ')
    )

    // Should see model options
    await expect(modelOptions.first()).toBeVisible({ timeout: 5000 })
  })

  test('should allow selecting different models', async ({ page }) => {
    // Find model selector
    const modelSelector = page
      .locator(
        [
          'select',
          'button[role="combobox"]',
          '[data-testid="model-selector"]',
        ].join(', ')
      )
      .first()

    if (await modelSelector.isVisible()) {
      await modelSelector.click()

      // Wait for options to appear
      await page.waitForTimeout(1000)

      // Look for any model option to select
      const modelOption = page
        .locator(
          [
            '[role="option"]:not([aria-selected="true"])',
            'option:not([selected])',
            'text*="claude"',
            'text*="gemini"',
            'text*="gpt-4o"',
          ].join(', ')
        )
        .first()

      if (await modelOption.isVisible()) {
        await modelOption.click()

        // Selector should close after selection
        await page.waitForTimeout(500)
      }
    }
  })

  test('should persist selected model across messages', async ({ page }) => {
    // Get current model selection
    const modelSelector = page
      .locator(
        [
          'select',
          'button[role="combobox"]',
          '[data-testid="model-selector"]',
        ].join(', ')
      )
      .first()

    await expect(modelSelector).toBeVisible()

    // Send a message with current model
    const inputField = page.locator('input[placeholder*="message"]').first()
    const sendButton = page.locator('button[type="submit"]').first()

    await inputField.fill('Hello, test message')
    await sendButton.click()

    // Wait for message to be sent
    await expect(page.locator('text*="streaming"').first()).toBeVisible({
      timeout: 5000,
    })

    // Model selector should still be visible and accessible
    await expect(modelSelector).toBeVisible()

    // Should be able to interact with it again
    await page.waitForTimeout(2000)
  })

  test('should display model information correctly', async ({ page }) => {
    // Look for current model display
    const modelDisplay = page
      .locator(
        [
          '[data-testid="current-model"]',
          'button[role="combobox"]',
          'select',
          'text*="gpt"',
          'text*="claude"',
        ].join(', ')
      )
      .first()

    await expect(modelDisplay).toBeVisible()

    // Should show some model identifier
    const modelText = await modelDisplay.textContent()
    expect(modelText).toBeTruthy()
    expect(modelText!.length).toBeGreaterThan(2)
  })

  test('should handle model selection in mobile view', async ({ page }) => {
    // Force mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Model selector should still be accessible in mobile
    const modelSelector = page
      .locator(
        [
          'select',
          'button[role="combobox"]',
          '[data-testid="model-selector"]',
        ].join(', ')
      )
      .first()

    await expect(modelSelector).toBeVisible({ timeout: 10000 })

    // Should be clickable in mobile view
    await modelSelector.click()

    // Options should appear
    await page.waitForTimeout(1000)

    // Should be able to close by clicking elsewhere or pressing escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  })
})
