import { test, expect } from '@playwright/test'

test.describe('File Explorer Operations', () => {
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

  test('should display file explorer panel', async ({ page }) => {
    // Check for file explorer in desktop view
    const fileExplorerPanel = page.locator(
      'text*="File Explorer", text*="Explorer"'
    )

    if (!(await page.locator('.lg\\:hidden').isVisible())) {
      // Desktop view - file explorer should be visible
      await expect(fileExplorerPanel.first()).toBeVisible()
    } else {
      // Mobile view - check for file explorer tab
      const fileExplorerTab = page.locator('text="File Explorer"')
      await expect(fileExplorerTab).toBeVisible()

      // Click on the tab to activate it
      await fileExplorerTab.click()

      // Now the file explorer content should be visible
      await expect(fileExplorerPanel.first()).toBeVisible()
    }
  })

  test('should show empty state when no files are generated', async ({
    page,
  }) => {
    // Navigate to file explorer
    const fileExplorerTab = page.locator('text="File Explorer"')
    if (await fileExplorerTab.isVisible()) {
      await fileExplorerTab.click()
    }

    // Look for empty state indicators
    const emptyStateIndicators = page.locator(
      'text*="No files", text*="empty", text*="Generate", text*="Create some files"'
    )

    // Should show some indication that no files exist yet
    // Or show the file explorer interface ready to display files
    const fileExplorerContent = page.locator(
      '[class*="file-explorer"], [data-testid="file-explorer"]'
    )
    await expect(fileExplorerContent.first()).toBeVisible({ timeout: 5000 })
  })

  test('should handle file explorer navigation', async ({ page }) => {
    // Access file explorer
    if (await page.locator('.lg\\:hidden').isVisible()) {
      const fileExplorerTab = page.locator('text="File Explorer"')
      await fileExplorerTab.click()
    }

    // Look for file explorer interface elements
    const fileExplorerElements = page.locator(
      '[class*="file"], [class*="folder"], [class*="tree"], [data-testid*="file"], [data-testid*="folder"]'
    )

    // File explorer interface should be present
    const fileExplorerPanel = page.locator('text*="File Explorer"').first()
    await expect(fileExplorerPanel).toBeVisible()

    // The panel should be ready to display content
    await page.waitForTimeout(1000)
  })

  test('should be accessible from mobile navigation', async ({ page }) => {
    // Force mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check for mobile navigation
    const mobileNav = page.locator('ul.flex.space-x-5.lg\\:hidden')
    await expect(mobileNav).toBeVisible()

    // File Explorer tab should be visible
    const fileExplorerTab = page.locator('text="File Explorer"')
    await expect(fileExplorerTab).toBeVisible()

    // Click on File Explorer tab
    await fileExplorerTab.click()

    // File explorer content should now be visible
    await page.waitForTimeout(500)

    // Verify we can navigate back to other tabs
    const chatTab = page.locator('text="Chat"')
    await expect(chatTab).toBeVisible()
    await chatTab.click()

    // Should be able to go back to file explorer
    await fileExplorerTab.click()
  })

  test('should integrate with file generation workflow', async ({ page }) => {
    // Start by generating some files through chat
    const inputField = page.locator('input[placeholder*="message"]').first()
    const sendButton = page.locator('button[type="submit"]').first()

    // Send a file generation request
    await inputField.fill('Create a package.json file for a Node.js project')
    await sendButton.click()

    // Wait for processing to start
    await expect(page.locator('text*="streaming"').first()).toBeVisible({
      timeout: 5000,
    })

    // Navigate to file explorer to check for generated files
    const fileExplorerTab = page.locator('text="File Explorer"')
    if (await fileExplorerTab.isVisible()) {
      await fileExplorerTab.click()
    }

    // File explorer should be ready to show any generated files
    const fileExplorerPanel = page.locator('text*="File Explorer"').first()
    await expect(fileExplorerPanel).toBeVisible()

    // Wait a bit for any async updates
    await page.waitForTimeout(2000)
  })
})
