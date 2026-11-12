# AGENTS.md — working in the S.A.P. repository

This file is the contract for any AI agent (Grok, Claude, Codex, …) picking
up work here. Read it before you touch anything.

**Project:** S.A.P. — *Shaddai Asimov Project*. A green-initiative stack:
a local-first forest explainer (EduTwin), a transparent payments leg, and
on-chain contracts that pay for real tree planting.

**Machine it must run on:** a ThinkPad, **~8 GB RAM, Windows, no NVIDIA
GPU**. Everything here has to work on that machine, or be explicitly
labelled knowledge/instruction-only.

**Caveat that every user-facing number must carry:**
> *Illustrative averages, not site-specific predictions.*

---

## 1. The three legs

| Leg | Path | What it is |
|---|---|---|
| **Education** | `sap-canopy/` | EduTwin: deterministic forest-growth explainer + a Three.js urban/mangrove digital twin. Gradio, runs on 8 GB, offline, Ollama optional. |
| **Payments** | `backend/` | Fee-routing policy, treasury transparency report, Treegens tree payments, Hyperliquid reads, HIP-1/2 deployment planner. |
| **Contracts** | `sap-canopy/contracts/` | `AgentPay` (escrow + 1% tree fund) and `TreeNFT` (Proof-of-Tree claim) in Solidity 0.8.24. |

Supporting: `asimov-site/` (the public site), `asimov-quill-skill/`
(the QUILL sub-agent skill), `bible/` (canon), `docs/`.

**Asimov's position:** Asimov is **QUILL's first sub-agent** — writing and
education, specialised in regenerative / physical-world work. The narrative
links **NVIDIA Omniverse + Cosmos physical-AI storytelling** to
**Treegens Proof of Tree**. Keep both threads when writing copy.

---

## 2. The seven rules

Break one of these and the change is wrong, no matter how good it looks.

### R1 — No HTTP route may trade.

Trading lives behind `lib/hyperliquid.js`'s **four-key gate**
(`HYPERLIQUID_TRADING_ENABLED`, `HYPERLIQUID_SDK`,
`HYPERLIQUID_PRIVATE_KEY`, `HYPERLIQUID_ACCOUNT_ADDRESS`). No route calls
`placeOrder` / `placeSpotOrder`. The public surface sets none of the four.

### R2 — The treasury records intent; a settler executes.

Nothing in this repo moves money on-chain. `treasury-service.js` writes a
settlement **intent**. A human-reviewed settler (which does not exist yet)
is the only thing permitted to execute it. Do not add one.

### R3 — Credits are not money.

The x402 fee is denominated in **SHAD-Credits** (closed-loop soft currency)
and lives in its own collection `db.creditFeeAllocations` with
`CREDIT_UNIT_SCALE = 100`. The real-money ledger is `db.settlements`, in
cents. **Never let credits into the money ledger.**

### R4 — Reuse `splitByPolicy`, don't copy it.

The fee policy (40% tree fund / 40% $ASIMOV liquidity / 20% platform, in
bps, summing to 10000) is owned by `backend/services/treegens-service.js`.
Import `splitByPolicy` / `readPolicyFromEnv`. Do not duplicate the
constants into another module — two sources of truth is how a fee policy
silently forks.

### R5 — x402 fee routing stays additively gated.

`SAP_X402_FEE_ROUTING=1` enables it. **Default OFF.** Enabling it must be
additive: it cannot change the behaviour of an existing path when off.

### R6 — The HIP-1 supply invariant is not negotiable.

`lib/hip1-deploy.js` enforces `maxSupplyWei === total(user-genesis
allocation)`. It is a safety invariant. Reconcile **callers** to it — never
relax the validator.

### R7 — No speculative token launches.

Utility-first only. `$ASIMOV` exists for a reason (fees → liquidity, tree
payments, plot funding). Do not propose a new token, a presale, or a
mechanism that buys our own token with user fees — that last one is
wash-trade-shaped, which is precisely why the liquidity leg is intent-only.

---

## 3. The gates

A change is not done until the relevant gates are green. Run them; don't
assume.

```bash
# payments leg
cd backend && npm test          # 65 assertions, no network, no secrets
cd backend && npm run test:sap  # the two SAP suites only

# contracts
cd sap-canopy/contracts
npm run build          # solc 0.8.24 — 31 checks, fails on error OR warning
npm run check:foundry  # type-checks the 42 Forge test functions
npm test               # ganache + ethers 6 — 84 behavioural assertions
```

