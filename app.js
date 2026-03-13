// ─── CONFIGURATION ───
const API_BASE = 'https://routellm.abacus.ai/v1';
const MODELS = [
  { group: '── Routing ──', models: ['route-llm'] },
  { group: '── OpenAI ──', models: ['gpt-5.2-codex', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo-2024-04-09', 'gpt-4', 'gpt-3.5-turbo'] },
  { group: '── Anthropic ──', models: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-sonnet-4-5-20250929', 'claude-opus-4-5-20251101', 'claude-haiku-4-5-20251001', 'claude-opus-4-1-20250805', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219'] },
  { group: '── Google ──', models: ['gemini-3.1-pro-preview', 'gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'] },
  { group: '── xAI ──', models: ['grok-4-0709', 'grok-4-1-fast-non-reasoning', 'grok-4-fast-non-reasoning', 'grok-code-fast-1'] },
  { group: '── Meta ──', models: ['meta-llama/Llama-4-Maverick', 'meta-llama/Llama-3.1-405B-Turbo', 'meta-llama/Llama-3.1-8B', 'llama-3.3-70b-versatile'] },
  { group: '── Qwen ──', models: ['qwen/qwen3-coder-480b-a35b', 'qwen3-max', 'Qwen/Qwen3-235B-A22B-Instruct', 'Qwen/Qwen3-32B', 'Qwen/QwQ-32B', 'Qwen/Qwen2.5-72B-Instruct', 'qwen-2.5-coder-32b'] },
  { group: '── DeepSeek ──', models: ['deepseek-ai/DeepSeek-V3.2', 'deepseek/deepseek-v3.1', 'deepseek/deepseek-v3.1-Terminus', 'deepseek-ai/deepseek-R1'] },
  { group: '── Kimi ──', models: ['kimi-k2.5', 'kimi-k2-turbo-preview'] },
  { group: '── ZhipuAI ──', models: ['zai-org/glm-5', 'zai-org/glm-4.7', 'zai-org/glm-4.6', 'zai-org/glm-4.5'] },
  { group: '── Other ──', models: ['openai/gpt-oss-120b'] }
];

const DEFAULT_ANALYSIS_MODEL = 'gpt-5.2-codex';

const DEFAULT_MODELS = [
  'gemini-3.1-pro-preview',
  'claude-sonnet-4-6',
  'gpt-5.2-codex'
];

// Panel color palette — cycles for 4+ models
const PANEL_COLORS = [
  { css: 'var(--accent-cyan)',    shadow: 'rgba(8, 145, 178, 0.3)' },
  { css: 'var(--accent-violet)',  shadow: 'rgba(139, 92, 246, 0.3)' },
  { css: 'var(--accent-emerald)', shadow: 'rgba(5, 150, 105, 0.3)' },
  { css: '#e67e22',              shadow: 'rgba(230, 126, 34, 0.3)' },
  { css: '#e84393',              shadow: 'rgba(232, 67, 147, 0.3)' },
  { css: '#00b894',              shadow: 'rgba(0, 184, 148, 0.3)' },
  { css: '#0984e3',              shadow: 'rgba(9, 132, 227, 0.3)' }
];

// ─── PROVIDER WEB INTERFACES ───
function getModelProvider(modelName) {
  const m = modelName.toLowerCase();
  if (m.includes('gpt') || m.includes('openai')) {
    return { name: 'ChatGPT', url: 'https://chatgpt.com/', icon: '🤖' };
  }
  if (m.includes('claude')) {
    return { name: 'Claude', url: 'https://claude.ai/new', icon: '🟠' };
  }
  if (m.includes('gemini')) {
    return { name: 'Gemini', url: 'https://gemini.google.com/app', icon: '💎' };
  }
  if (m.includes('grok')) {
    return { name: 'Grok', url: 'https://grok.com/', icon: '⚡' };
  }
  if (m.includes('deepseek')) {
    return { name: 'DeepSeek', url: 'https://chat.deepseek.com/', icon: '🔮' };
  }
  if (m.includes('kimi')) {
    return { name: 'Kimi', url: 'https://kimi.moonshot.cn/', icon: '🌙' };
  }
  return null; // No known web UI
}

const DEFAULT_INSTRUCTIONS = `You are an expert analyst comparing AI model responses. Analyze the following responses to the same prompt. Structure your analysis in markdown with these sections:

## 🤝 Areas of Agreement
Highlight key points where the models agree.

## ⚡ Key Differences
Point out where the models diverge in their answers, reasoning, or emphasis.

## 🎯 Accuracy & Quality Assessment
Briefly assess which responses seem most accurate or complete.

## 🔍 Suggested Follow-up Questions
Suggest 2-3 follow-up questions that could help clarify the differences or deepen understanding.

Be concise but thorough. Use bullet points for clarity.`;

// ─── STATE ───
let state = {
  apiKey: '',
  activeModels: [],     // [{index: 0, model: 'gpt-4o'}, ...]
  rounds: [],           // array of round objects
  customInstructions: DEFAULT_INSTRUCTIONS,
  abortControllers: {},
  pendingFiles: [],     // [{name, size, type, dataUrl, textContent}]
  modelSlots: [],       // [{id: 0}, {id: 1}, ...] — dynamic model slots
  nextSlotId: 0         // auto-incrementing slot ID
};

// Round object shape:
// { prompt, responses: ['','',''], responseModels: ['','',''],
//   usage: [null,null,null], analysis: '', analysisUsage: null,
//   histories: [[msgs],[msgs],[msgs]], collapsed: false,
//   files: [{name, size, type, dataUrl, textContent}] }

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  initApiKey();
  populateModelSelectors();
  bindEvents();
  loadCustomInstructions();
  configureMarked();
});

