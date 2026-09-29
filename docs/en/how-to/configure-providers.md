# Configure LLM providers

AI Translate uses an OpenAI-compatible `POST /chat/completions` API.

| Provider | Example base URL |
| --- | --- |
| OpenAI | `https://api.openai.com/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| Qwen (DashScope) | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Doubao | Your Volcengine OpenAI-compatible endpoint |

Set `aiTranslate.llm.model` to the model id your provider expects. API keys are stored per origin in VS Code SecretStorage.
