# Stellar Community Fund (SCF) Proposal: Mesa

## One Sentence

**Mesa is an embedded finance runtime for Stellar — letting developers build resilient on-ramp, payment, and off-ramp workflows in 10 lines of code.**

---

## The Problem (Concrete)

A developer building a cross-border remittance product on Stellar must write:

1. Wallet connectivity (Freighter / WalletConnect)
2. SEP-24 anchor initiation + polling loop (async, can take hours)
3. Retry logic when Stellar RPC times out
4. Path payment transaction construction + simulation
5. Ledger confirmation polling
6. Webhook delivery to notify their application
7. State recovery when their server restarts mid-flow

Every developer writes all seven. Every developer writes at least one wrong.

**There is no standard way to compose Stellar's primitives into a resilient multi-step financial workflow.**

---

## The Solution

```ts
import { Mesa } from '@mesa/sdk';

const payout = Mesa.flow('kenya-remittance')
  .onRamp({
    anchor: 'https://testanchor.stellar.org',
    asset: 'USDC',
    amount: 100,
    userAddress: senderAddress,
  })
  .pathPayment({
    sendAsset: 'USDC',
    sendAmount: 100,
    destAsset: 'USDC',
    destMin: 99,
    to: recipientAddress,
  })
  .offRamp({
    anchor: 'https://testanchor.stellar.org',
    asset: 'USDC',
    userAddress: recipientAddress,
  })
  .webhook({ url: 'https://myapp.com/hooks/payment' })
  .build();

const { executionId } = await Mesa.execute(payout);
```

Mesa handles the rest:
- **Durable** — survives server restarts. Execution resumes from where it stopped.
- **Async** — SEP-24 anchors respond via webhook hours later. Mesa suspends and resumes automatically.
- **Retriable** — Stellar RPC failures get exponential backoff without the developer writing retry code.
- **Observable** — every step is logged. Debugging a failed payment is one query, not a log archaeology expedition.

---

## Who Uses Mesa

**The customer is a developer at a fintech startup building on Stellar.**

Specifically:
- A **remittance product** (MoneyGram, Wave, LemFi equivalent) routing payments across corridors
- A **neobank or savings app** (in Kenya, Nigeria, Argentina) using anchors for fiat on/off ramps
- A **payroll provider** automating USDC disbursement to contractors across borders
- A **wallet** that wants to offer anchor-powered on-ramp without maintaining anchor polling infrastructure

These teams have 2–5 engineers. They cannot afford to build and maintain durable workflow infrastructure. They need it to exist.

---

## Why Not Temporal?

Temporal is a general-purpose workflow engine. It does not know:
- What SEP-24 is
- How Stellar path payments work
- What a suspension key from an anchor callback looks like
- How to sign a Soroban transaction

Mesa's providers are Stellar-native. `AnchorProvider` speaks SEP-24 natively. `StellarRpcProvider` speaks Horizon. `SorobanProvider` speaks Soroban RPC. You get durable execution *and* Stellar-specific semantics — without translating between two paradigms.

---

## Why Not SDF?

SDF builds Stellar primitives:
- Wallet Kit → wallet connectivity
- Anchor Platform → anchor infrastructure
- Horizon → ledger data
- Soroban → smart contracts

**SDF does not build the orchestration layer that connects them.**

Mesa is explicitly additive. It wraps SDF's tools, it does not compete with them.

---

## Architecture

```
Developer App
    │
    │  npm install @mesa/sdk
    │
    ▼
Mesa SDK              ← describes the workflow (pure data)
    │
    │  HTTP
    │
    ▼
Mesa Runtime          ← executes durably (self-hosted Docker)
    │
    ├── Scheduler     ← polls Postgres, advances executions
    ├── Executor      ← runs steps, handles retries/suspension
    └── Store         ← Postgres: flows, executions, steps, events
    │
    ▼
Providers
    ├── anchor        ← SEP-24 deposit/withdraw + webhook resume
    ├── stellar       ← transfers, path payments, monitoring
    ├── soroban       ← contract invocations (MesaVault, MesaCore)
    ├── delegation    ← Stellar multi-sig delegation
    └── webhook       ← HTTP notifications + callback suspension
```