function initApiKey() {
  const saved = localStorage.getItem('abacus_api_key') || '';
  const input = document.getElementById('apiKeyInput');
  input.value = saved;
  state.apiKey = saved;
  input.addEventListener('input', (e) => {
    state.apiKey = e.target.value.trim();
    localStorage.setItem('abacus_api_key', state.apiKey);
  });
}

function loadCustomInstructions() {
  const saved = localStorage.getItem('analysis_instructions');
  if (saved) state.customInstructions = saved;
}

function populateModelSelectors() {
  // Populate analysis model selector using same createModelSelect
  const analysisSel = document.getElementById('analysisModel');
  const templateSel = createModelSelect(false);
  // Move options from template to the actual select
  while (templateSel.firstChild) {
    analysisSel.appendChild(templateSel.firstChild);
  }
  analysisSel.value = DEFAULT_ANALYSIS_MODEL;

  // Try to load saved config from localStorage
  const savedConfig = loadModelConfig();

  if (savedConfig) {
    // Restore saved model slots
    savedConfig.slots.forEach(modelValue => addModelSlot(modelValue, true));
    // Restore analysis model
    if (savedConfig.analysisModel) analysisSel.value = savedConfig.analysisModel;
  } else {
    // Create default 3 model slots
    DEFAULT_MODELS.forEach(defaultModel => addModelSlot(defaultModel, true));
  }

  // Bind add-model button
  document.getElementById('addModelBtn').addEventListener('click', () => {
    addModelSlot('');
    saveModelConfig();
  });

  // Bind reset button
  document.getElementById('resetModelsBtn').addEventListener('click', resetModelsToDefault);

  // Save analysis model changes
  analysisSel.addEventListener('change', () => saveModelConfig());
}

function createModelSelect(includeNone) {
  const sel = document.createElement('select');
  if (includeNone) {
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = '— None —';
    sel.appendChild(opt);
  }
  MODELS.forEach(g => {
    const grp = document.createElement('optgroup');
    grp.label = g.group;
    g.models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = m;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  });
  return sel;
}

function addModelSlot(defaultModel, skipSave) {
  const slotId = state.nextSlotId++;
  state.modelSlots.push({ id: slotId });
  const position = state.modelSlots.length;
  const colorIdx = (position - 1) % PANEL_COLORS.length;
  const color = PANEL_COLORS[colorIdx];

  const container = document.getElementById('modelSlotsContainer');
  const wrapper = document.createElement('div');
  wrapper.className = 'model-slot';
  wrapper.id = `model-slot-wrapper-${slotId}`;

  const label = document.createElement('label');
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = color.css;
  dot.style.boxShadow = `0 0 6px ${color.shadow}`;
  label.appendChild(dot);
  label.appendChild(document.createTextNode(` Model ${position} `));

  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.className = 'slot-remove-btn';
  removeBtn.title = 'Remove this model';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeModelSlot(slotId);
  });
  label.appendChild(removeBtn);

  const sel = createModelSelect(true);
  sel.id = `model-slot-${slotId}`;
  if (defaultModel) sel.value = defaultModel;

  // Fade behavior: when "None" is selected, fade the slot
  updateSlotFade(wrapper, sel.value);
  sel.addEventListener('change', () => {
    updateSlotFade(wrapper, sel.value);
    saveModelConfig();
  });

  wrapper.appendChild(label);
  wrapper.appendChild(sel);
  container.appendChild(wrapper);

  updateSlotLabels();
  if (!skipSave) saveModelConfig();
  return slotId;
}

function removeModelSlot(slotId) {
  if (state.modelSlots.length <= 1) {
    showToast('Must have at least one model', 'error');
    return;
  }
  const idx = state.modelSlots.findIndex(s => s.id === slotId);
  if (idx === -1) return;
  state.modelSlots.splice(idx, 1);

  const wrapper = document.getElementById(`model-slot-wrapper-${slotId}`);
  if (wrapper) wrapper.remove();

  updateSlotLabels();
  saveModelConfig();
}

function updateSlotFade(wrapper, value) {
  if (!value) {
    wrapper.classList.add('slot-faded');
  } else {
    wrapper.classList.remove('slot-faded');
  }
}

function updateSlotLabels() {
  state.modelSlots.forEach((slot, i) => {
    const wrapper = document.getElementById(`model-slot-wrapper-${slot.id}`);
    if (!wrapper) return;
    const label = wrapper.querySelector('label');
    const dot = label.querySelector('.dot');
    const removeBtn = label.querySelector('.slot-remove-btn');
    const colorIdx = i % PANEL_COLORS.length;
    const color = PANEL_COLORS[colorIdx];
    dot.style.background = color.css;
    dot.style.boxShadow = `0 0 6px ${color.shadow}`;
    // Rebuild label text
    label.textContent = '';
    label.appendChild(dot);
    label.appendChild(document.createTextNode(` Model ${i + 1} `));
    label.appendChild(removeBtn);
  });
}

// ─── MODEL CONFIG PERSISTENCE ───
function saveModelConfig() {
  const slots = state.modelSlots.map(slot => {
    const sel = document.getElementById(`model-slot-${slot.id}`);
    return sel ? sel.value : '';
  });
  const analysisModel = document.getElementById('analysisModel').value;
  const config = { slots, analysisModel };
  localStorage.setItem('model_config', JSON.stringify(config));
}

function loadModelConfig() {
  try {
    const raw = localStorage.getItem('model_config');
    if (!raw) return null;
    const config = JSON.parse(raw);
    if (!config.slots || !Array.isArray(config.slots) || config.slots.length === 0) return null;
    return config;
  } catch {
    return null;
  }
}

