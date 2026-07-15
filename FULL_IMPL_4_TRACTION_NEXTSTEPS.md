# Mesa — Full Implementation Reference (Part 4 of 4)
# Topic: Platform Traction + What To Do Next (Prioritized)

---

## SCF FOCUS AREAS — HOW MESA ADDRESSES EACH

| SCF Focus | Mesa Implementation | Status |
|:---|:---|:---|
| On-Ramp | AnchorProvider.sep24Deposit() + FlowBuilder.onRamp() | Code written in Part 2 |
| Off-Ramp | AnchorProvider.sep24Withdraw() + FlowBuilder.offRamp() | Code written in Part 2 |
| Anchors | AnchorProvider: SEP-10 auth, SEP-24, SEP-6, webhook resume | Code written in Part 2 |
| Payments | StellarRpcProvider: transfer, pathPayment, receive, confirm | Code written in Part 3 |
| Delegation Kit | DelegationProvider: grant, revoke, check + Soroban auth | Code written in Part 3 |
| Platform Traction | docker compose up, CLI, examples, dashboard | This document |

---

## WHAT TO BUILD IN ORDER (PRIORITIZED)

### Priority 1 — Make the runtime actually run (TODAY)

The runtime code is written. The problem: it won't run until the TypeScript is compiled and Postgres is up.

Steps:
```bash
# 1. Install dependencies
cd f:\Stellar\stitch_mesa_protocol
npm install

# 2. Install runtime dependencies specifically
cd packages/runtime
npm install

# 3. Compile runtime
npx tsc --outDir dist src/index.ts

# OR use tsup (already in package.json):
npm run build

# 4. Copy schema.sql to dist
cp src/store/schema.sql dist/store/schema.sql

# 5. Start Postgres + runtime
docker compose up
```

The `docker-compose.yml` is already written at the repo root. It starts:
- `postgres` service (mesa db, user: mesa, pass: mesa)
- `runtime` service (builds from packages/runtime/Dockerfile)

### Priority 2 — Copy the new provider files into correct directories (TODAY)

Currently the provider implementations are written in the docs (Part 2 and 3 of this series).
They need to be created as actual TypeScript files:

```
packages/providers/anchor/index.ts            ← copy from FULL_IMPL_2_ONRAMP_ANCHORS.md
packages/providers/soroban/stellar-rpc.ts     ← copy from FULL_IMPL_3_PAYMENTS_DELEGATION.md
packages/providers/soroban/index.ts           ← SorobanProvider from Part 3
packages/providers/delegation/index.ts        ← DelegationProvider from Part 3
```

Add each to `packages/runtime/src/index.ts` `registerProvider()` calls (shown in Part 3).

### Priority 3 — Add missing FlowBuilder methods to SDK (TODAY)

In `packages/sdk/src/flow.ts`, add these methods to the FlowBuilder class:

```typescript
// On-ramp: user deposits fiat, receives crypto on Stellar
onRamp(params: {
  anchorUrl: string;
  asset: string;
  amount?: number;
  userAddress: string;
  userJwt?: string;
}): this {
  this._steps.push({
    name: 'on-ramp',
    provider: 'anchor',
    params: { action: 'sep24-deposit', ...params },
  });
  return this;
}

// Off-ramp: user sends crypto, receives fiat
offRamp(params: {
  anchorUrl: string;
  asset: string;
  amount?: number;
  userAddress: string;
  userJwt?: string;
}): this {
  this._steps.push({
    name: 'off-ramp',
    provider: 'anchor',
    params: { action: 'sep24-withdraw', ...params },
  });
  return this;
}

// Path payment across DEX
pathPayment(params: {
  to: string;
  sendAsset: string;
  sendAmount: number;
  destAsset: string;
  destMin: number;
}): this {
  this._steps.push({
    name: 'path-payment',
    provider: 'stellar',
    params: { action: 'pathPayment', ...params },
  });
  return this;
}

// Check account balance
balance(params: { address: string; asset: string }): this {
  this._steps.push({
    name: 'get-balance',
    provider: 'stellar',
    params: { action: 'balance', ...params },
  });
  return this;
}

// Delegate signing authority
delegate(params: {
  userAddress: string;
  delegateTo: string;
  weight: number;
  thresholdType: 'low' | 'med' | 'high';
}): this {
  this._steps.push({
    name: 'grant-delegation',
    provider: 'delegation',
    params: { action: 'grant', ...params },
  });
  return this;
}

// Custom provider step (escape hatch)
custom(providerName: string, params: Record<string, unknown>): this {
  this._steps.push({
    name: `custom-${providerName}`,
    provider: providerName,
    params,
  });
  return this;
}
```

