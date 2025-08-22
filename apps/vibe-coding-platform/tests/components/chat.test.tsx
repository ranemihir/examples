import { render, screen, fireEvent, waitFor } from '../utils/test-utils';
import { Chat } from '../../app/chat';

// Mock the AI SDK hooks
jest.mock('@ai-sdk/react', () => ({
  useChat: jest.fn(),
}));

// Mock the state mapper
jest.mock('../../app/state', () => ({
  useDataStateMapper: jest.fn(() => jest.fn()),
}));

// Mock SWR
jest.mock('swr', () => ({
  mutate: jest.fn(),
}));

// Mock Sonner
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

import { useChat } from '@ai-sdk/react';
import { mutate } from 'swr';
import { toast } from 'sonner';

const mockUseChat = useChat as jest.MockedFunction<typeof useChat>;
const mockMutate = mutate as jest.MockedFunction<typeof mutate>;
const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>;

describe('Chat Component', () => {
  const defaultChatHookReturn = {
    messages: [],
    sendMessage: jest.fn(),
    status: 'ready' as const,
    input: '',
    setInput: jest.fn(),
    append: jest.fn(),
    reload: jest.fn(),
    stop: jest.fn(),
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    mockUseChat.mockReturnValue(defaultChatHookReturn);
    jest.clearAllMocks();
  });

  test('renders chat interface correctly', () => {
    render(<Chat className="test-class" />);

    // Check main elements are present
    expect(screen.getByTestId('chat-section')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByTestId('send-button')).toBeInTheDocument();
    expect(screen.getByTestId('model-selector')).toBeInTheDocument();
  });

  test('displays test prompts when no messages', () => {
    render(<Chat className="test-class" />);

    expect(screen.getByTestId('test-prompts')).toBeInTheDocument();
    expect(screen.getByText(/Pokemon/i)).toBeInTheDocument();
    expect(screen.getByText(/golang/i)).toBeInTheDocument();
  });

  test('hides test prompts when messages exist', () => {
    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      messages: [
        { id: '1', content: 'Hello', role: 'user' },
        { id: '2', content: 'Hi there!', role: 'assistant' },
      ],
    });

    render(<Chat className="test-class" />);

    expect(screen.queryByTestId('test-prompts')).not.toBeInTheDocument();
    expect(screen.getByTestId('chat-message')).toBeInTheDocument();
  });

  test('sends message when form is submitted', async () => {
    const mockSendMessage = jest.fn();
    const mockSetInput = jest.fn();
    
    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      sendMessage: mockSendMessage,
      setInput: mockSetInput,
    });

    render(<Chat className="test-class" />);

    const input = screen.getByTestId('chat-input');
    const sendButton = screen.getByTestId('send-button');

    // Type message
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    // Submit form
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        { text: 'Test message' },
        { body: { modelId: expect.any(String) } }
      );
    });

    expect(mockSetInput).toHaveBeenCalledWith('');
  });

  test('disables send button when input is empty', () => {
    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      input: '',
    });

    render(<Chat className="test-class" />);

    const sendButton = screen.getByTestId('send-button');
    expect(sendButton).toBeDisabled();
  });

  test('enables send button when input has content', () => {
    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      input: 'Test message',
    });

    render(<Chat className="test-class" />);

    const sendButton = screen.getByTestId('send-button');
    expect(sendButton).not.toBeDisabled();
  });

  test('shows loading state during message sending', () => {
    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      status: 'streaming',
    });

    render(<Chat className="test-class" />);

    const sendButton = screen.getByTestId('send-button');
    expect(sendButton).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('displays status in header', () => {
    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      status: 'streaming',
    });

    render(<Chat className="test-class" />);

    expect(screen.getByText('[streaming]')).toBeInTheDocument();
  });

  test('handles test prompt clicks', async () => {
    const mockSendMessage = jest.fn();
    const mockSetInput = jest.fn();

    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      sendMessage: mockSendMessage,
      setInput: mockSetInput,
    });

    render(<Chat className="test-class" />);

    const testPrompt = screen.getByTestId('test-prompt-0');
    fireEvent.click(testPrompt);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalled();
    });
  });

  test('handles errors gracefully', () => {
    const error = new Error('Test error');
    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      error,
    });

    render(<Chat className="test-class" />);

    // Should not crash and should display error handling
    expect(screen.getByTestId('chat-section')).toBeInTheDocument();
  });

  test('calls onError callback when chat error occurs', () => {
    const mockSendMessage = jest.fn().mockImplementation(() => {
      // Simulate error in sendMessage
      const error = new Error('Network error');
      mockUseChat.mockReturnValue({
        ...defaultChatHookReturn,
        error,
      });
    });

    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      sendMessage: mockSendMessage,
    });

    render(<Chat className="test-class" />);

    const input = screen.getByTestId('chat-input');
    const sendButton = screen.getByTestId('send-button');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // onError should be called, which shows toast
    expect(mockToastError).toHaveBeenCalled();
  });

  test('handles keyboard shortcuts', () => {
    const mockSendMessage = jest.fn();
    
    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      sendMessage: mockSendMessage,
      input: 'Test message',
    });

    render(<Chat className="test-class" />);

    const input = screen.getByTestId('chat-input');

    // Test Enter key
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockSendMessage).toHaveBeenCalled();
  });

  test('maintains input focus after sending message', async () => {
    const mockSendMessage = jest.fn();
    const mockSetInput = jest.fn();

    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      sendMessage: mockSendMessage,
      setInput: mockSetInput,
    });

    render(<Chat className="test-class" />);

    const input = screen.getByTestId('chat-input');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalled();
    });

    // Input should maintain focus for better UX
    expect(document.activeElement).toBe(input);
  });

  test('calls mutate on tool call', () => {
    const mockOnToolCall = jest.fn();
    
    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      onToolCall: mockOnToolCall,
    });

    render(<Chat className="test-class" />);

    // Simulate tool call
    mockOnToolCall();

    expect(mockMutate).toHaveBeenCalledWith('/api/auth/info');
  });

  test('handles long messages gracefully', () => {
    const longMessage = 'This is a very long message '.repeat(100);
    
    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      messages: [
        { id: '1', content: longMessage, role: 'assistant' },
      ],
    });

    render(<Chat className="test-class" />);

    const messageElement = screen.getByTestId('chat-message');
    expect(messageElement).toBeInTheDocument();
    expect(messageElement).toHaveTextContent(longMessage);
  });

  test('auto-scrolls to latest message', () => {
    const mockScrollIntoView = jest.fn();
    
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = mockScrollIntoView;

    mockUseChat.mockReturnValue({
      ...defaultChatHookReturn,
      messages: [
        { id: '1', content: 'Message 1', role: 'user' },
        { id: '2', content: 'Message 2', role: 'assistant' },
      ],
    });

    render(<Chat className="test-class" />);

    // Should scroll to bottom when messages change
    expect(mockScrollIntoView).toHaveBeenCalled();
  });
});