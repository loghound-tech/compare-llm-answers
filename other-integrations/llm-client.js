/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  LLM Client — Reusable Library for Querying LLMs               ║
 * ║  Works with Abacus AI RouteLLM (OpenAI-compatible endpoints)    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Drop this file into any web app to get:
 *   - Streaming & non-streaming chat completions
 *   - API key management (localStorage-backed)
 *   - Conversation history tracking
 *   - File/image attachment support (multimodal)
 *   - Token usage tracking
 *   - Abort/cancel support
 *   - Retry with exponential backoff
 *   - Multiple provider presets
 *
 * Usage:
 *   import { LLMClient } from './llm-client.js';
 *   const client = new LLMClient({ provider: 'abacus' });
 *   // or: const client = new LLMClient({ baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-...' });
 */

// ─── PROVIDER PRESETS ───────────────────────────────────────────────
const PROVIDERS = {
  abacus: {
    name: 'Abacus AI RouteLLM',
    baseUrl: 'https://routellm.abacus.ai/v1',
    modelsApiUrl: 'https://apps.abacus.ai/api/v0/listRouteLLMModels',
    keyPrefix: 'abacus_api_key',
    defaultModel: 'gpt-4o',
    models: [
      // Routing
      'route-llm',
      // OpenAI
      'gpt-5.2-codex', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo-2024-04-09', 'gpt-4', 'gpt-3.5-turbo',
      // Anthropic
      'claude-sonnet-4-6', 'claude-opus-4-6', 'claude-sonnet-4-5-20250929', 'claude-opus-4-5-20251101',
      'claude-haiku-4-5-20251001', 'claude-opus-4-1-20250805', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219',
      // Google
      'gemini-3.1-pro-preview', 'gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash',
      // xAI
      'grok-4-0709', 'grok-4-1-fast-non-reasoning', 'grok-4-fast-non-reasoning', 'grok-code-fast-1',
      // Meta
      'meta-llama/Llama-4-Maverick', 'meta-llama/Llama-3.1-405B-Turbo', 'meta-llama/Llama-3.1-8B', 'llama-3.3-70b-versatile',
      // Qwen
      'qwen/qwen3-coder-480b-a35b', 'qwen3-max', 'Qwen/Qwen3-235B-A22B-Instruct', 'Qwen/Qwen3-32B',
      'Qwen/QwQ-32B', 'Qwen/Qwen2.5-72B-Instruct', 'qwen-2.5-coder-32b',
      // DeepSeek
      'deepseek-ai/DeepSeek-V3.2', 'deepseek/deepseek-v3.1', 'deepseek/deepseek-v3.1-Terminus', 'deepseek-ai/deepseek-R1',
      // Kimi
      'kimi-k2.5', 'kimi-k2-turbo-preview',
      // ZhipuAI
      'zai-org/glm-5', 'zai-org/glm-4.7', 'zai-org/glm-4.6', 'zai-org/glm-4.5',
      // Other
      'openai/gpt-oss-120b'
    ]
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    keyPrefix: 'openai_api_key',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o1-mini']
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    keyPrefix: 'custom_api_key',
    defaultModel: '',
    models: []
  }
};

// ─── DYNAMIC MODEL FETCHING ─────────────────────────────────────────
/**
 * Fetch the live list of available models from the Abacus AI RouteLLM API.
 * Each model object: { id, name, description, input_token_rate, output_token_rate }
 * Falls back to the hard-coded list if the network request fails.
 *
 * Usage:
 *   import { fetchAvailableModels, populateModelSelect } from './llm-client.js';
 *   const models = await fetchAvailableModels();
 *   populateModelSelect(document.getElementById('mySelect'), models, { selectedValue: 'gpt-4o' });
 */
