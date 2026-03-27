# LLM Integration Kit

**Reusable code, documentation, and examples for adding LLM (Large Language Model) querying capabilities to any web app.**

Extracted from the [LLM Compare](../README.md) application — everything you need to integrate streaming AI responses, API key management, conversation history, and file uploads into your own projects.

---

## 📁 What's Included

| File | Description |
|------|-------------|
| [`llm-client.js`](./llm-client.js) | **Core library** — Drop-in ES module with `LLMClient`, `ConversationManager`, `FileUtils`, `SettingsStore`, and UI helpers |
| [`snippets.js`](./snippets.js) | **Copy-paste snippets** — Standalone functions you can paste directly into any project (no imports needed) |
| [`example-basic.html`](./example-basic.html) | **Basic example** — Single prompt → streaming response with markdown rendering |
| [`example-conversation.html`](./example-conversation.html) | **Conversation example** — Multi-turn chat with history persistence (ChatGPT-style UI) |
| [`example-file-upload.html`](./example-file-upload.html) | **File upload example** — Drag-and-drop image/file uploads with multimodal LLM queries |
| [`INTEGRATION-GUIDE.md`](./INTEGRATION-GUIDE.md) | **Detailed integration guide** — Step-by-step instructions for all features |

---

## 🚀 Quick Start

### Option A: Use the Full Library

1. Copy `llm-client.js` into your project
2. Import it as an ES module:

```html
<script type="module">
  import { LLMClient } from './llm-client.js';
  
  const client = new LLMClient({ provider: 'abacus' });
  client.apiKey = 'your-api-key'; // or let user enter it — auto-saved to localStorage
  
  // Simple one-shot question
  const answer = await client.ask('What is the capital of France?');
  console.log(answer);
  
  // Streaming response
  client.stream({
    messages: [{ role: 'user', content: 'Explain quantum computing' }],
    onToken: (token, fullText) => {
      document.getElementById('output').innerHTML = fullText;
    }
  });
</script>
```

### Option B: Copy-Paste Snippets

If you don't want a library, grab individual functions from [`snippets.js`](./snippets.js):

```javascript
// Minimal streaming request — paste this anywhere
async function streamLLM(prompt, onToken, model = 'gpt-4o') {
  const apiKey = localStorage.getItem('abacus_api_key');
  const res = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      stream_options: { include_usage: true }
    })
  });
  // ... see snippets.js for the full streaming parser
}
```

---

## 🔑 API Key Security

> **Your API key never leaves the browser.** It is stored only in `localStorage` and sent directly from the client to the API endpoint. There is no intermediary server.

- The key is saved under `localStorage` key `abacus_api_key` (configurable)
- It's included only in the `Authorization` header of API requests
- Users can clear it anytime via `client.clearApiKey()`
- The library supports `type="password"` inputs for visual masking

---

## 📦 Library API Reference

### `LLMClient`

| Method | Description |
|--------|-------------|
| `new LLMClient(options)` | Create a client. Options: `provider`, `baseUrl`, `apiKey`, `model`, `storagePrefix`, `persistKey` |
| `client.apiKey = 'sk-...'` | Set API key (auto-saves to localStorage) |
| `client.hasApiKey` | Check if key is configured |
| `client.clearApiKey()` | Remove stored key |
| `client.ask(prompt, options)` | One-shot prompt → string response |
| `client.complete(params)` | Full non-streaming request → `{content, usage, model, raw}` |
| `client.stream(params)` | Streaming request → `{id, promise, abort}` |
| `client.askStreaming(prompt, onToken)` | Shorthand streaming prompt |
| `client.abortAll()` | Cancel all active requests |
| `client.withRetry(fn, options)` | Retry with exponential backoff |

### `ConversationManager`

| Method | Description |
|--------|-------------|
| `new ConversationManager(options)` | Options: `systemPrompt`, `persist`, `storageKey`, `maxMessages` |
| `convo.messages` | Full message array (with system prompt) |
| `convo.addUser(content)` | Add user message |
| `convo.addAssistant(content)` | Add assistant message |
| `convo.clear()` | Clear history |
| `convo.undo(n)` | Remove last N messages |
| `convo.toMarkdown()` | Export as markdown text |

### `FileUtils`

| Method | Description |
|--------|-------------|
| `FileUtils.processFiles(files)` | Process File objects into `{name, size, type, dataUrl/textContent}` |
| `FileUtils.buildMessageContent(text, files)` | Build OpenAI-compatible multimodal content array |
| `FileUtils.readAsDataUrl(file)` | Read file as base64 data URL |
| `FileUtils.readAsText(file)` | Read file as text |
| `FileUtils.formatSize(bytes)` | Human-readable file size |

### `SettingsStore`

| Method | Description |
|--------|-------------|
| `new SettingsStore(key, defaults)` | Create with localStorage key and default values |
| `settings.get(key)` / `settings.set(key, val)` | Get/set individual settings |
| `settings.getAll()` / `settings.update(obj)` | Bulk get/set |
| `settings.reset()` | Reset to defaults |

### `UIHelpers`

| Method | Description |
|--------|-------------|
| `UIHelpers.escapeHtml(str)` | XSS-safe HTML escaping |
| `UIHelpers.showToast(msg, type)` | Show toast notification |
| `UIHelpers.createApiKeyInput(client, container)` | Auto-wired API key input |
| `UIHelpers.createModelSelector(client, container)` | Model dropdown |
| `UIHelpers.createLoadingDots()` | Animated loading indicator |
| `UIHelpers.injectStyles()` | Inject required CSS animations |

---

## 🌐 Supported Providers

The library comes pre-configured with **Abacus AI RouteLLM** (which gives you access to 30+ models through one API key), but it works with **any OpenAI-compatible endpoint**:

```javascript
// Abacus AI (default — access all models with one key)
const client = new LLMClient({ provider: 'abacus' });

// OpenAI direct
const client = new LLMClient({ provider: 'openai', apiKey: 'sk-...' });

// Any OpenAI-compatible endpoint
const client = new LLMClient({
  baseUrl: 'https://my-custom-llm.example.com/v1',
  apiKey: 'my-key',
  model: 'my-model'
});
```

### Models Available via Abacus AI

| Provider | Models |
|----------|--------|
| **OpenAI** | gpt-5.2-codex, gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo |
| **Anthropic** | claude-sonnet-4-6, claude-opus-4-6, claude-sonnet-4-5, claude-opus-4-5, and more |
| **Google** | gemini-3.1-pro-preview, gemini-3-pro-preview, gemini-3-flash-preview, gemini-2.5-pro/flash |
| **xAI** | grok-4-0709, grok-4-1-fast, grok-4-fast, grok-code-fast-1 |
| **Meta** | Llama-4-Maverick, Llama-3.1-405B-Turbo, Llama-3.1-8B, llama-3.3-70b |
| **Qwen** | qwen3-coder-480b, qwen3-max, Qwen3-235B, Qwen3-32B, QwQ-32B, and more |
| **DeepSeek** | DeepSeek-V3.2, deepseek-v3.1, deepseek-R1 |
| **Kimi** | kimi-k2.5, kimi-k2-turbo-preview |
| **ZhipuAI** | glm-5, glm-4.7, glm-4.6, glm-4.5 |

---

## 🧪 Try the Examples

1. Open any example HTML file directly in your browser (double-click or `file://` URL)
2. Enter your Abacus AI API key
3. Start chatting!

```bash
# Or serve locally:
cd other-integrations
python3 -m http.server 8765
# Open http://localhost:8765/example-basic.html
```

---

## 📜 License

For personal use. Same license as the parent LLM Compare project.
