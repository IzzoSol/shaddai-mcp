# SHADDAI Tool Usage Guide — When & Why

Companion to `SKILL_INDEX.md`. Tells an agent (or user) **which tool to reach for and why**, grouped by intent.

## Discovery (start here)
- `tool_categories` — orient yourself in the 652-tool catalog.
- `tool_search <keyword>` — find tools by intent (e.g. "price", "scrape", "workflow").
- `tool_info <name>` — full schema for one tool before calling it.
- `shaddai_list_agents` — the 7 agents and what each owns.

## By intent

### "I need live data / prices / markets"
- `zerox_price` (BTC, SOL, mints) · `zerox_market_scan` · `zerox_sentiment` · `fetch_price` · `get_fear_greed` · `get_trending` · `get_ohlcv`
- Why: ZEROX owns markets; `fetch_price`/`get_*` are the raw CoinGecko/alt.me versions.

### "I need to research / look something up"
- `rag_search` (SHADDAI brain, 91k chunks) · `rag_ask` (grounded answer) · `web_search` (live web) · `web_scrape` (read a URL) · `brain_overview` · `brain_knowledge_map`
- Why: library first (`rag_search`), fall out to the web (`web_search`) for current data.

### "I need to write / create content"
- `shaddai_quill` (specialist) · `shaddai_generate_image` (TURTLE) · `shaddai_turtle` · `hall_music` (procedural track)
- Why: QUILL for copy/docs, TURTLE for visuals.

### "I need to decide / plan / orchestrate"
- `shaddai_orchestrate` (decompose + route) · `get_route` (which agent fits) · `shaddai_<agent>` (run one specialist)
- Why: orchestrate for multi-part goals; get_route when unsure.

### "I need memory / knowledge persistence"
- `memory_search` (semantic) · `aura_ingest` (teach a URL) · `aura_search` · `aura_boxes` · `hall_web_scrape` (scrape into brain)
- Why: memory_search for your notes; aura_* for boxed knowledge.

### "I need economy / money / billing"
- `zerox_commission_rate` · `zerox_record_deal` · `zerox_commissions` · `zerox_paper_open/close/portfolio` · `ledger_receipt` · `ledger_summary` · `x402_intent/confirm`
- Why: ZEROX owns revenue; ledger/x402 for the platform split.

### "I need community / gamification"
- `hall_gem_profile` · `hall_daily_bonus` · `hall_quests` · `hall_referral` · `hall_arcade` · `hall_leaderboard` · `hall_conviction`

### "I need scheduling / automation"
- `sched_add` · `sched_list` · `sched_cancel` · `workflow_create` · `workflow_run` · `workflow_list`

### "I need security review"
- `shaddai_pikadon` · `pikadon_*` (audit, password_check, sandbox_check, doctrine, swarm_brief)

## Combined workflows (recipes)
1. **Daily intel brief** — `hall_moon` → `zerox_sentiment` → `web_search` (workflow: `daily-intel-brief`)
2. **Pricing intel** — `rag_search` (pricing) → `zerox_price` (BTC) → `shaddai_quill` (writeup) (workflow: `pricing-intel`)
3. **Platform health** — `brain_overview` → `hall_community_stats` (workflow: `platform-health`)
4. **Research → write** — `rag_search` → `web_search` → `shaddai_quill`
5. **Price → trade (paper)** — `zerox_price` → `zerox_paper_open` → `zerox_paper_portfolio`

## Rules of thumb
- Library first (`rag_search`), web second (`web_search`).
- Specialist tools (`shaddai_<agent>`) for judgment; raw tools (`zerox_price`, etc.) for data.
- Money tools are OFF by default (PIKADON) — set `SHADDAI_ENABLE_MONEY=1`.
- Use `workflow_run` to replay a saved multi-step recipe.
