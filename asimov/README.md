# Shaddai Asimov Project (S.A.P.)

**Asimov** — the local-first explainability companion for Treegens real
planting and NVIDIA-style physical-AI urban-forest digital twins.

> Open source. MIT. **Runs on a 8 GB ThinkPad, Windows, no NVIDIA GPU, no
> cloud, no keys.**

```text
  Treegens funds and verifies tree planting (Proof of Tree)
                        +
  NVIDIA's physical-AI stack simulates cities (Omniverse / Cosmos / SimReady)
                        =
              S.A.P. — the layer in between
```

Treegens ships **sponsorship claims, not tree geometry**. NVIDIA ships
**simulation, not planting**. The gap is the middle: a fast, private,
understandable layer where a community, a student, or an ambassador can see
what a 15-year canopy and carbon trajectory actually mean.

---

## What's inside

| Path | What it is |
|---|---|
| `sap-canopy/` | Three.js urban/mangrove forest digital twin + Leaflet ⇄ Three camera bridge + local explainer drawer |
| `sap-canopy/forest_edutwin/` | Gradio educational explainer & mini digital twin (5 tabs, runs on 8 GB RAM) |
| `sap-canopy/contracts/` | `AgentPay` + `TreeNFT` in Solidity 0.8.24 — escrow, a 1% tree fund, and a Proof-of-Tree claim |
| `backend/` | The payments leg: fee-routing policy, treasury transparency report, tree payments, Hyperliquid reads, HIP-1/2 planner |
| `asimov-site/` | Asimov static site |
| `asimov-quill-skill/` | QUILL skill for Asimov-style long-form writing |
| `bible/` | Project treatment / canon documents |
| `docs/` | Treasury document, NVIDIA stack verdict |
| `Isaac_Asimov_Agent.md` | Agent persona + operating rules |
| **`AGENTS.md`** | **Read this before you change anything** — the seven rules and the gates |

---

## Quick start

### 1. The educational explainer (local-first, Ollama optional)

```bash
cd sap-canopy/forest_edutwin
pip install -r requirements.txt
python app.py                      # http://127.0.0.1:7860
```

### 2. The 3D digital twin

```bash
cd sap-canopy
python -m http.server 8000         # http://localhost:8000/index.html
```

### 3. The payments leg

```bash
cd backend
npm install
npm start                          # http://127.0.0.1:3000
npm test                           # 65 assertions, no network, no secrets
```

```bash
curl http://127.0.0.1:3000/api/sap/policy      # the 40/40/20 fee split
curl http://127.0.0.1:3000/api/sap/hip1/plan    # the HIP-1 deployment plan
```

### 4. The contracts

```bash
cd sap-canopy/contracts
npm install
npm run build          # solc 0.8.24 — 31 checks, fails on error OR warning
npm run check:foundry  # type-checks the 42 Forge test functions
npm test               # ganache + ethers 6 — 84 behavioural assertions
```

Foundry is not installed on this machine, so the Forge suites are
type-checked while the ganache suite is what actually executes.

---

## The payments leg, in one paragraph

Every payment is split **40% to a real tree fund, 40% to $ASIMOV liquidity,
20% to platform operations** — in basis points, summing to exactly 10000,
and readable at `GET /api/sap/policy`. The treasury **records what should
happen rather than doing it**: no HTTP route can trade, and no settlement
executes without a human-reviewed settler. Credits (SHAD-Credits) live in
their own ledger, separate from the real-money ledger. x402 fee routing is
**off by default** (`SAP_X402_FEE_ROUTING=1` enables it).

Full detail: [`docs/SAP_TREASURY.md`](docs/SAP_TREASURY.md).

## The contracts, in one paragraph

A poster escrows a stablecoin bounty; an agent does the work; the poster
names the winner. The winner is paid **99%** and a **TreeNFT** claim is
minted to them; the remaining **1%** is booked into the tree fund and
released to the designated recipient by an authorised settler. The
contracts expose no route that moves escrowed user funds to an arbitrary
address — and that property is **asserted in the test suite**, not just
claimed. Six flaws in the original spec were found and fixed (including the
one where the *first* job got id `0`, the "no such job" sentinel, and could
never be read or refunded); all six are documented inline and in
[`sap-canopy/contracts/README.md`](sap-canopy/contracts/README.md).

---

## NVIDIA stack verdict — what runs here and what doesn't

A repository enters this project **only** if it runs on this machine (no
NVIDIA GPU, no Jetson, no CUDA, 8 GB RAM, Windows) **or** is
knowledge/instruction-only. Every NVIDIA repo gets a verdict row recorded
**before** any install. Full table:
[`docs/NVIDIA_STACK_VERDICT.md`](docs/NVIDIA_STACK_VERDICT.md).