export async function fetchAvailableModels(url) {
  const endpoint = url || PROVIDERS.abacus.modelsApiUrl;
  try {
    const headers = {};
    const key = localStorage.getItem('abacus_api_key');
    if (key) headers['apikey'] = key;
    const res = await fetch(endpoint, { headers });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    // API returns { success: true, result: [...] } or a plain array
    const raw = Array.isArray(data) ? data : (data.result || data.models || data.data || []);
    if (raw.length > 0) {
      // Normalize: prefer display_name, convert per-token rates to stored floats
      return raw.map(function(m) {
        return {
          id: m.id,
          name: m.display_name || m.name || m.id,
          description: m.description || '',
          input_token_rate:  m.input_token_rate  != null ? Number(m.input_token_rate)  : null,
          output_token_rate: m.output_token_rate != null ? Number(m.output_token_rate) : null
        };
      });
    }
    throw new Error('Empty model list');
  } catch (err) {
    console.warn('[llm-client] Could not fetch models from API, using fallback.', err);
    return PROVIDERS.abacus.models.map(function(id) {
      return { id: id, name: id, description: '', input_token_rate: null, output_token_rate: null };
    });
  }
}

/** Heuristic: derive a provider-group label from a model id/name. */
export function detectModelGroup(name) {
  var n = (name || '').toLowerCase();
  if (n.indexOf('routellm') !== -1 || n.indexOf('route-llm') !== -1) return 'Routing';
  if (n.indexOf('gpt') !== -1 || n.indexOf('openai') !== -1 || n.indexOf('codex') !== -1) return 'OpenAI';
  if (n.indexOf('claude') !== -1) return 'Anthropic';
  if (n.indexOf('gemini') !== -1) return 'Google';
  if (n.indexOf('grok') !== -1) return 'xAI';
  if (n.indexOf('llama') !== -1 || n.indexOf('meta') !== -1) return 'Meta';
  if (n.indexOf('qwen') !== -1 || n.indexOf('qwq') !== -1) return 'Qwen';
  if (n.indexOf('deepseek') !== -1) return 'DeepSeek';
  if (n.indexOf('kimi') !== -1 || n.indexOf('moonshot') !== -1) return 'Kimi';
  if (n.indexOf('glm') !== -1 || n.indexOf('zai-org') !== -1 || n.indexOf('zhipu') !== -1) return 'ZhipuAI';
  if (n.indexOf('mistral') !== -1) return 'Mistral';
  if (n.indexOf('command') !== -1 || n.indexOf('cohere') !== -1) return 'Cohere';
  return 'Other';
}

/** Format a token rate (credits per token) for display. */
export function formatTokenRate(rate) {
  if (rate == null) return '';
  const scaled = Number(rate) * 1_000_000;
  return Number(scaled.toPrecision(4)).toString() + ' credits/token';
}

/**
 * Populate a <select> element with model options grouped by provider.
 * Each option label: "ModelName [$X.XX/1M out]" when pricing is available.
 *
 * @param {HTMLSelectElement} selectEl
 * @param {Array}  modelsList            - Result of fetchAvailableModels()
 * @param {Object} [opts]
 * @param {boolean} [opts.includeNone]   - Prepend a '--- None ---' option
 * @param {string}  [opts.selectedValue] - Model id to pre-select
 */
