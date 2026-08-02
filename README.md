# SHADDAI MCP — Public Edition

The 7 SHADDAI agents and their **RAG knowledge base** (the YouTube-transcription
mastery stores) as a **Model Context Protocol** server. Works in Claude Desktop,
Claude Code, Cursor, or any MCP stdio client.

This is the **reduced public build**: agents + knowledge only. It does **not**
include SHADDAI's proprietary orchestration engine, 200+ tool suite, billing,
or server routes — those stay private.

## Tools

- `list_agents` — the 7 agents, their role/goal, and KB document count
- `list_rag_docs` — documents inside one agent's knowledge base
- `rag_search` — raw TF-IDF chunk hits (score + source doc) for a query
- `rag_ask` — grounded answer synthesized from the KB via a cloud LLM
- `run_agent` — RAG-injected agent run (single-pass, cloud LLM)

## Resources

- `kb://<agent>` — each agent's knowledge base, browsable (7 resources)

## Install

```bash
npm install
cp .env.example .env     # then add ONE cloud API key (Groq is free + fastest)
```

Windows: `setup.bat` / macOS+Linux: `chmod +x setup.sh && ./setup.sh` do all
three steps and run a self-test.

## API key (ONE is enough)

| Provider | Key | Env var | Free tier |
|----------|-----|---------|-----------|
| Groq (recommended) | https://console.groq.com | `GROQ_API_KEY` | yes, fast |
| OpenRouter | https://openrouter.ai | `OPENROUTER_API_KEY` | yes |
| Google Gemini | https://aistudio.google.com | `GEMINI_API_KEY` | yes |
| Anthropic | https://console.anthropic.com | `ANTHROPIC_API_KEY` | — |
| OpenAI | https://platform.openai.com | `OPENAI_API_KEY` | — |

The server tries them in order. Ollama (`DEFAULT_OLLAMA_MODEL`) is only a
last-resort local fallback — no Ollama required.

## Connect to Claude

### Claude Desktop
Edit config (File ▸ Settings ▸ Developer ▸ Edit Config) and add:
```json
{"mcpServers":{"shaddai":{"command":"node","args":["C:\\full\\path\\to\\mcp-server-rag.js"]}}}
```

### Claude Code
```bash
claude mcp add shaddai -- node /full/path/to/mcp-server-rag.js
```

### Cursor
Settings ▸ Features ▸ MCP ▸ Add new MCP server ▸ type `stdio`, command
`node /full/path/to/mcp-server-rag.js`.

## Try it

- "`rag_search` in NEXUS's KB for how to design a scalable system."
- "`rag_ask` — using the ORACLE knowledge base, what is manifestation?"
- "`run_agent` — QUILL, write a stoic essay on discipline using your knowledge."

## Troubleshooting

- `node mcp-server-rag.js --self-test` — fast protocol test (no model)
- `node mcp-server-rag.js --self-test-full` — also runs `rag_ask` + `run_agent`
- Logs go to **stderr**; stdout is reserved for the MCP protocol.

## License

Source-available. You may use this server and its knowledge for your own
personal or commercial work, but you may not redistribute the code or the
knowledge base contents in a competing product. See LICENSE.
