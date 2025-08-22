import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock handlers for API endpoints
export const handlers = [
  // Mock chat API
  http.post('/api/chat', async ({ request }) => {
    const body = await request.json() as any;
    const { messages, modelId } = body;
    
    // Mock streaming response
    const mockResponse = {
      id: 'msg-123',
      content: 'This is a mock AI response for testing purposes.',
      role: 'assistant',
      model: modelId || 'openai/gpt-5',
    };
    
    return HttpResponse.json(mockResponse);
  }),

  // Mock models API
  http.get('/api/models', () => {
    return HttpResponse.json([
      { id: 'openai/gpt-5', name: 'GPT-5' },
      { id: 'anthropic/claude-4-sonnet', name: 'Claude 4 Sonnet' },
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    ]);
  }),

  // Mock sandbox creation
  http.post('/api/sandboxes', () => {
    return HttpResponse.json({
      sandboxId: 'sbx_test_123',
      status: 'ready',
      url: 'https://test-sandbox.vercel.app',
    });
  }),

  // Mock sandbox file operations
  http.get('/api/sandboxes/:sandboxId/files', () => {
    return HttpResponse.json({
      files: [
        { name: 'package.json', type: 'file', content: '{}' },
        { name: 'src', type: 'directory', children: [] },
      ],
    });
  }),

  // Mock command execution
  http.post('/api/sandboxes/:sandboxId/commands', () => {
    return HttpResponse.json({
      cmdId: 'cmd_test_123',
      status: 'running',
      output: 'Command executed successfully',
    });
  }),

  // Mock command logs
  http.get('/api/sandboxes/:sandboxId/cmds/:cmdId/logs', () => {
    return HttpResponse.json({
      logs: [
        { timestamp: Date.now(), type: 'stdout', content: 'Test log output' },
      ],
    });
  }),
];

// Create server instance
export const server = setupServer(...handlers);