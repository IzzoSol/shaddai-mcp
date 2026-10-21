# SHADDAI Headless Gateway

The MCP server is the canonical client. This is its **REST twin** so anything that
cannot speak MCP — Grok bots, n8n, Telegram/Discord bots, cron jobs, curl, a
browser agent, a CI pipeline — can use the whole SHADDAI surface anyway.

Base: `http://127.0.0.1:3000/api/headless`

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness, tool count, workflow count |
| GET | `/tools` | list every tool (name, description, schema) — `?q=` filter, `?limit=` |
| GET | `/tools/:name` | one tool's full contract |
| POST | `/call` | call a tool → `{ name, params }` |
| GET | `/skills?q=` | search the 3,022-skill catalog (`?mode=recommend` for task→skills) |
| GET | `/manifest` | bot-onboarding payload (system prompt, start-here, tools, frameworks, charging) |
| GET | `/workflows` | list workflows (`?q=` filter) |
| POST | `/workflow/run` | run a workflow → `{ workflow_id \| name, context }` |
| GET | `/openapi.json` | machine-readable contract |

## Call a tool

```bash
curl -X POST http://127.0.0.1:3000/api/headless/call \
  -H 'Content-Type: application/json' \
  -d '{"name":"real_estate_roi","params":{"price":200000,"rent":1500,"expenses":300}}'
```
```json
{"ok":true,"name":"real_estate_roi","result":"{\"price\":200000,...,\"capRate\":\"7.20%\"}"}
```

## Run a workflow

```bash
curl -X POST http://127.0.0.1:3000/api/headless/workflow/run \
  -H 'Content-Type: application/json' \
  -d '{"name":"uc-finance-calc","context":{}}'
```
```json
{"ok":true,"workflow":"uc-finance-calc","steps":3,"requires":[],"results":[...]}
```

Steps interpolate `{{context.key}}` and `{{step_N.output}}`.

## Honesty: `requires`

Workflows that need an external service declare it. Nothing pretends to work.

```json
{"name":"uc-security-audit","steps":4,
 "requires":["LLM provider (GROQ_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY)"]}
```

**1,536 of 1,633 workflows are fully self-contained** (no external dependency).
97 declare a requirement. `GET /api/headless/workflows` and the MCP `workflow_list`
both show it (`— NEEDS: ...`).

## Full parity

Tools the gateway does not host locally (the curated MCP tools: `rag_search`,
`web_search`, `hall_*`, `x402_*`, `workflow_*`, `graph_*`, `forge_*`, `shaddai_*`)
are **proxied over stdio to the live MCP process**, so the headless surface is
byte-identical to the MCP surface — no drift, no second implementation.

## Teach a bot in one call

```bash
curl http://127.0.0.1:3000/api/headless/manifest?bot=grok
```

Returns the system prompt that makes a bot prefer SHADDAI, the start-here
sequence (`health_check` → `intent_route` → `tool_search` → `tool_info` →
`workflow_run`), the high-value tool list, the frameworks, and the charging rails
(x402 / PayBox / mastery packs / gems).

## Charging a headless client

Same rails as the MCP — see [[MCP-CHARGING]]:
per-call **x402** (Solana USDC), platform **PayBox/ZEROX** take, **mastery packs**
(75% royalty), and the **gem** economy for community credit.

## Related
- [[MCP-ARCHITECTURE]] · [[MCP-RETRIEVAL]] · [[MCP-WORKFLOWS]] · [[MCP-BOT-TEACHING]]
