# Mesa Protocol — Embedded Finance Runtime for Stellar

> **Build resilient financial workflows on Stellar in minutes, not weeks.**

[![npm version](https://img.shields.io/npm/v/@mesaprotocol/sdk?color=00dbe9&label=%40mesaprotocol%2Fsdk)](https://www.npmjs.com/package/@mesaprotocol/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](https://opensource.org/licenses/MIT)
[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar-blueviolet)](https://stellar.org)

```bash
npm install @mesaprotocol/sdk
```

```ts
import { Mesa } from "@mesaprotocol/sdk";

Mesa.configure({ runtimeUrl: "http://localhost:3001" });

const flow = Mesa.flow("stellar-payment-flow")
  .receive({
    asset: "XLM",
    minAmount: 25,
    toAddress: "GD3Z...KAOV"
  })
  .delay({ seconds: 5 })
  .payment({
    horizonUrl: "https://horizon-testnet.stellar.org",
    senderSecretRef: "SENDER_SECRET",  // resolved from process.env — never hardcoded
    to: "GA4U...IW3P",
    amount: 25
  })
  .build();

await Mesa.execute(flow);
```

---

## ⚡ What is Mesa?

Stellar developers spend weeks wiring together Wallet Kits, SEP-10 Authentication, SEP-24/SEP-6 anchors, Horizon operations, path payments, event persistence, retries, and webhooks.

**Mesa orchestrates all of those components into a single durable runtime.**

If a network call fails, or an interactive anchor deposit takes hours to complete, Mesa persists the execution state to PostgreSQL, schedules retries with exponential backoff, suspends execution when waiting on user interaction, and resumes instantly via webhooks.

---

## 🏛️ System Architecture

```
  Developer App  ◄──►  Mesa Studio (Visual Builder)
       │
       ▼
    Mesa SDK  (@mesaprotocol/sdk)
       │
       ▼
  Mesa Runtime  (REST API + Scheduler + Executor)
       │
  ┌────┼────────┐
  │    │        │
Anchor │    Stellar
(SEP-24)│  Provider
   Wallet    │
   Kit    Horizon API
             │
             ▼
       Stellar Network (Testnet / Mainnet)
```

---

## ❓ Why Mesa?

| Feature / Challenge | Without Mesa | With Mesa |
| :--- | :--- | :--- |
| **SEP-10 Authentication** | Manually request challenge XDR, parse, sign, manage JWT storage & refresh | `Mesa.flow()` auto-signs challenges and caches tokens |
| **Workflow State Persistence** | Design custom DB schemas for steps, transaction IDs, statuses, retry state | Built-in Postgres store with standard execution logging |
| **Long-Running Suspension** | Build complex event loops or polling anchors to wait for user actions | Built-in suspension keys that pause and resume via webhook |
| **Distributed Retries** | Write custom cron jobs or worker queues with backoff logic | Built-in scheduler with exponential backoff |
| **Provider Abstractions** | Manually wire Horizon, MoneyGram, and Soroban API interfaces | Standardized Provider adapters separating ledger calls from core logic |
| **Key Security** | Risk of raw private keys in code or DB | `secretRef` pattern resolves keys from `process.env` at execution time |

---

## 📊 Benchmarks

| Metric | Mesa |
|---|---|
| **Lines of integration code** | ~15 lines |
| **Workflow state persistence** | Built-in (PostgreSQL / In-Memory) |
| **Retry handling** | Built-in (Exponential backoff) |
| **Suspend / Resume** | Built-in (Suspension Keys & Webhooks) |
| **Developer Console** | Built-in (Visual timeline & event logs) |

---

## 🚀 5-Minute Quickstart

### 1. Clone & Install

Ensure you have [Node.js](https://nodejs.org) and [Docker](https://www.docker.com) installed.

```bash
git clone https://github.com/thesumedh/Mesa-Protocol.git
cd Mesa-Protocol
npm install
```

### 2. Start PostgreSQL

Mesa uses PostgreSQL to durably persist execution steps, states, and retry history.

```bash
docker compose up -d
```

### 3. Set Your Testnet Secret

```bash
# On Linux / macOS
export SENDER_SECRET="S..."

# On Windows PowerShell
$env:SENDER_SECRET = "S..."
```

> ⚠️ **Never commit your secret key.** Mesa's `secretRef` pattern resolves it from `process.env` at runtime.

### 4. Start the Mesa Runtime

```bash
npm run runtime:dev
```

### 5. Run the Hello World Example

```bash
cd examples/hello-world
npm install
npm start
```

### 6. Monitor Live Executions

Open the Developer Console in your browser:

👉 **[http://localhost:3001/dashboard](http://localhost:3001/dashboard)**

Watch the real-time execution timeline, step logs, and transaction hashes as the workflow runs on the Stellar Testnet.

---

## 🎬 The 5-Step Demo Flow

| Step | What Happens |
|---|---|
| **1. Define** | Declare the financial corridor using the fluent SDK: `receive → delay → payment` |
| **2. Start** | Run the flow. The dashboard shows `PENDING → RUNNING` in real-time |
| **3. Suspend** | The engine halts on the SEP-24 anchor step, waiting for user deposit |
| **4. Resume** | POST a webhook event to `/webhooks/resume`. Execution continues instantly |
| **5. Settle** | The payment is submitted to Stellar Testnet. Console displays the real tx hash and ledger slot |

---

## 🖼️ Mesa Studio — Visual Workflow Builder

> **Mesa Studio is the logical next step to make Mesa mainstream.**

Because Mesa workflows are fully declarative (JSON schemas of steps under the hood), a **visual node graph maps 1:1 to the runtime engine**. What you draw is exactly what executes.

### Why Studio is a Game-Changer

**Bridge between Product & Engineering:** In fintech, compliance managers and product architects design payment flows — *"Wait 24 hours for KYC, then release funds"*. Studio lets them design the flow visually while generating the exact TypeScript that developers need to ship.

**Zero onboarding friction:** Instead of reading API docs to understand SDK syntax, a developer builds their corridor visually in 2 minutes, hits "Download Code", and pastes it into their project.

---

### Feature Architecture

#### A. The Visual Canvas

A dot-grid infinite canvas with a palette of draggable node blocks, each mapping to a registered provider:

| Node | Description |
|---|---|
| `Receive` | Listen for incoming XLM / USDC deposits |
| `Delay` | Time-pause for compliance holds |
| `Payment` | Submit a real Stellar Testnet / Mainnet transaction |
| `Webhook` | Suspend execution waiting for an external event |
| `Anchor.SEP24` | Interactive deposit / withdrawal flows |
| `If / Else` *(v2)* | Conditional branch routing |

**Data Flow Wiring:** Draw connections between node output ports and input fields. The system is type-aware — wiring `Receive.receivedAmount → Payment.amount` shows a live preview of the data type flowing through the connection.

#### B. Live Code Generation

As nodes are wired and configured, a side panel updates in real-time showing equivalent TypeScript SDK syntax:

```ts
const flow = Mesa.flow("my-visual-flow")
  .receive({ asset: "XLM", minAmount: 25, toAddress: "G..." })
  .delay({ seconds: 5 })
  .payment({ senderSecretRef: "SENDER_SECRET", to: "G...", amount: 25 })
  .build();
```

Supports three export formats:
- **TypeScript SDK code** — paste directly into your project
- **Raw JSON definition** — POST to `/flows` on your runtime
- **cURL request** — test from terminal immediately

#### C. Download & Deploy

- **Download ZIP:** A pre-configured starter project with `package.json`, `@mesaprotocol/sdk` installed, and the generated flow code wired up and ready to run.
- **Deploy to Runtime** *(planned)*: If Studio is connected to a live Mesa Runtime instance, "Deploy" registers the flow on the server immediately — no file download needed.

---

### Design Principles & Security

**Secrets are never raw strings.** The Studio forces key inputs to be reference tokens (e.g. `"SENDER_SECRET"`), with a clear reminder that the runtime resolves these from `process.env`. No raw `S...` private keys ever appear in generated code or the UI.

**Bidirectional round-tripping.** Developers can paste existing `Mesa.flow()` code and see it parse into a visual graph instantly. Switch freely between code and visual mode without losing state.

**Linear flows ship first.** The `receive → validate → payout` pattern covers ~80% of fintech corridors. Conditional branching is a v2 feature — scope discipline over feature bloat.

**Flow versioning is non-negotiable.** A payment can be mid-execution for hours. Deploying a new flow version can't break in-flight transactions. Studio will publish immutable versioned snapshots (`flow@v2`) rather than overwriting live definitions.

---

### Studio Roadmap

```
Phase 1 — Foundation (Now)
├── WorkflowDefinition typed schema (versioned)
├── generateSDKCode() pure function
├── generateJSON() pure function
└── parseSDKCode() → WorkflowDefinition (AST round-trip)

Phase 2 — Studio MVP
├── Linear node canvas (React Flow / xyflow)
├── Per-node Properties Panel
├── Live TypeScript + JSON side-by-side preview
└── Download ZIP with pre-wired starter project

Phase 3 — Power Features
├── Code → Graph import (paste existing SDK code, render graph)
├── Type-aware wired connections (output schema hints per node)
├── Deploy to Runtime button
└── Flow versioning UI (immutable snapshots)

Phase 4 — Advanced
├── If/Else conditional branching nodes
├── Team workspaces & shared flow libraries
└── Execution history replayed in Studio canvas
```

---

## 🏛️ Project Modules

Mesa separates execution concerns into clean, decoupled layers:

| Module | Responsibility |
|---|---|
| **`packages/sdk`** | Fluent, type-safe `FlowBuilder` API for defining steps |
| **`packages/runtime`** | REST API server, workflow registration, dashboard endpoint |
| **`packages/providers/stellar`** | Stellar-specific `receive`, `payment`, and transfer handlers |
| **Scheduler** | Polls Postgres for pending executions, drives the retry loop |
| **Executor** | Manages step-level execution, event history, and retry scheduling |
| **`UI/`** | Mesa Studio static web app (Visual Builder + Developer Portal) |

---

## 🖥️ E2E Test Scenarios

### Cross-Border Corridor Demo

A complete corridor run (Anchor Deposit → DEX Swap → Ledger Payout):

```bash
npx ts-node examples/remittance/index.ts
```

### Live Stellar Testnet Test Suite

Runs the automated test suite simulating interactive deposits and payouts:

```bash
npm run test --workspace=packages/runtime
```

---

## 🛠️ Backlog & Future Improvements

See [BACKLOG.md](./BACKLOG.md) for full details:

- Compensation & Distributed Saga API
- LISTEN / NOTIFY real-time scheduling
- Dynamic provider capability discovery
- Event streaming log sinks
- Studio: If/Else branching nodes
- Studio: Team workspaces
- Soroban smart contract provider

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All contributions, bug reports, and feature requests are welcome.

---

## ⚖️ License

Mesa is open-source software licensed under the [MIT License](./LICENSE).

---

<p align="center">Built with ⚡ for the Stellar ecosystem</p>
