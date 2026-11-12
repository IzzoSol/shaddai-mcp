# S.A.P. Treasury — how the money is routed, and what is deliberately not done

**Owner:** SHADDAI (policy) · ZEROX (economics) · NEXUS (implementation) · PIKADON (compliance review)
**Implementation:** `backend/services/treasury-service.js`, `backend/services/treegens-service.js`, `backend/x402-routes.js`
**Status:** live code paths; **every on-chain leg is intent-only** — no settler exists yet
**Last reviewed:** 2026-11-05

> *Illustrative averages, not site-specific predictions.*

---

## 1. The one-sentence version

The S.A.P. green initiative splits every payment it receives **40% to a real tree
fund, 40% to $ASIMOV liquidity, 20% to platform operations** — and the treasury
**records what should happen rather than doing it**, because a human-reviewed
settler is the only thing that may move money on-chain.

---

## 2. The fee-routing policy

One policy, one implementation, no copies.

| Slice | Default | Env override | Goes to |
|-------|---------|--------------|---------|
| Tree fund | **40%** (4000 bps) | `SAP_TREE_FUND_BPS` | Treegens — real planting + Proof-of-Tree verification |
| $ASIMOV liquidity | **40%** (4000 bps) | `SAP_ASIMOV_LIQUIDITY_BPS` | $ASIMOV liquidity on Solana |
| Platform | **20%** (2000 bps) | `SAP_PLATFORM_BPS` | SHADDAI operating revenue |

The policy **must sum to exactly 10000 bps**. It is enforced in two places:

- `treegens-service.js` — `readPolicyFromEnv()` refuses an incomplete policy.
- `treasury-service.js` — `recordCreditFeeAllocation()` refuses to write an
  allocation whose three slices do not sum to the gross, and refuses a policy
  that does not sum to 10000 bps.

The x402 fee path **imports** `splitByPolicy` and `readPolicyFromEnv` from
`treegens-service.js`. It does not re-declare the numbers. So an env override
moves both paths together — there is no way for the green initiative and the
marketplace to disagree about the split.

---

## 3. Two currencies, never mixed

This is the single most important accounting rule in the ledger.

| | Real money | Credits |
|---|---|---|
| Unit | **integer cents** (USD / USDC) | **integer credit units** (1 SHAD-Credit = 100 units) |
| Where | `db.pools`, `db.settlements`, `db.treePayments` | `db.creditFeeAllocations` |
| Treasury report | `pools`, `treePayments`, `settlements` | `creditFeeRouting` |
| Real-money value | the amount itself | **`null` — never derived** |
| Source | real payments for real work | the x402 marketplace fee |

**SHAD-Credits are a closed-loop soft currency.** The x402 rail mints **100 free
demo credits for every new wallet**, so a credits balance can have *no money
behind it at all*. Writing a credits fee into the cents pools would inflate the
real-money totals with soft currency and corrupt every downstream reading of
them.

So a credits allocation:

- lives in its own collection,
- carries its own unit label (`unit: 'SHAD-Credits'`, `currency: 'SHAD-Credits'`),
- appears in the transparency report under `creditFeeRouting` with
  `excludedFromRealMoneyTotals: true` and `realMoneyValue: null`,
- **never touches** `db.pools`, `db.settlements` or `db.treePayments`,
- **never queues an on-chain intent** and **never settles** —
  `settlement: 'not_applicable'`.

There is **no SHAD-Credits → USD/USDC conversion rate anywhere in this
codebase**, so no real-money value is ever computed for a credits fee. That is
a deliberate absence, not an oversight — inventing a rate would manufacture a
dollar figure for something that may be worth nothing.

The x402 fee routing is **additive and gated off by default**:

```bash
# OFF (default) — legacy behaviour, byte-for-byte unchanged
SAP_X402_FEE_ROUTING=0

# ON — the 5% fee is split 40/40/20 into a credits allocation
SAP_X402_FEE_ROUTING=1
```

With the flag unset, the treasury sees nothing at all and the x402 ledger's
balance behaviour is identical to before.

---