function resetModelsToDefault() {
  // Clear saved config
  localStorage.removeItem('model_config');

  // Remove all existing slots
  const container = document.getElementById('modelSlotsContainer');
  container.innerHTML = '';
  state.modelSlots = [];
  state.nextSlotId = 0;

  // Recreate defaults
  DEFAULT_MODELS.forEach(defaultModel => addModelSlot(defaultModel, true));

  // Reset analysis model
  document.getElementById('analysisModel').value = DEFAULT_ANALYSIS_MODEL;

  showToast('Models reset to defaults', 'success');
}

function bindEvents() {
  document.getElementById('sendBtn').addEventListener('click', handleInitialSend);
  document.getElementById('promptInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleInitialSend();
  });
  document.getElementById('instructionsBtn').addEventListener('click', showInstructionsModal);

  // File attach button
  const fileInput = document.getElementById('fileInput');
  document.getElementById('attachBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    addFilesToPending(Array.from(e.target.files));
    fileInput.value = '';  // reset so same file can be re-selected
  });

  // Drag and drop on main prompt area
  const dropZone = document.getElementById('promptDropZone');
  let dragCounter = 0;
  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; dropZone.classList.remove('drag-over'); }
  });
  dropZone.addEventListener('dragover', (e) => e.preventDefault());
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) addFilesToPending(Array.from(e.dataTransfer.files));
  });
}

// ─── FILE MANAGEMENT ───
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function addFilesToPending(files, targetArray, targetContainer) {
  const pending = targetArray || state.pendingFiles;
  const container = targetContainer || document.getElementById('attachedFiles');

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      showToast(`File "${file.name}" exceeds 10MB limit`, 'error');
      continue;
    }
    try {
      let dataUrl = null;
      let textContent = null;

      if (isImageFile(file)) {
        dataUrl = await readFileAsDataUrl(file);
      } else {
        textContent = await readFileAsText(file);
      }

      pending.push({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl,
        textContent
      });
    } catch (err) {
      showToast(`Failed to read "${file.name}"`, 'error');
    }
  }
  renderFileChips(pending, container);
}

function removeFileFromPending(index, targetArray, targetContainer) {
  const pending = targetArray || state.pendingFiles;
  const container = targetContainer || document.getElementById('attachedFiles');
  pending.splice(index, 1);
  renderFileChips(pending, container);
}

