/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  LLM Integration — Quick Start Snippets                        ║
 * ║  Copy-paste these into any web app                              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * These snippets are standalone — they don't require llm-client.js.
 * Use them when you want minimal code without the full library.
 */


// ═══════════════════════════════════════════════════════════════════
// SNIPPET 1: Minimal non-streaming LLM request
// ═══════════════════════════════════════════════════════════════════

async function askLLM(prompt, model = 'gpt-4o') {
  const apiKey = localStorage.getItem('abacus_api_key');
  if (!apiKey) throw new Error('No API key found in localStorage');

  const res = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

// Usage:
// const answer = await askLLM('What is the capital of France?');


// ═══════════════════════════════════════════════════════════════════
// SNIPPET 2: Streaming LLM request (token by token)
// ═══════════════════════════════════════════════════════════════════

async function streamLLM(prompt, onToken, model = 'gpt-4o') {
  const apiKey = localStorage.getItem('abacus_api_key');
  if (!apiKey) throw new Error('No API key found in localStorage');

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

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

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
          onToken(delta, fullText);
        }
      } catch {}
    }
  }
  return fullText;
}

// Usage:
// const result = await streamLLM('Explain quantum computing', (token, full) => {
//   document.getElementById('output').textContent = full;
// });


// ═══════════════════════════════════════════════════════════════════
// SNIPPET 3: API key management with localStorage
// ═══════════════════════════════════════════════════════════════════

function setupApiKeyInput(inputElementId, storageKey = 'abacus_api_key') {
  const input = document.getElementById(inputElementId);
  // Load saved key
  input.value = localStorage.getItem(storageKey) || '';
  // Auto-save on change
  input.addEventListener('input', () => {
    localStorage.setItem(storageKey, input.value.trim());
  });
}

// Usage (after DOM ready):
// setupApiKeyInput('myApiKeyField');


// ═══════════════════════════════════════════════════════════════════
// SNIPPET 4: Image upload → base64 → multimodal message
// ═══════════════════════════════════════════════════════════════════

async function askWithImage(prompt, imageFile, model = 'gpt-4o') {
  const apiKey = localStorage.getItem('abacus_api_key');
  if (!apiKey) throw new Error('No API key');

  // Convert image to base64 data URL
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });

  const res = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }]
    })
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

// Usage:
// const fileInput = document.getElementById('imageInput');
// fileInput.addEventListener('change', async (e) => {
//   const result = await askWithImage('Describe this image', e.target.files[0]);
//   console.log(result);
// });


// ═══════════════════════════════════════════════════════════════════
// SNIPPET 5: Conversation with history
// ═══════════════════════════════════════════════════════════════════

class SimpleConversation {
  constructor(systemPrompt = 'You are a helpful assistant.') {
    this.messages = [{ role: 'system', content: systemPrompt }];
  }

  async send(prompt, model = 'gpt-4o') {
    this.messages.push({ role: 'user', content: prompt });

    const apiKey = localStorage.getItem('abacus_api_key');
    const res = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages: this.messages })
    });

    const data = await res.json();
    const reply = data.choices[0].message.content;
    this.messages.push({ role: 'assistant', content: reply });
    return reply;
  }

  clear() {
    this.messages = [this.messages[0]]; // keep system prompt
  }
}

// Usage:
// const convo = new SimpleConversation();
// const answer1 = await convo.send('What is Python?');
// const answer2 = await convo.send('What about JavaScript?'); // has context from answer1


// ═══════════════════════════════════════════════════════════════════
// SNIPPET 6: Settings persistence helper
// ═══════════════════════════════════════════════════════════════════

function saveSettings(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function loadSettings(key, defaults = {}) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch { return defaults; }
}

// Usage:
// saveSettings('my_app_prefs', { model: 'gpt-4o', theme: 'dark' });
// const prefs = loadSettings('my_app_prefs', { model: 'gpt-4o', theme: 'dark' });


// ═══════════════════════════════════════════════════════════════════
// SNIPPET 7: Abort controller for cancelling requests
// ═══════════════════════════════════════════════════════════════════

function createCancellableRequest(prompt, onToken, model = 'gpt-4o') {
  const controller = new AbortController();

  const promise = (async () => {
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
      }),
      signal: controller.signal
    });

    // ... streaming logic same as SNIPPET 2 ...
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', fullText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const l of lines) {
        const t = l.trim();
        if (!t || !t.startsWith('data:')) continue;
        const d = t.slice(5).trim();
        if (d === '[DONE]') continue;
        try {
          const p = JSON.parse(d);
          const delta = p.choices?.[0]?.delta?.content;
          if (delta) { fullText += delta; onToken(delta, fullText); }
        } catch {}
      }
    }
    return fullText;
  })();

  return { promise, cancel: () => controller.abort() };
}

// Usage:
// const req = createCancellableRequest('Write a story', (t, full) => { ... });
// document.getElementById('cancelBtn').onclick = () => req.cancel();
// const result = await req.promise;