## 4. The tree fund — what it actually pays for

The tree-fund slice is **payment for planting and verification services already
rendered**. The exact string on every record (`TREE_PAYMENT_NOTE`):

> *"Payment for planting and verification services already rendered. Not an
> investment, not a promise of appreciation, and not redeemable for fiat."*

This framing is deliberate. It is a **services** payment — not a token
purchase, not a donation, not a promise of appreciation. It is what keeps the
leg clear of a Howey-style analysis. The test suite asserts the exact string,
so it cannot drift.

> **Configuration gap:** `TREEGENS_TREASURY_WALLET` is **unset**. Tree
> intents currently queue with `destination: null` and the memo
> *"Tree fund — awaiting TREEGENS_TREASURY_WALLET configuration"*. That is the
> correct behaviour: the leg records intent and refuses to guess a destination.

---

## 5. The $ASIMOV liquidity leg — what the venue actually is

### 5.1 The facts (verified 2026-11-05 against three independent sources)

| | |
|---|---|
| **$ASIMOV mint** | `DaFB3rooEtLMoQh9P8xAkSUeJ8utuh3VBfwnZAaysCXC` (Solana **Token-2022**, 6 decimals, supply 999,798,654.675747, mint authority revoked) |
| **Pool** | `2MhdCBPyHyRKoM5AVEfq1rbcTkCnMz8iWpuUCrjMJXUw` |
| **Pool owner** | `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj` — the **Raydium LaunchLab** program |
| **Venue type** | **Raydium LaunchLab constant-product bonding curve** (StonkFun launch) — *not* a CPMM, *not* CLMM |
| **Quote asset** | **NVDAx** `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` (8 decimals, Token-2022) |
| **Live** | ~$985 TVL · ~$692 24h volume · ~40 holders · **13.76% graduation progress** · price **−29.6%** on the day |

Confirmed three ways: StonkFun's public API, the pool account decoded from
mainnet-beta RPC, and the Jupiter router's `routePlan[0].swapInfo.ammKey`.

> **$ASIMOV is NOT on Hyperliquid.** It is a Solana Token-2022 asset. The
> liquidity leg routes to **Solana**; Hyperliquid is the **USDC treasury rail**
> and a future HIP-1 venue.

### 5.2 Six caveats that change what "route fees to liquidity" means

1. **Venue fees go to the PLATFORM, not to us.** StonkFun's own fee endpoint
   states it plainly: *"trading fees go to the platform. There is no creator
   fee position."* The `creator` field is `null`. **We cannot route fees into
   this pool and then claim them** — the pool is a destination for a buy, not a
   fee accrual we own.

2. **"Deepening liquidity" means executing a BUY.** A bonding curve's liquidity
   *is* its reserves. There is no LP token and no `add_liquidity` instruction.
   Direct transfers into the vault accounts are impossible — they are
   program-owned. The only way to deepen this pool is to **buy $ASIMOV with the
   routed funds**.

3. **Graduation moves the pool to a new address.** `migrateType: cpmm` — when
   the curve graduates, Raydium migrates it to a CPMM pool **at a different
   address** and `2MhdCB…XUw` goes stale. A hardcoded pool address becomes a
   dead destination on graduation. **Re-verify before every settlement.**

4. **$ASIMOV carries a 3% Token-2022 transfer fee**, capped at 1,000,000 tokens
   per transfer. Splits computed from raw amounts will not reconcile. Use
   Token-2022 accounts throughout — classic SPL accounts will not work.

5. **NVDAx is a tokenised equity and is not available to US persons.** If US
   persons are in the tree-payer population, this leg is not viable for them.
   Every settlement is also at least two hops (USDC → NVDAx → $ASIMOV) through
   a third party whose fee and impact we do not control.

6. **The book is thin and the price is a curve function.** ~$985 TVL, ~$692 24h
   volume, 11 traders, Jupiter `organicScore: 0`. A **$40 slice is ~4% of pool
   TVL** with a measured **~6.3% price impact** ($100 → ~7.9%). There is no
   order book and no meaningful slippage protection pre-graduation.