### Priority 4 — Write .env file for runtime config

Create `packages/runtime/.env` (add to .gitignore):

```env
DATABASE_URL=postgresql://mesa:mesa@localhost:5432/mesa
PORT=3001
NODE_ENV=development

# Stellar network
HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Mesa runtime signer (used for server-side transfers)
# Generate with: node -e "const { Keypair } = require('@stellar/stellar-sdk'); const kp = Keypair.random(); console.log('Secret:', kp.secret(), '\nPublic:', kp.publicKey())"
MESA_SIGNER_SECRET=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Priority 5 — Test the cross-border payment example

```bash
# Terminal 1: Start runtime
docker compose up

# Terminal 2: Run the demo
cd f:\Stellar\stitch_mesa_protocol
npx ts-node examples/cross-border-payment/index.ts

# Expected output:
# Flow definition: { id: "...", name: "cross-border-payment-demo", steps: [...] }
# ✔ Execution started: [executionId]
#   Monitor at: http://localhost:3001/executions/[executionId]

# Terminal 3: Simulate payment received (trigger the suspended step)
curl -X POST http://localhost:3001/webhooks/resume \
  -H "Content-Type: application/json" \
  -d '{"suspensionKey":"stellar:receive:GBHTY...:EXEC_ID","payload":{"asset":"XLM","amount":15,"txHash":"abc123"}}'

# Watch runtime logs — should see:
# ▶ Step 0 resumed via webhook.
# ✔ Step 1 (confirm-on-chain) completed.
# ✔ Step 2 (transfer-funds) completed.
# ✔ Step 3 (send-webhook) completed.
# 🎉 Execution [executionId] completed.
```

---

## PLATFORM TRACTION STRATEGY

Traction means: developers actually using Mesa, not just us building it.

### Traction Channel 1: The One-Minute Test Drive

Every developer who visits the GitHub or SCF proposal must be able to:
```bash
git clone https://github.com/thesumedh/Mesa-Protocol
cd Mesa-Protocol
docker compose up
```

Then open another terminal and run one example. No configuration. No API keys. No registration.

This means:
- `docker-compose.yml` must work out of the box (it does)
- The cross-border payment example must auto-configure for testnet (no real accounts needed)
- The sandbox demo should use Friendbot-funded accounts

### Traction Channel 2: The README demo gif

The README must show a GIF or video of:
1. Terminal: `docker compose up` → runtime starts
2. Terminal 2: `npx ts-node examples/cross-border-payment/index.ts` → executionId printed
3. Terminal 2: curl resume command → logs show step-by-step completion

Record this with a screen recorder. Put it in README.md as `![Demo](demo.gif)`.

### Traction Channel 3: Examples for Each SCF Focus Area

Create `examples/` subdirectories with working code for each use case:

```
examples/
├── cross-border-payment/      ← already written
│   └── index.ts
├── usdc-onramp/               ← to write
│   └── index.ts               ← shows Mesa.flow().onRamp().invoke('deposit')...
├── usdc-offramp/              ← to write
│   └── index.ts
├── recurring-savings/         ← to write
│   └── index.ts               ← shows cron-style recurring vault deposits
└── delegation-setup/          ← to write
    └── index.ts               ← shows granting Mesa key delegation on Stellar account