export function populateModelSelect(selectEl, modelsList, opts) {
  opts = opts || {};
  selectEl.innerHTML = '';
  if (opts.includeNone) {
    var none = document.createElement('option');
    none.value = ''; none.textContent = '\u2014 None \u2014';
    selectEl.appendChild(none);
  }
  var groups = {};
  modelsList.forEach(function(m) {
    var g = detectModelGroup(m.name || m.id);
    if (!groups[g]) groups[g] = [];
    groups[g].push(m);
  });
  var groupOrder = ['Routing', 'Anthropic', 'OpenAI', 'Google', 'Meta', 'xAI', 'DeepSeek', 'Qwen', 'ZhipuAI'];
  Object.entries(groups).sort(function(a, b) {
    var idxA = groupOrder.indexOf(a[0]);
    var idxB = groupOrder.indexOf(b[0]);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    if (idxA !== idxB) return idxA - idxB;
    return a[0].localeCompare(b[0]);
  }).forEach(function(entry) {
    var gName = entry[0], models = entry[1];
    var grp = document.createElement('optgroup');
    grp.label = '\u2500\u2500 ' + gName + ' \u2500\u2500';
    
    // Sort models by most expensive first
    models.sort(function(a, b) {
      var costA = a.output_token_rate != null ? Number(a.output_token_rate) : -1;
      var costB = b.output_token_rate != null ? Number(b.output_token_rate) : -1;
      if (costA !== costB) return costB - costA;
      return (a.name || '').localeCompare(b.name || '');
    }).forEach(function(m) {
      var opt = document.createElement('option');
      opt.value = m.id;
      var cost = m.output_token_rate != null
        ? ' [' + (function(r){ const scaled = Number(r)*1_000_000; return Number(scaled.toPrecision(4)).toString()+' cr/tok'; })(Number(m.output_token_rate)) + ']'
        : '';
      opt.textContent = m.name + cost;
      grp.appendChild(opt);
    });
    selectEl.appendChild(grp);
  });
  if (opts.selectedValue != null) selectEl.value = opts.selectedValue;
}

// ─── LLM CLIENT CLASS ───────────────────────────────────────────────
export class LLMClient {
  /**
   * @param {Object} options
   * @param {string} [options.provider='abacus']  — Provider preset name
   * @param {string} [options.baseUrl]            — Override base URL
   * @param {string} [options.apiKey]             — API key (or loads from localStorage)
   * @param {string} [options.model]              — Default model
   * @param {string} [options.storagePrefix]      — localStorage key prefix (default: provider keyPrefix)
   * @param {boolean} [options.persistKey=true]   — Auto-save API key to localStorage
   */
  constructor(options = {}) {
    const providerName = options.provider || 'abacus';
    const provider = PROVIDERS[providerName] || PROVIDERS.abacus;

    this.baseUrl = options.baseUrl || provider.baseUrl;
    this.storagePrefix = options.storagePrefix || provider.keyPrefix;
    this.defaultModel = options.model || provider.defaultModel;
    this.availableModels = provider.models;
    this.providerName = provider.name;
    this.persistKey = options.persistKey !== false;

    // Load API key: explicit > localStorage
    this._apiKey = options.apiKey || '';
    if (!this._apiKey && this.persistKey) {
      this._apiKey = localStorage.getItem(this.storagePrefix) || '';
    }

    // Active abort controllers
    this._controllers = new Map();
    this._nextId = 0;
  }

  // ─── API KEY MANAGEMENT ─────────────────────────────────────────

  /** Get the current API key */
  get apiKey() {
    return this._apiKey;
  }

  /** Set the API key (and optionally persist to localStorage) */
  set apiKey(key) {
    this._apiKey = (key || '').trim();
    if (this.persistKey) {
      localStorage.setItem(this.storagePrefix, this._apiKey);
    }
  }

  /** Check if an API key is configured */
  get hasApiKey() {
    return this._apiKey.length > 0;
  }

  /** Remove the stored API key from localStorage */
  clearApiKey() {
    this._apiKey = '';
    localStorage.removeItem(this.storagePrefix);
  }

  // ─── CORE CHAT COMPLETION (NON-STREAMING) ───────────────────────

  /**
   * Send a chat completion request (non-streaming).
   *
   * @param {Object} params
   * @param {Array<{role: string, content: string|Array}>} params.messages
   * @param {string}  [params.model]          — Model to use (or defaultModel)
   * @param {string}  [params.systemPrompt]   — Convenience: prepend a system message
   * @param {number}  [params.maxTokens]      — max_tokens
   * @param {number}  [params.temperature]    — temperature (0–2)
   * @param {number}  [params.timeoutMs=30000] — timeout in ms
   * @returns {Promise<{content: string, usage: Object|null, model: string, raw: Object}>}
   */
  async complete(params = {}) {
    this._requireApiKey();
    const model = params.model || this.defaultModel;
    const messages = this._buildMessages(params);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeoutMs || 30000);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          ...(params.maxTokens && { max_tokens: params.maxTokens }),
          ...(params.temperature != null && { temperature: params.temperature })
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      if (!res.ok) {
        const errBody = await res.text();
        throw new LLMError(`HTTP ${res.status}: ${errBody}`, res.status);
      }

