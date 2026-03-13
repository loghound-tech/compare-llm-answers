I want you to build me a HTML web app that will let me ask a question that is routed to up to 3 AI LLM's and then each answer is compared using a 4th AI LLM where it returns the answers highliting things they agree on, areas they differ and possible follow up questions or research.

It should be a beutiful single page HTML web app using teh abacus API for the LLM's.   The interface should allow me to paste in my API key and then select one, two or three LLMS to use.  THen there should be a prompt box where I can ask my question.  There should be three columns (adjustable widths) where each answer is output and when each LLM is done the 4th LLM should look at the answers and provide an analysis above in a window below the three columsn.

all output should be in markdown and there should be a way to saves individual markdowns (by copying to clipboard or saving to file) as well as the entire outptu of the three LLMs and the 4ths analysis

you can use any libraries you want to make this work but I want a modern UI that is a pleasure to use

1. Abacus API Details
Research the abacus API here https://abacus.ai/help/api

here are the available models

| **Model Name**                      | **Input Cost (/1M tokens)** | **Output Cost (/1M tokens)** |
| ----------------------------------- | --------------------------- | ---------------------------- |
| **route-llm**                       | $3.00                       | $15.00                       |
| **gpt-4-0613**                      | $30.00                      | $60.00                       |
| **gpt-4**                           | $30.00                      | $60.00                       |
| **gpt-4-32k**                       | $60.00                      | $120.00                      |
| **gpt-4-32k-0613**                  | $60.00                      | $120.00                      |
| **gpt-3.5-turbo-16k**               | $3.00                       | $4.00                        |
| **gpt-3.5-turbo**                   | $1.50                       | $2.00                        |
| **gpt-3.5-turbo-0613**              | $1.50                       | $2.00                        |
| **gpt-3.5-turbo-16k-0613**          | $3.00                       | $4.00                        |
| **gpt-4-1106-preview**              | $10.00                      | $30.00                       |
| **gpt-4-0125-preview**              | $10.00                      | $30.00                       |
| **gpt-4-turbo-2024-04-09**          | $10.00                      | $30.00                       |
| **gpt-3.5-turbo-0125**              | $0.50                       | $1.50                        |
| **gpt-4o**                          | $5.00                       | $15.00                       |
| **gpt-4o-2024-05-13**               | $5.00                       | $15.00                       |
| **gpt-4o-mini**                     | $0.15                       | $0.60                        |
| **gpt-4o-mini-2024-07-18**          | $0.15                       | $0.60                        |
| **gpt-4-0729-preview**              | $10.00                      | $30.00                       |
| **gpt-5.2-codex**                   | $0.25                       | $1.00                        |
| **openai/gpt-oss-120b**             | $0.00                       | $0.00                        |
| **claude-3-7-sonnet-20250219**      | $0.00                       | $0.00                        |
| **claude-sonnet-4-20250514**        | $0.00                       | $0.00                        |
| **claude-opus-4-20250514**          | $0.00                       | $0.00                        |
| **claude-opus-4-1-20250805**        | $0.00                       | $0.00                        |
| **claude-sonnet-4-5-20250929**      | $0.00                       | $0.00                        |
| **claude-haiku-4-5-20251001**       | $0.00                       | $0.00                        |
| **claude-opus-4-5-20251101**        | $0.00                       | $0.00                        |
| **claude-opus-4-6**                 | $0.00                       | $0.00                        |
| **claude-sonnet-4.6**               | $0.00                       | $0.00                        |
| **meta-llama/Llama-4-Maverick...**  | $0.00                       | $0.00                        |
| **meta-llama/Llama-3.1-405B-Turbo** | $2.50                       | $3.50                        |
| **meta-llama/Llama-3.1-8B**         | $0.20                       | $0.20                        |
| **llama-3.3-70b-versatile**         | $0.00                       | $0.00                        |
| **gemini-2.5-pro**                  | $0.00                       | $0.00                        |
| **gemini-2.5-flash**                | $0.00                       | $0.00                        |
| **gemini-3-pro-preview**            | $0.00                       | $0.00                        |
| **gemini-3.1-pro-preview**          | $0.00                       | $0.00                        |
| **gemini-3-flash-preview**          | $0.00                       | $0.00                        |
| **qwen-2.5-coder-32b**              | $0.00                       | $0.00                        |
| **Qwen/Qwen2.5-72B-Instruct**       | $0.00                       | $0.00                        |
| **Qwen/QwQ-32B**                    | $0.00                       | $0.00                        |
| **Qwen/Qwen3-235B-A22B-Instruct**   | $0.00                       | $0.00                        |
| **Qwen/Qwen3-32B**                  | $0.00                       | $0.00                        |
| **qwen/qwen3-coder-480b-a35b**      | $0.00                       | $0.00                        |
| **qwen3-max**                       | $0.00                       | $0.00                        |
| **grok-4-0709**                     | $0.00                       | $0.00                        |
| **grok-4-fast-non-reasoning**       | $0.00                       | $0.00                        |
| **grok-4-1-fast-non-reasoning**     | $0.00                       | $0.00                        |
| **grok-code-fast-1**                | $0.00                       | $0.00                        |
| **kimi-k2-turbo-preview**           | $0.00                       | $0.00                        |
| **kimi-k2.5**                       | $0.00                       | $0.00                        |
| **deepseek/deepseek-v3.1**          | $0.55                       | $1.66                        |
| **deepseek/deepseek-v3.1-Terminus** | $0.27                       | $1.00                        |
| **deepseek-ai/deepseek-R1**         | $3.00                       | $7.00                        |
| **deepseek-ai/DeepSeek-V3.2**       | $0.27                       | $0.40                        |
| **zai-org/glm-4.5**                 | $0.60                       | $2.20                        |
| **zai-org/glm-4.6**                 | $0.60                       | $2.20                        |
| **zai-org/glm-4.7**                 | $0.60                       | $2.20                        |
| **zai-org/glm-5**                   | $1.00                       | $3.20                        |



2. The 4th "Analysis" LLM
that should default to GPT 5.2 but it should be able to pick any of them.



3. Streaming vs. Non-Streaming
I don't know -- reserach how this works -- I just want it to be a smoother responsive system 

4. Markdown Rendering
Include a markdown renderer
5. Save/Export
-- saving as a md file and copying to clipboard as md is fine
-- for 'save all' save it as a single MD clearly laid out

6. API Key Persistence
Yes -- store api key in localstorage to make it easier

7. Error Handling
if an API has an error just proceed with what does work

the abacus api open api route is documented here

https://abacus.ai/help/developer-platform/route-llm/api