```

Each `index.ts` in examples should:
- Use Friendbot-funded testnet accounts (no real money)
- Print clear step-by-step output
- Take under 60 seconds to run

### Traction Channel 4: CLI quickstart

The `mesa` CLI already exists. Add a `mesa quickstart` command that:
1. Creates a `mesa.config.ts` in current directory
2. Runs `docker compose up` in background
3. Writes a sample flow file
4. Executes it against the local runtime

```bash
# What developer does:
npx @mesa/cli quickstart

# What they see:
# ✔ Starting Mesa Runtime...
# ✔ Runtime healthy at http://localhost:3001
# ✔ Created mesa.config.ts
# ✔ Executing sample flow...
# 📋 Execution started: abc-123
# ✔ Step 1/3: receive-payment — suspended (waiting for payment)
# [To complete: curl http://localhost:3001/webhooks/resume ...]
```

### Traction Channel 5: Developer Documentation Site

The docs already exist at `docs/`. Organize them as:

```
docs/
├── getting-started.md          ← docker compose up + first flow in 5 minutes
├── concepts/
│   ├── flows.md                ← what is a flow, what is a step
│   ├── providers.md            ← how providers work, how to write one
│   ├── runtime.md              ← scheduler, executor, store
│   └── suspension.md           ← what suspended means, how resume works
├── providers/
│   ├── stellar.md              ← receive, confirm, transfer, pathPayment
│   ├── anchor.md               ← SEP-24, SEP-6, on-ramp, off-ramp
│   ├── soroban.md              ← contract invocations, MesaVault, MesaCore
│   ├── delegation.md           ← grant, revoke, check
│   └── webhook.md              ← outbound, inbound callback
├── examples/
│   ├── cross-border-payment.md
│   ├── usdc-onramp.md
│   └── recurring-savings.md
└── reference/
    ├── sdk-api.md              ← full FlowBuilder API
    ├── runtime-api.md          ← HTTP endpoints
    └── protocol-spec.md        ← invariants, state machines
```

---

## ENVIRONMENT SETUP — COMPLETE REFERENCE

### Local development (no Docker)

```bash
# 1. Install Postgres locally
# Windows: https://www.postgresql.org/download/windows/
# Create DB: psql -U postgres -c "CREATE DATABASE mesa; CREATE USER mesa WITH PASSWORD 'mesa'; GRANT ALL ON DATABASE mesa TO mesa;"

# 2. Install dependencies
cd f:\Stellar\stitch_mesa_protocol
npm install
cd packages/runtime && npm install
cd packages/sdk && npm install

# 3. Build SDK
cd packages/sdk && npm run build

# 4. Build runtime
cd packages/runtime && npm run build

# 5. Apply schema
psql -U mesa -d mesa -f packages/runtime/src/store/schema.sql

# 6. Start runtime
cd packages/runtime && npm run start
```

### With Docker (recommended)

```bash
# Start everything
docker compose up

# Runtime: http://localhost:3001
# Postgres: localhost:5432

# Stop
docker compose down

# Stop and wipe data
docker compose down -v
```

### Runtime API Quick Reference

```bash
# Health
curl http://localhost:3001/health

# Register flow
curl -X POST http://localhost:3001/flows \
  -H "Content-Type: application/json" \
  -d '{"name":"my-flow","definition":{"id":"flow-1","name":"my-flow","steps":[{"name":"wait","provider":"delay","params":{"seconds":5}}]}}'

# Start execution
curl -X POST http://localhost:3001/executions \
  -H "Content-Type: application/json" \
  -d '{"flowId":"flow-1","context":{"note":"test"}}'

# Get execution status
curl http://localhost:3001/executions/EXECUTION_ID

# Resume suspended step
curl -X POST http://localhost:3001/webhooks/resume \
  -H "Content-Type: application/json" \
  -d '{"suspensionKey":"KEY","payload":{"status":"completed","data":"value"}}'
