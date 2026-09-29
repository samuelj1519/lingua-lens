# 设置面板安全

**LinguaLens: Open Settings Panel** 命令打开基于 Webview 的 UI（`SettingsPanelController` + `settingsPanel/webview/main.ts`），用于编辑诸多 `linguaLens.*` 键而无需手写 JSON。本文说明该 UI 的加固方式以及哪些密钥它绝不接触。

## 威胁模型（实用视角）

Webview 在扩展提供的隔离上下文中运行 HTML。需要缓解的风险：

1. 若不可信内容可执行脚本，则存在**跨站脚本（XSS）**。
2. 通过 DOM 或 postMessage 泄漏导致 **API 密钥外泄**。
3. **过度权限的资源加载**（远程脚本、iframe）。

面板是本地设置表单，而非通用浏览器——攻击面较小，但仍应用 CSP 并将密钥保留在扩展宿主。

## 内容安全策略（CSP）

`panelHtml.ts` 生成带每会话 **nonce** 的 HTML：

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
```

含义：

- **default-src 'none'** — 除非显式允许（未允许），否则阻止图片、字体与框架。
- **style-src 'unsafe-inline'** — 允许模板内联 CSS（VS Code 主题变量）。
- **script-src 'nonce-…'** — 仅带匹配 nonce 的内联脚本标签可运行。

扩展在 webview 上设置 `localResourceRoots`（控制器），使脚本 URI 仅能解析到打包的扩展文件。

## API 密钥不进入 webview

用户 API 密钥通过 `ApiKeyStore` → VS Code `SecretStorage` 存储，按 LLM 源（origin）键控。

设置面板：

- **不**渲染 API 密钥输入框。
- **不**在 `postMessage` 载荷中传递密钥。
- 引导用户使用命令 **LinguaLens: Set API Key**（原生 UI 密码输入框）。

`testConnection` 在扩展宿主读取密钥后运行；仅成功/错误字符串返回 webview。

这符合产品预期：webview 比 SecretStorage 提示更难审计。

## 消息协议

`settingsPanel/protocol.ts` 中的类型化消息：

- Webview → 扩展：`update` 键/值、`testConnection`、`setScope`、extra body 模板等。
- 扩展 → webview：`state` 快照、`extraBodyError`、测试结果。

允许的配置键有白名单（`PANEL_CONFIG_KEYS`）；webview 不能写入任意键。

`llm.extraBody` 更新在宿主解析 JSON（`parseExtraBodyJson`）；畸形 JSON 不会在无错误反馈的情况下部分破坏已存对象。

## Extra body 与 headers

`extraBody` 在面板中以 JSON 文本显示——应仅包含非机密的提供商标志。请勿将 API 密钥放入 `extraBody` 或 `extraHeaders`；请使用 **Set API Key** 与官方 header 机制。

## 作用域栏

用户与工作区作用域切换决定更新的 `ConfigurationTarget`。工作区写入需要工作区文件夹；控制器安全解析文件夹 URI。

## 与核心设置 UI 的对比

**LinguaLens: Open Settings** 打开 VS Code 原生设置编辑器（`@ext:…`）。该编辑器同样不显示 SecretStorage 密钥。Webview 面板额外提供模板（DeepSeek/Qwen extra body）与分组字段。

## 信任与工作区文件夹

打开恶意工作区无法在未 compromised 扩展二进制的前提下在面板执行任意代码，因为 webview 仅加载扩展打包的 JavaScript。仍请遵循 VS Code 常规建议：在启用完整功能前信任工作区作者，尤其当工作区设置将 `llm.baseUrl` 覆盖为攻击者控制的主机时——一旦您确认隐私并提供了密钥，扩展会把译文发送到该主机。

面板的 `testConnection` 按钮触发与命令面板相同的宿主侧代码路径；结果仅为状态字符串，从不返回可能嵌凭据的原始 HTTP 体。

## 本地资源与主题

Webview HTML 使用 VS Code CSS 变量（`var(--vscode-*)`）渲染表单控件，不加载外部字体或图片 CDN。`localResourceRoots` 限制为扩展安装目录下的 `settingsPanel` 资源，因此即使工作区包含恶意 `index.html`，也不会被面板当作脚本源加载。面板关闭后 webview 销毁，nonce 与会话状态一并失效，下次打开重新生成 CSP。

## 配置写入与审计

经 `update` 消息写入的配置在扩展宿主执行，与手写 `settings.json` 等效，并受 VS Code 配置合并规则约束。工作区作用域写入需要已信任的工作区文件夹；在不受信任工作区中，面板可能限制部分键或回退到用户作用域——行为与核心设置编辑器一致。建议团队将敏感 `llm.baseUrl` 覆盖策略写入内部安全基线，而非依赖面板隐藏密钥（密钥本就不在面板中）。

## 威胁建模边界

本面板不渲染用户 Markdown 或仓库文件内容，XSS 风险主要来自扩展自身 HTML 模板被篡改（供应链）。用户不应从不可信来源安装 VSIX。`postMessage` 仅处理白名单键，webview 无法请求任意 `executeCommand`。若 VS Code 报告 webview 安全警告，优先更新扩展版本与编辑器补丁。

## 与 SecretStorage 轮换

轮换 API 密钥时使用命令 **Set API Key** / **Clear API Key**，而非通过面板。密钥按 origin 存储多个提供商时可 **Clear API Key** 选择清除全部，避免旧密钥残留。`testConnection` 失败信息不回显密钥前缀，减少肩窥风险。

## 无障碍与键盘

Webview 表单控件继承 VS Code 主题对比度；焦点顺序与原生设置编辑器可能不同。屏幕阅读器用户仍可使用 **LinguaLens: Open Settings** 打开核心设置 JSON 编辑 LLM 字段。面板适合视觉化分组，非唯一配置入口。

## 版本升级与 CSP

升级扩展后若面板空白，检查是否加载了旧版缓存 webview（重载窗口）。CSP nonce 每会话变化，禁止将 panel HTML 保存到仓库离线打开。安全报告请发送至项目维护者，勿公开披露未修复的 XSS 链。## 数据驻留与 LLM 端点

面板可修改 `llm.baseUrl` 指向任意兼容主机；这不改变 PrivacyGuard 对「内容离开本机」的提示义务。团队应通过工作区策略限制不可信仓库覆盖端点。`testConnection` 仅发送最小 ping 类 completion，不应包含用户源码；仍经过所选提供商网络路径，合规审查时需计入。

## 与 Open Settings 命令的并存

用户可同时使用原生设置搜索与 Webview 面板；两者写入同一配置键，后写入者生效。无密钥字段重复，不会双倍存储。文档应引导敏感操作使用命令 **Set API Key**，面板文案亦指向该命令。

Red team 测试应针对扩展打包产物而非用户仓库；工作区无法向 panel 注入脚本，除非同时存在恶意 VSIX 或供应链篡改。定期依赖审计与 `npm audit` 是发布者责任，与面板 CSP 互补。

## 小结

设置面板 = CSP + 白名单配置键 + 无密钥 webview；密钥与 `testConnection` 留在扩展宿主。用户应信任扩展来源，并谨慎对待工作区对 `baseUrl` 的覆盖。配置 LLM 的步骤见[配置提供商](../how-to/configure-providers.md)；extra body 在面板可见但仍不得含密钥。Webview 与 SecretStorage 的分工是扩展安全模型的基石，新功能应默认延续此边界。若未来在面板展示「已配置密钥」状态，应仅为布尔指示，永不回显密钥材料或前缀。状态栏密钥指示器同样只显示是否已配置，不显示密钥内容。面板与原生设置并存，用户可任选其一完成非密钥配置。安全模型以本页为准。

## 相关文档

- [配置 LLM 提供商](../how-to/configure-providers.md)
- [Extra body](../how-to/extra-body-thinking.md)
- [架构](architecture.md)
