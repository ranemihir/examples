/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '../../app/api/chat/route';

// Mock dependencies
jest.mock('ai', () => ({
  convertToModelMessages: jest.fn(),
  createUIMessageStream: jest.fn(),
  createUIMessageStreamResponse: jest.fn(),
  stepCountIs: jest.fn(),
  streamText: jest.fn(),
}));

jest.mock('../../ai/constants', () => ({
  DEFAULT_MODEL: 'openai/gpt-5',
}));

jest.mock('../../ai/gateway', () => ({
  getAvailableModels: jest.fn(),
  getModelOptions: jest.fn(),
}));

jest.mock('../../ai/tools', () => ({
  tools: jest.fn(),
}));

jest.mock('botid/server', () => ({
  checkBotId: jest.fn(),
}));

import { getAvailableModels, getModelOptions } from '../../ai/gateway';
import { checkBotId } from 'botid/server';
import { streamText, createUIMessageStreamResponse } from 'ai';

const mockGetAvailableModels = getAvailableModels as jest.MockedFunction<typeof getAvailableModels>;
const mockGetModelOptions = getModelOptions as jest.MockedFunction<typeof getModelOptions>;
const mockCheckBotId = checkBotId as jest.MockedFunction<typeof checkBotId>;
const mockStreamText = streamText as jest.MockedFunction<typeof streamText>;
const mockCreateUIMessageStreamResponse = createUIMessageStreamResponse as jest.MockedFunction<typeof createUIMessageStreamResponse>;

describe('/api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockCheckBotId.mockResolvedValue({ isBot: false });
    mockGetAvailableModels.mockResolvedValue([
      { id: 'openai/gpt-5', name: 'GPT-5' },
      { id: 'anthropic/claude-4-sonnet', name: 'Claude 4 Sonnet' },
    ]);
    mockGetModelOptions.mockReturnValue({});
    mockStreamText.mockReturnValue({
      consumeStream: jest.fn(),
      toUIMessageStream: jest.fn(),
    } as any);
    mockCreateUIMessageStreamResponse.mockReturnValue(new Response());
  });

  test('should handle valid chat request', async () => {
    const requestBody = {
      messages: [
        { id: '1', content: 'Hello', role: 'user' as const },
      ],
      modelId: 'openai/gpt-5',
    };

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    
    expect(response).toBeInstanceOf(Response);
    expect(mockCheckBotId).toHaveBeenCalled();
    expect(mockGetAvailableModels).toHaveBeenCalled();
    expect(mockStreamText).toHaveBeenCalled();
  });

  test('should reject bot requests', async () => {
    mockCheckBotId.mockResolvedValue({ isBot: true });

    const requestBody = {
      messages: [
        { id: '1', content: 'Hello', role: 'user' as const },
      ],
    };

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    
    expect(response.status).toBe(403);
    
    const body = await response.json();
    expect(body.error).toBe('Bot detected');
  });

  test('should handle invalid model', async () => {
    const requestBody = {
      messages: [
        { id: '1', content: 'Hello', role: 'user' as const },
      ],
      modelId: 'invalid-model',
    };

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    
    expect(response.status).toBe(400);
    
    const body = await response.json();
    expect(body.error).toContain('Model invalid-model not found');
  });

  test('should use default model when none specified', async () => {
    const requestBody = {
      messages: [
        { id: '1', content: 'Hello', role: 'user' as const },
      ],
      // No modelId specified
    };

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    
    expect(response).toBeInstanceOf(Response);
    expect(mockGetModelOptions).toHaveBeenCalledWith('openai/gpt-5');
  });

  test('should handle empty messages array', async () => {
    const requestBody = {
      messages: [],
      modelId: 'openai/gpt-5',
    };

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    
    // Should still process (empty conversation is valid)
    expect(response).toBeInstanceOf(Response);
    expect(mockStreamText).toHaveBeenCalled();
  });

  test('should handle malformed request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Should handle JSON parsing error gracefully
    await expect(POST(request)).rejects.toThrow();
  });

  test('should handle model fetching error', async () => {
    mockGetAvailableModels.mockRejectedValue(new Error('Failed to fetch models'));

    const requestBody = {
      messages: [
        { id: '1', content: 'Hello', role: 'user' as const },
      ],
      modelId: 'openai/gpt-5',
    };

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await expect(POST(request)).rejects.toThrow('Failed to fetch models');
  });

  test('should pass correct parameters to streamText', async () => {
    const requestBody = {
      messages: [
        { id: '1', content: 'Hello', role: 'user' as const },
        { id: '2', content: 'Hi there!', role: 'assistant' as const },
        { id: '3', content: 'How are you?', role: 'user' as const },
      ],
      modelId: 'anthropic/claude-4-sonnet',
    };

    const mockModelOptions = { temperature: 0.7 };
    mockGetModelOptions.mockReturnValue(mockModelOptions);

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await POST(request);

    // Verify streamText was called with correct parameters
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockModelOptions,
        system: expect.any(String), // prompt from prompt.md
        messages: expect.any(Array),
        tools: expect.any(Function),
      })
    );
  });

  test('should handle concurrent requests', async () => {
    const createRequest = (id: string) => {
      const requestBody = {
        messages: [
          { id, content: `Message ${id}`, role: 'user' as const },
        ],
        modelId: 'openai/gpt-5',
      };

      return new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    };

    const requests = [
      POST(createRequest('1')),
      POST(createRequest('2')),
      POST(createRequest('3')),
    ];

    const responses = await Promise.all(requests);

    // All requests should succeed
    responses.forEach((response) => {
      expect(response).toBeInstanceOf(Response);
    });

    // Should have called streamText for each request
    expect(mockStreamText).toHaveBeenCalledTimes(3);
  });
});