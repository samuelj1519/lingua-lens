# 语言检测与跳过逻辑

`LanguageDetector` 依据书写系统比例、最小长度与可选的严格中文变体判断。跳过的段落不会调用 LLM。全文与悬停共用规则，除非开启 `forceTranslate`。