      const data = await res.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage || null,
        model: data.model || model,
        raw: data
      };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new LLMError('Request timed out', 408);
      }
      throw err instanceof LLMError ? err : new LLMError(err.message);
    }
  }

  // ─── STREAMING CHAT COMPLETION ──────────────────────────────────

  /**
   * Send a streaming chat completion. Returns a handle for managing the stream.
   *
   * @param {Object} params
   * @param {Array<{role: string, content: string|Array}>} params.messages
   * @param {string}  [params.model]
   * @param {string}  [params.systemPrompt]
   * @param {number}  [params.maxTokens]
   * @param {number}  [params.temperature]
   * @param {function(string, string)} [params.onToken]  — callback(token, fullText)
   * @param {function(Object)}         [params.onUsage]  — callback(usageObj)
   * @param {function(string)}         [params.onDone]   — callback(fullText)
   * @param {function(Error)}          [params.onError]  — callback(error)
   * @returns {{ id: number, promise: Promise<string>, abort: function }}
   */
  stream(params = {}) {
    this._requireApiKey();
    const model = params.model || this.defaultModel;
    const messages = this._buildMessages(params);
    const id = this._nextId++;
    const controller = new AbortController();
    this._controllers.set(id, controller);

    const promise = this._runStream(id, model, messages, params, controller);

    return {
      id,
      promise,
      abort: () => {
        controller.abort();
        this._controllers.delete(id);
      }
    };
  }

  async _runStream(id, model, messages, params, controller) {
    let fullText = '';
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          stream_options: { include_usage: true },
          ...(params.maxTokens && { max_tokens: params.maxTokens }),
          ...(params.temperature != null && { temperature: params.temperature })
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new LLMError(`HTTP ${res.status}: ${errBody}`, res.status);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              params.onToken?.(delta, fullText);
            }
            if (parsed.usage) {
              params.onUsage?.(parsed.usage);
            }
          } catch { /* skip malformed SSE chunks */ }
        }
      }

      params.onDone?.(fullText);
      return fullText;
    } catch (err) {
      if (err.name === 'AbortError') {
        params.onDone?.(fullText); // partial result
        return fullText;
      }
      const llmErr = err instanceof LLMError ? err : new LLMError(err.message);
      params.onError?.(llmErr);
      throw llmErr;
    } finally {
      this._controllers.delete(id);
    }
  }

  // ─── CONVENIENCE: SIMPLE PROMPT ─────────────────────────────────

  /**
   * Quick one-shot prompt. Returns just the text.
   *
   * @param {string} prompt — Your question/prompt
   * @param {Object} [options] — Same as complete() params
   * @returns {Promise<string>}
   */
  async ask(prompt, options = {}) {
    const result = await this.complete({
      ...options,
      messages: [{ role: 'user', content: prompt }]
    });
    return result.content;
  }

  /**
   * Quick one-shot prompt with streaming. Returns text via callback.
   *
   * @param {string} prompt
   * @param {function(string, string)} onToken — callback(token, fullTextSoFar)
   * @param {Object} [options]
   * @returns {{ id: number, promise: Promise<string>, abort: function }}
   */
  askStreaming(prompt, onToken, options = {}) {
    return this.stream({
      ...options,
      messages: [{ role: 'user', content: prompt }],
      onToken
    });
  }

  // ─── ABORT ALL ──────────────────────────────────────────────────

  /** Cancel all in-flight requests */
  abortAll() {
    for (const [id, controller] of this._controllers) {
      controller.abort();
    }
    this._controllers.clear();
  }

  // ─── RETRY WRAPPER ─────────────────────────────────────────────

  /**
   * Retry a function with exponential backoff.
   *
   * @param {function} fn — async function to retry
   * @param {Object} [options]
   * @param {number} [options.maxRetries=3]
   * @param {number} [options.baseDelay=1000] — ms
   * @param {function(Error, number)} [options.onRetry] — callback(error, attempt)
   * @returns {Promise<*>}
   */
  async withRetry(fn, options = {}) {
    const maxRetries = options.maxRetries ?? 3;
    const baseDelay = options.baseDelay ?? 1000;
    let lastErr;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        // Don't retry on auth errors or aborts
        if (err.status === 401 || err.status === 403 || err.name === 'AbortError') throw err;
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
          options.onRetry?.(err, attempt + 1);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastErr;
  }

  // ─── INTERNAL HELPERS ──────────────────────────────────────────

  _requireApiKey() {
    if (!this._apiKey) {
      throw new LLMError('API key is not set. Call client.apiKey = "sk-..." or pass it in the constructor.', 401);
    }
  }

  _headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this._apiKey}`
    };
  }

  _buildMessages(params) {
    let messages = params.messages ? [...params.messages] : [];
    if (params.systemPrompt) {
      messages.unshift({ role: 'system', content: params.systemPrompt });
    }
    return messages;
  }
}

// ─── CUSTOM ERROR CLASS ──────────────────────────────────────────────
export class LLMError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'LLMError';
    this.status = status;
  }
}

// ─── CONVERSATION MANAGER ───────────────────────────────────────────
/**
 * Manages multi-turn conversation history with optional localStorage persistence.
 *
 * Usage:
 *   const convo = new ConversationManager({ persist: true, storageKey: 'my_convo' });
 *   convo.addUser('What is the capital of France?');
 *   const response = await client.complete({ messages: convo.messages });
 *   convo.addAssistant(response.content);
 *   // Later...
 *   convo.addUser('Tell me more about it.');
 *   const followUp = await client.complete({ messages: convo.messages });
 */
export class ConversationManager {
  /**
   * @param {Object} [options]
   * @param {string} [options.systemPrompt]       — System prompt prepended to every request
   * @param {boolean} [options.persist=false]      — Save to localStorage
   * @param {string} [options.storageKey='llm_conversation'] — localStorage key
   * @param {number} [options.maxMessages]         — Max messages to keep (sliding window)
   */
  constructor(options = {}) {
    this.systemPrompt = options.systemPrompt || null;
    this.persist = options.persist || false;
    this.storageKey = options.storageKey || 'llm_conversation';
    this.maxMessages = options.maxMessages || Infinity;
    this._messages = [];

    if (this.persist) this._load();
  }

  /** Get the full message array (including system prompt if set) */
  get messages() {
    const msgs = [];
    if (this.systemPrompt) {
      msgs.push({ role: 'system', content: this.systemPrompt });
    }
    return msgs.concat(this._messages);
  }

  /** Get raw message history (without system prompt) */
  get history() {
    return [...this._messages];
  }

  /** Number of messages in history */
  get length() {
    return this._messages.length;
  }

  /** Add a user message */
  addUser(content) {
    this._add({ role: 'user', content });
  }

  /** Add an assistant message */
  addAssistant(content) {
    this._add({ role: 'assistant', content });
  }

  /** Add any message */
  add(role, content) {
    this._add({ role, content });
  }

  /** Clear all messages */
  clear() {
    this._messages = [];
    if (this.persist) this._save();
  }

  /** Remove the last N messages */
  undo(n = 1) {
    this._messages.splice(-n);
    if (this.persist) this._save();
  }

  _add(msg) {
    this._messages.push(msg);
    if (this._messages.length > this.maxMessages) {
      // Keep system-like context, trim from the start
      this._messages = this._messages.slice(-this.maxMessages);
    }
    if (this.persist) this._save();
  }

  _save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this._messages));
    } catch { /* quota exceeded, etc. */ }
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        this._messages = JSON.parse(raw);
      }
    } catch {
      this._messages = [];
    }
  }

  /** Export conversation as Markdown */
  toMarkdown() {
    let md = '';
    for (const msg of this._messages) {
      if (msg.role === 'user') {
        md += `**User:** ${typeof msg.content === 'string' ? msg.content : '[Multimodal content]'}\n\n`;
      } else if (msg.role === 'assistant') {
        md += `**Assistant:** ${msg.content}\n\n---\n\n`;
      }
    }
    return md;
  }
}

// ─── FILE ATTACHMENT HELPERS ────────────────────────────────────────
/**
 * Utility functions for handling file attachments in LLM requests.
 * Converts files to the multimodal content format expected by OpenAI-compatible APIs.
 */
export const FileUtils = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB

  /**
   * Read a File object as a data URL (for images).
   * @param {File} file
   * @returns {Promise<string>}
   */
  readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Read a File object as text.
   * @param {File} file
   * @returns {Promise<string>}
   */
  readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },

  /** Check if a File is an image */
  isImage(file) {
    return file.type?.startsWith('image/');
  },

  /** Format file size for display */
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },

  /**
   * Process files for an LLM request. Returns an array of processed file objects.
   *
   * @param {FileList|File[]} files
   * @returns {Promise<Array<{name, size, type, dataUrl?, textContent?}>>}
   */
  async processFiles(files) {
    const results = [];
    for (const file of files) {
      if (file.size > this.MAX_FILE_SIZE) {
        console.warn(`Skipping "${file.name}": exceeds ${this.formatSize(this.MAX_FILE_SIZE)} limit`);
        continue;
      }
      const entry = {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: null,
        textContent: null
      };
      if (this.isImage(file)) {
        entry.dataUrl = await this.readAsDataUrl(file);
      } else {
        entry.textContent = await this.readAsText(file);
      }
      results.push(entry);
    }
    return results;
  },

  /**
   * Build a multimodal message content array from text + processed files.
   * Compatible with OpenAI vision API format.
   *
   * @param {string} text — The user's prompt text
   * @param {Array<{name, dataUrl?, textContent?}>} files — Processed files from processFiles()
   * @returns {string|Array} — String if no files, multimodal array if files present
   */
  buildMessageContent(text, files = []) {
    if (!files || files.length === 0) return text;

    const parts = [];

    // Embed text files into the text portion
    let fullText = text;
    const textFiles = files.filter(f => f.textContent != null);
    if (textFiles.length > 0) {
      fullText += '\n\n--- Attached Files ---';
      textFiles.forEach(f => {
        fullText += `\n\n### File: ${f.name}\n\`\`\`\n${f.textContent}\n\`\`\``;
      });
    }
    parts.push({ type: 'text', text: fullText });

    // Add images as image_url parts
    const imageFiles = files.filter(f => f.dataUrl != null);
    imageFiles.forEach(f => {
      parts.push({
        type: 'image_url',
        image_url: { url: f.dataUrl }
      });
    });

    return parts;
  }
};

