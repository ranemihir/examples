import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createMockMessage = (overrides = {}) => ({
  id: 'msg-123',
  content: 'Test message content',
  role: 'user' as const,
  timestamp: Date.now(),
  ...overrides,
});

export const createMockSandbox = (overrides = {}) => ({
  sandboxId: 'sbx_test_123',
  status: 'ready',
  url: 'https://test-sandbox.vercel.app',
  ports: [3000],
  ...overrides,
});

export const createMockCommand = (overrides = {}) => ({
  cmdId: 'cmd_test_123',
  command: 'npm run dev',
  status: 'completed',
  exitCode: 0,
  output: 'Development server started',
  ...overrides,
});

// Mock AI responses
export const mockAIResponses = {
  createSandbox: {
    sandboxId: 'sbx_test_123',
    status: 'ready',
  },
  generateFiles: {
    files: [
      { path: 'package.json', content: '{}' },
      { path: 'src/index.js', content: 'console.log("Hello World")' },
    ],
  },
  runCommand: {
    cmdId: 'cmd_test_123',
    output: 'Command executed successfully',
  },
};

// Wait for loading states
export const waitForLoadingToFinish = async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
};