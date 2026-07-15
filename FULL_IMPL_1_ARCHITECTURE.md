# Mesa — Full Implementation Reference (Part 1 of 4)
# Topic: Architecture, Positioning, Current Codebase

---

## WHAT MESA IS

Mesa is a **financial workflow orchestration runtime for Stellar**.

Positioning sentence for SCF: "Mesa lets developers build on-ramp, off-ramp, cross-border payment, and savings workflows on Stellar by composing existing primitives — anchors, wallets, contracts — into durable, resumable, observable pipelines."

The SCF focus areas map to Mesa like this:
- **On-ramp / Off-ramp** → AnchorProvider (SEP-24/SEP-6) + StellarRpcProvider
- **Anchors** → AnchorProvider implements SEP-24 interactive deposit/withdrawal with async suspend/resume
- **Payments** → StellarRpcProvider handles path payments, transfers, monitoring
- **Delegation Kit** → DelegationProvider lets one address authorize another to execute steps on its behalf via Soroban auth
- **Traction** → CLI scaffolding, hosted examples, one-command docker start

---

## HIGH-LEVEL ARCHITECTURE

```
Developer Application
        │
        │  npm install @mesa/sdk
        │
        ▼
┌─────────────────────┐
│    @mesa/sdk        │  ← describes workflows (Mesa.flow().receive()...)
│    (pure data)      │
└────────┬────────────┘
         │  HTTP POST /flows  +  POST /executions
         ▼
┌─────────────────────────────────────────────────────┐
│              Mesa Runtime  (:3001)                  │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Scheduler  │  │   Executor   │  │  HTTP API │  │
│  │  (polls DB) │  │ (runs steps) │  │  (server) │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  │
│         └────────────────┴──────────────── │        │
│                      │                     │        │
│              ┌────────▼──────────┐         │        │
│              │  Postgres Store   │         │        │
│              │  flows            │◄────────┘        │
│              │  executions       │  webhook resume   │
│              │  steps            │                  │
│              │  events           │                  │
│              └───────────────────┘                  │
└────────────────────┬────────────────────────────────┘
                     │  provider.execute()
          ┌──────────┴──────────────────────────────┐
          │                                         │
    ┌─────▼──────┐  ┌──────────┐  ┌─────────────┐  │
    │  stellar   │  │  anchor  │  │   soroban   │  │
    │  provider  │  │ provider │  │  provider   │  │
    └─────┬──────┘  └──────┬───┘  └──────┬──────┘  │
          │                │             │          │
          ▼                ▼             ▼          │
     Horizon RPC     SEP-24 Anchor    Soroban RPC   │
     Path Payments   Interactive      Contracts     │
     Monitoring      Deposit/Withdraw               │
```

---

## CURRENT MONOREPO FILE STRUCTURE

