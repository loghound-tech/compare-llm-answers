# LLM Integration Guide

A comprehensive step-by-step guide for integrating LLM capabilities into any web application. This guide covers everything from basic setup to advanced patterns.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Setting Up API Key Management](#2-setting-up-api-key-management)
3. [Making Your First LLM Request](#3-making-your-first-llm-request)
4. [Streaming Responses](#4-streaming-responses)
5. [Rendering Markdown Responses](#5-rendering-markdown-responses)
6. [Multi-Turn Conversations](#6-multi-turn-conversations)
7. [File Uploads & Multimodal Input](#7-file-uploads--multimodal-input)
8. [Persisting User Settings](#8-persisting-user-settings)
9. [Error Handling & Retry Logic](#9-error-handling--retry-logic)
10. [Cancelling Requests](#10-cancelling-requests)
11. [Using Multiple Models](#11-using-multiple-models)
12. [Dynamic Model UI & RouteLLM Hacks](#12-dynamic-model-ui--routellm-hacks)
13. [Security Best Practices](#13-security-best-practices)
14. [Performance Tips](#14-performance-tips)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  YOUR WEB APP                    │
│                                                  │
│  ┌────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  UI Layer  │  │ LLM Client  │  │ Settings  │ │
│  │  (HTML/JS) │──│ (API calls) │  │ (Storage) │ │
│  └────────────┘  └──────┬──────┘  └─────┬─────┘ │
│                         │               │        │
│                    localStorage    localStorage   │
│                  (API key only)  (user prefs)    │
└─────────────────────────┼───────────────────────┘
                          │ HTTPS (direct)
                          ▼
              ┌───────────────────────┐
              │  Abacus AI RouteLLM   │
              │  (OpenAI-compatible)  │
              └───────────────────────┘
```

**Key architectural decisions:**
- **No backend required** — all API calls go directly from browser to the LLM provider
- **API key stays local** — stored in `localStorage`, never sent to any intermediary
- **Streaming via SSE** — Server-Sent Events for real-time token delivery
- **OpenAI-compatible** — works with any provider that implements the OpenAI chat completions API

---

## 2. Setting Up API Key Management

### Basic Pattern (No Library)

```javascript
// Save the key
function saveApiKey(key) {
  localStorage.setItem('abacus_api_key', key.trim());
}

// Load the key
function getApiKey() {
  return localStorage.getItem('abacus_api_key') || '';
}

// Wire up an input field
function initApiKeyInput(inputId) {
  const input = document.getElementById(inputId);
  input.value = getApiKey();
  input.addEventListener('input', (e) => saveApiKey(e.target.value));
}
```

### With the Library

```javascript
import { LLMClient } from './llm-client.js';

const client = new LLMClient({ provider: 'abacus' });
// API key is automatically loaded from localStorage
// Setting it auto-saves:
client.apiKey = 'sk-abc123';

// Check if key exists
if (!client.hasApiKey) {
  showApiKeyPrompt();
}
```

### HTML for the API Key Input

```html
<div class="api-key-group">
  <label for="apiKeyInput">🔑 API Key</label>
  <input type="password" id="apiKeyInput" placeholder="sk-..." autocomplete="off" />
</div>
```

> **Tip:** Always use `type="password"` to mask the key visually, and `autocomplete="off"` to prevent browser auto-fill.

---

## 3. Making Your First LLM Request

### Non-Streaming (Simple)

```javascript
import { LLMClient } from './llm-client.js';

const client = new LLMClient({ provider: 'abacus' });

// One-liner
const answer = await client.ask('What is photosynthesis?');

// Full control
const result = await client.complete({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are a biology teacher.' },
    { role: 'user', content: 'What is photosynthesis?' }
  ],
  maxTokens: 500,
  temperature: 0.7
});

console.log(result.content);  // The response text
console.log(result.usage);    // { prompt_tokens, completion_tokens, total_tokens }
console.log(result.model);    // Actual model used
```

### Without the Library (Raw Fetch)

```javascript
const apiKey = localStorage.getItem('abacus_api_key');

const response = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'What is photosynthesis?' }]
  })
});

const data = await response.json();
const answer = data.choices[0].message.content;
```

---

## 4. Streaming Responses

Streaming delivers tokens in real-time as they're generated, providing an interactive "typing" experience.

### With the Library

```javascript
const { promise, abort } = client.stream({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Write a poem about the ocean' }],
  
  onToken: (token, fullText) => {
    // Called for each new token
    document.getElementById('output').innerHTML = marked.parse(fullText);
  },
  
  onUsage: (usage) => {
    // Called when usage data is available
    console.log(`Tokens used: ${usage.total_tokens}`);
  },
  
  onDone: (fullText) => {
    // Called when streaming completes
    console.log('Done!');
  },
  
  onError: (error) => {
    // Called on any error
    console.error(error.message);
  }
});

// Cancel the stream if needed
document.getElementById('stopBtn').onclick = () => abort();

// Or await the full result
const fullText = await promise;
```

### How SSE Streaming Works

The API returns a stream of Server-Sent Events (SSE). Each event contains a JSON chunk:

```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" world"}}]}
data: {"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}
data: [DONE]
```

The streaming parser in the library:
1. Reads chunks from the `ReadableStream`
2. Splits on newlines and extracts `data:` prefixed lines
3. Parses each JSON chunk to extract `delta.content`
4. Accumulates tokens into a full text string
5. Calls your `onToken` callback with each delta and the accumulated text

---

## 5. Rendering Markdown Responses

LLMs typically respond in markdown. Use the `marked` library to render it as HTML:

### Setup

```html
<!-- Include marked.js via CDN -->
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

<script type="module">
  import { setupMarkdown } from './llm-client.js';
  
  // Configure marked with custom renderers (images, etc.)
  setupMarkdown();
  
  // Render LLM output
  const html = marked.parse(llmResponse);
  document.getElementById('output').innerHTML = html;
</script>
```

### Essential CSS for Markdown

```css
.llm-response code {
  background: rgba(99,102,241,0.12);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85em;
}
.llm-response pre {
  background: rgba(0,0,0,0.4);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}
.llm-response pre code {
  background: none;
  padding: 0;
}
.llm-response table {
  width: 100%;
  border-collapse: collapse;
}
.llm-response th, .llm-response td {
  border: 1px solid rgba(148,163,184,0.2);
  padding: 8px 12px;
}
```

---

## 6. Multi-Turn Conversations

### With ConversationManager

```javascript
import { LLMClient, ConversationManager } from './llm-client.js';

const client = new LLMClient({ provider: 'abacus' });
const convo = new ConversationManager({
  systemPrompt: 'You are a helpful assistant.',
  persist: true,           // Auto-save to localStorage
  storageKey: 'my_chat',   // Unique key for this conversation
  maxMessages: 50          // Sliding window to prevent token overflow
});

// Send a message and get a response
async function chat(userMessage) {
  convo.addUser(userMessage);
  
  const result = await client.complete({
    messages: convo.messages  // Includes system prompt + full history
  });
  
  convo.addAssistant(result.content);
  return result.content;
}

// Usage
await chat('What is the capital of France?');
// → "The capital of France is Paris."

await chat('Tell me more about it.');
// → "Paris is known for the Eiffel Tower..." (has context from previous exchange)

// Export conversation
const markdown = convo.toMarkdown();

// Clear and start fresh
convo.clear();
```

### How History Works

Each request includes the full message array:

```json
[
  { "role": "system", "content": "You are a helpful assistant." },
  { "role": "user", "content": "What is the capital of France?" },
  { "role": "assistant", "content": "The capital of France is Paris." },
  { "role": "user", "content": "Tell me more about it." }
]
```

The LLM uses this history to maintain context. Be aware that long histories consume more tokens.

---

## 7. File Uploads & Multimodal Input

### Processing and Sending Files

```javascript
import { LLMClient, FileUtils } from './llm-client.js';

const client = new LLMClient({ provider: 'abacus' });

// Process files from a file input
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (e) => {
  const processedFiles = await FileUtils.processFiles(e.target.files);
  
  // Build multimodal content
  const content = FileUtils.buildMessageContent(
    'Describe these files',
    processedFiles
  );
  
  // Send to LLM
  const result = await client.complete({
    model: 'gpt-4o', // Use a vision-capable model for images
    messages: [{ role: 'user', content }]
  });
});
```

### How Multimodal Messages Work

For **text files** (code, CSV, etc.), the content is embedded inline:

```json
{
  "role": "user",
  "content": "Describe these files\n\n--- Attached Files ---\n\n### File: data.csv\n```\nname,value\nfoo,42\n```"
}
```

For **images**, the content uses the vision format:

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "Describe this image" },
    { "type": "image_url", "image_url": { "url": "data:image/png;base64,iVBOR..." } }
  ]
}
```

### Drag & Drop Support

```javascript
const dropZone = document.getElementById('dropZone');
let dragCounter = 0;

dropZone.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dropZone.classList.remove('drag-over');
  }
});

dropZone.addEventListener('dragover', (e) => e.preventDefault());

dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropZone.classList.remove('drag-over');
  
  const processed = await FileUtils.processFiles(e.dataTransfer.files);
  // Use processed files...
});
```

---

## 8. Persisting User Settings

### With SettingsStore

```javascript
import { SettingsStore } from './llm-client.js';

const settings = new SettingsStore('myapp_settings', {
  // Default values
  model: 'gpt-4o',
  theme: 'dark',
  temperature: 0.7,
  streaming: true
});

// Get/set
settings.get('model');         // 'gpt-4o'
settings.set('model', 'claude-sonnet-4-6');

// Bulk update
settings.update({ theme: 'light', temperature: 0.5 });

// Get all
const all = settings.getAll();

// Reset to defaults
settings.reset();
```

### What to Persist (Recommendations)

| Setting | Storage Key | Why |
|---------|------------|-----|
| API key | `abacus_api_key` | So users don't re-enter it every visit |
| Selected model | `selected_model` | Users have preferences |
| Custom instructions | `analysis_instructions` | System prompts users have customized |
| UI preferences | `ui_prefs` | Theme, panel sizes, collapsed states |
| Conversation history | `convo_history` | For multi-session conversations |

---

## 9. Error Handling & Retry Logic

### Error Types You'll Encounter

| HTTP Status | Meaning | Action |
|------------|---------|--------|
| 401/403 | Invalid API key | Prompt user to re-enter key |
| 429 | Rate limited | Retry with backoff |
| 500/502/503 | Server error | Retry with backoff |
| 408 / timeout | Request timeout | Retry or inform user |

### Retry with Exponential Backoff

```javascript
const result = await client.withRetry(
  () => client.ask('What is AI?'),
  {
    maxRetries: 3,
    baseDelay: 1000,  // First retry after ~1s, then ~2s, then ~4s
    onRetry: (err, attempt) => {
      console.log(`Retry ${attempt}: ${err.message}`);
    }
  }
);
```

### Manual Error Handling

```javascript
try {
  const result = await client.complete({
    messages: [{ role: 'user', content: prompt }]
  });
} catch (err) {
  if (err.status === 401) {
    showMessage('Invalid API key. Please check and re-enter it.');
    client.clearApiKey();
  } else if (err.status === 429) {
    showMessage('Rate limited. Please wait a moment and try again.');
  } else if (err.name === 'AbortError') {
    // User cancelled — no error needed
  } else {
    showMessage(`Error: ${err.message}`);
  }
}
```

---

## 10. Cancelling Requests

### Single Request

```javascript
const stream = client.stream({
  messages: [{ role: 'user', content: 'Write a long story...' }],
  onToken: (token, full) => { /* ... */ }
});

// Cancel it
document.getElementById('cancelBtn').onclick = () => stream.abort();
```

### All Active Requests

```javascript
// Useful when navigating away or starting a new query
client.abortAll();
```

---

## 11. Using Multiple Models

### Parallel Queries

```javascript
const models = ['gpt-4o', 'claude-sonnet-4-6', 'gemini-2.5-pro'];
const prompt = 'What are the benefits of TypeScript?';

const results = await Promise.allSettled(
  models.map(model => 
    client.complete({
      model,
      messages: [{ role: 'user', content: prompt }]
    })
  )
);

results.forEach((result, i) => {
  if (result.status === 'fulfilled') {
    console.log(`${models[i]}: ${result.value.content.slice(0, 100)}...`);
  } else {
    console.error(`${models[i]} failed: ${result.reason.message}`);
  }
});
```

### Parallel Streaming

```javascript
const streams = models.map((model, i) =>
  client.stream({
    model,
    messages: [{ role: 'user', content: prompt }],
    onToken: (token, fullText) => {
      document.getElementById(`panel-${i}`).innerHTML = marked.parse(fullText);
    }
  })
);

// Wait for all to complete
await Promise.allSettled(streams.map(s => s.promise));

// Cancel all if needed
streams.forEach(s => s.abort());
```

---

## 12. Dynamic Model UI & RouteLLM Hacks

Building a robust frontend entails fetching accurately priced models, ordering them, and styling their descriptions efficiently.

### Fetching Models with Authentication
The `/listRouteLLMModels` endpoint returns different datasets depending on the `apikey`. Unauthenticated requests yield fractional values, whereas authenticated ones return normalized credits (which must be scaled by `1,000,000` to yield properly human-readable integer credit costs):

```javascript
export async function fetchAvailableModels() {
  const headers = {};
  const key = localStorage.getItem('abacus_api_key');
  if (key) headers['apikey'] = key; // Essential for correct pricing!
  
  const res = await fetch('https://apps.abacus.ai/api/v0/listRouteLLMModels', { headers });
  const data = await res.json();
  // Remember: scale the rate by 1_000_000 
  return data.map(m => ({
    ...m,
    output_token_rate: m.output_token_rate ? Number(m.output_token_rate) * 1_000_000 : null
  }));
}
```

### Sorting and Grouping
Group your models alphabetically by Category, and *always* sort them internally from most to least computationally expensive:

```javascript
const groupOrder = ['Routing', 'Anthropic', 'OpenAI', 'Google', 'Meta', 'xAI', 'DeepSeek', 'Qwen', 'ZhipuAI'];

Object.entries(groups).sort((a, b) => {
  return groupOrder.indexOf(a[0]) - groupOrder.indexOf(b[0]);
}).forEach(([groupName, models]) => {
  // Sort most expensive first
  models.sort((a, b) => {
    const costA = a.output_token_rate || -1;
    const costB = b.output_token_rate || -1;
    return costB - costA;
  });
});
```

### Native Hover Tooltips for Descriptions
Never use the native HTML `title` attributes on truncated description elements if you also render a custom CSS popup! Having a native `title="..."` and a CSS `.tooltip` on the same hover target causes an ugly UI double-popup.

```html
<!-- INCORRECT: causes double-tooltips -->
<span class="desc" title="My description">My description</span>

<!-- CORRECT: Wrapper holds the position and hover state -->
<div class="model-info-desc-wrapper">
  <span class="model-info-desc">Truncated text...</span>
  <div class="model-info-tooltip">Full long text here without title attributes</div>
</div>
```

### Identifying RouteLLM's Pick
When performing multi-model completions, the streaming API usually tells you the target routing layer. If you use `RouteLLM`, intercept the very first streaming chunk and extract the actual `model` string. This dynamically upgrades the UI from saying "RouteLLM" to saying "RouteLLM (Gemini 2.5 Flash)".

```javascript
client.stream({
  model: 'route-llm',
  onToken: (token, fullText, chunk) => {
    // If the chunk defines the model dynamically, grab it:
    if (chunk.model && chunk.model !== 'route-llm') {
      updateUIBadge(`Routed to: ${chunk.model}`);
    }
  }
});
```

---

## 13. Security Best Practices

### ✅ Do

- Store API keys in `localStorage` only (client-side)
- Use `type="password"` for API key inputs
- Use `autocomplete="off"` on key input fields
- Send keys only via `Authorization` header to the API endpoint
- Use HTTPS for all API requests (ensured by the API URL)

### ❌ Don't

- Never include API keys in your source code
- Never send API keys to your own server
- Never log API keys to console in production
- Never store API keys in cookies (they get sent with every request)
- Never embed keys in URLs (query parameters are logged by servers)

### CSP Headers (if using a server)

```
Content-Security-Policy: 
  default-src 'self'; 
  connect-src 'self' https://routellm.abacus.ai;
  script-src 'self' https://cdn.jsdelivr.net;
```

---

## 14. Performance Tips

1. **Use streaming** — Users perceive faster responses when tokens appear incrementally
2. **Debounce re-renders** — If using markdown rendering, consider debouncing at ~50ms intervals instead of on every token
3. **Limit conversation history** — Use `maxMessages` in `ConversationManager` to prevent token count from growing unbounded
4. **Use `max_tokens`** — Set a reasonable limit to prevent unexpectedly long (and expensive) responses
5. **Choose the right model** — `gpt-4o-mini` is much faster and cheaper for simple tasks; save `gpt-4o` for complex ones
6. **Cache responses** — If the same prompt is asked repeatedly, consider caching in `sessionStorage`

### Debounced Rendering Example

```javascript
let renderTimer = null;
client.stream({
  messages: [{ role: 'user', content: prompt }],
  onToken: (token, fullText) => {
    // Debounce rendering to every 50ms
    if (renderTimer) return;
    renderTimer = setTimeout(() => {
      outputEl.innerHTML = marked.parse(fullText);
      renderTimer = null;
    }, 50);
  },
  onDone: (fullText) => {
    // Final render
    clearTimeout(renderTimer);
    outputEl.innerHTML = marked.parse(fullText);
  }
});
```

---

## 15. Troubleshooting

### "CORS error" when opening from `file://`

Some browsers block API requests from `file://` URLs. Solution:

```bash
# Serve the files locally
python3 -m http.server 8765
# Then open http://localhost:8765
```

### "API key not working"

1. Verify the key at [abacus.ai](https://abacus.ai)
2. Check that `localStorage.getItem('abacus_api_key')` returns the correct value
3. Look for whitespace — `client.apiKey` trims automatically

### Streaming seems stuck

- Check the browser DevTools Network tab for the actual response
- Ensure `stream: true` and `stream_options: { include_usage: true }` are in the request body
- Some models may take longer to start generating

### Large file uploads fail

- The default limit is 10MB per file
- Images are sent as base64 (33% larger than the original file)
- Some models have total context limits — very large files may be truncated

### Token count is very high

- Long conversation histories inflate token counts
- Use `maxMessages` in `ConversationManager` to cap history
- Use `max_tokens` to limit response length
- Consider summarizing old messages instead of sending the full history

---

## Next Steps

- Read through the [example files](./README.md#-try-the-examples) to see complete working implementations
- Copy what you need into your project
- Check the [snippets.js](./snippets.js) file for standalone copy-paste functions
- Customize the UI helpers to match your app's design system
