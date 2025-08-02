import { FeedbackElicitationServer } from './index';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ElicitResult, ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Create a single, reusable mock instance that we can control in our tests.
const mockServerInstance: any = {
  handlers: new Map<any, (req: any) => Promise<any>>(),
  setRequestHandler: jest.fn((schema: any, handler: (req: any) => Promise<any>) => {
    mockServerInstance.handlers.set(schema, handler);
  }),
  elicitInput: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  // Helper to trigger handlers in tests
  _triggerHandler: jest.fn((schema: any, request: any) => {
    const handler = mockServerInstance.handlers.get(schema);
    if (handler) {
      return handler(request);
    }
    return Promise.reject(new Error(`No handler for schema ${schema.title}`));
  }),
  // Helper to clear mocks between tests
  _clearMocks: () => {
    mockServerInstance.setRequestHandler.mockClear();
    mockServerInstance.elicitInput.mockClear();
    mockServerInstance.connect.mockClear();
    mockServerInstance._triggerHandler.mockClear();
    mockServerInstance.handlers.clear();
  },
};

// Mock the MCP Server SDK to return our controlled instance
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  return {
    Server: jest.fn().mockImplementation(() => mockServerInstance),
  };
});

describe('FeedbackElicitationServer', () => {
  beforeEach(() => {
    // Clear all mocks and reset the server instance before each test
    mockServerInstance._clearMocks();
    // Instantiate our server, which will use the mocked MCP Server
    new FeedbackElicitationServer();
    // Reset environment variables
    delete process.env.FEEDBACK_PROMPT;
    delete process.env.FEEDBACK_TEMPLATE;
  });

  describe('ListTools', () => {
    it('should return the interactive_feedback tool with default prompt', async () => {
      const result = await mockServerInstance._triggerHandler(ListToolsRequestSchema, {});
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('interactive_feedback');
      expect(result.tools[0].description).toContain('Interactive feedback collection tool for LLM agents');
    });

    it('should use FEEDBACK_PROMPT for tool description if set', async () => {
      const customPrompt = 'This is a custom prompt.';
      process.env.FEEDBACK_PROMPT = customPrompt;
      
      // Create a new server instance to pick up the environment variable
      new FeedbackElicitationServer();
      
      const result = await mockServerInstance._triggerHandler(ListToolsRequestSchema, {});
      expect(result.tools[0].description).toBe(customPrompt);
      
      // Clean up
      delete process.env.FEEDBACK_PROMPT;
    });
  });

  describe('CallTool: interactive_feedback', () => {
    const callToolRequest = {
      params: {
        name: 'interactive_feedback',
        arguments: {
          summary: 'Test summary'
        }
      }
    };

    it('should handle user accepting and providing feedback', async () => {
      const feedbackText = 'This is great!';
      mockServerInstance.elicitInput.mockResolvedValue({
        action: 'accept',
        content: { feedback: feedbackText }
      } as ElicitResult);

      const result = await mockServerInstance._triggerHandler(CallToolRequestSchema, callToolRequest);

      expect(mockServerInstance.elicitInput).toHaveBeenCalled();
      expect(result.content[0].text).toBe(`=== 用户反馈 ===\n${feedbackText}`);
      expect(result.isError).toBeUndefined();
    });

    it('should handle user declining feedback', async () => {
      mockServerInstance.elicitInput.mockResolvedValue({ action: 'decline' } as ElicitResult);

      const result = await mockServerInstance._triggerHandler(CallToolRequestSchema, callToolRequest);

      expect(result.content[0].text).toBe('=== 用户反馈 ===\n无反馈内容');
      expect(result.isError).toBeUndefined();
    });

    it('should handle user cancelling feedback', async () => {
      mockServerInstance.elicitInput.mockResolvedValue({ action: 'cancel' } as ElicitResult);

      const result = await mockServerInstance._triggerHandler(CallToolRequestSchema, callToolRequest);

      expect(result.content[0].text).toBe('=== 用户反馈 ===\n无反馈内容');
      expect(result.isError).toBeUndefined();
    });

    it('should use FEEDBACK_TEMPLATE when provided', async () => {
      const template = 'Feedback: {{feedback}}';
      process.env.FEEDBACK_TEMPLATE = template;
      const feedbackText = 'Template test';

      // Create a new server instance to pick up the environment variable
      new FeedbackElicitationServer();

      mockServerInstance.elicitInput.mockResolvedValue({
        action: 'accept',
        content: { feedback: feedbackText }
      } as ElicitResult);

      const result = await mockServerInstance._triggerHandler(CallToolRequestSchema, callToolRequest);

      expect(result.content[0].text).toBe(`Feedback: ${feedbackText}`);
      
      // Clean up
      delete process.env.FEEDBACK_TEMPLATE;
    });

    it('should handle timeout errors gracefully', async () => {
      mockServerInstance.elicitInput.mockRejectedValue(new Error('Request timed out'));

      const result = await mockServerInstance._triggerHandler(CallToolRequestSchema, callToolRequest);

      expect(result.content[0].text).toContain('超时提示');
      expect(result.isError).toBe(false);
    });

    it('should handle other errors', async () => {
      const errorMessage = 'Something went wrong';
      mockServerInstance.elicitInput.mockRejectedValue(new Error(errorMessage));

      const result = await mockServerInstance._triggerHandler(CallToolRequestSchema, callToolRequest);

      expect(result.content[0].text).toBe(`错误: ${errorMessage}`);
      expect(result.isError).toBe(true);
    });
  });
});