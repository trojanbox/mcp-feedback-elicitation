# MCP Feedback Elicitation Server

[![Apache 2.0 License](https://img.shields.io/badge/license-Apache%202.0-green)](LICENSE)

[English Readme](README.md)

一个基于 Model Context Protocol (MCP) 的交互式反馈收集服务器，使用 MCP Elicitation 功能替代传统的 Web UI 方案，提供标准化的用户反馈收集体验。

## 项目背景

- 🤖 **AI 生成**: 本项目使用 Claude Sonnet 4 生成。
- 📚 **参考项目**: 参考 [mcp-feedback-enhanced](https://github.com/Minidoracat/mcp-feedback-enhanced) 实现。如果需要更强大的功能，例如图片上传、会话管理等，请使用 [mcp-feedback-enhanced](https://github.com/Minidoracat/mcp-feedback-enhanced) 项目。
- 🔧 **技术特色**: 使用 MCP Elicitation 代替 Web UI，需要客户端支持 Elicitation 功能。

## 兼容性

目前 **VS Code 1.102+** 版本支持 MCP Elicitation 功能。

## 快速开始

在 `mcp.json` 中添加以下配置：

```json5
"mcp-feedback-elicitation": {
    "command": "npx",
    "args": [
        "mcp-feedback-elicitation"
    ],
    "timeout": 86400000,
    "autoApprove": [
        "interactive_feedback"
    ],
    "env": {
        "FEEDBACK_TEMPLATE": "=== 用户反馈 ===\n{{feedback}}", 
        "FEEDBACK_PROMPT": "自定义工具描述，用于 AI 助手了解工具用途和使用规则"
    }
}
```

## 环境变量配置

### FEEDBACK_TEMPLATE
控制反馈输出的格式模板，使用 `{{feedback}}` 作为占位符来插入实际的用户反馈内容。

**示例配置：**
```json
"FEEDBACK_TEMPLATE": "📝 反馈内容：{{feedback}}\n\n✅ 请及时处理相关事项"
```

### FEEDBACK_PROMPT  
自定义工具的描述内容，AI 助手会根据这个描述来理解工具的用途和使用规则。

**多语言支持示例：**
```json
// 中文环境
"FEEDBACK_PROMPT": "交互式反馈收集工具。在任务执行过程中调用此工具收集用户反馈。必须重复调用直到用户明确表示结束。"

// 英文环境  
"FEEDBACK_PROMPT": "Interactive feedback collection tool. Call this tool to collect user feedback during task execution. Must call repeatedly until user explicitly says 'end'."

// 日文环境
"FEEDBACK_PROMPT": "インタラクティブフィードバック収集ツール。タスク実行中にこのツールを呼び出してユーザーフィードバックを収集します。ユーザーが明確に終了を示すまで繰り返し呼び出す必要があります。"
```

## 免责声明

本项目由 AI 生成，未经过完整的测试和优化。使用时请自行评估风险，作者不承担任何责任。