```
f:\Stellar\stitch_mesa_protocol\
│
├── ARCHITECTURE.md                    ← canonical design doc
├── FULL_IMPL_1_ARCHITECTURE.md        ← this file
├── FULL_IMPL_2_ONRAMP_ANCHORS.md      ← SEP-24/SEP-6 full implementation
├── FULL_IMPL_3_PAYMENTS_DELEGATION.md ← path payments + delegation kit
├── FULL_IMPL_4_TRACTION_NEXTSTEPS.md  ← traction strategy + next steps
├── SCF_PROPOSAL.md                    ← rewritten for workflow platform
├── README.md                          ← rewritten, one-sentence tagline
├── docker-compose.yml                 ← mesa + postgres, one command start
├── package.json                       ← workspaces: sdk, runtime, providers, cli
│
├── packages/
│   ├── sdk/                           ← @mesa/sdk (developer API)
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts               ← exports: Mesa, FlowBuilder, MesaSigner
│   │       ├── flow.ts                ← Mesa.flow().receive().convert()... builder
│   │       ├── client.ts              ← Mesa.execute(), Mesa.status() → HTTP
│   │       └── signer.ts              ← MesaSigner, SecretKeySigner, FreighterSigner
│   │
│   ├── runtime/                       ← @mesa/runtime (self-hosted engine)
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── index.ts               ← startup: schema init, providers, scheduler, server
│   │       ├── provider.ts            ← MesaProvider interface + registry
│   │       ├── server.ts              ← Express: /flows /executions /webhooks/resume /health
│   │       ├── engine/
│   │       │   ├── scheduler.ts       ← polls DB every 2s, advances executions
│   │       │   └── executor.ts        ← runs single step, retry/suspend logic
│   │       └── store/
│   │           ├── schema.sql         ← CREATE TABLE flows, executions, steps, events
│   │           └── index.ts           ← CRUD: createFlow, createExecution, updateStep...
│   │
│   ├── providers/                     ← one folder per Stellar primitive
│   │   ├── webhook/
│   │   │   └── index.ts               ← outbound POST + inbound suspend/resume
│   │   ├── delay/
│   │   │   └── index.ts               ← timed wait step
│   │   └── soroban/
│   │       └── stellar-rpc.ts         ← receive/confirm/transfer (partially stubbed)
│   │
│   └── mesa-cli/                      ← @mesa/cli (existing, keep as-is)
│       └── src/index.ts               ← mesa init/create/deploy/doctor/verify
│
├── contracts/                         ← Soroban Rust contracts
│   ├── mesa-vault/src/lib.rs          ← policy savings vault (Lock/Goal/AutoConvert)
│   └── mesa-core/src/lib.rs           ← ROSCA circle (contributions, auctions)
│
└── examples/
    └── cross-border-payment/
        └── index.ts                   ← MVP demo: receive→confirm→transfer→webhook
```

---

## WHAT EACH LAYER DOES (EXACT RESPONSIBILITY)

### packages/sdk/src/flow.ts — FlowBuilder
The ONLY job of the SDK is to produce a JSON object called a FlowDefinition.
It does NOT call Stellar. It does NOT hit any network. It produces data.

```typescript
// A FlowDefinition looks like this after .build():
{
  "id": "uuid",
  "name": "cross-border-payment",
  "steps": [
    { "name": "receive-payment",  "provider": "stellar",  "params": { "action": "receive", "asset": "XLM", "minAmount": 10, "toAddress": "G..." } },
    { "name": "convert-asset",    "provider": "anchor",   "params": { "action": "sep24-deposit", "from": "XLM", "to": "USDC", "anchor": "https://testanchor.stellar.org" } },
    { "name": "transfer-funds",   "provider": "stellar",  "params": { "action": "transfer", "to": "G...", "asset": "USDC" } },
    { "name": "send-webhook",     "provider": "webhook",  "params": { "url": "https://myapp.com/hooks" } }
  ]
}
```

### packages/runtime/src/engine/scheduler.ts — Scheduler
- Polls `SELECT * FROM executions WHERE status IN ('PENDING','RUNNING')` every 2 seconds
- For each execution: fetches flow definition from `flows` table
- Calls `executor.executeStep()` for `current_step`
- If step COMPLETED → increments `current_step`, loops
- If step SUSPENDED → stops loop (waits for external webhook resume)
- If step RETRYING → stops loop (waits for `next_retry` timestamp)
- If all steps done → marks execution COMPLETED

### packages/runtime/src/engine/executor.ts — Executor
- Upserts `steps` row for this step_index
- Calls `getProvider(step.provider).execute(step, context)`
- On `completed`: writes output to step, merges into execution context
- On `suspended`: writes suspensionKey to step output, stops
- On throw: increments attempts, sets next_retry with exponential backoff (1s, 2s, 4s, 8s, 16s), marks PERMANENTLY_FAILED after 5 attempts

