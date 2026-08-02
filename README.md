# SHADDAI MCP

The **7 SHADDAI agents** and their **RAG knowledge bases** (the mastery stores) as a
**Model Context Protocol** server for Claude Desktop, Claude Code, Cursor, or any
MCP stdio client.

**Key-free.** No API keys. No external LLM calls. No localhost server. You paste
one line, and Claude instantly gets a knowledge-grounded 7-agent council it can
route to.

## One-line install (no setup)

Add to Claude Code:

```bash
claude mcp add shaddai -- npx -y shaddai-mcp
```

Claude Desktop — edit config (File ▸ Settings ▸ Developer ▸ Edit Config) and add:

```json
{"mcpServers":{"shaddai":{"command":"npx","args":["-y","shaddai-mcp"]}}}
```

Cursor — Settings ▸ Features ▸ MCP ▸ Add new MCP server ▸ type `stdio`, command:

```
npx -y shaddai-mcp
```

That's it. The package runs anywhere Node >= 18 is installed. If you want a local
copy instead of npx, `npm i -g shaddai-mcp` then use the `shaddai-mcp` binary.

## The 7 agents

| Agent    | Role       | Knowledge base |
|----------|------------|----------------|
| SHADDAI  | Orchestrator | Strategy, decisions, manifestation |
| NEXUS    | Architect  | Scalable system design, engineering |
| ZEROX    | Markets    | Money, investing, unit economics |
| ORACLE   | Research   | Manifestation, law of attraction, research |
| TURTLE   | Creative   | Art, design, creative process |
| QUILL    | Writing    | Stoic discipline, writing craft |
| PIKADON  | Security   | Privacy, online security, hardening |

## Tools

- `list_agents` — the 7 agents, their role/goal, and KB document count
- `list_rag_docs` — documents inside one agent's knowledge base
- `rag_search` — raw TF-IDF chunk hits (score + source doc) for a query
- `rag_ask` — retrieves the most relevant passages and returns them with a
  grounded-answer instruction. **Claude synthesizes the answer from the passages.**
- `run_agent` — routes a goal to the right agent, injects its knowledge as
  passages, and returns a persona + instruction for Claude to complete the task.

## Resources

- `kb://<agent>` — each agent's knowledge base, browsable (7 resources)

## Try it

- "`rag_ask` — using the ORACLE knowledge base, what is manifestation?"
- "`run_agent` — QUILL, write a stoic essay on discipline using your knowledge."
- "`rag_search` in NEXUS's KB for how to design a scalable system."

## How it works

This package ships the 7 agent personas + their RAG stores only. Tools return
ranked passages and an explicit instruction, and the connected host model
(Claude) does the synthesis. The proprietary SHADDAI orchestration engine, tool
suite, billing, and server routes are **not** included.

## Development

```bash
npm install
node mcp-server-rag.js --self-test        # fast protocol test
node mcp-server-rag.js --self-test-full   # + rag_ask & run_agent
```

Logs go to **stderr**; stdout is reserved for the MCP protocol.

## License

Source-available. You may use this server and its knowledge for your own personal
or commercial work, but you may not redistribute the code or the knowledge base
contents in a competing product. See LICENSE.