### 5.3 Therefore: the leg is INTENT-ONLY

Buying our own token with our users' fees into a thin pre-graduation bonding
curve is **wash-trade-shaped**. `treasury-service.js` already flags this in its
own header. So the liquidity leg:

- **records an intent**, never executes,
- carries the venue route and every caveat above **in the intent's own memo**,
  so a settler reading the record cannot mistake it for an add-liquidity call,
- keeps `chain: 'solana-amm'` as the plain rail identifier so settler-side
  filters keep matching, with the precise mechanics in
  `ASIMOV_LIQUIDITY_ROUTE` / `ASIMOV_LIQUIDITY_NOTE`.

### 5.4 There is no DexScreener pair

DexScreener does not index this token. `/latest/dex/tokens/<mint>` returns
`{"pairs":null}`, `/token-pairs/v1/solana/<mint>` returns `[]`, and the
pair endpoint for the pool address returns nothing. The site's DexScreener link
is a **token-page** URL that resolves to no pair, so its live-price widget was
dead until it was repointed at StonkFun's public API and the Jupiter price
API.

---

## 6. The Hyperliquid leg — USDC treasury rail, and why it is shut

Hyperliquid is the **USDC** side of the treasury, and a future **HIP-1** venue
for a policy-compliant token.

### 6.1 HIP-1 costs a lot to enter

| | |
|---|---|
| Mainnet deployment | **31-hour Dutch auction** with a **500 HYPE floor** (~$40,000–43,000) |
| Testnet | **free**, but the faucet requires a prior **mainnet** deposit from the same address — and email-login addresses differ between mainnet and testnet |

**Recommendation: testnet first.** Do not spend $40k+ on an auction to prove a
venue works.

### 6.2 The four-key gate

No hand-rolled EIP-712 signing. Trading is delegated behind **four** conditions
that must **all** be present:

```
HYPERLIQUID_TRADING_ENABLED
HYPERLIQUID_PRIVATE_KEY
HYPERLIQUID_ACCOUNT_ADDRESS
+ the Hyperliquid SDK
```

If any one is missing, `assertTradingEnabled()` throws and nothing happens.
None of the four is set on this machine, so **trading is off**.

---

## 7. Three compliance gates

These are the reasons the on-chain legs stay intent-only.

### Gate 1 — Hyperliquid geoblocks US residents

Hyperliquid's terms exclude US persons. Any flow that assumes a US-inclusive
user base has to route around this or not exist. The tree-fund leg is
deliberately built so it does **not** depend on Hyperliquid.

### Gate 2 — token-linked rewards attract a Howey analysis

Anything that looks like "pay money, receive a token that may appreciate" risks
being treated as an investment. The tree-fund framing (**payment for services
already rendered**) and the explicit `TREE_PAYMENT_NOTE` exist to keep the leg
on the **services** side of that line.

### Gate 3 — no custody, no routing of user funds through our own pool

We do not take custody of user funds and we do not route user money through a
pool we control. The tree fund flows to **Treegens**, a third party, for work
they have already done. The liquidity leg routes to a **public venue pool** that
we do not own and from which we take no fee.

---

## 8. What the treasury will NOT do

This is design, not omission.

- **No HTTP route may trade.** Not the x402 route, not a SAP route, not an
  admin route. There is no code path from a request handler to an order.
- **No route may settle.** `treasury-service.js` exposes no `payout`,
  `withdraw`, `transfer`, `settleToAccount`, `send` or `move` method. The test
  suite asserts each of those is `undefined`.
- **The treasury records settlement intent only.** A **human-reviewed settler**
  executes. The contracts enforce the same rule on-chain: `releaseTreeFund` is
  callable only by the authorised settler (or the owner) and only to the
  designated `treeFundRecipient`.
- **No automatic on-chain swap of the tree fund.** The tree fund is released to
  Treegens for planting work, not converted.

---

## 9. The on-chain contracts

**Repository:** `IzzoSol/shaddai-asimov-project` → `sap-canopy/contracts/`