| Repository | Verdict | Why |
|---|---|---|
| **NVIDIA/skills** | ✅ **ADOPTED** | 48 of 437 curated. 23 run without a GPU; 25 are adopted instruction-only and are described that way. |
| **NVIDIA-ISAAC-ROS** | ❌ **NOT NOW** | **Four failing gates:** no NVIDIA GPU (Intel HD 620 only) · ~8 GB RAM, no Jetson · no ROS 2 · Windows, not Ubuntu. The *idea* is preserved via the shipped Omniverse / Cosmos / TAO / FoundationPose skills and recorded as a future edge-node drop-in (Apache-2.0, citation-safe). **Do not install or run Isaac-ROS here.** |
| NVIDIA TensorRT | ❌ | Needs a discrete NVIDIA GPU + CUDA. |
| nvidia-docker / nvidia-container-toolkit | ❌ | Needs a Linux container runtime and NVIDIA drivers. |
| xmrig-nvidia | ❌ | Needs an NVIDIA GPU; irrelevant to the project. |
| NVIDIAImageScaling | ⏸️ | Later/optional — instruction-only for now. |

The 48 adopted skills are published at
**[`IzzoSol/shaddai-agents-mcp`](https://github.com/IzzoSol/shaddai-agents-mcp)**
(the 7-agent council MCP + the NVIDIA skill library). There is no npm
package — the GitHub repo is the distribution channel.

---

## Principles

1. **Local-first.** Ollama / transformers-4bit / deterministic fallback. No cloud, no telemetry.
2. **Explainable by construction.** Numbers are deterministic and auditable (`scenarios.py`);
   the model only narrates numbers it was handed (`agent.py`).
3. **Always caveated.** Every answer carries *illustrative averages, not site-specific predictions*.
4. **Honest about the data.** Treegens ships sponsorship claims, not tree geometry. Everything
   derived is labelled as derived.
5. **Small downloads.** Hugging Face assets are fetched selectively — streamed or a few hundred KB.
6. **Utility-first.** $ASIMOV exists to fund trees and deepen liquidity. No presales, no
   speculative launches, and no buying our own token with user fees.

---

## Media — screenshots & demo

> **TODO — not yet recorded.** The demo runs today; the polished capture is
> still to do. This section is a placeholder so the structure is in place.

**Screenshots to capture** (all from the local stack, no cloud):

| # | What | Where |
|---|---|---|
| 1 | EduTwin — canopy growth tab with the 15-year trajectory | `sap-canopy/forest_edutwin` → `http://127.0.0.1:7860` |
| 2 | EduTwin — cumulative carbon tab | same |
| 3 | The 3D urban-forest twin, Three.js camera | `sap-canopy` → `http://localhost:8000/index.html` |
| 4 | The payments transparency report | `GET /api/sap/treasury/report` |
| 5 | The 40/40/20 policy | `GET /api/sap/policy` |

**Demo video — 30–60 s, silent or voice-over.** Storyboard:

1. (0–8 s) Open the EduTwin. Pick a plot. The canopy grows. *"This is what
   15 years of mangrove actually looks like."*
2. (8–20 s) The carbon chart. *"Illustrative averages, not site-specific
   predictions."*
3. (20–35 s) Cut to the 3D twin. Fly the camera down through the canopy.
4. (35–50 s) Cut to the terminal: `GET /api/sap/policy` → **40 / 40 / 20**.
   *"Every fee: 40% plants trees, 40% deepens liquidity, 20% runs the
   platform."*
5. (50–60 s) `GET /api/sap/treegens/plots` → the real plots that can be
   funded. End card: **S.A.P. — Shaddai Asimov Project.**

**Recording notes:** 1920×1080, 30 fps. The EduTwin is heavy on a 8 GB
ThinkPad — record the explainer separately from the 3D twin so a swap
doesn't stall the capture. Keep every on-screen number caveated.

**Launch posts.** Tag **`@NVIDIAAI`** and **`@thetreegens`**. Keep every
claim educational and caveated — *illustrative averages, not site-specific
predictions* — and do not imply a token launch, a price, or a guaranteed
return. Suggested angle: *"What a 15-year mangrove canopy actually looks
like — simulated locally on an 8 GB laptop, no cloud, no GPU."*

---

## Agents

Built with the SHADDAI council: TURTLE (UI/UX), NEXUS (architecture), ORACLE (research),
QUILL (writing), ZEROX (economics), PIKADON (security), SHADDAI (orchestration).

**Asimov is QUILL's first sub-agent** — writing and education, specialised in
regenerative / physical-world work.

---

## Licence

MIT. See [`LICENSE`](LICENSE).

## Contributing

Read [`AGENTS.md`](AGENTS.md) first — it carries the seven rules, the gates,
and the standing constraints. Changes under `backend/` are mirrored from the
private monolith and need re-syncing.