// ─── SETTINGS PERSISTENCE ───────────────────────────────────────────
/**
 * Generic settings persistence helper using localStorage.
 * Use this to store user preferences like selected models, UI state, etc.
 *
 * Usage:
 *   const settings = new SettingsStore('myapp_settings', { theme: 'dark', model: 'gpt-4o' });
 *   settings.set('model', 'claude-sonnet-4-6');
 *   console.log(settings.get('model')); // 'claude-sonnet-4-6'
 *   settings.reset(); // back to defaults
 */
export class SettingsStore {
  /**
   * @param {string} storageKey — localStorage key
   * @param {Object} defaults — Default values
   */
  constructor(storageKey, defaults = {}) {
    this.storageKey = storageKey;
    this.defaults = { ...defaults };
    this._data = { ...defaults };
    this._load();
  }

  /** Get a setting value */
  get(key) {
    return this._data[key];
  }

  /** Get all settings as an object */
  getAll() {
    return { ...this._data };
  }

  /** Set a single setting */
  set(key, value) {
    this._data[key] = value;
    this._save();
  }

  /** Update multiple settings at once */
  update(obj) {
    Object.assign(this._data, obj);
    this._save();
  }

  /** Reset all settings to defaults */
  reset() {
    this._data = { ...this.defaults };
    this._save();
  }

