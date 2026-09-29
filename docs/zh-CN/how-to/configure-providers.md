# 配置 LLM 提供商

AI Translate 使用 OpenAI 兼容的 `POST /chat/completions` 接口。

| 提供商 | 示例 base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| 通义千问（DashScope） | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| 豆包 | 火山引擎提供的 OpenAI 兼容端点 |

将 `aiTranslate.llm.model` 设为提供商要求的模型 id。API Key 按 origin 存入 VS Code SecretStorage，不会写入 settings.json。
