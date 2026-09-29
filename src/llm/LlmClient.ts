import type { TranslateConfig } from '../config/types';
import type { ApiKeyStore } from '../secrets/ApiKeyStore';
import type { AppLogger } from '../util/logger';
import { LlmError } from './errors';
import { assertNonEmptyTranslation } from './outputBudget';
import { backoffDelay, parseRetryAfter } from './retry';
import { logLlmFailure, parseUsageFromApi, type LlmUsageSnapshot } from './requestFailureLog';
import { RequestSemaphore } from './semaphore';
import { applySseChunk, type SseCompletionAggregate } from './sseAggregate';
import { parseSseDataLine } from './sseContent';
import { redactSecrets } from '../secrets/redact';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  maxTokens?: number;
  json?: boolean;
  priority: 'interactive' | 'background';
  signal?: AbortSignal;
  /** Shown in output-channel failure logs (e.g. hover, selection, document-batch). */
  feature?: string;
}

export interface ChatResponse {
  content: string;
  usage?: { promptTokens: number; completionTokens: number };
  model: string;
  latencyMs: number;
}

export class LlmClient {
  private readonly sem: RequestSemaphore;
  private jsonUnsupported = new Set<string>();

  constructor(
    private getConfig: () => TranslateConfig,
    private readonly apiKeys: ApiKeyStore,
    private readonly log?: AppLogger,
  ) {
    this.sem = new RequestSemaphore(getConfig().llm.maxConcurrency);
  }

  private chatUrl(baseUrl: string): string {
    const trimmed = baseUrl.replace(/\/+$/, '');
    if (trimmed.endsWith('/chat/completions')) return trimmed;
    return `${trimmed}/chat/completions`;
  }

  private capabilityKey(): string {
    const c = this.getConfig();
    return `${c.llm.baseUrl}|${c.llm.model}`;
  }

  private redactMessage(message: string, requestKey?: string): string {
    const known = requestKey ? [requestKey] : [];
    return redactSecrets(message, known);
  }

  private llmError(
    kind: LlmError['kind'],
    message: string,
    status?: number,
    retryAfterMs?: number,
    meta?: LlmError['meta'],
    requestKey?: string,
  ): LlmError {
    return new LlmError(kind, this.redactMessage(message, requestKey), status, retryAfterMs, meta);
  }

  private failureContext(
    req: ChatRequest,
    config: TranslateConfig,
    error: LlmError,
    extras?: { finishReason?: string; usage?: LlmUsageSnapshot; httpStatus?: number },
  ): void {
    logLlmFailure(this.log, {
      feature: req.feature ?? 'chat',
      model: config.llm.model,
      baseUrl: config.llm.baseUrl,
      httpStatus: extras?.httpStatus ?? error.status,
      finishReason: extras?.finishReason ?? error.finishReason,
      usage: extras?.usage ?? error.usage,
      error,
    });
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const config = this.getConfig();
    this.sem.setMax(config.llm.maxConcurrency);
    const key = await this.apiKeys.get(config.llm.baseUrl);
    if (!key) throw new LlmError('noKey', 'API Key is not set');
    if (!config.llm.model) throw new LlmError('noModel', 'Model name is not configured');

    const release = await this.sem.acquire(req.priority);
    const start = Date.now();
    try {
      return await this.chatWithRetry(req, key, config, start);
    } finally {
      release();
    }
  }

  private async chatWithRetry(
    req: ChatRequest,
    key: string,
    config: TranslateConfig,
    start: number,
  ): Promise<ChatResponse> {
    let attempt = 0;
    let useJson = req.json && config.llm.jsonMode !== 'off';
    const capKey = this.capabilityKey();
    if (this.jsonUnsupported.has(capKey)) useJson = false;
    if (config.llm.jsonMode === 'on' && req.json) useJson = true;

    let degraded: { noJson?: boolean; noTemp?: boolean } = {};

    while (true) {
      try {
        const res = await this.doFetch(req, key, config, !!(useJson && !degraded.noJson), !degraded.noTemp);
        this.sem.onSuccess();
        return { ...res, latencyMs: Date.now() - start };
      } catch (e) {
        if (e instanceof LlmError) {
          if (e.kind === 'auth' || e.kind === 'noKey' || e.kind === 'noModel' || e.kind === 'cancelled') {
            this.failureContext(req, config, e);
            throw e;
          }
          if (e.kind === 'badRequest' && req.json && useJson) {
            this.jsonUnsupported.add(capKey);
            useJson = false;
            degraded.noJson = true;
            continue;
          }
          if (e.kind === 'rateLimit') {
            this.sem.onRateLimit();
          }
          if (attempt >= config.llm.maxRetries) {
            this.failureContext(req, config, e);
            throw e;
          }
          if (e.kind === 'rateLimit' || e.kind === 'server' || e.kind === 'timeout' || e.kind === 'network') {
            const wait = e.retryAfterMs ?? backoffDelay(attempt);
            const hoverCap = req.priority === 'interactive' ? 5000 : Infinity;
            if (req.priority === 'interactive' && wait > hoverCap - (Date.now() - start)) {
              this.failureContext(req, config, e);
              throw e;
            }
            await new Promise((r) => setTimeout(r, wait));
            attempt++;
            continue;
          }
          this.failureContext(req, config, e);
          throw e;
        }
        throw e;
      }
    }
  }