| Contract | Role |
|----------|------|
| `AgentPay.sol` | Escrows bounties, pays the winner 99%, books 1% into the tree fund |
| `TreeNFT.sol` | ERC-721 claim for a tree that was paid for and planted |

Both are `solc 0.8.24`, OpenZeppelin 5.1.0, optimizer 200, `evmVersion: cancun`.
The build gate (`node scripts/compile.js`) runs **28 checks** and fails on any
error **or** warning. A ganache + ethers behavioural harness asserts every
defect fix end-to-end.

The original `AGENTPAY_MULTICHAIN_SPEC.md` sketch carried **five exploitable
defects** (a `uint8` chain id that cannot hold Base's 8453; ignored ERC20
return values that break on USDT; a tree-fund "transfer" to the contract itself
that never moves anything; a requested-bounty record that goes insolvent on
fee-on-transfer tokens; and no cancel / timeout / zero-address check that lets
bounties be locked or burned). All five are fixed and documented inline at the
code site that fixes them. See `08_AGENTPAY/agentpay_contract_spec.md`.

The **Solana / Anchor leg is not written yet** and has two defects of its own
(a missing poster-authority check on `complete_job`, and a `tree_fund` that is
never actioned). It is a future sub-project with its own gate.

---

## 10. Environment

The file that matters is **`backend/.env`** (git-ignored), loaded by
`backend/server-production.js` via
`require('dotenv').config({ path: path.join(__dirname, '.env') })`.

```bash
# ── $ASIMOV liquidity leg ──────────────────────────────────────────────
ASIMOV_LIQUIDITY_POOL=2MhdCBPyHyRKoM5AVEfq1rbcTkCnMz8iWpuUCrjMJXUw
ASIMOV_LIQUIDITY_VENUE=solana-amm
ASIMOV_LIQUIDITY_ROUTE=raydium-launchlab-bonding-curve-buy
ASIMOV_LIQUIDITY_NOTE=<the caveats in §5.2, verbatim>

# ── Tree fund ─────────────────────────────────────────────────────────
TREEGENS_TREASURY_WALLET=<treegens treasury wallet>   # UNSET — see §4

# ── Fee-routing policy (must sum to 10000 bps) ───────────────────────
SAP_TREE_FUND_BPS=4000
SAP_ASIMOV_LIQUIDITY_BPS=4000
SAP_PLATFORM_BPS=2000

# ── x402 fee routing (OFF by default) ─────────────────────────────────
SAP_X402_FEE_ROUTING=1
```

`ASIMOV_LIQUIDITY_NOTE` is not decoration. It is copied into **every queued
liquidity intent's memo**, so the caveats travel with the record to whoever
settles it.

---

## 11. What is still missing

| Gap | Consequence | Owner |
|-----|-------------|-------|
| No settler component | Intents queue and wait. Nothing executes. | NEXUS |
| `TREEGENS_TREASURY_WALLET` unset | Tree intents have `destination: null`. | ZEROX |
| No Hyperliquid wallet | USDC leg cannot settle; trading gate closed. | ZEROX |
| HIP-1 testnet not funded | Venue not proven. 500 HYPE mainnet floor avoided for now. | ZEROX |
| No `SHADDAI_MERCHANT_WALLET` in the production env | Solana payment records carry the system program id as recipient. | ZEROX |
| Live Stripe publishable key committed in `backend/data/payment-config.json` | Rotate the key and move it to the environment. | PIKADON |

The treasury is currently **empty** — all pools zero, zero tree payments, zero
intents. The showcase shows those real zeros, not dressed-up numbers.

---

## 12. The caveats that travel with every report

```
'This ledger records settlement INTENT for on-chain transfers; it does not move money.'
'Illustrative averages, not site-specific predictions.'
'Tree payments are payment for planting and verification services already rendered.'
'creditFeeRouting totals are SHAD-Credits (closed-loop soft currency), NOT cents — they are excluded from pools, settlements and treePayments totals.'
'No SHAD-Credits -> USD/USDC conversion rate exists in this codebase, so no real-money value is derived from a credits fee.'
```