function renderFileChips(files, container) {
  container.innerHTML = '';
  files.forEach((f, i) => {
    const chip = document.createElement('div');
    chip.className = 'file-chip';

    let thumbHtml = '';
    if (f.dataUrl && isImageType(f.type)) {
      thumbHtml = `<img class="file-chip-thumb" src="${f.dataUrl}" alt="" />`;
    } else {
      thumbHtml = `<span class="file-chip-icon">${getFileIcon(f.name, f.type)}</span>`;
    }

    chip.innerHTML = `
      ${thumbHtml}
      <span class="file-chip-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
      <span class="file-chip-size">${formatFileSize(f.size)}</span>
      <button class="file-chip-remove" title="Remove" data-idx="${i}">✕</button>
    `;
    chip.querySelector('.file-chip-remove').addEventListener('click', () => {
      removeFileFromPending(i, files === state.pendingFiles ? undefined : files, container);
    });
    container.appendChild(chip);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function isImageFile(file) {
  return file.type.startsWith('image/');
}

function isImageType(mimeType) {
  return mimeType && mimeType.startsWith('image/');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(name, type) {
  if (type && type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf') return '📄';
  const ext = name.split('.').pop().toLowerCase();
  const codeExts = ['py', 'js', 'ts', 'html', 'css', 'java', 'c', 'cpp', 'h', 'rs', 'go', 'rb', 'sh', 'sql', 'r', 'jl'];
  if (codeExts.includes(ext)) return '💻';
  if (['csv', 'json', 'xml', 'yaml', 'yml'].includes(ext)) return '📊';
  if (['md', 'txt', 'log'].includes(ext)) return '📝';
  return '📎';
}

function buildMessageContent(promptText, files) {
  if (!files || files.length === 0) return promptText;

  // Build multimodal content array
  const parts = [];

  // Add text files as context in the text part
  let fullText = promptText;
  const textFiles = files.filter(f => f.textContent != null);
  if (textFiles.length > 0) {
    fullText += '\n\n--- Attached Files ---';
    textFiles.forEach(f => {
      fullText += `\n\n### File: ${f.name}\n\`\`\`\n${f.textContent}\n\`\`\``;
    });
  }
  parts.push({ type: 'text', text: fullText });

  // Add image files as image_url parts
  const imageFiles = files.filter(f => f.dataUrl != null);
  imageFiles.forEach(f => {
    parts.push({
      type: 'image_url',
      image_url: { url: f.dataUrl }
    });
  });

  return parts;
}

// ─── GET ACTIVE MODELS ───
function getActiveModels() {
  const models = [];
  state.modelSlots.forEach((slot, position) => {
    const sel = document.getElementById(`model-slot-${slot.id}`);
    const m = sel ? sel.value : '';
    if (m) models.push({ index: position, model: m });
  });
  return models;
}

// ─── INITIAL SEND ───
async function handleInitialSend() {
  const prompt = document.getElementById('promptInput').value.trim();
  if (!prompt && state.pendingFiles.length === 0) return showToast('Please enter a prompt or attach files', 'error');
  if (!state.apiKey) return showToast('Please enter your API key', 'error');

  state.activeModels = getActiveModels();
  if (state.activeModels.length === 0) return showToast('Select at least one model', 'error');

  // Capture files and clear
  const files = [...state.pendingFiles];
  state.pendingFiles = [];
  document.getElementById('attachedFiles').innerHTML = '';

  // Clear previous conversation
  state.rounds = [];
  document.getElementById('roundsContainer').innerHTML = '';
  Object.values(state.abortControllers).forEach(c => c.abort());
  state.abortControllers = {};

  document.getElementById('sendBtn').disabled = true;
  document.getElementById('promptInput').value = '';

  await createAndRunRound(prompt || '(see attached files)', true, files);
  document.getElementById('sendBtn').disabled = false;
  document.getElementById('globalSaveBar').style.display = 'flex';
}

// ─── CREATE AND RUN A ROUND ───
async function createAndRunRound(prompt, isInitial, files = []) {
  const roundIdx = state.rounds.length;
  const models = state.activeModels;

  // Build histories from previous rounds
  const histories = models.map(({ index }) => {
    if (roundIdx === 0) return [];
    // Collect history from all previous rounds for this model slot
    const hist = [];
    for (let r = 0; r < roundIdx; r++) {
      const prev = state.rounds[r];
      // For history, use plain text prompt (files were already sent in that round)
      hist.push({ role: 'user', content: prev.prompt });
      if (prev.responses[index]) {
        hist.push({ role: 'assistant', content: prev.responses[index] });
      }
    }
    return hist;
  });

  const slotCount = state.modelSlots.length;
  const round = {
    prompt,
    responses: new Array(slotCount).fill(''),
    responseModels: new Array(slotCount).fill(''),
    usage: new Array(slotCount).fill(null),
    analysis: '',
    analysisUsage: null,
    histories,
    collapsed: false,
    files: files
  };
  // Map active models to their response slots
  models.forEach(({ index, model }) => { round.responseModels[index] = model; });
  state.rounds.push(round);

  // Build DOM
  buildRoundDOM(roundIdx, prompt, isInitial, models, files);

  // Scroll to the new round
  const el = document.getElementById(`round-${roundIdx}`);
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Build multimodal content for the user message
  const messageContent = buildMessageContent(prompt, files);

  // Fire requests
  const promises = models.map(({ index, model }, modelPos) => {
    const msgs = [...histories[modelPos], { role: 'user', content: messageContent }];
    return streamCompletion(model, msgs, roundIdx, index);
  });

  await Promise.allSettled(promises);

  // Run analysis
  const completedResponses = models
    .filter(({ index }) => round.responses[index].length > 0)
    .map(({ index, model }) => ({ model, response: round.responses[index] }));

  if (completedResponses.length >= 1) {
    await runAnalysis(roundIdx, prompt, completedResponses);
  }
}

// ─── BUILD ROUND DOM ───
function buildRoundDOM(roundIdx, prompt, isInitial, models, files = []) {
  const container = document.getElementById('roundsContainer');
  const div = document.createElement('div');
  div.id = `round-${roundIdx}`;
  div.className = 'round-container';

  const badgeClass = isInitial ? 'initial' : 'followup';
  const badgeText = isInitial ? 'Initial Query' : `Follow-up #${roundIdx}`;
  const shortPrompt = prompt.length > 80 ? prompt.slice(0, 80) + '…' : prompt;

  // File badge text
  const fileBadge = files.length > 0 ? ` <span class="round-file-badge" title="${files.map(f => f.name).join(', ')}">📎 ${files.length} file${files.length > 1 ? 's' : ''}</span>` : '';

  // Round header
  div.innerHTML = `
    <div class="round-header" onclick="toggleRound(${roundIdx})">
      <div class="round-header-left">
        <span class="round-badge ${badgeClass}">${badgeText}</span>
        <span class="round-prompt-preview">${escapeHtml(shortPrompt)}</span>
        ${fileBadge}
      </div>
      <div class="round-header-right">
        <button class="btn-icon" title="Copy this round" onclick="event.stopPropagation();copyRound(${roundIdx})">📋</button>
        <button class="btn-icon" title="Save this round" onclick="event.stopPropagation();saveRound(${roundIdx})">💾</button>
        <span class="collapse-icon">▼</span>
      </div>
    </div>
    <div class="round-content">
      <div class="responses-grid" id="grid-${roundIdx}">
        ${models.map(({ index }, modelPos) => {
          const colorIdx = index % PANEL_COLORS.length;
          const color = PANEL_COLORS[colorIdx];
          const modelObj = models.find(m => m.index === index);
          const provider = getModelProvider(modelObj.model);
          const isLast = modelPos === models.length - 1;
          return `
          <div class="response-panel" id="rpanel-${roundIdx}-${index}"
               style="--panel-color: ${color.css}; --panel-shadow: ${color.shadow}">
            <div class="panel-header">
              <div class="panel-header-left">
                <div class="panel-indicator" style="background: ${color.css}; box-shadow: 0 0 6px ${color.shadow}"></div>
                <span class="panel-title">${escapeHtml(modelObj.model)}</span>
              </div>
              <div class="panel-actions">
                <button class="btn-expand" title="Expand" onclick="toggleExpandPanel(${roundIdx},${index})">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="21" y1="3" x2="14" y2="10"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                </button>
                <button class="btn-icon" title="Copy" onclick="copyPanelMd(${roundIdx},${index})">📋</button>
                <button class="btn-icon" title="Save" onclick="savePanelMd(${roundIdx},${index})">💾</button>
              </div>
            </div>
            <div class="panel-body" id="body-${roundIdx}-${index}">
              <div class="panel-status"><div class="loading-dots"><span></span><span></span><span></span></div></div>
            </div>
            <div class="panel-footer" id="footer-${roundIdx}-${index}" style="display:none"></div>
            ${provider ? `<div class="panel-followup-bar">
                <button class="btn-followup" title="Copy prompt and open ${provider.name}" onclick="followUpReask(${roundIdx},${index})">
                  ${provider.icon} Re-ask on ${provider.name}
                </button>
                <button class="btn-followup btn-followup-ctx" title="Copy prompt + response and open ${provider.name}" onclick="followUpWithContext(${roundIdx},${index})">
                  📋→${provider.icon} Follow up with context
                </button>
              </div>` : ''}
          </div>
          ${!isLast && models.length > 1 ? `<div class="resize-handle" id="handle-${roundIdx}-${index}"></div>` : ''}
        `;}).join('')}
      </div>
      <div class="analysis-section" id="analysis-${roundIdx}">
        <div class="analysis-header">
          <div class="analysis-header-left">
            <div class="analysis-indicator"></div>
            <span class="panel-title">Comparative Analysis</span>
          </div>
          <div class="panel-actions">
            <button class="btn-icon" title="Copy analysis" onclick="copyAnalysis(${roundIdx})">📋</button>
            <button class="btn-icon" title="Save analysis" onclick="saveAnalysis(${roundIdx})">💾</button>
          </div>
        </div>
        <div class="analysis-body" id="abody-${roundIdx}">
          <div class="panel-status" style="color:var(--text-muted)">Waiting for responses…</div>
        </div>
        <div class="analysis-footer" id="afooter-${roundIdx}" style="display:none"></div>
      </div>
      <div class="followup-area" id="followup-${roundIdx}">
        <div class="attached-files" id="followupFiles-${roundIdx}"></div>
        <input type="file" id="followupFileInput-${roundIdx}" multiple accept="image/*,.pdf,.txt,.md,.csv,.json,.xml,.yaml,.yml,.py,.js,.ts,.html,.css,.java,.c,.cpp,.h,.rs,.go,.rb,.sh,.sql,.r,.jl,.log" hidden />
        <button class="followup-attach-btn" title="Attach files" onclick="document.getElementById('followupFileInput-${roundIdx}').click()">📎</button>
        <textarea placeholder="Ask a follow-up question… (Ctrl+Enter to send)" onkeydown="handleFollowupKey(event,${roundIdx})"></textarea>
        <button class="btn btn-primary btn-sm" onclick="handleFollowup(${roundIdx})">Follow Up</button>
      </div>
    </div>`;

  container.appendChild(div);

  // Init follow-up file input handler
  const fuFileInput = document.getElementById(`followupFileInput-${roundIdx}`);
  // Store per-round pending files
  if (!state.followupFiles) state.followupFiles = {};
  state.followupFiles[roundIdx] = [];
  fuFileInput.addEventListener('change', (e) => {
    addFilesToPending(
      Array.from(e.target.files),
      state.followupFiles[roundIdx],
      document.getElementById(`followupFiles-${roundIdx}`)
    );
    fuFileInput.value = '';
  });

  // Init resize handles for this round
  initResizeHandlesForRound(roundIdx);
}

// ─── STREAMING ───
async function streamCompletion(model, messages, roundIdx, panelIndex) {
  const key = `${roundIdx}-${panelIndex}`;
  const controller = new AbortController();
  state.abortControllers[key] = controller;
  const body = document.getElementById(`body-${roundIdx}-${panelIndex}`);
  if (!body) return;
  let fullText = '';

  try {
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.apiKey}` },
      body: JSON.stringify({ model, messages, stream: true, stream_options: { include_usage: true } }),
      signal: controller.signal
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

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
            body.innerHTML = '<div class="markdown-content">' + marked.parse(fullText) + '</div>';
            body.scrollTop = body.scrollHeight;
          }
          if (parsed.usage) {
            state.rounds[roundIdx].usage[panelIndex] = parsed.usage;
            updateFooter(`footer-${roundIdx}-${panelIndex}`, parsed.usage);
          }
        } catch (e) { }
      }
    }

    state.rounds[roundIdx].responses[panelIndex] = fullText;
    const panel = document.getElementById(`rpanel-${roundIdx}-${panelIndex}`);
    if (panel) panel.classList.remove('active');
    if (!fullText) body.innerHTML = '<div class="panel-status">No response received</div>';
    if (!state.rounds[roundIdx].usage[panelIndex]) {
      updateFooter(`footer-${roundIdx}-${panelIndex}`, null, 'not reported');
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    body.innerHTML = `<div class="panel-status" style="color:var(--accent-rose)">⚠️ ${escapeHtml(err.message)}</div>`;
  } finally {
    delete state.abortControllers[key];
  }
}

// ─── ANALYSIS ───
async function runAnalysis(roundIdx, prompt, responses) {
  const analysisModel = document.getElementById('analysisModel').value;
  const analysisBody = document.getElementById(`abody-${roundIdx}`);
  analysisBody.innerHTML = '<div class="panel-status"><div class="loading-dots"><span></span><span></span><span></span></div>&nbsp; Analyzing…</div>';

  // For follow-ups, build full conversation context
  let userMessage;
  if (roundIdx === 0) {
    const responseSummary = responses.map(r => `### Response from ${r.model}:\n${r.response}`).join('\n\n---\n\n');
    userMessage = `Original prompt: "${prompt}"\n\n${responseSummary}`;
  } else {
    // Include all rounds in the analysis
    let fullContext = '';
    for (let r = 0; r <= roundIdx; r++) {
      const rd = state.rounds[r];
      fullContext += `\n## ${r === 0 ? 'Initial Question' : `Follow-up #${r}`}: "${rd.prompt}"\n\n`;
      state.activeModels.forEach(({ index, model }) => {
        if (rd.responses[index]) {
          fullContext += `### ${model}:\n${rd.responses[index]}\n\n---\n\n`;
        }
      });
    }
    userMessage = `Full conversation context:\n${fullContext}\n\nPlease provide a comprehensive analysis covering the entire conversation including all follow-ups.`;
  }

  const controller = new AbortController();
  state.abortControllers[`analysis-${roundIdx}`] = controller;
  let fullText = '';

  try {
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.apiKey}` },
      body: JSON.stringify({
        model: analysisModel,
        messages: [
          { role: 'system', content: state.customInstructions },
          { role: 'user', content: userMessage }
        ],
        stream: true,
        stream_options: { include_usage: true }
      }),
      signal: controller.signal
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
            analysisBody.innerHTML = '<div class="markdown-content">' + marked.parse(fullText) + '</div>';
            analysisBody.scrollTop = analysisBody.scrollHeight;
          }
          if (parsed.usage) {
            state.rounds[roundIdx].analysisUsage = parsed.usage;
            updateFooter(`afooter-${roundIdx}`, parsed.usage);
          }
        } catch (e) { }
      }
    }
    state.rounds[roundIdx].analysis = fullText;
    if (!state.rounds[roundIdx].analysisUsage) {
      updateFooter(`afooter-${roundIdx}`, null, 'not reported');
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    analysisBody.innerHTML = `<div class="panel-status" style="color:var(--accent-rose)">⚠️ ${escapeHtml(err.message)}</div>`;
  } finally {
    delete state.abortControllers[`analysis-${roundIdx}`];
  }
}

// ─── FOLLOW-UP ───
function handleFollowupKey(e, roundIdx) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleFollowup(roundIdx);
}

async function handleFollowup(roundIdx) {
  const area = document.getElementById(`followup-${roundIdx}`);
  const textarea = area.querySelector('textarea');
  const prompt = textarea.value.trim();
  const followupFiles = (state.followupFiles && state.followupFiles[roundIdx]) || [];
  if (!prompt && followupFiles.length === 0) return showToast('Enter a follow-up question or attach files', 'error');
  if (!state.apiKey) return showToast('API key required', 'error');

  // Capture files
  const files = [...followupFiles];
  if (state.followupFiles) {
    state.followupFiles[roundIdx] = [];
    const fuContainer = document.getElementById(`followupFiles-${roundIdx}`);
    if (fuContainer) fuContainer.innerHTML = '';
  }

  textarea.value = '';
  // Disable the follow-up area for this round
  area.querySelectorAll('button').forEach(b => b.disabled = true);
  textarea.disabled = true;

  await createAndRunRound(prompt || '(see attached files)', false, files);

  // Re-enable
  area.querySelectorAll('button').forEach(b => b.disabled = false);
  textarea.disabled = false;
}

// ─── COLLAPSE/EXPAND ───
function toggleRound(roundIdx) {
  const el = document.getElementById(`round-${roundIdx}`);
  el.classList.toggle('collapsed');
  state.rounds[roundIdx].collapsed = el.classList.contains('collapsed');
}

// ─── EXPAND SINGLE PANEL ───
function toggleExpandPanel(roundIdx, panelIndex) {
  const grid = document.getElementById(`grid-${roundIdx}`);
  if (!grid) return;
  const panel = document.getElementById(`rpanel-${roundIdx}-${panelIndex}`);
  if (!panel) return;

  const isExpanded = panel.classList.contains('expanded');

  if (isExpanded) {
    // Collapse back to normal view
    panel.classList.remove('expanded');
    grid.querySelectorAll('.response-panel').forEach(p => p.classList.remove('panel-collapsed'));
    grid.querySelectorAll('.resize-handle').forEach(h => h.classList.remove('panel-collapsed'));

    // Restore expand icon
    const btn = panel.querySelector('.btn-expand');
    if (btn) {
      btn.title = 'Expand';
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      </svg>`;
    }
  } else {
    // First collapse any already-expanded panel in this grid
    grid.querySelectorAll('.response-panel.expanded').forEach(p => {
      p.classList.remove('expanded');
      const btn = p.querySelector('.btn-expand');
      if (btn) {
        btn.title = 'Expand';
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 3 21 3 21 9"></polyline>
          <polyline points="9 21 3 21 3 15"></polyline>
          <line x1="21" y1="3" x2="14" y2="10"></line>
          <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>`;
      }
    });
    grid.querySelectorAll('.response-panel.panel-collapsed').forEach(p => p.classList.remove('panel-collapsed'));
    grid.querySelectorAll('.resize-handle.panel-collapsed').forEach(h => h.classList.remove('panel-collapsed'));

    // Expand this panel, collapse others
    panel.classList.add('expanded');
    grid.querySelectorAll('.response-panel').forEach(p => {
      if (p !== panel) p.classList.add('panel-collapsed');
    });
    grid.querySelectorAll('.resize-handle').forEach(h => h.classList.add('panel-collapsed'));

    // Switch to minimize icon
    const btn = panel.querySelector('.btn-expand');
    if (btn) {
      btn.title = 'Collapse';
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 14 10 14 10 20"></polyline>
        <polyline points="20 10 14 10 14 4"></polyline>
        <line x1="14" y1="10" x2="21" y2="3"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      </svg>`;
    }
  }
}

// ─── RESIZE HANDLES ───
function initResizeHandlesForRound(roundIdx) {
  const grid = document.getElementById(`grid-${roundIdx}`);
  if (!grid) return;
  grid.querySelectorAll('.resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handle.classList.add('active');
      const startX = e.clientX;
      const allItems = Array.from(grid.children).filter(c => !c.classList.contains('hidden-panel'));
      const hIdx = allItems.indexOf(handle);
      const leftPanel = allItems[hIdx - 1];
      const rightPanel = allItems[hIdx + 1];
      if (!leftPanel || !rightPanel) return;
      const leftW = leftPanel.getBoundingClientRect().width;
      const rightW = rightPanel.getBoundingClientRect().width;
      const onMove = (e) => {
        const dx = e.clientX - startX;
        leftPanel.style.flex = `0 0 ${Math.max(180, leftW + dx)}px`;
        rightPanel.style.flex = `0 0 ${Math.max(180, rightW - dx)}px`;
      };
      const onUp = () => {
        handle.classList.remove('active');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

// ─── CUSTOM INSTRUCTIONS MODAL ───
function showInstructionsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'instructionsModal';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>⚙️ Analysis Prompt Instructions</h2>
        <button class="btn-icon" onclick="closeModal()" title="Close">✕</button>
      </div>
      <div class="modal-body">
        <p>Customize the system prompt sent to the analysis LLM. This controls how it compares and summarizes responses.</p>
        <textarea id="instructionsTextarea">${escapeHtml(state.customInstructions)}</textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="resetInstructions()">↩ Reset to Default</button>
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveInstructions()">Save</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

function closeModal() {
  const m = document.getElementById('instructionsModal');
  if (m) m.remove();
}

function saveInstructions() {
  const textarea = document.getElementById('instructionsTextarea');
  state.customInstructions = textarea.value;
  localStorage.setItem('analysis_instructions', state.customInstructions);
  closeModal();
  showToast('Instructions saved!', 'success');
}

function resetInstructions() {
  document.getElementById('instructionsTextarea').value = DEFAULT_INSTRUCTIONS;
}

// ─── SAVE/COPY PER PANEL ───
function copyPanelMd(roundIdx, panelIndex) {
  const md = state.rounds[roundIdx]?.responses[panelIndex];
  if (!md) return showToast('No content', 'error');
  navigator.clipboard.writeText(md).then(() => showToast('Copied!', 'success'));
}

// ─── FOLLOW UP ON PROVIDER ───
function followUpReask(roundIdx, panelIndex) {
  const rd = state.rounds[roundIdx];
  if (!rd) return;
  const modelName = rd.responseModels[panelIndex];
  const provider = getModelProvider(modelName);
  if (!provider) return showToast('No web interface for this model', 'error');

  // Build the prompt text from the full conversation
  let promptText = '';
  for (let r = 0; r <= roundIdx; r++) {
    if (r === 0) {
      promptText += state.rounds[r].prompt;
    } else {
      promptText += '\n\nFollow-up: ' + state.rounds[r].prompt;
    }
  }

  navigator.clipboard.writeText(promptText).then(() => {
    showToast(`Prompt copied! Opening ${provider.name}…`, 'success');
    window.open(provider.url, '_blank');
  }).catch(() => {
    showToast('Failed to copy to clipboard', 'error');
  });
}

function followUpWithContext(roundIdx, panelIndex) {
  const rd = state.rounds[roundIdx];
  if (!rd) return;
  const modelName = rd.responseModels[panelIndex];
  const provider = getModelProvider(modelName);
  if (!provider) return showToast('No web interface for this model', 'error');

  // Build full context: prompt + this model's response
  let contextText = '';
  for (let r = 0; r <= roundIdx; r++) {
    const round = state.rounds[r];
    if (r === 0) {
      contextText += `My question: ${round.prompt}`;
    } else {
      contextText += `\n\nFollow-up question: ${round.prompt}`;
    }
    if (round.responses[panelIndex]) {
      contextText += `\n\n${modelName}'s response:\n${round.responses[panelIndex]}`;
    }
  }
  contextText += '\n\n---\nI\'d like to follow up on the above. ';

  navigator.clipboard.writeText(contextText).then(() => {
    showToast(`Prompt + response copied! Opening ${provider.name}…`, 'success');
    window.open(provider.url, '_blank');
  }).catch(() => {
    showToast('Failed to copy to clipboard', 'error');
  });
}

async function savePanelMd(roundIdx, panelIndex) {
  const rd = state.rounds[roundIdx];
  const md = rd?.responses[panelIndex];
  if (!md) return showToast('No content', 'error');
  const modelName = rd.responseModels[panelIndex] || 'response';
  const fallback = `${modelName}-round${roundIdx}.md`;
  showToast('Generating filename…', 'success');
  const filename = await generateFilename(fallback);
  downloadFile(filename, md);
}

function copyAnalysis(roundIdx) {
  const md = state.rounds[roundIdx]?.analysis;
  if (!md) return showToast('No analysis', 'error');
  navigator.clipboard.writeText(md).then(() => showToast('Copied!', 'success'));
}

async function saveAnalysis(roundIdx) {
  const md = state.rounds[roundIdx]?.analysis;
  if (!md) return showToast('No analysis', 'error');
  showToast('Generating filename…', 'success');
  const filename = await generateFilename(`analysis-round${roundIdx}.md`);
  downloadFile(filename, md);
}

// ─── SAVE/COPY PER ROUND ───
function buildRoundMd(roundIdx) {
  const rd = state.rounds[roundIdx];
  let md = `## ${roundIdx === 0 ? 'Initial Query' : `Follow-up #${roundIdx}`}\n\n**Prompt:** ${rd.prompt}\n\n---\n`;
  state.activeModels.forEach(({ index, model }) => {
    if (rd.responses[index]) {
      md += `\n### ${model}\n\n${rd.responses[index]}\n\n---\n`;
    }
  });
  if (rd.analysis) md += `\n### Comparative Analysis\n\n${rd.analysis}\n\n---\n`;
  return md;
}

function copyRound(roundIdx) {
  const md = buildRoundMd(roundIdx);
  navigator.clipboard.writeText(md).then(() => showToast('Round copied!', 'success'));
}

async function saveRound(roundIdx) {
  const md = buildRoundMd(roundIdx);
  showToast('Generating filename…', 'success');
  const filename = await generateFilename(`round-${roundIdx}.md`);
  downloadFile(filename, md);
}

// ─── SAVE/COPY ENTIRE CONVERSATION ───
function buildFullConversationMd() {
  let md = `# LLM Comparison Report\n\n**Date:** ${new Date().toLocaleString()}\n\n`;
  md += `**Models:** ${state.activeModels.map(m => m.model).join(', ')}\n\n`;
  md += `**Analysis Model:** ${document.getElementById('analysisModel').value}\n\n---\n`;
  state.rounds.forEach((rd, i) => { md += '\n' + buildRoundMd(i); });
  return md;
}

function copyEntireConversation() {
  const md = buildFullConversationMd();
  navigator.clipboard.writeText(md).then(() => showToast('Full conversation copied!', 'success'));
}

async function saveEntireConversation() {
  const md = buildFullConversationMd();
  showToast('Generating filename…', 'success');
  const filename = await generateFilename('llm-comparison-full-report.md');
  downloadFile(filename, md);
  showToast('Full report saved!', 'success');
}

// ─── UTILITIES ───
function updateFooter(footerId, usage, fallbackText) {
  const footer = document.getElementById(footerId);
  if (!footer) return;
  if (usage) {
    const parts = [];
    if (usage.prompt_tokens != null) parts.push(`<span class="usage-item"><span class="usage-label">In:</span> <span class="usage-value">${usage.prompt_tokens.toLocaleString()}</span></span>`);
    if (usage.completion_tokens != null) parts.push(`<span class="usage-item"><span class="usage-label">Out:</span> <span class="usage-value">${usage.completion_tokens.toLocaleString()}</span></span>`);
    if (usage.total_tokens != null) parts.push(`<span class="usage-item"><span class="usage-label">Total:</span> <span class="usage-value">${usage.total_tokens.toLocaleString()}</span></span>`);
    if (usage.compute_points_used != null) parts.push(`<span class="usage-item"><span class="usage-label">Credits:</span> <span class="usage-credits">${usage.compute_points_used.toLocaleString()}</span></span>`);
    footer.innerHTML = parts.join('');
  } else {
    footer.innerHTML = `<span class="usage-item"><span class="usage-label">Usage:</span> <span class="usage-value">${fallbackText || 'N/A'}</span></span>`;
  }
  footer.style.display = 'flex';
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `${type === 'success' ? '✓' : '⚠'} ${escapeHtml(message)}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ─── SMART FILENAME GENERATION ───
function getInitialPrompt() {
  // Always use the first round's prompt for filename generation
  if (state.rounds.length > 0 && state.rounds[0].prompt) {
    return state.rounds[0].prompt;
  }
  return '';
}

async function generateFilename(fallback) {
  const prompt = getInitialPrompt();
  if (!prompt || prompt === '(see attached files)') return fallback;

  try {
    const analysisModel = document.getElementById('analysisModel').value;

    // Add a timeout so saves don't hang
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.apiKey}` },
      body: JSON.stringify({
        model: analysisModel,
        messages: [
          {
            role: 'user',
            content: `Task: Generate a concise, descriptive filename for an LLM conversation.\nInput Prompt: "${prompt}"\n\nConstraints:\n1. Use 3 to 4 words maximum.\n2. Use only lowercase letters.\n3. Separate words with underscores (_).\n4. Do not include file extensions (like .md).\n5. Return ONLY the filename. No preamble, no quotes, and no explanations.`
          }
        ],
        stream: false,
        max_tokens: 30
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let filename = data.choices?.[0]?.message?.content?.trim();
    if (!filename) throw new Error('Empty response');

    // Sanitize the filename
    filename = sanitizeFilename(filename);
    if (!filename || filename.length < 3) throw new Error('Too short');

    return filename + '.md';
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('Filename generation timed out, using fallback');
    } else {
      console.warn('Filename generation failed, using fallback:', err.message);
    }
    return fallback;
  }
}

function sanitizeFilename(name) {
  // Remove any markdown formatting, quotes, extension the model may have added
  name = name.replace(/```/g, '').replace(/`/g, '').replace(/["']/g, '').trim();
  // Remove .md or other extensions if model included them
  name = name.replace(/\.\w{1,4}$/i, '');
  // Replace spaces and hyphens with underscores for consistency
  name = name.replace(/[\s-]+/g, '_');
  // Keep only alphanumeric and underscores
  name = name.replace(/[^a-zA-Z0-9_]/g, '');
  // Collapse multiple underscores
  name = name.replace(/_{2,}/g, '_');
  // Trim underscores from ends
  name = name.replace(/^_+|_+$/g, '');
  // Lowercase
  name = name.toLowerCase();
  // Truncate to 55 chars
  if (name.length > 55) name = name.slice(0, 55).replace(/_+$/, '');
  return name;
}

// ─── CONFIGURE MARKED FOR INLINE IMAGES ───
function configureMarked() {
  const renderer = new marked.Renderer();

  // Custom image renderer for inline display
  renderer.image = function({ href, title, text }) {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    const altText = text ? escapeHtml(text) : '';
    return `<figure class="md-image-figure">
      <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
        <img src="${escapeHtml(href)}" alt="${altText}"${titleAttr} class="md-inline-image" loading="lazy" />
      </a>
      ${altText ? `<figcaption>${altText}</figcaption>` : ''}
    </figure>`;
  };

  marked.setOptions({
    renderer,
    breaks: true,
    gfm: true
  });
}
