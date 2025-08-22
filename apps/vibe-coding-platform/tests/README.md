# End-to-End Test Suite for Vibe Coding Platform

## Overview

This test suite provides comprehensive end-to-end testing for the vibe-coding-platform using Playwright. The tests cover all major user workflows and functionality of the AI-powered coding assistant.

## Test Coverage

### 1. Chat Functionality (`chat-functionality.spec.ts`)

Tests the core chat interface and message handling:

- ✅ Chat interface display and components
- ✅ Test prompts visibility when no messages exist
- ✅ Send button state management (enabled/disabled)
- ✅ Loading states during message processing
- ✅ Clicking on predefined test prompts

### 2. Project Generation Workflow (`project-generation.spec.ts`)

Tests the complete project creation and generation flow:

- ✅ End-to-end project generation workflow
- ✅ Sandbox creation progress indication
- ✅ File generation request handling
- ✅ Preview panel visibility during generation
- ✅ Panel layout and accessibility (desktop/mobile)

### 3. File Explorer Operations (`file-explorer.spec.ts`)

Tests file browsing and management functionality:

- ✅ File explorer panel display
- ✅ Empty state handling when no files exist
- ✅ Navigation within file explorer interface
- ✅ Mobile responsive navigation
- ✅ Integration with file generation workflow

### 4. Model Selection (`model-selection.spec.ts`)

Tests AI model switching and selection:

- ✅ Model selector visibility in chat interface
- ✅ Dropdown/popover with available models
- ✅ Model selection and switching capability
- ✅ Model persistence across messages
- ✅ Model information display
- ✅ Mobile view compatibility

### 5. Error Handling (`error-handling.spec.ts`)

Tests error scenarios and recovery mechanisms:

- ✅ Empty message submission prevention
- ✅ Network error handling and user feedback
- ✅ Malformed response handling
- ✅ Recovery from temporary failures
- ✅ Concurrent message handling
- ✅ Invalid model selection graceful handling
- ✅ Loading state feedback

## Prerequisites

### Dependencies

```bash
# Install testing dependencies
pnpm add -D @playwright/test @types/jest

# Install Playwright browsers
npx playwright install chromium
```

### Environment Setup

Ensure the application can be built and started:

```bash
cd apps/vibe-coding-platform
pnpm install
pnpm build
pnpm start
```

## Running Tests

### All Tests

```bash
# Run all e2e tests
pnpm test:e2e

# Run with UI mode for debugging
pnpm test:e2e:ui

# Run in headed mode (visible browser)
pnpm test:e2e:headed
```

### Individual Test Suites

```bash
# Run specific test file
npx playwright test tests/e2e/chat-functionality.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Run specific test by name
npx playwright test --grep "should display chat interface"
```

### Debug Mode

```bash
# Debug specific test
npx playwright test --debug tests/e2e/chat-functionality.spec.ts

# Generate and view test report
npx playwright show-report
```

## Test Configuration

### Playwright Config (`playwright.config.ts`)

- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12
- **Web Server**: Automatically starts app before testing
- **Timeouts**: 120 seconds for server startup
- **Retry**: 2 retries on CI, 0 locally
- **Reporters**: HTML report generation

### Browser Support

- ✅ Desktop Chrome (Chromium)
- ✅ Desktop Firefox
- ✅ Desktop Safari (WebKit)
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)

## Test Architecture

### Test Structure

```
tests/e2e/
├── chat-functionality.spec.ts    # Chat interface tests
├── project-generation.spec.ts    # Project creation workflow
├── file-explorer.spec.ts         # File management tests
├── model-selection.spec.ts       # AI model switching tests
└── error-handling.spec.ts        # Error scenarios and recovery
```

### Common Patterns

#### Page Setup

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Handle welcome modal
  const welcomeModal = page.locator('[role="dialog"], .modal')
  if (await welcomeModal.isVisible()) {
    await welcomeModal.locator('button').first().click()
  }
})
```

#### Element Location Strategy

Tests use multiple selector strategies for robustness:

- Data test IDs (`[data-testid="element"]`)
- Semantic selectors (`button[type="submit"]`)
- Text-based selectors (`text*="Chat"`)
- Class-based selectors (`[class*="selector"]`)
- Role-based selectors (`[role="combobox"]`)

#### Responsive Testing

Tests handle both desktop and mobile layouts:

```typescript
if (await page.locator('.lg\\:hidden').isVisible()) {
  // Mobile view logic
} else {
  // Desktop view logic
}
```

## Known Issues and Limitations

### Environment Limitations

- Some system dependencies may be missing for Playwright browser execution
- Tests are designed to work with fallback builds when necessary
- Network-dependent tests may need mocking for consistent CI/CD

### Test Scope

- Tests focus on UI interactions and workflow validation
- API integration testing is handled through UI interactions
- Real AI model responses are not tested (relies on mocking for error scenarios)

### Browser Compatibility

- Primary testing on Chromium (most reliable in sandbox environments)
- Firefox and WebKit support available but may have environment-specific issues

## Maintenance

### Updating Tests

When adding new features:

1. Add corresponding test cases to appropriate spec files
2. Update selectors if UI components change
3. Ensure mobile compatibility is maintained
4. Add error handling scenarios if new failure modes are introduced

### Selector Maintenance

If UI changes break tests:

1. Check data-testid attributes first
2. Fall back to semantic HTML selectors
3. Use text content selectors as last resort
4. Avoid fragile class-based selectors when possible

### CI/CD Integration

Tests are configured for CI environments:

- Retry logic for flaky tests
- HTML report generation
- Parallel execution disabled on CI for stability
- Screenshot capture on failures

## Contributing

When adding new tests:

1. Follow existing patterns for consistency
2. Add proper assertions and timeout handling
3. Include both positive and negative test cases
4. Test responsive behavior
5. Update this documentation

## Support

For issues with test execution:

1. Check browser installation: `npx playwright install`
2. Verify app builds successfully: `pnpm build`
3. Check port availability (3000)
4. Review test reports: `npx playwright show-report`
5. Use debug mode for troubleshooting: `npx playwright test --debug`
