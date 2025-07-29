# MCP Feedback Elicitation Server

这个项目是参考 [https://github.com/Minidoracat/mcp-feedback-enhanced](https://github.com/Minidoracat/mcp-feedback-enhanced) 开发，使用 MCP Elicitation 代替 Web UI。需要客户端支持 Elicitation 功能，才能使用此 MCP 工具。

目前 `vscode 1.102` 版本支持 Elicitation 功能。

mcp.json 中追加如下配置：

```json
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
        "MCP_DEBUG": "false"
    }
}
```
