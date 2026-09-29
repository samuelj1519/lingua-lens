# 管理翻译缓存

## 目标

控制 AI Translate 如何存储与复用 LLM 结果以节省延迟与 API 成本，并了解配置或内容变更后何时应清空缓存。

## 前提

- 基本理解[缓存](../explanation/caching.md)键组成：text、`targetLang`、`model`、`promptVersion`、`baseUrl`、`extraBodyHash`（自 **0.4.3**）。

## 缓存层

`CacheService` 维护：

1. **内存 LRU** — 大小 `aiTranslate.cache.memoryEntries`（默认 2000）。
2. **磁盘 JSONL** — 位于扩展 `globalStorageUri/cache/v2`，上限 `aiTranslate.cache.maxDiskMB`（默认 50 MB）。

查找顺序：内存 → 磁盘 → 未命中 → LLM。磁盘命中提升到内存。

## 步骤 1：启用或禁用缓存

应用程序作用域：

```json
{
  "aiTranslate.cache.enabled": true,
  "aiTranslate.cache.memoryEntries": 2000,
  "aiTranslate.cache.maxDiskMB": 50
}
```

`enabled` 为 false 时，`get`/`set` 无操作；每次翻译都调用 API。

## 步骤 2：理解逻辑失效

以下任一项变更会计算**新缓存键**：

- 源分段文本（悬停/字符串占位符提取后）。
- `aiTranslate.targetLanguage`。
- `aiTranslate.llm.model`。
- `aiTranslate.llm.baseUrl`。
- `aiTranslate.llm.extraBody`（哈希）。
- 提示词版本（内置提示模板、匹配的术语表术语、自定义 `llm.systemPrompt`）。

单独改 temperature **不会**改变键，除非在提供商侧移入 `extraBody`。

## 步骤 3：手动清空缓存

1. 从命令面板运行 **AI Translate: Clear Cache**。
2. 确认模态警告。
3. 内存与磁盘存储被清空；显示消息 `msg.cacheCleared`。

适用于：

- 大规模提示词或术语表实验后。
- 怀疑损坏条目（读取时空值会被删除）。
- 调试「陈旧」译文且变更的设置**不在**键中（少见）。

## 步骤 4：按操作绕过缓存

| 操作 | 行为 |
|------|------|
| `aitranslate:` 文档上**刷新预览** | `bypassCache: true` → `invalidateDocumentSegmentCaches` 后重新翻译。 |
| 悬停**重新翻译** / 刷新命令 | 经 `refreshHoverTranslation` 传递 `bypassCache`。 |
| 选区翻译 | 默认使用缓存；除清空后重跑外无专用绕过命令。 |

## 步骤 5：文档批量缓存

`translateBatch` 在成功解析后按项写入键。`peekDocumentBatchCache` 支持快速重开预览。恒等译文（`isSameTranslationAsSource`）可能跳过缓存写入但仍返回结果。

## 步骤 6：观察缓存效果

状态栏 / 统计服务跟踪 `memoryHits`、`diskHits`、`apiCalls`（内部）。粗略验证：同一悬停翻译两次，第二次应更快且在 `info` 日志无新 API 调用。

设置面板可能通过 `cacheService.stats()` 显示缓存统计（内存条目数、磁盘字节）。

## 大型项目调优

```json
{
  "aiTranslate.cache.memoryEntries": 5000,
  "aiTranslate.cache.maxDiskMB": 200
}
```

磁盘压缩在初始化后延迟定时器运行（`compact()` 约 30s）。`deactivate` 刷新磁盘。

## 陷阱

| 陷阱 | 说明 |
|------|------|
| 改 system prompt 后译文陈旧 | 提示词版本改变键——旧条目孤立直至磁盘上限淘汰。 |
| 相同文本不同提供商 | 键含 `baseUrl`——正确行为。 |
| 空缓存条目 | 读取时自动删除（`trim` 检查）。 |
| 禁用缓存仍有 inflight 去重 | `inflight` Map 在同会话去重并发相同键。 |
| 隐私 | 缓存将**译文明文**存于全局存储磁盘——保护机器访问。 |

## 开发者说明：缓存位置

