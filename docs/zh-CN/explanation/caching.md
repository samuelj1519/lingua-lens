# 缓存

LinguaLens 缓存 LLM 的**模型输出字符串**（内存中在占位符恢复之前；存储的是模型原始返回值），以降低延迟并避免对相同工作重复计费。

## 键组成（自 0.4.3 起）

`CacheService.key()` 对以 NUL 分隔的载荷做哈希：

1. **text** — 源分段或单元文本（悬停时占位符已提取到 unit.text）。
2. **targetLang** — 例如 `zh-CN`。
3. **model** — `aiTranslate.llm.model`。
4. **promptVersion** — 来自 `PromptBuilder.promptVersion()`（kind、target、术语表哈希、自定义 system prompt）。
5. **baseUrl** — 完整配置的 base URL 字符串。
6. **extraBodyHash** — `JSON.stringify(extraBody ?? {})` 的 SHA-256 前 16 个十六进制字符。

```typescript
// 概念示意（见 TranslationService.cacheKey 与 CacheService.key）
sha256Hex(
  [text, targetLang, model, promptVersion, baseUrl, extraBodyHash].join('\0')
)
```

工程决策 **D7** 最初将 `baseUrl` 排除在键外；该决策**已废止**——键现包含 `baseUrl` 与 `extraBodyHash`，切换端点或思考类标志时不会返回错误的缓存译文。见[决策记录](decisions.md)。

### 不在键中的内容

- `temperature`、`timeoutMs`、`maxRetries`（除非编码在提供商特定的 `extraBody` 中）。
- API 密钥（从不缓存）。
- 文件路径或 URI（两处文件中的相同字符串共享缓存——通常符合预期）。

### 提示词版本

修改 `llm.systemPrompt`、术语表匹配或批量 kind（`hover` 与 `documentBatch`、`documentFrontmatterBatch`）会改变 `promptVersion`，从而改变键。

## 存储层级

| 层级 | 位置 | 策略 |
|------|------|------|
| 内存 | 进程内 `LruCache` | `cache.memoryEntries`（默认 2000） |
| 磁盘 | `globalStorageUri/cache/v2` JSONL 分片 | `cache.maxDiskMB`（默认 50） |

磁盘命中会提升到内存。`configure()` 在设置变更时重建缓存。

## 读路径

`TranslationService.translate` / `peekCache`：

1. 缓存禁用 → 未命中。
2. 内存命中 → `resultFromCached` → 恢复占位符 → 返回。
3. 磁盘命中 → 统计 `diskHits`，提升，恢复。
4. 无效或空缓存值 → 删除键，未命中。

`isCacheableTranslation` 拒绝空/仅空白字符串。

## 写路径

LLM 成功响应并清理后：

- `cache.set(key, cleaned, { model, targetLang })`。
- 批量路径在译文与源不同时按项写入（`isSameTranslationAsSource` 可能跳过写入）。

## 失效

- **清空缓存**命令——清除所有层级。
- 带 bypass 的**刷新预览**——`invalidateDocumentSegmentCaches` 删除当前会话分段的键。
- 读取时发现损坏条目时 **delete(key)**。

## 进行中去重

与缓存分开：`TranslationService` 中的 `inflight` Map 确保并发相同键共享一个 Promise（防惊群）。

## 与失败暂停的交互

缓存不能绕过重复鉴权/网络/服务器错误后的 `TranslationService` 暂停。暂停期间仍可读缓存。

## 隐私说明

磁盘缓存包含用户全局存储目录中的**译文明文**。请保护工作站访问权限；在共享机器上请清空缓存。

## 运维调优

对注释重复度高的大型 monorepo 可增大 `memoryEntries`。长文档会话可增大 `maxDiskMB`。仅在调试模型随机性（temperature > 0）时禁用缓存。

## 版本历史说明

0.4.3 之前，缓存键省略 `baseUrl` 与 `extraBodyHash`。升级扩展不会迁移旧分片文件；它们保留直至按大小压缩或手动清空。升级后首次用新键查找会未命中旧条目——行为安全，不会出现跨提供商的陈旧命中。

