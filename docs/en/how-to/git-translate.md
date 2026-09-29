# Translate Git commit messages

## Goal

Translate Git commit message text from history (at a line in a repo file) or from the SCM commit input box, using the same LLM and detection stack as selection translation.

## Prerequisites

- Repository with Git integration (`vscode.git` extension active).
- `aiTranslate.hover.gitCommitMessage` enabled (default true) for hover on commit lines; commands work independently.
- LLM configured ([Configure providers](./configure-providers.md)).
- Privacy acknowledged.

## Commands

| Command | Purpose |
|---------|---------|
| **AI Translate: Translate Git Commit at Line** | Reads commit message for the commit associated with the active line in a tracked file. |
| **AI Translate: Translate SCM Input** | Translates text currently in the Source Control commit message input. |

## Step 1: Translate a historical commit message

1. Open a file under Git tracking in a **file** scheme workspace (`file://`).
2. Place the cursor on a line that belongs to a commit (blame/history context).
3. Run **AI Translate: Translate Git Commit at Line**.
4. `getCommitMessageAtLine` resolves the message; if empty, you see a warning (`msg.git.noCommitMessage`).
5. Translation opens in a virtual Markdown document (title from `hover.title.gitCommit`) unless SCM replace flow applies.

Requirements:

- Active editor must exist and `document.uri.scheme === 'file'`.
- Otherwise: warning to use inside a repository (`msg.git.useInRepo`).

## Step 2: Translate the SCM input box

1. Type or paste your draft commit message in **Source Control** input.
2. Run **AI Translate: Translate SCM Input**.
3. If input is empty, warning `msg.scm.empty`.
4. After translation, a prompt offers **Replace** (writes `inputBox.value` on the first repository) or view-only.

`replaceScm` path uses the Git extension API:

```typescript
git.getAPI(1).repositories[0].inputBox.value = result.text;
```

Only the first repository is updated; multi-repo workspaces may need manual copy.

## Step 3: Target language for Git text

`resolveSelectionTargetLanguage` may adjust target based on message content (same helper as other selection flows). Workspace `aiTranslate.targetLanguage` is the baseline.

Example user settings:

```json
{
  "aiTranslate.targetLanguage": "en",
  "aiTranslate.hover.gitCommitMessage": true
}
```

## Step 4: Hover on commit-associated lines

When enabled, document hover over relevant Git contexts can show commit message translation via `DocumentHoverExtractor` / git hover path (see architecture). Ensure hover delay and max chars accommodate commit message length.

## Step 5: Verify

- Command produces Markdown preview with translated subject/body.
- Secrets in commit messages are blocked when `privacy.blockSecrets` matches patterns (`msg.secretNotSent`).
- **Test Connection** still valid; translation uses `kind: 'selection'` cache keys.

## Provider examples (same as elsewhere)

DeepSeek:

```json
{
  "aiTranslate.llm.baseUrl": "https://api.deepseek.com/v1",
  "aiTranslate.llm.model": "deepseek-chat",
  "aiTranslate.llm.extraBody": { "thinking": { "type": "disabled" } }
}
```

Qwen:

```json
{
  "aiTranslate.llm.baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "aiTranslate.llm.model": "qwen-plus",
  "aiTranslate.llm.extraBody": { "enable_thinking": false }
}
```

## Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| No message at line | Line not linked to a commit in Git history view. |
| Wrong repo in SCM replace | Copy from preview manually for non-first repo. |
| Conventional commits broken | Review translation before replace; prefixes may be localized unintentionally. |
| Long messages truncated in UI | Hover `maxChars` may clip; use command for full text. |
| Excluded workspace | `.git` paths are excluded from file translation, not from Git message commands. |

## Keyboard and menu discovery

Git translate commands appear in the Command Palette under category **AI Translate**. They are not bound to default key chords in `package.json`; assign your own keybindings in `keybindings.json` if you translate commit messages frequently:

```json
{
  "key": "ctrl+shift+g t",
  "command": "aiTranslate.translateScmInput",
  "when": "scmRepository"
}
```

## Related documentation

- [Configure providers](./configure-providers.md)
- [Architecture](../explanation/architecture.md)
