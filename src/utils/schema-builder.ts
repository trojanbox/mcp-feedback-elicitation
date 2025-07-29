/**
 * JSON Schema 构建工具
 */

export interface FeedbackSchema {
  type: "object";
  properties: Record<string, {
    type: "string" | "boolean" | "number" | "integer";
    title?: string;
    description?: string;
    minLength?: number;
    maxLength?: number;
    format?: "email" | "uri" | "date" | "date-time";
    enum?: string[];
    enumNames?: string[];
    default?: any;
    minimum?: number;
    maximum?: number;
  }>;
  required?: string[];
}

/**
 * 创建反馈表单的 JSON Schema
 */
export function createFeedbackSchema(summary: string): FeedbackSchema {
  return {
    type: "object",
    properties: {
      feedback: {
        type: "string",
        title: "您的反馈",
        description: `基于以下 AI 工作摘要，请提供您的反馈意见：\n\n${summary}`,
        minLength: 1
      }
    },
    required: ["feedback"]
  };
}

/**
 * 创建简化的反馈 Schema（仅文本）
 */
export function createSimpleFeedbackSchema(summary: string) {
  return {
    type: "object",
    properties: {
      feedback: {
        type: "string",
        title: "您的反馈",
        description: summary,
        minLength: 1
      }
    },
    required: ["feedback"]
  };
}

/**
 * 创建确认对话框 Schema
 */
export function createConfirmationSchema(message: string) {
  return {
    type: "object",
    properties: {
      confirmed: {
        type: "boolean",
        title: "确认",
        description: message,
        default: false
      }
    },
    required: ["confirmed"]
  };
}
