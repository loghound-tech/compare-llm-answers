# LLM Compare

A beautiful single-page web app that lets you compare answers from up to 3 AI language models side-by-side, with a 4th model providing comparative analysis and support for multi-round follow-up conversations.

![LLM Compare](https://img.shields.io/badge/Powered%20by-Abacus%20AI%20RouteLLM-6366f1)

## Features

- **Multi-Model Comparison** — Select up to 3 LLMs and ask them the same question simultaneously
- **Follow-up Conversations** — Ask follow-up questions that maintain full conversation history with each LLM. Each follow-up creates a new set of columns below the previous round
- **Streaming Responses** — Real-time token-by-token streaming for a smooth, responsive experience
- **Comparative Analysis** — A 4th LLM analyzes all responses, highlighting agreements, differences, and follow-up questions. On follow-ups it sees the full conversation context
- **Custom Analysis Instructions** — Click "⚙️ Analysis Prompt" to customize how the analysis LLM responds, with ability to revert to defaults
- **Collapsible Rounds** — Click any round header to collapse/expand it — great when you have many follow-ups
- **Markdown Rendering** — All responses rendered as rich markdown (code blocks, tables, lists, etc.)
- **Token/Credit Usage** — Displays token counts and credit usage for each query
- **Resizable Panels** — Drag the handles between columns to adjust widths
- **Save & Export** — Multiple levels of save/copy:
  - Per-panel: copy or save an individual model's response
  - Per-round: copy or save a single question + all responses + analysis
  - Full conversation: copy or save the entire multi-round conversation as a `.md` report
- **API Key Persistence** — Your API key is stored in browser `localStorage`

## Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- An **Abacus AI** account with a RouteLLM API key
  - Sign up at [abacus.ai](https://abacus.ai)
  - Get your API key from the RouteLLM API section in the ChatLLM interface

## Quick Start

### Option 1: Python HTTP Server (Recommended)

If you have Python 3 installed (comes pre-installed on macOS):

```bash
# Navigate to the project directory
cd /path/to/compare-answers

# Start a local web server
python3 -m http.server 8765
```

Then open your browser to: **http://localhost:8765**

### Option 2: Node.js HTTP Server

```bash
npx -y http-server . -p 8765
```

Then open: **http://localhost:8765**

### Option 3: Open Directly

You can also open `index.html` directly in your browser — however, some browsers may restrict `fetch` requests from `file://` URLs, so a local server is recommended.

## Usage

1. **Enter your API Key** — Paste your Abacus AI RouteLLM API key in the header field. It will be remembered for future sessions.

2. **Select Models** — Choose up to 3 models from the dropdowns. Set any slot to "— None —" to disable it.

3. **Choose an Analysis Model** — The 4th model that compares responses. Defaults to `gpt-5.2-codex`.

4. **Customize Analysis (Optional)** — Click **⚙️ Analysis Prompt** to edit the system prompt used by the analysis LLM. You can revert to defaults at any time.

5. **Ask your question** — Type in the prompt box and click **Send** (or press `Ctrl+Enter` / `Cmd+Enter`).

6. **Review results** — Watch responses stream in real-time across the columns. Once all models respond, the analysis automatically runs.

7. **Ask follow-ups** — Use the follow-up input at the bottom of any round to ask additional questions. Each LLM receives the full conversation history (but not the analysis). A new set of columns appears below.

8. **Collapse old rounds** — Click the round header (e.g., "Initial Query" or "Follow-up #1") to collapse/expand it.

9. **Save/Export** — Use the 📋 and 💾 buttons at various levels:
   - On each panel → save/copy that model's response
   - On each round header → save/copy the entire round
   - At the bottom → **Save/Copy Entire Conversation** for a full multi-round report

## Project Structure

```
compare-answers/
├── index.html      # Main HTML page
├── styles.css      # All styling (light theme, responsive)
├── app.js          # Application logic (rounds, API, streaming, UI)
├── README.md       # This file
└── requirements.md # Original feature requirements
```

## API Reference

This app uses the [Abacus AI RouteLLM API](https://abacus.ai/help/developer-platform/route-llm/api), which provides an OpenAI-compatible endpoint:

- **Base URL:** `https://routellm.abacus.ai/v1`
- **Endpoint:** `POST /chat/completions`
- **Auth:** `Authorization: Bearer <your_api_key>`
- **Streaming:** SSE via `stream: true`

## License

For personal use.