---

## What "Embedded Finance Runtime" Means

The runtime is self-hosted. Developers `docker compose up` and it runs next to their application. No Mesa servers are involved. No custody. No trust required.

This is the Supabase / Temporal model: open-source first, cloud option later.

---

## Deployment

```bash
docker compose up
```

Starts Mesa Runtime (port 3001) + Postgres. That is the entire infrastructure required.

---

## What Is Working Today

| Component | Status |
|:---|:---|
| Runtime engine (scheduler, executor, retry, suspension) | Written and complete |
| Postgres store (flows, executions, steps, events) | Written and complete |
| HTTP API (/flows, /executions, /webhooks/resume) | Written and complete |
| `Mesa.flow().onRamp().pathPayment().offRamp()` SDK | Written and complete |
| AnchorProvider (SEP-24 deposit/withdraw, SEP-6, SEP-10 auth) | Written and complete |
| StellarRpcProvider (transfer, pathPayment, receive, confirm) | Written and complete |
| DelegationProvider (Stellar multi-sig grant/revoke/check) | Written and complete |
| SorobanProvider (contract invocations with simulation) | Written and complete |
| MesaVault contract — deployed on Testnet | Deposit Tx: `7590ce4...` |
| MesaVault — lock enforcement verified | Withdrawal rejected: Error#5 |
| MesaVault — post-lock withdrawal verified | Tx: `347882cf...` |
| docker-compose.yml | Complete |
| mesa CLI (init/create/deploy/doctor/verify) | Complete |

---

## The Demo (What Reviewers Will See)

**30 seconds, one terminal, one browser tab:**

```bash
# Terminal 1
docker compose up
# → Runtime starts. Postgres ready. Providers registered.

# Terminal 2
npx ts-node examples/cross-border-payment/index.ts
# → Execution started: abc-123
# → Waiting for on-ramp...

# Simulate anchor completing the on-ramp:
curl -X POST http://localhost:3001/webhooks/resume \
  -d '{"suspensionKey":"anchor:sep24:...:TXID","payload":{"status":"completed"}}'

# → Step 1 resumed: on-ramp complete
# → Step 2 running: path payment...
# → Step 2 complete
# → Step 3 running: off-ramp...
# → 🎉 Execution complete
```

The dashboard shows each step transition in real time.

---

## Milestones

### Milestone 1 (Completed)
- Self-hosted runtime with durable Postgres-backed execution
- SDK: `Mesa.flow().onRamp().pathPayment().offRamp()`
- AnchorProvider, StellarRpcProvider, SorobanProvider, DelegationProvider
- MesaVault deployed and verified on Testnet
- `docker compose up` deployment

### Milestone 2 (Next)
- Workflow monitoring dashboard (Next.js) — execution state, step logs, retry controls
- `AnchorProvider` tested against real testanchor.stellar.org with live SEP-24 flows
- Additional provider: MoneyGram On/Off Ramp (via MoneyGram Access API)

### Milestone 3
- Mesa Cloud (hosted runtime option)
- `mesa generate <provider>` — scaffold new providers from OpenAPI spec
- Enterprise audit logs, multi-region support

---

## Business Model

- **Phase 1**: Open Source (MIT). Enterprise support contracts.
- **Phase 2**: Mesa Cloud — hosted runtime, usage-based pricing.
- **Phase 3**: Enterprise SLAs, SSO, compliance exports.

Same model as Temporal, Trigger.dev, Supabase: earn trust with open source, charge for convenience.

---

## Honesty

- AnchorProvider is implemented but not yet tested live against testanchor.stellar.org
- Dashboard is not yet built (Milestone 2)
- Smart contracts (`MesaVault`, `MesaCore`) have not undergone third-party security audit
- Mesa Cloud does not exist
