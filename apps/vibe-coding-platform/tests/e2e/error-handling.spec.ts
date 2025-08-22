import { test, expect } from '@playwright/test'

test.describe('Error Handling', () => {
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

  test('should handle empty message submission gracefully', async ({
    page,
  }) => {
    const inputField = page.locator('input[placeholder*="message"]').first()
    const sendButton = page.locator('button[type="submit"]').first()

    // Try to send empty message
    await inputField.fill('')

    // Send button should be disabled for empty input
    await expect(sendButton).toBeDisabled()

    // Try with whitespace only
    await inputField.fill('   ')

    // Should still be disabled
    await expect(sendButton).toBeDisabled()

    // Add actual content
    await inputField.fill('Hello')

    // Should become enabled
    await expect(sendButton).not.toBeDisabled()
  })

  test('should display error messages when network issues occur', async ({
    page,
  }) => {
    // Block network requests to simulate network error
    await page.route('**/api/chat', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })

    const inputField = page.locator('input[placeholder*="message"]').first()
    const sendButton = page.locator('button[type="submit"]').first()

    await inputField.fill('Test message that will fail')
    await sendButton.click()

    // Look for error indicators
    const errorIndicators = page.locator(
      [
        'text*="error"',
        'text*="failed"',
        'text*="Communication error"',
        '[role="alert"]',
        '[class*="error"]',
        'text*="try again"',
      ].join(', ')
    )

    // Should show some error indication
    await expect(errorIndicators.first()).toBeVisible({ timeout: 10000 })
  })

  test('should handle malformed responses gracefully', async ({ page }) => {
    // Mock API to return malformed response
    await page.route('**/api/chat', (route) => {
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: 'invalid json response',
      })
    })

    const inputField = page.locator('input[placeholder*="message"]').first()
    const sendButton = page.locator('button[type="submit"]').first()

    await inputField.fill('Test message')
    await sendButton.click()

    // Should handle gracefully - either show error or recover
    await page.waitForTimeout(3000)

    // Interface should remain functional
    await expect(inputField).toBeVisible()
    await expect(sendButton).toBeVisible()
  })

  test('should recover from temporary failures', async ({ page }) => {
    let requestCount = 0

    // Mock API to fail first request, succeed on second
    await page.route('**/api/chat', (route) => {
      requestCount++
      if (requestCount === 1) {
        route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'Service Unavailable' }),
        })
      } else {
        route.continue()
      }
    })

    const inputField = page.locator('input[placeholder*="message"]').first()
    const sendButton = page.locator('button[type="submit"]').first()

    // First request should fail
    await inputField.fill('First message')
    await sendButton.click()

    // Wait for error handling
    await page.waitForTimeout(2000)

    // Should be able to send another message
    await inputField.fill('Second message')
    await expect(sendButton).not.toBeDisabled()

    // Interface should still be responsive
    await expect(inputField).toBeVisible()
    await expect(sendButton).toBeVisible()
  })

  test('should handle concurrent message sending attempts', async ({
    page,
  }) => {
    const inputField = page.locator('input[placeholder*="message"]').first()
    const sendButton = page.locator('button[type="submit"]').first()

    // Send first message
    await inputField.fill('First concurrent message')
    await sendButton.click()

    // Try to send second message immediately
    await inputField.fill('Second concurrent message')

    // Send button should be disabled while first is processing
    await expect(sendButton).toBeDisabled()

    // Wait for first message to process
    await page.waitForTimeout(3000)

    // Should eventually allow new messages
    if (await inputField.inputValue()) {
      await expect(sendButton).not.toBeDisabled()
    }
  })

  test('should handle invalid model selection gracefully', async ({ page }) => {
    // Try to set invalid model through URL parameters
    await page.goto('/?modelId=invalid-model-name')
    await page.waitForLoadState('networkidle')

    // Interface should still load
    const chatInterface = page.locator('text*="Chat"')
    await expect(chatInterface).toBeVisible()

    const inputField = page.locator('input[placeholder*="message"]').first()
    await expect(inputField).toBeVisible()

    // Should handle invalid model gracefully
    await page.waitForTimeout(1000)
  })

  test('should provide user feedback during loading states', async ({
    page,
  }) => {
    const inputField = page.locator('input[placeholder*="message"]').first()
    const sendButton = page.locator('button[type="submit"]').first()

    await inputField.fill('Test loading feedback')
    await sendButton.click()

    // Should show loading indicators
    const loadingIndicators = page.locator(
      [
        'text*="streaming"',
        'text*="submitted"',
        '[class*="loader"]',
        '[class*="spinner"]',
        'text*="processing"',
      ].join(', ')
    )

    await expect(loadingIndicators.first()).toBeVisible({ timeout: 5000 })

    // Input should be disabled during processing
    await expect(sendButton).toBeDisabled()
  })
})
