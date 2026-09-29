# 安全说明

[English](SECURITY.md) | 简体中文

## 报告方式

如发现安全问题，请私下联系仓库维护者，勿在公开 issue 中披露可利用细节。

## 发送至 LLM 的数据

AI Translate 仅将您悬停、选中或主动翻译的文本（注释、字符串、文档段落、Git 提交说明等）发送到 `aiTranslate.llm.baseUrl` 配置的 HTTP 端点，不会上传整个工作区。

## 密钥

- API Key 存放在 VS Code **SecretStorage** 中，按 API origin 区分。
- `aiTranslate.privacy.blockSecrets` 会尝试阻止明显的密钥被发送。
- `.env` 与排除 glob 中的文件不会被翻译。

## 设置面板

设置 Webview 使用严格 CSP，HTML 中不包含 API Key。

## 缓存

磁盘缓存位于扩展 global storage 目录，存储译文结果。可通过 **清除缓存** 删除。
