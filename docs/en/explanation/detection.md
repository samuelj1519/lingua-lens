# Language detection and skip logic

`LanguageDetector` uses script ratios, min length, and optional strict Chinese variant. Skipped segments are not sent to the LLM. Document and hover share the same rules unless `forceTranslate` is on.
