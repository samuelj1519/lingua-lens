# 排查连接错误

1. 在设置面板点击 **测试连接**。
2. 将 `aiTranslate.log.level` 设为 `debug`，打开 **AI Translate: 显示日志**。
3. 确认 base URL 是否需包含 `/v1`。
4. 若返回 401/403，请用 **设置 API Key** 更新密钥。
