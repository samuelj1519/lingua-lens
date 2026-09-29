import type { TranslateConfig } from '../config/types';
import type { ApiKeyStore } from '../secrets/ApiKeyStore';
import { LlmError } from './errors';
import { backoffDelay, parseRetryAfter } from './retry';
import { RequestSemaphore } from './semaphore';

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

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const config = this.getConfig();
    this.sem.setMax(config.llm.maxConcurrency);
    const key = await this.apiKeys.get(config.llm.baseUrl);
    if (!key) throw new LlmError('noKey', '未设置 API Key');
    if (!config.llm.model) throw new LlmError('noModel', '未配置模型名');

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
          if (attempt >= config.llm.maxRetries) throw e;
          if (e.kind === 'rateLimit' || e.kind === 'server' || e.kind === 'timeout' || e.kind === 'network') {
            const wait = e.retryAfterMs ?? backoffDelay(attempt);
            const hoverCap = req.priority === 'interactive' ? 5000 : Infinity;
            if (req.priority === 'interactive' && wait > hoverCap - (Date.now() - start)) throw e;
            await new Promise((r) => setTimeout(r, wait));
            attempt++;
            continue;
          }
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

    const body: Record<string, unknown> = {
      model: config.llm.model,
      messages: req.messages,
      stream: false,
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

      if (res.status === 401 || res.status === 403) {
        throw new LlmError('auth', `API Key 无效或无权限 (HTTP ${res.status})`, res.status);
      }
      if (res.status === 404) {
        throw new LlmError('notFound', '接口地址或模型不存在', res.status);
      }
      if (res.status === 429) {
        const ra = parseRetryAfter(res.headers.get('Retry-After'));
        throw new LlmError('rateLimit', '请求过于频繁', res.status, ra);
      }
      if (res.status >= 500) {
        throw new LlmError('server', `服务暂时不可用 (HTTP ${res.status})`, res.status);
      }
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 400 && /context|length|token/i.test(text)) {
          throw new LlmError('contextLength', text.slice(0, 200), res.status);
        }
        throw new LlmError('badRequest', text.slice(0, 200) || `HTTP ${res.status}`, res.status);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        model?: string;
      };
      const content = data.choices?.[0]?.message?.content;
      if (content === undefined) {
        throw new LlmError('invalidResponse', '模型返回格式无效');
      }
      return {
        content,
        model: data.model ?? config.llm.model,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens ?? 0,
              completionTokens: data.usage.completion_tokens ?? 0,
            }
          : undefined,
      };
    } catch (e) {
      clearTimeout(timeout);
      if (req.signal?.aborted) throw new LlmError('cancelled', '已取消');
      if (e instanceof LlmError) throw e;
      if (e instanceof Error && e.name === 'AbortError') {
        throw new LlmError('timeout', `请求超时 (${config.llm.timeoutMs}ms)`);
      }
      throw new LlmError('network', e instanceof Error ? e.message : '网络错误');
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await this.chat({
        messages: [{ role: 'user', content: 'Reply with OK only.' }],
        maxTokens: 5,
        priority: 'interactive',
      });
      return { ok: true, message: `连接成功 (${res.latencyMs}ms)，模型 ${res.model}` };
    } catch (e) {
      return { ok: false, message: e instanceof LlmError ? e.message : String(e) };
    }
  }
}