  private async doFetch(
    req: ChatRequest,
    key: string,
    config: TranslateConfig,
    json: boolean,
    useTemperature: boolean,
  ): Promise<Omit<ChatResponse, 'latencyMs'>> {
    const url = this.chatUrl(config.llm.baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.llm.extraHeaders,
    };
    if (!headers.Authorization) {
      headers.Authorization = `Bearer ${key}`;
    }

    const useStream = config.llm.stream && req.priority === 'interactive' && !json;
    const body: Record<string, unknown> = {
      model: config.llm.model,
      messages: req.messages,
      ...config.llm.extraBody,
      stream: useStream,
    };
    if (useTemperature) body.temperature = config.llm.temperature;
    if (req.maxTokens) body.max_tokens = req.maxTokens;
    if (json) body.response_format = { type: 'json_object' };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.llm.timeoutMs);
    if (req.signal) {
      req.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (useStream && res.ok && res.body) {
        const agg = await readSseAggregate(res.body, controller.signal);
        assertNonEmptyTranslation({
          content: agg.content,
          reasoningContent: agg.reasoningContent,
          finishReason: agg.finishReason,
          usage: agg.usage,
        });
        return {
          content: agg.content,
          model: config.llm.model,
          usage: agg.usage
            ? {
                promptTokens: agg.usage.promptTokens ?? 0,
                completionTokens: agg.usage.completionTokens ?? 0,
              }
            : undefined,
        };
      }

      if (res.status === 401 || res.status === 403) {
        throw this.llmError('auth', `Invalid API Key or forbidden (HTTP ${res.status})`, res.status, undefined, undefined, key);
      }
      if (res.status === 404) {
        throw this.llmError('notFound', 'API endpoint or model not found', res.status, undefined, undefined, key);
      }
      if (res.status === 429) {
        const ra = parseRetryAfter(res.headers.get('Retry-After'));
        throw this.llmError('rateLimit', 'Rate limit exceeded', res.status, ra, undefined, key);
      }
      if (res.status >= 500) {
        throw this.llmError('server', `Service unavailable (HTTP ${res.status})`, res.status, undefined, undefined, key);
      }
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 400 && /context|length|token/i.test(text)) {
          throw this.llmError('contextLength', text.slice(0, 200), res.status, undefined, undefined, key);
        }
        throw this.llmError('badRequest', text.slice(0, 200) || `HTTP ${res.status}`, res.status, undefined, undefined, key);
      }

      const data = (await res.json()) as {
        choices?: {
          message?: { content?: string | null; reasoning_content?: string | null };
          finish_reason?: string;
        }[];
        usage?: unknown;
        model?: string;
      };
      const choice = data.choices?.[0];
      const msg = choice?.message;
      const content = msg?.content ?? '';
      const reasoningContent = msg?.reasoning_content ?? '';
      const finishReason = choice?.finish_reason;
      const usage = parseUsageFromApi(data.usage);
      assertNonEmptyTranslation({
        content,
        reasoningContent,
        finishReason,
        usage,
      });
      return {
        content,
        model: data.model ?? config.llm.model,
        usage: usage
          ? {
              promptTokens: usage.promptTokens ?? 0,
              completionTokens: usage.completionTokens ?? 0,
            }
          : undefined,
      };
    } catch (e) {
      clearTimeout(timeout);
      if (req.signal?.aborted) throw new LlmError('cancelled', 'Cancelled');
      if (e instanceof LlmError) throw e;
      if (e instanceof Error && e.name === 'AbortError') {
        throw this.llmError('timeout', `Request timed out (${config.llm.timeoutMs}ms)`, undefined, undefined, undefined, key);
      }
      throw this.llmError('network', e instanceof Error ? e.message : 'Network error', undefined, undefined, undefined, key);
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string; latencyMs?: number; model?: string }> {
    try {
      const res = await this.chat({
        messages: [{ role: 'user', content: 'Reply with OK only.' }],
        maxTokens: 5,
        priority: 'interactive',
        feature: 'test-connection',
      });
      return {
        ok: true,
        message: `Connected (${res.latencyMs}ms), model ${res.model}`,
        latencyMs: res.latencyMs,
        model: res.model,
      };
    } catch (e) {
      return { ok: false, message: e instanceof LlmError ? e.message : String(e) };
    }
  }
}

async function readSseAggregate(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): Promise<SseCompletionAggregate> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let agg: SseCompletionAggregate = { content: '', reasoningContent: '' };
  while (true) {
    if (signal.aborted) throw new LlmError('cancelled', 'Cancelled');
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const json = parseSseDataLine(line);
      if (!json) continue;
      agg = applySseChunk(agg, json);
    }
  }
  return agg;
}