磁盘文件位于扩展 `globalStorageUri` 下（每台机器、每次安装），不在仓库内。Git 不同步。卸载扩展可能依编辑器行为删除全局存储；将缓存视为可丢弃的加速，而非真相来源。

## 与目标语言、术语表联动

更改 `aiTranslate.targetLanguage` 会使所有新查找使用新 `targetLang` 分量，旧目标语言的磁盘条目仍占用空间直至 LRU/压缩淘汰，不会自动删除——若磁盘紧张可在切换目标后运行 **Clear Cache**。向 `.translate-glossary.json` 添加术语会改变 `promptVersion`，即使悬停文本未变也会 miss；这是为了让新术语进入模型上下文。若仅调试术语表匹配，可临时禁用缓存，避免误以为「译文未更新」实为命中旧键。

## 团队与 CI 注意事项

缓存目录位于开发者本机 globalStorage，不会进入 Git。CI 集成测试若共享同一 runner 用户，可能复用磁盘缓存导致偶发「无 API 调用」——测试套件应使用隔离 globalStorage 或禁用缓存。不要在缓存目录中手工编辑 JSONL；损坏行会在读取时删除对应键，但可能导致难以复现的间歇 miss。

## 典型排障场景

**现象：** 更换 `llm.systemPrompt` 后悬停仍显示旧措辞。**原因：** 若提示词变更未反映在 `promptVersion` 计算中（极少见）或您看到的是不同占位符文本，可能仍命中旧键；正常情况下 prompt 变更应 miss。**操作：** 运行 **Clear Cache** 或改一个无关设置触发 `configure()`。

**现象：** 同一英文句子在两个仓库注释中译文一致。**原因：** 键不含文件路径，跨项目复用是设计行为。**操作：** 若需隔离，只能禁用缓存或使用不同模型/目标/extra body。

**现象：** 磁盘占用接近 `maxDiskMB`。**原因：** JSONL 分片累积。**操作：** 清空缓存或增大上限；`compact()` 在扩展生命周期内异步运行，不必重启编辑器。

## inflight 与缓存的协作

当十个悬停同时请求相同字符串时，`inflight` Map 只发起一次 HTTP，结果写入缓存后供后续等待者读取。这与「第二次悬停读缓存」不同：inflight 解决同一时刻并发，缓存解决跨时间复用。禁用 `cache.enabled` 后 inflight 仍生效，故压力测试时仍会看到合并请求。文档批量内多段不同文本不会 inflight 合并，但相同段落在重复预览时会走 `peekDocumentBatchCache`。

## 文档维护者与写作者

撰写本扩展文档的团队若在 CI 中频繁改 `llm.systemPrompt` 做 A/B，应在流水线末尾 **Clear Cache** 或固定专用 `model`+`promptVersion` 测试机，避免开发者本机磁盘缓存与 CI 行为不一致。对外发布前检查 `cache.maxDiskMB` 是否适合目标用户磁盘（笔记本默认 50 MB 通常足够）。若用户报告「译文永远不变」，先问是否命中缓存、是否改动了不在键中的参数（如仅改 `maxRetries`），再建议 **Clear Cache** 与 bypass 刷新预览，避免不必要的提供商工单排查。将 `memoryEntries` 从 2000 提到 5000 对 16 GB 内存开发机通常安全；若扩展宿主 OOM，再降回默认。磁盘 `maxDiskMB` 触顶时旧分片按策略淘汰，用户可能感到「很久以前的译文又变新」，属正常 LRU 行为而非 bug。

## 小结

缓存是默认启用的性能与成本优化层；理解键组成比频繁清空更重要。仅在变更 `systemPrompt`/术语表、调试模型随机性或怀疑损坏条目时优先 **Clear Cache**；日常切换目标或模型会自动使用新键空间。阅读[缓存说明](../explanation/caching.md)可深入键字段与 D7 废止背景，便于向同事解释「换 DeepSeek 后为何旧译文不再出现」。以上即缓存运维要点。

## 相关文档

- [缓存](../explanation/caching.md)
- [Extra body](./extra-body-thinking.md)
- [配置提供商](./configure-providers.md)
