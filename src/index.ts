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
  Tool,
  CallToolRequest,
  ElicitResult
} from '@modelcontextprotocol/sdk/types.js';
import { FeedbackSession } from './session/feedback-session';
import { createFeedbackSchema } from './utils/schema-builder';
import { handleElicitationResponse } from './utils/response-handler';
import { interactiveFeedbackPrompt } from './config/prompt';

/**
 * MCP 服务器类
 */
class FeedbackElicitationServer {
  private server: Server;
  private activeSessions: Map<string, FeedbackSession> = new Map();
  // 已移除自动清理定时器，精简代码

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
      console.log('[MCP DEBUG] Received SIGINT, shutting down gracefully...');
      this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('[MCP DEBUG] Received SIGTERM, shutting down gracefully...');
      this.cleanup();
      process.exit(0);
    });
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    console.log(`[MCP DEBUG] Cleaning up ${this.activeSessions.size} active sessions`);
    this.activeSessions.clear();
  }

  /**
   * 设置请求处理器
   */
  private setupHandlers(): void {
    // 工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // 检查是否有自定义 prompt
      const customPrompt = process.env.FEEDBACK_PROMPT;
      const toolDescription = customPrompt && customPrompt.trim() ? customPrompt.trim() : interactiveFeedbackPrompt;

      return {
        tools: [
          {
            name: "interactive_feedback",
            description: toolDescription,
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
  private async handleInteractiveFeedback(params: { project_directory?: string; summary?: string }): Promise<any> {
    let sessionId: string | null = null;

    try {
      // 标准化参数
      const projectDirectory = params.project_directory?.trim() || ".";
      const summary = params.summary?.trim() || "我已完成了您请求的任务。";

      // 创建会话
      sessionId = this.generateSessionId();
      const session = new FeedbackSession(sessionId, projectDirectory, summary);
      this.activeSessions.set(sessionId, session);

      // 发送 elicitation 请求
      const elicitResult = await this.performElicitation(session, summary);

      // 处理用户响应
      return this.formatResponse(elicitResult, session);

    } catch (error) {
      return this.handleError(error, sessionId);
    } finally {
      // 确保会话总是被清理
      if (sessionId) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * 执行 Elicitation
   */
  private async performElicitation(session: FeedbackSession, summary: string): Promise<ElicitResult> {
    const schema = createFeedbackSchema(summary);
    const message = `${summary}\n\n请提供您的反馈意见：`;

    console.log(`[MCP DEBUG] Starting elicitation for session ${session.id}`);
    return this.server.elicitInput(
      { message, requestedSchema: schema as any },
      { timeout: 86400000 }
    );
  }

  /**
   * 格式化响应
   */
  private formatResponse(elicitResult: ElicitResult, session: FeedbackSession): any {
    const result = handleElicitationResponse(elicitResult, session);
    const template = process.env.FEEDBACK_TEMPLATE;
    let responseText: string;

    if (template?.trim()) {
      const feedbackContent = result.feedback || "无反馈内容";
      responseText = template.replace(/\{\{feedback\}\}/g, feedbackContent);
    } else {
      responseText = result.feedback ? `=== 用户反馈 ===\n${result.feedback}` : "=== 用户反馈 ===\n无反馈内容";
    }

    return {
      content: [{ type: "text", text: responseText }]
    };
  }

  /**
   * 处理错误
   */
  private handleError(error: any, sessionId: string | null): any {
    console.log(`[MCP DEBUG] Error in session ${sessionId}:`, error);

    if (error instanceof Error && error.message.includes('Request timed out')) {
      return {
        content: [{ 
          type: "text", 
          text: `超时提示: MCP 协议超时。这通常是因为用户界面响应超时。\n\n如需继续提供反馈，请重新调用此工具。`
        }],
        isError: false
      };
    }

    return {
      content: [{ 
        type: "text", 
        text: `错误: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
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
      console.log('[MCP DEBUG] Starting MCP Feedback Elicitation Server...');
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.log('[MCP DEBUG] Server started successfully');
    } catch (error) {
      console.log('[MCP DEBUG] Failed to start server:', error);
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
if (require.main === module) {
  main().catch((error) => {
    console.log("Server failed to start:", error);
    process.exit(1);
  });
}

export { FeedbackElicitationServer };