### packages/runtime/src/store/index.ts — Store
All Postgres operations. Parameterized queries only. Tables:
- `flows` — flow definitions (JSON)
- `executions` — one row per workflow run (status, current_step, shared context)
- `steps` — one row per step per execution (status, attempts, output, error)
- `events` — append-only log of everything (flow.started, step.completed, etc.)

### packages/runtime/src/server.ts — HTTP API
Endpoints:
- `GET  /health`                         — liveness check
- `POST /flows`                          — register flow definition
- `POST /executions`                     — start execution (returns executionId)
- `GET  /executions/:id`                 — get status + event log
- `POST /webhooks/resume`                — resume a suspended step (anchor callback lands here)

---

## RUNTIME DATA FLOW (STEP BY STEP)

1. Developer calls `Mesa.execute(flow)` in their app
2. SDK POSTs flow definition to `POST /flows`
3. SDK POSTs `{ flowId, context }` to `POST /executions`
4. Runtime inserts row in `executions` with status=PENDING
5. Scheduler picks it up within 2 seconds
6. Scheduler calls `executor.executeStep(execution, step[0], 0)`
7. Executor calls `getProvider('stellar').execute(step, context)`
8. If step returns `suspended` → execution parks, scheduler moves on
9. External event arrives at `POST /webhooks/resume` with `suspensionKey`
10. Server finds the suspended step, calls `provider.resume(event, context)`
11. Resume returns `completed` → step marked COMPLETED, execution status reset to PENDING
12. Scheduler picks it up again, advances to step[1]
13. Repeat until all steps complete
14. Final event: `flow.completed` written to events table

---

## PROVIDER INTERFACE (EXACT CONTRACT)

```typescript
// Every provider MUST implement this:
export interface MesaProvider {
  readonly name: string;   // must match what FlowBuilder puts in step.provider

  // Called by executor to run the step
  execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult>;

  // Called by server when external webhook arrives (optional)
  resume?(event: ExternalEvent, context: ExecutionContext): Promise<StepResult>;

  // Called if execution is cancelled (optional)
  cancel?(context: ExecutionContext): Promise<void>;
}

// StepResult outcome values:
// 'completed' → step done, scheduler advances to next step
// 'suspended' → step waiting for external event, include suspensionKey
// 'failed'    → step failed, executor handles retry/permanent failure

// ExecutionContext.shared → key-value bag passed between all steps
// Providers READ from shared to get outputs of previous steps
// Providers WRITE to shared (via output) so next steps can use their results
```

---

## CURRENTLY WORKING (VERIFIED)

- MesaVault Soroban contract deployed on Testnet
  - Contract ID: CAI7GBF5H3ESZ7OBGANBL63B3SRA3MXK3REHYHN6LA6DUC7D3QFJIKYZ
  - Deposit Tx: 7590ce4389968b1d8f96ad2beaf72622d32d5477d10b36a5cd79d8669a9b78d5
  - Lock-rejected withdrawal confirmed (Error#5 FundsLocked)
  - Post-lock withdrawal: 347882cf179a8bce5d5342bc8e8cc9bfbbe00bb36c089bbd7749ea89406b8211

- Runtime engine code: written (needs Postgres to run)
- SDK FlowBuilder: written and functional
- CLI (mesa init/create/deploy/doctor/verify): written and verified
- docker-compose.yml: written (starts mesa + postgres)

---

## WHAT NEEDS TO BE BUILT NEXT

1. AnchorProvider — SEP-24 full implementation (see Part 2)
2. StellarRpcProvider — real Horizon monitoring + path payments (see Part 3)
3. DelegationProvider — Soroban delegated auth (see Part 3)
4. Dashboard — Next.js workflow monitoring UI (see Part 4)
5. Platform traction plan (see Part 4)

See FULL_IMPL_2_ONRAMP_ANCHORS.md for anchor/on-ramp details.
See FULL_IMPL_3_PAYMENTS_DELEGATION.md for payments + delegation kit.
See FULL_IMPL_4_TRACTION_NEXTSTEPS.md for traction + what to do today.