术语表变更会影响 `promptVersion`，即使源文本未变，会话中途添加术语也会导致下次悬停缓存未命中——这是设计使然，使新术语无需手动清空即可到达模型。

## 与文档会话的交互

`DocTranslationService` 在批量翻译前对每段调用 `peekDocumentBatchCache`，使重新打开预览时尽可能从磁盘恢复段落结果。`invalidateDocumentSegmentCaches` 仅删除当前 `DocSession` 已知分段对应的键，不会清空全局悬停缓存——这是为了在「刷新预览」与「清空全部缓存」之间提供粒度控制。Frontmatter 批量与正文批量使用不同 `promptVersion`，即使文本相同也不会错误共享条目。

## 统计与可观测性

内部 `CacheService.stats()` 暴露内存条目数与磁盘占用字节，设置面板可选展示。`TranslationService` 在日志级别 `debug` 时可打印 cache hit/miss 原因，便于区分「键变更」与「缓存被禁用」。集成测试环境通常仍启用缓存，以验证键稳定性；若测试需要确定性输出，请在用例级禁用 `aiTranslate.cache.enabled` 而非删除 globalStorage 目录。

## 内存与磁盘一致性

`configure()` 在缓存相关设置变化时重建内存 LRU，但不一定立即删除磁盘分片——旧哈希域条目可能残留直至 `maxDiskMB` 压缩。这不会造成错误命中，因为新查找使用新哈希。`deactivate()` 路径会 flush，降低异常退出时丢失最近写入的风险。单条 `delete(key)` 在内存与磁盘同步移除，用于损坏值自愈。

## 与 temperature 随机性

默认 `temperature` 较低时，重复 API 调用与缓存命中结果应接近；若将 temperature 调高做创意翻译，缓存仍返回首次写入的字符串，直到键失效或 bypass。调试随机性时应禁用缓存或每次 **Clear Cache**，否则难以比较模型采样差异。

## SHA-256 与键碰撞

使用 SHA-256 十六进制摘要作为键名，碰撞概率可忽略。载荷用 NUL 分隔字段，避免相邻文本拼接歧义。`extraBodyHash` 仅取前缀 16 hex 为节省键长；理论上存在不同 body 碰撞可能，实践中极低。切勿在扩展外实现「兼容」缓存读取，私有格式无稳定公开契约。

## 批量与悬停键空间统一

悬停 `kind: hover` 与文档 `documentBatch` 通过不同 `promptVersion` 区分，相同句子不会跨 kind 共享缓存，避免批量 JSON 模板污染悬停短回复。Frontmatter 批量第三套 promptVersion，确保标题翻译不沿用正文批量语气设置。监控磁盘目录大小可间接验证缓存命中率；异常增长可能意味着大量唯一字符串注释或频繁变更 `extraBody` 导致无法复用旧分片。卸载扩展不保证删除 globalStorage；企业映像克隆可能复制缓存目录，换机后偶见旧译文，**Clear Cache** 即可。键设计自 0.4.3 含 `baseUrl` 后，多提供商共用一台机器不再交叉污染缓存。

## 小结

缓存键自 0.4.3 起包含端点与 extra body 哈希；读路径内存优先，写路径在成功后落盘；与 inflight 去重、失败暂停、文档段失效协同工作，构成翻译服务的性能核心。操作指南见[管理与清空缓存](../how-to/cache.md)；变更 `extraBody` 时键自动变化，无需牢记 D7 废止前的旧行为。磁盘明文缓存提醒共享电脑用户在离职前执行 **Clear Cache**。`peekCache` 与 `translate` 共享读路径，文档批量预热依赖同一套键逻辑。`isCacheableTranslation` 过滤空白译文，避免磁盘膨胀无意义条目。缓存层与 LLM 层解耦，暂停翻译时仍可安全读取历史译文。

## 相关文档

- [管理与清空缓存](../how-to/cache.md)
- [Extra body](../how-to/extra-body-thinking.md)
- [架构](architecture.md)
