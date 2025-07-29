#!/usr/bin/env node

/**
 * MCP Feedback Elicitation Server
 * 
 * 基于 MCP elicitation 功能的交互式反馈收集服务器
 * 替代传统的 Web UI 方案，使用标准化的 MCP 客户端界面
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TextContent,
  Tool,
  CallToolRequest,
  ElicitRequest,
  ElicitResult
} from '@modelcontextprotocol/sdk/types.js';
import { FeedbackSession } from './session/feedback-session.js';
import { createFeedbackSchema } from './utils/schema-builder.js';
import { handleElicitationResponse } from './utils/response-handler.js';
import { interactiveFeedbackPrompt } from './config/prompt.js';

/**
 * MCP 服务器类
 */
class FeedbackElicitationServer {
  private server: Server;
  private activeSessions: Map<string, FeedbackSession> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.server = new Server(
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

    this.setupHandlers();
    this.setupProcessHandlers();
  }

  /**
   * 设置进程处理器
   */
  private setupProcessHandlers(): void {
    // 优雅关闭处理
    process.on('SIGINT', () => {
      console.error('[MCP DEBUG] Received SIGINT, shutting down gracefully...');
      this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.error('[MCP DEBUG] Received SIGTERM, shutting down gracefully...');
      this.cleanup();
      process.exit(0);
    });

    // 启动心跳检查
    this.heartbeatInterval = setInterval(() => {
      this.cleanupExpiredSessions();
      console.error(`[MCP DEBUG] Heartbeat - Active sessions: ${this.activeSessions.size}`);
    }, 60000);
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    console.error(`[MCP DEBUG] Cleaning up ${this.activeSessions.size} active sessions`);
    this.activeSessions.clear();
  }

  /**
   * 设置请求处理器
   */
  private setupHandlers(): void {
    // 工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "interactive_feedback",
            description: interactiveFeedbackPrompt,
            inputSchema: {
              type: "object",
              properties: {
                project_directory: {
                  type: "string",
                  description: "项目路径",
                  default: "."
                },
                summary: {
                  type: "string",
                  description: "摘要说明",
                  default: "我已完成了您请求的任务。"
                }
              },
              required: []
            }
          } as Tool
        ]
      };
    });

    // 工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      if (name === "interactive_feedback") {
        return await this.handleInteractiveFeedback(args as any);
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  /**
   * 处理交互式反馈请求
   */
  private async handleInteractiveFeedback(params: any): Promise<any> {
    let sessionId: string | null = null;

    try {
      // 创建会话
      sessionId = this.generateSessionId();
      const session = new FeedbackSession(
        sessionId,
        params.project_directory || ".",
        params.summary || "我已完成了您请求的任务。"
      );
      this.activeSessions.set(sessionId, session);

      // 构建 elicitation schema
      const schema = createFeedbackSchema(params.summary || "我已完成了您请求的任务。");

      // 构建提示消息
      const message = `${params.summary || "我已完成了您请求的任务。"}\n\n请提供您的反馈意见：`;

      console.error(`[MCP DEBUG] Starting elicitation for session ${sessionId}, active sessions: ${this.activeSessions.size}`);

      // 发送 elicitation 请求，传递长超时选项
      const elicitResult: ElicitResult = await this.server.elicitInput({
        message: message,
        requestedSchema: schema as any
      }, {
        timeout: 86400000
      });

      console.error(`[MCP DEBUG] Elicitation completed for session ${sessionId}`);

      // 处理用户响应
      const result = handleElicitationResponse(elicitResult, session);
      const responseText = result.feedback ? `=== 用户反馈 ===\n${result.feedback}` : "=== 用户反馈 ===\n无反馈内容";

      return {
        content: [
          {
            type: "text",
            text: `=== 原则重申 ===\n` + interactiveFeedbackPrompt + `\n\n${responseText}`
          } as TextContent
        ]
      };

    } catch (error) {
      console.error(`[MCP DEBUG] Error in session ${sessionId}:`, error);
      console.error(`[MCP DEBUG] Error type: ${error?.constructor?.name}, message: ${error instanceof Error ? error.message : String(error)}`);

      // 特殊处理超时错误
      if (error instanceof Error && error.message.includes('Request timed out')) {
        return {
          content: [
            {
              type: "text",
              text: `超时提示: MCP 协议超时。这通常是因为用户界面响应超时。\n\n如需继续提供反馈，请重新调用此工具。`
            } as TextContent
          ],
          isError: false  // 不标记为错误，因为这是可预期的超时情况
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `错误: ${error instanceof Error ? error.message : String(error)}`
          } as TextContent
        ],
        isError: true
      };
    } finally {
      // 确保会话总是被清理
      if (sessionId) {
        console.error(`[MCP DEBUG] Cleaning up session ${sessionId} in finally block`);
        this.activeSessions.delete(sessionId);
      }

      // 立即清理所有过期会话
      this.cleanupExpiredSessions();
      console.error(`[MCP DEBUG] After cleanup, active sessions: ${this.activeSessions.size}`);
    }
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const maxAge = 25 * 60 * 60 * 1000;

    let cleanedCount = 0;
    this.activeSessions.forEach((session, id) => {
      const sessionData = session.getData();
      if (now - sessionData.startTime > maxAge) {
        console.error(`[MCP DEBUG] Cleaning up expired session ${id} (age: ${Math.round((now - sessionData.startTime) / 1000)}s)`);
        this.activeSessions.delete(id);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.error(`[MCP DEBUG] Cleaned up ${cleanedCount} expired sessions, remaining: ${this.activeSessions.size}`);
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    try {
      console.error('[MCP DEBUG] Starting MCP Feedback Elicitation Server...');
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('[MCP DEBUG] Server started successfully');
    } catch (error) {
      console.error('[MCP DEBUG] Failed to start server:', error);
      throw error;
    }
  }
}

// 启动服务器
async function main() {
  const server = new FeedbackElicitationServer();
  await server.start();
}

// 仅在直接运行时执行
main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});

export { FeedbackElicitationServer };
