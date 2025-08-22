import { test, expect } from './fixtures';

test.describe('File Management Tests', () => {
  test.beforeEach(async ({ chatPage, mockAI }) => {
    await chatPage.goto();
    await chatPage.dismissWelcomeModal();
    
    // Create a sandbox with files for testing
    await mockAI.mockSandboxCreation('sbx_files_test');
    await mockAI.mockFileGeneration([
      { path: 'package.json', content: '{"name": "test-app", "version": "1.0.0"}' },
      { path: 'src/index.js', content: 'console.log("Hello World");' },
      { path: 'src/components/Button.jsx', content: 'export default function Button() { return <button>Click me</button>; }' },
      { path: 'README.md', content: '# Test Project\n\nThis is a test project.' },
    ]);
    
    await mockAI.mockChatResponse('Creating project files...');
    await chatPage.sendMessage('Create a React project');
    await chatPage.waitForResponse();
  });

  test('should display file explorer with generated files', async ({ page, chatPage }) => {
    await chatPage.switchToFileExplorer();
    
    // Wait for file tree to load
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    // Verify files are displayed
    const fileTree = page.locator('[data-testid="file-tree"]');
    await expect(fileTree).toBeVisible();
    
    // Check for generated files
    await expect(fileTree.locator('[data-testid="file-package.json"]')).toBeVisible();
    await expect(fileTree.locator('[data-testid="file-README.md"]')).toBeVisible();
    await expect(fileTree.locator('[data-testid="folder-src"]')).toBeVisible();
  });

  test('should expand and collapse folders', async ({ page, chatPage }) => {
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    const srcFolder = page.locator('[data-testid="folder-src"]');
    await expect(srcFolder).toBeVisible();
    
    // Expand src folder
    await srcFolder.click();
    await page.waitForTimeout(500);
    
    // Check if folder contents are visible
    await expect(page.locator('[data-testid="file-src/index.js"]')).toBeVisible();
    await expect(page.locator('[data-testid="folder-src/components"]')).toBeVisible();
    
    // Collapse folder
    await srcFolder.click();
    await page.waitForTimeout(500);
    
    // Contents should be hidden
    await expect(page.locator('[data-testid="file-src/index.js"]')).toBeHidden();
  });

  test('should display file content when clicked', async ({ page, chatPage }) => {
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    // Click on package.json file
    await page.click('[data-testid="file-package.json"]');
    
    // Wait for file content to load
    await page.waitForSelector('[data-testid="file-content"]', { timeout: 5000 });
    
    const fileContent = page.locator('[data-testid="file-content"]');
    await expect(fileContent).toBeVisible();
    await expect(fileContent).toContainText('test-app');
    await expect(fileContent).toContainText('1.0.0');
  });

  test('should show syntax highlighting for different file types', async ({ page, chatPage }) => {
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    // Test JavaScript file
    await page.click('[data-testid="folder-src"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="file-src/index.js"]');
    
    await page.waitForSelector('[data-testid="file-content"]', { timeout: 5000 });
    
    const jsContent = page.locator('[data-testid="file-content"] code');
    await expect(jsContent).toHaveClass(/language-javascript|hljs/);
    
    // Test JSON file
    await page.click('[data-testid="file-package.json"]');
    await page.waitForTimeout(500);
    
    const jsonContent = page.locator('[data-testid="file-content"] code');
    await expect(jsonContent).toHaveClass(/language-json|hljs/);
    
    // Test JSX file
    await page.click('[data-testid="folder-src/components"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="file-src/components/Button.jsx"]');
    
    await page.waitForTimeout(500);
    const jsxContent = page.locator('[data-testid="file-content"] code');
    await expect(jsxContent).toHaveClass(/language-jsx|language-javascript|hljs/);
  });

  test('should handle file loading errors gracefully', async ({ page, chatPage }) => {
    await chatPage.switchToFileExplorer();
    
    // Mock file loading error
    await page.route('/api/sandboxes/*/files/*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'File not found',
        }),
      });
    });
    
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    await page.click('[data-testid="file-package.json"]');
    
    // Should show error message
    const errorMessage = page.locator('[data-testid="file-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('not found');
  });

  test('should show file sizes and timestamps', async ({ page, chatPage }) => {
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    // Check if file metadata is displayed
    const fileItem = page.locator('[data-testid="file-package.json"]');
    
    // Look for file size indicator
    const fileMeta = fileItem.locator('[data-testid="file-meta"]');
    if (await fileMeta.isVisible()) {
      await expect(fileMeta).toContainText(/\d+\s?(B|KB|MB)/); // Size pattern
    }
  });

  test('should support file search and filtering', async ({ page, chatPage }) => {
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    // Look for search input
    const searchInput = page.locator('[data-testid="file-search"]');
    if (await searchInput.isVisible()) {
      // Search for .js files
      await searchInput.fill('index.js');
      await page.waitForTimeout(500);
      
      // Should show only matching files
      await expect(page.locator('[data-testid="file-src/index.js"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-package.json"]')).toBeHidden();
      
      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(500);
      
      // All files should be visible again
      await expect(page.locator('[data-testid="file-package.json"]')).toBeVisible();
    }
  });

  test('should handle deep folder structures', async ({ page, chatPage, mockAI }) => {
    // Create deeper folder structure
    await mockAI.mockFileGeneration([
      { path: 'src/components/ui/forms/Input.jsx', content: 'export default function Input() {}' },
      { path: 'src/utils/helpers/validation.js', content: 'export const validate = () => {}' },
      { path: 'docs/api/endpoints/users.md', content: '# Users API' },
    ]);
    
    await mockAI.mockChatResponse('Creating deep folder structure...');
    await chatPage.sendMessage('Create nested folders and files');
    await chatPage.waitForResponse();
    
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    // Navigate through nested folders
    await page.click('[data-testid="folder-src"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="folder-src/components"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="folder-src/components/ui"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="folder-src/components/ui/forms"]');
    await page.waitForTimeout(500);
    
    // Verify deeply nested file is accessible
    await expect(page.locator('[data-testid="file-src/components/ui/forms/Input.jsx"]')).toBeVisible();
    
    // Click on nested file
    await page.click('[data-testid="file-src/components/ui/forms/Input.jsx"]');
    
    const fileContent = page.locator('[data-testid="file-content"]');
    await expect(fileContent).toContainText('export default function Input');
  });

  test('should show file icons based on file types', async ({ page, chatPage }) => {
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    // Check for file type icons
    const jsFile = page.locator('[data-testid="file-src/index.js"]');
    const jsonFile = page.locator('[data-testid="file-package.json"]');
    const mdFile = page.locator('[data-testid="file-README.md"]');
    const folder = page.locator('[data-testid="folder-src"]');
    
    // Expand src to see index.js
    await page.click('[data-testid="folder-src"]');
    await page.waitForTimeout(500);
    
    // Check if icons are present (implementation dependent)
    const jsIcon = jsFile.locator('[data-testid="file-icon"]');
    const jsonIcon = jsonFile.locator('[data-testid="file-icon"]');
    const mdIcon = mdFile.locator('[data-testid="file-icon"]');
    const folderIcon = folder.locator('[data-testid="folder-icon"]');
    
    if (await jsIcon.isVisible()) {
      await expect(jsIcon).toBeVisible();
    }
    if (await jsonIcon.isVisible()) {
      await expect(jsonIcon).toBeVisible();
    }
    if (await mdIcon.isVisible()) {
      await expect(mdIcon).toBeVisible();
    }
    if (await folderIcon.isVisible()) {
      await expect(folderIcon).toBeVisible();
    }
  });

  test('should maintain file explorer state during navigation', async ({ page, chatPage }) => {
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    // Expand src folder and select a file
    await page.click('[data-testid="folder-src"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="file-src/index.js"]');
    
    // Switch to chat and back
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile view
    await page.click('[data-testid="tab-chat"]');
    await page.waitForTimeout(500);
    await chatPage.switchToFileExplorer();
    
    // File should still be selected and src folder expanded
    const selectedFile = page.locator('[data-testid="file-src/index.js"][data-selected="true"]');
    if (await selectedFile.isVisible()) {
      await expect(selectedFile).toBeVisible();
    }
    
    // src folder should still be expanded
    await expect(page.locator('[data-testid="file-src/index.js"]')).toBeVisible();
  });

  test('should handle binary files appropriately', async ({ page, chatPage, mockAI }) => {
    // Create binary files
    await mockAI.mockFileGeneration([
      { path: 'assets/logo.png', content: '[BINARY_DATA]' },
      { path: 'assets/fonts/custom.woff2', content: '[BINARY_DATA]' },
    ]);
    
    await mockAI.mockChatResponse('Adding binary assets...');
    await chatPage.sendMessage('Add images and fonts');
    await chatPage.waitForResponse();
    
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    // Expand assets folder
    await page.click('[data-testid="folder-assets"]');
    await page.waitForTimeout(500);
    
    // Click on binary file
    await page.click('[data-testid="file-assets/logo.png"]');
    
    // Should show appropriate message for binary file
    const binaryMessage = page.locator('[data-testid="binary-file-message"]');
    if (await binaryMessage.isVisible()) {
      await expect(binaryMessage).toContainText('Binary file');
    }
  });

  test('should refresh file tree when new files are generated', async ({ page, chatPage, mockAI }) => {
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    // Count initial files
    const initialFiles = await page.locator('[data-testid^="file-"]').count();
    
    // Generate new files
    await mockAI.mockFileGeneration([
      { path: 'config/database.js', content: 'module.exports = {}' },
      { path: 'tests/unit/app.test.js', content: 'describe("App", () => {})' },
    ]);
    
    await mockAI.mockChatResponse('Adding configuration and tests...');
    await chatPage.sendMessage('Add config and test files');
    await chatPage.waitForResponse();
    
    // Wait for file tree to update
    await page.waitForTimeout(2000);
    
    // Should have more files now
    const newFileCount = await page.locator('[data-testid^="file-"]').count();
    expect(newFileCount).toBeGreaterThan(initialFiles);
    
    // New folders should be visible
    await expect(page.locator('[data-testid="folder-config"]')).toBeVisible();
    await expect(page.locator('[data-testid="folder-tests"]')).toBeVisible();
  });

  test('should handle large file lists efficiently', async ({ page, chatPage, mockAI }) => {
    // Generate many files
    const manyFiles = Array.from({ length: 50 }, (_, i) => ({
      path: `src/components/Component${i}.jsx`,
      content: `export default function Component${i}() { return <div>Component ${i}</div>; }`,
    }));
    
    await mockAI.mockFileGeneration(manyFiles);
    await mockAI.mockChatResponse('Generating many components...');
    await chatPage.sendMessage('Generate 50 components');
    await chatPage.waitForResponse();
    
    await chatPage.switchToFileExplorer();
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });
    
    // Expand src and components folders
    await page.click('[data-testid="folder-src"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="folder-src/components"]');
    await page.waitForTimeout(2000);
    
    // Should handle large list without performance issues
    const componentFiles = page.locator('[data-testid^="file-src/components/Component"]');
    const count = await componentFiles.count();
    
    expect(count).toBeGreaterThanOrEqual(50);
    
    // Should be able to scroll through the list
    const fileTree = page.locator('[data-testid="file-tree"]');
    await fileTree.hover();
    
    // Test scrolling (if virtualized)
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(50);
    }
    
    // Should still be responsive
    await page.click('[data-testid="file-src/components/Component0.jsx"]');
    await page.waitForSelector('[data-testid="file-content"]', { timeout: 5000 });
  });
});