  /** Remove stored settings from localStorage */
  clear() {
    localStorage.removeItem(this.storageKey);
    this._data = { ...this.defaults };
  }

  _save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this._data));
    } catch { /* ignore */ }
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._data = { ...this.defaults, ...parsed };
      }
    } catch {
      this._data = { ...this.defaults };
    }
  }
}

// ─── MARKDOWN RENDERER SETUP ────────────────────────────────────────
/**
 * Helper to configure the `marked` library for rendering LLM responses.
 * Requires `marked` to be loaded (e.g., via CDN).
 *
 * Usage:
 *   setupMarkdown(); // Call once on page load
 *   element.innerHTML = marked.parse(llmResponseText);
 */
export function setupMarkdown() {
  if (typeof marked === 'undefined') {
    console.warn('[llm-client] `marked` library not found. Include it via CDN or npm.');
    return;
  }

  const renderer = new marked.Renderer();

  renderer.image = function ({ href, title, text }) {
    const titleAttr = title ? ` title="${title}"` : '';
    const altText = text || '';
    return `<figure style="margin:1em 0;text-align:center">
      <a href="${href}" target="_blank" rel="noopener noreferrer">
        <img src="${href}" alt="${altText}"${titleAttr}
             style="max-width:100%;border-radius:8px;cursor:zoom-in" loading="lazy" />
      </a>
      ${altText ? `<figcaption style="font-size:0.85em;color:#888;margin-top:0.5em">${altText}</figcaption>` : ''}
    </figure>`;
  };

  marked.setOptions({ renderer, breaks: true, gfm: true });
}