```

---

## SCF PROPOSAL — KEY MESSAGES TO EMPHASIZE

When talking to SCF reviewers / mentors, say exactly this:

**What Mesa does in one sentence:**
"Mesa is an open-source runtime that lets Stellar developers build on-ramp, off-ramp, and cross-border payment workflows as composable, durable pipelines — without writing orchestration code from scratch."

**Why the runtime needs to exist (not just an SDK):**
"SEP-24 anchor flows are async. They can take minutes or hours. Without a runtime, developers write polling loops that break on restart. Mesa suspends the workflow and resumes it when the anchor callback arrives — automatically."

**Why Stellar specifically:**
"Stellar has the anchor ecosystem, the path payment DEX, and Soroban contracts. Each is powerful but requires custom integration code. Mesa connects them via a single workflow definition."

**What's working today:**
- MesaVault deployed and verified on Testnet (deposit, lock, withdraw — all proven with transaction hashes)
- Runtime engine: scheduler, executor, retry logic, webhook resume, Postgres store — all written
- SDK FlowBuilder: `.receive().onRamp().offRamp().pathPayment().delegate()` — written
- `docker compose up` starts runtime + Postgres in one command
- AnchorProvider, StellarRpcProvider, SorobanProvider, DelegationProvider — full implementations in Part 2 and Part 3 of this document series

**What needs to be copy-pasted into actual files:**
- AnchorProvider code (Part 2) → `packages/providers/anchor/index.ts`
- StellarRpcProvider code (Part 3) → `packages/providers/soroban/stellar-rpc.ts` (replace stub)
- SorobanProvider code (Part 3) → `packages/providers/soroban/index.ts`
- DelegationProvider code (Part 3) → `packages/providers/delegation/index.ts`
- FlowBuilder new methods (this file, Priority 3) → `packages/sdk/src/flow.ts`

---

## HANDOFF SUMMARY FOR NEXT AI SESSION

If you are a new AI reading this document, here is the current state:

**DONE:**
1. `ARCHITECTURE.md` — canonical design document in repo root
2. `packages/runtime/src/` — scheduler, executor, store, server, provider interface
3. `packages/sdk/src/` — FlowBuilder, MesaClient, MesaSigner
4. `packages/providers/webhook/` and `packages/providers/delay/` — working providers
5. `docker-compose.yml` — starts mesa + postgres
6. `examples/cross-border-payment/index.ts` — MVP demo
7. `README.md` and `SCF_PROPOSAL.md` — rewritten with new positioning
8. `FULL_IMPL_2_ONRAMP_ANCHORS.md` — complete AnchorProvider code
9. `FULL_IMPL_3_PAYMENTS_DELEGATION.md` — complete StellarRpcProvider, SorobanProvider, DelegationProvider code

**TODO (copy code from docs into files):**
1. Copy AnchorProvider from `FULL_IMPL_2_ONRAMP_ANCHORS.md` → `packages/providers/anchor/index.ts`
2. Copy StellarRpcProvider from `FULL_IMPL_3_PAYMENTS_DELEGATION.md` → `packages/providers/soroban/stellar-rpc.ts`
3. Copy SorobanProvider from `FULL_IMPL_3_PAYMENTS_DELEGATION.md` → `packages/providers/soroban/index.ts`
4. Copy DelegationProvider from `FULL_IMPL_3_PAYMENTS_DELEGATION.md` → `packages/providers/delegation/index.ts`
5. Add new FlowBuilder methods from `FULL_IMPL_4_TRACTION_NEXTSTEPS.md` Priority 3 → `packages/sdk/src/flow.ts`
6. Update `packages/runtime/src/index.ts` with all registerProvider() calls (shown in Part 3)
7. Create `.env` file with testnet config (shown in this document Priority 4)
8. Run `docker compose up` and test the cross-border-payment example
9. Record demo, update README with GIF

**GitHub repo:** https://github.com/thesumedh/Mesa-Protocol
**Workspace:** f:\Stellar\stitch_mesa_protocol
**Deployed contracts on testnet:**
  - MesaVault: CAI7GBF5H3ESZ7OBGANBL63B3SRA3MXK3REHYHN6LA6DUC7D3QFJIKYZ
  - Deposit Tx: 7590ce4389968b1d8f96ad2beaf72622d32d5477d10b36a5cd79d8669a9b78d5
  - Withdrawal Tx: 347882cf179a8bce5d5342bc8e8cc9bfbbe00bb36c089bbd7749ea89406b8211
