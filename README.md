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

## What you can actually do with it

This isn't just a persona plugin — it ships **7 agent knowledge bases** (85 source
documents across the mastery stores) so your answers come with receipts, not vibes.

- **Get a grounded strategy council.** Ask `run_agent` — "SHADDAI, I have $5k and a SaaS idea — plan my launch" — and get SHADDAI's orchestration persona **plus** the actual money/strategy passages from ZEROX's KB that the answer should draw on.
- **Grounded research, cited.** `rag_ask` against ORACLE's KB returns the exact source doc + score behind every claim, then Claude writes the answer from those passages. No hallucinated "well-known" facts — it's grounded in what's actually in the library.
- **Skip the generic.** `rag_search` lets you peek at the raw TF-IDF hits before asking, so you can steer a question straight at the right source.
- **Every agent, one line.** Same `npx -y shaddai-mcp` gives you all 7 — SHADDAI (strategy), NEXUS (architecture), ZEROX (money), ORACLE (research), TURTLE (creative), QUILL (writing), PIKADON (security).

**Try these in Claude after adding it:**

1. `run_agent` — "ZEROX, price a Pro tier for a B2B SaaS using your KB."
2. `rag_ask` — "What does ORACLE's KB say about consistent daily practice?"
3. `run_agent` — "PIKADON, audit this login flow against your KB."
4. `rag_search` — "NEXUS — microservices vs monolith tradeoffs"

**The deal:** free, key-free, no server — your copy of Claude becomes a 7-council
meeting room with a library. There's a richer commercial edition behind the
SHADDAI platform (live orchestration engine, billing, agent marketplace) — but
this package is, and stays, the open no-keys front door.

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