// ─── UI HELPERS (OPTIONAL) ──────────────────────────────────────────
/**
 * Optional UI utilities for common LLM integration patterns.
 */
export const UIHelpers = {
  /**
   * Escape HTML to prevent XSS when inserting user/LLM content.
   * @param {string} str
   * @returns {string}
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {'success'|'error'|'info'} [type='success']
   * @param {number} [durationMs=3000]
   */
  showToast(message, type = 'success', durationMs = 3000) {
    const existing = document.querySelector('.llm-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `llm-toast llm-toast-${type}`;
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 10000;
      padding: 12px 20px; border-radius: 10px;
      font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: white; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      animation: llm-toast-in 0.3s ease;
      background: ${type === 'error' ? '#e74c3c' : type === 'info' ? '#3498db' : '#27ae60'};
    `;
    toast.textContent = `${type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ'} ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), durationMs);
  },

  /**
   * Create an API key input field that auto-saves to the LLMClient.
   *
   * @param {LLMClient} client
   * @param {HTMLElement} container — Where to insert the input
   * @param {Object} [options]
   * @param {string} [options.label='API Key']
   * @param {string} [options.placeholder='sk-...']
   */
  createApiKeyInput(client, container, options = {}) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;';

    const label = document.createElement('label');
    label.textContent = options.label || 'API Key';
    label.style.cssText = 'font-size:13px;font-weight:600;color:#94a3b8;';

    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = options.placeholder || 'sk-...';
    input.value = client.apiKey || '';
    input.autocomplete = 'off';
    input.style.cssText = `
      padding: 8px 12px; border-radius: 8px;
      border: 1px solid rgba(148,163,184,0.2);
      background: rgba(15,23,42,0.6); color: #e2e8f0;
      font-size: 13px; width: 220px;
      transition: border-color 0.2s;
    `;
    input.addEventListener('input', (e) => {
      client.apiKey = e.target.value;
    });
    input.addEventListener('focus', () => {
      input.style.borderColor = 'rgba(99,102,241,0.5)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = 'rgba(148,163,184,0.2)';
    });

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    container.appendChild(wrapper);

    return input;
  },

  /**
   * Create a model selector dropdown.
   *
   * @param {LLMClient} client
   * @param {HTMLElement} container
   * @param {Object} [options]
   * @param {string} [options.label='Model']
   * @param {function(string)} [options.onChange]
   * @param {boolean} [options.includeNone=false]
   * @returns {HTMLSelectElement}
   */
  createModelSelector(client, container, options = {}) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;';

    const label = document.createElement('label');
    label.textContent = options.label || 'Model';
    label.style.cssText = 'font-size:13px;font-weight:600;color:#94a3b8;';

    const select = document.createElement('select');
    select.style.cssText = `
      padding: 8px 12px; border-radius: 8px;
      border: 1px solid rgba(148,163,184,0.2);
      background: rgba(15,23,42,0.6); color: #e2e8f0;
      font-size: 13px; cursor: pointer;
    `;

    if (options.includeNone) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '\u2014 None \u2014';
      select.appendChild(opt);
    }

    for (const model of client.availableModels) {
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = model;
      select.appendChild(opt);
    }
    select.value = client.defaultModel;

    // Info panel: shows description + token rates
    const infoEl = document.createElement('div');
    infoEl.style.cssText = 'font-size:11px;color:#94a3b8;margin-top:2px;display:none;';

    const updateInfo = (modelId, modelsData) => {
      if (!modelsData || !modelId) { infoEl.style.display = 'none'; return; }
      const m = modelsData.find(x => x.id === modelId);
      if (!m) { infoEl.style.display = 'none'; return; }
      const fmtRate = (r) => { const scaled = Number(r)*1_000_000; return Number(scaled.toPrecision(4)).toString()+' cr/tok'; };
      const costParts = [];
      if (m.output_token_rate != null) costParts.push('\uD83E\uDE99 Out: ' + fmtRate(m.output_token_rate));
      if (m.input_token_rate  != null) costParts.push('In: ' + fmtRate(m.input_token_rate));
      if (costParts.length === 0 && !m.description) { infoEl.style.display = 'none'; return; }
      let html = '';
      if (costParts.length > 0) {
        html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:2px">' +
          costParts.map(p => `<span style="font-weight:600;color:#d97706;background:rgba(217,119,6,0.1);border-radius:3px;padding:1px 5px;">${p}</span>`).join('') +
          '</div>';
      }
      if (m.description) {
        html += `<div class="model-info-desc-wrapper">
          <span class="model-info-desc">${UIHelpers.escapeHtml(m.description)}</span>
          <div class="model-info-tooltip">${UIHelpers.escapeHtml(m.description)}</div>
        </div>`;
      }
      infoEl.innerHTML = html;
      infoEl.style.display = 'block';
    };

    select.addEventListener('change', () => {
      options.onChange?.(select.value);
      updateInfo(select.value, options.modelsData);
    });

    row.appendChild(label);
    row.appendChild(select);
    wrapper.appendChild(row);
    wrapper.appendChild(infoEl);
    container.appendChild(wrapper);

    // Expose a refresh method so callers can hydrate info after fetching models
    select._refreshModelInfo = (modelsData) => {
      options.modelsData = modelsData;
      updateInfo(select.value, modelsData);
    };

    return select;
  },

  /**
   * Create a loading dots animation element.
   * @returns {HTMLElement}
   */
  createLoadingDots() {
    const container = document.createElement('div');
    container.style.cssText = 'display:inline-flex;gap:4px;align-items:center;';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.style.cssText = `
        width: 6px; height: 6px; border-radius: 50%;
        background: #6366f1; display: inline-block;
        animation: llm-dot-bounce 1.4s ease-in-out ${i * 0.16}s infinite both;
      `;
      container.appendChild(dot);
    }
    return container;
  },

  /**
   * Inject minimal CSS animations required by UI helpers.
   * Call once on page load.
   */
  injectStyles() {
    if (document.getElementById('llm-client-styles')) return;
    const style = document.createElement('style');
    style.id = 'llm-client-styles';
    style.textContent = `
      @keyframes llm-toast-in {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes llm-dot-bounce {
        0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
        40% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
};

// ─── DEFAULT EXPORT ──────────────────────────────────────────────────
export default LLMClient;
