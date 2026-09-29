# 架构

入口：`src/extension.ts`。悬停流水线：提取 → 隐私守卫 → 检测 → 缓存 → `LlmClient`。全文流程：分段 → 计划 → 批量翻译 → `DocumentAssembler` 预览。
