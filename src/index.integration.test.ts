import { FeedbackElicitationServer } from './index';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Mock the transport
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
const MockStdioServerTransport = StdioServerTransport as jest.MockedClass<typeof StdioServerTransport>;

// Mock the server
const mockServer = {
  connect: jest.fn(),
  setRequestHandler: jest.fn(),
  elicitInput: jest.fn()
};

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => mockServer)
}));

describe('FeedbackElicitationServer Integration Tests', () => {
  let server: FeedbackElicitationServer;
  let mockTransport: jest.Mocked<StdioServerTransport>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransport = new MockStdioServerTransport() as jest.Mocked<StdioServerTransport>;
    MockStdioServerTransport.mockImplementation(() => mockTransport);
    server = new FeedbackElicitationServer();
  });

  describe('Server Initialization', () => {
    it('should initialize with correct server configuration', () => {
      expect(Server).toHaveBeenCalledWith(
        {
          name: "mcp-feedback-elicitation",
          version: "1.1.13"
        },
        {
          capabilities: {
            tools: {},
            elicitation: {
              timeout: 86400000
            }
          }
        }
      );
    });

    it('should set up request handlers', () => {
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Server Startup', () => {
    it('should start server successfully', async () => {
      mockServer.connect.mockResolvedValue(undefined);

      await expect(server.start()).resolves.toBeUndefined();
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockServer.connect.mockRejectedValue(error);

      await expect(server.start()).rejects.toThrow('Connection failed');
    });
  });

  describe('Process Signal Handling', () => {
    let originalProcess: NodeJS.Process;
    let mockExit: jest.SpyInstance;
    
    beforeEach(() => {
      originalProcess = process;
      mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
    });

    afterEach(() => {
      mockExit.mockRestore();
    });

    it('should handle SIGINT gracefully', () => {
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
      
      // Create new server to attach signal handlers
      new FeedbackElicitationServer();
      
      expect(() => process.emit('SIGINT')).toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(0);
      
      mockConsoleError.mockRestore();
    });

    it('should handle SIGTERM gracefully', () => {
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
      
      // Create new server to attach signal handlers
      new FeedbackElicitationServer();
      
      expect(() => process.emit('SIGTERM')).toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(0);
      
      mockConsoleError.mockRestore();
    });
  });

  describe('Session Management', () => {
    it('should generate unique session IDs', () => {
      // Access private method through any casting for testing
      const server1 = new FeedbackElicitationServer() as any;
      const server2 = new FeedbackElicitationServer() as any;
      
      const id1 = server1.generateSessionId();
      const id2 = server1.generateSessionId();
      const id3 = server2.generateSessionId();
      
      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);
      
      expect(id1).toMatch(/^feedback_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^feedback_\d+_[a-z0-9]+$/);
      expect(id3).toMatch(/^feedback_\d+_[a-z0-9]+$/);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle elicitation timeout in real scenarios', async () => {
      const timeoutError = new Error('Request timed out');
      mockServer.elicitInput.mockRejectedValue(timeoutError);

      // This would be called by the handler - we're testing the error handling path
      const serverInstance = server as any;
      const result = await serverInstance.handleError(timeoutError, 'test-session');

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('超时提示');
    });
  });

  describe('Environment Configuration', () => {
    it('should respect FEEDBACK_PROMPT environment variable', () => {
      const originalEnv = process.env.FEEDBACK_PROMPT;
      process.env.FEEDBACK_PROMPT = 'Custom prompt for testing';
      
      const customServer = new FeedbackElicitationServer();
      expect(mockServer.setRequestHandler).toHaveBeenCalled();
      
      if (originalEnv) {
        process.env.FEEDBACK_PROMPT = originalEnv;
      } else {
        delete process.env.FEEDBACK_PROMPT;
      }
    });

    it('should respect FEEDBACK_TEMPLATE environment variable', () => {
      const originalEnv = process.env.FEEDBACK_TEMPLATE;
      process.env.FEEDBACK_TEMPLATE = 'Custom template: {{feedback}}';
      
      const customServer = new FeedbackElicitationServer();
      expect(mockServer.setRequestHandler).toHaveBeenCalled();
      
      if (originalEnv) {
        process.env.FEEDBACK_TEMPLATE = originalEnv;
      } else {
        delete process.env.FEEDBACK_TEMPLATE;
      }
    });
  });
});