Foundry is **not** installed on this machine, so the Forge suites are
type-checked while the ganache suite is what actually executes. Say so
rather than claiming `forge test` passed.

### Contract facts that will bite you

- **ethers v6 has no `expectRevert`.** Use `.staticCall(...)` for revert
  assertions — a state-changing call is `estimateGas`'d first, and
  ganache's estimateGas error carries **no decoded revert data**.
- Errors not in the contract's own ABI (e.g. OpenZeppelin's
  `SafeERC20FailedOperation(address)`) need a standalone `ethers.Interface`
  to decode.
- `contract.connect(signer).method(...)` is the correct binding. **Not**
  `contract.method.connect(signer)`.
- Job ids start at **1**. `0` is the "no such job" sentinel — see the FLAW 6
  note in `sap-canopy/contracts/README.md`.

---

## 4. The NVIDIA admission rule

A repository enters this project **if and only if** one of these is true:

1. **It runs on this machine** — no NVIDIA GPU, no Jetson, no CUDA, 8 GB
   RAM, Windows.
2. **It is knowledge or instruction only** — a skill, a prompt library, a
   reference document that makes an agent smarter about an NVIDIA workflow
   without needing NVIDIA silicon to execute it.

**Every NVIDIA repo gets a verdict row recorded BEFORE any install.** The
current verdicts live in [`docs/NVIDIA_STACK_VERDICT.md`](docs/NVIDIA_STACK_VERDICT.md).
Do not install anything that is not recorded there.

**Current headline verdicts:**

- **NVIDIA/skills → ✅ ADOPTED** (48 of 437 skills curated).
- **NVIDIA-ISAAC-ROS → ❌ NOT NOW.** Four failing gates: no NVIDIA GPU,
  ~8 GB RAM with no Jetson, no ROS 2, Windows instead of Ubuntu. The
  *idea* is preserved through the shipped Omniverse / Cosmos / TAO /
  FoundationPose skills and recorded as a future edge-node drop-in
  (Apache-2.0, citation-safe). **Do not try to install or run Isaac-ROS
  here.**
- TensorRT / nvidia-docker / nvidia-container-toolkit / xmrig-nvidia → ❌.
- NVIDIAImageScaling → ⏸️ later/optional.

25 of the 48 adopted skills need a GPU for their model steps. They are
adopted as **instruction-only** here and must be described that way.

---

## 5. Where the canonical code lives

This repository is the **public** face of S.A.P. The payments leg is
mirrored from the private SHADDAI monolith (`Shaddai-3d`, branch
`feat/sap-treasury`) so it can be reviewed and worked on in the open.

**If you change a file under `backend/`, say so in your summary.** The
mirrored copy and the monolith will need to be re-synced, and the monolith
is what actually runs in production. Changes here do not take effect
upstream by themselves.

Public sibling repos:

- `IzzoSol/shaddai-asimov-project` — **this repo**.
- `IzzoSol/shaddai-agents-mcp` — the 7-agent council MCP + the 48 NVIDIA
  skills, published as a GitHub repo (there is no npm package).

---

## 6. Blocked — do not attempt

These are blocked on money, credentials, or hardware. Say they are blocked;
do not fake them and do not spend the user's money to unblock them.

- **Real HIP-1 deployment** — the 31-hour Dutch auction has a 500 HYPE
  floor (~$40–43k). Testnet needs a prior mainnet deposit from the same
  address.
- **Trading** — no funded Hyperliquid account, and R1 forbids it anyway.
- **On-chain settlement** — no settler exists.
- **Live tree-fund destination** — `TREEGENS_TREASURY_WALLET` is unset.
- **25 GPU-dependent NVIDIA skills** — no NVIDIA GPU on this machine.

---

## 7. Style

- Match the surrounding code. These files are dense and heavily commented
  with *why*, not *what* — keep the "why" comments.
- Do not reformat unrelated lines. The diff should be the change.
- Never commit `node_modules/`, `build/`, `.env`, or runtime ledgers.
- Every user-facing number carries the caveat.
- Prefer a smaller, testable change over a clever abstraction.
