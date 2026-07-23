# Mesa Protocol — Embedded Finance Engine for Stellar

> **Mesa is the fastest way to build, visually design, and deploy reliable financial applications on Stellar.**

[![npm version](https://img.shields.io/npm/v/@mesaprotocol/sdk?color=00dbe9&label=%40mesaprotocol%2Fsdk)](https://www.npmjs.com/package/@mesaprotocol/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](https://opensource.org/licenses/MIT)
[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar-blueviolet)](https://stellar.org)

```bash
npx mesa create my-stellar-app --template remittance
```

```ts
import { Mesa } from "@mesaprotocol/sdk";

Mesa.configure({ runtimeUrl: "http://localhost:3001" });

export const flow = Mesa.flow("cross-border-remittance", "remittance-corridor-v1")
  .receive({
    asset: "USDC",
    minAmount: 100,
    toAddress: "GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV",
  })
  .delay({ seconds: 5 })
  .payment({
    amount: 95,
    to: "GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P",
    senderSecretRef: "SENDER_SECRET", // resolved safely from process.env at runtime
  })
  // Saga Compensation Rollback hook — executed automatically if downstream steps fail
  .compensate({
    provider: "stellar",
    refundAddress: "GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV",
    refundAsset: "USDC"
  })
  .build();

// Register flow definition & trigger execution
await Mesa.register(flow);
const { executionId } = await Mesa.execute(flow);
```

---

## ⚡ What is Mesa Protocol?

Building financial applications on Stellar requires coordinating SEP-24/SEP-6 anchors, Horizon path payments, Soroban smart contract invocations, compliance holds, retries, and webhook callbacks.

**Mesa Protocol provides a complete visual builder, TypeScript SDK, CLI, and durable execution runtime for Stellar.**

If a network call fails, or an interactive anchor deposit takes hours to complete, Mesa persists execution state, schedules retries with exponential backoff, suspends execution while waiting on external deposit callbacks, and resumes safely via HMAC SHA-256 verified webhooks.

---

## 🏛️ Monorepo Architecture

Mesa is structured into modular, decoupled workspace packages:

| Package | Workspace Path | Description |
|---|---|---|
| **`@mesaprotocol/schema`** | `packages/schema` | Canonical Zod schemas, discriminated step unions (`receive`, `payment`, `convert`, `delay`, `webhook`, `soroban`), provider metadata, & HTTP request payloads |
| **`@mesaprotocol/sdk`** | `packages/sdk` | Ultra-lightweight (~10 KB) fluent TypeScript builder API (`Mesa.flow()`, `Mesa.register()`, `Mesa.execute()`) |
| **`@mesaprotocol/codegen`** | `packages/codegen` | TypeScript AST parser (`ts.createSourceFile`), cURL generator, JSON exporter, & 1-click runnable app workspace packager |
| **`@mesaprotocol/runtime`** | `packages/runtime` | State machine engine, REST API server, scheduler with exponential backoff, HMAC webhook security, & Developer Dashboard |
| **`@mesaprotocol/cli`** | `packages/cli` | Command-line tool for scaffolding starter apps, validating flow definitions, and running local runtimes |

```
  ┌─────────────────────────────────────────────────────────┐
  │                 Mesa Studio (Visual UI)                 │
  └────────────────────────────┬────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   Mesa CLI (npx mesa)                  Mesa SDK (@mesaprotocol/sdk)
            │                                     │
            └──────────────────┬──────────────────┘
                               ▼
            @mesaprotocol/schema + @mesaprotocol/codegen
                               │
                               ▼
                       Mesa Runtime API
                  (Engine + Scheduler + Store)
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
     Stellar Horizon     SEP-24 Anchors     Soroban Contracts
```

---

## 🚀 1-Minute CLI Quickstart

Scaffold a complete, 100% runnable monorepo app workspace with React UI, runtime server, flow auto-registration, and interactive deposit simulator using the Mesa CLI:

```bash
# 1. Create a new app workspace using a preset template
npx mesa create my-remittance-app --template remittance

# 2. Navigate to your app directory
cd my-remittance-app

# 3. Install dependencies & copy environment template
npm install
cp .env.example .env

# 4. Launch dev workspace (Server + React UI)
npm run dev
```

### Supported CLI Templates (`--template`):
- `remittance` — Cross-Border Remittance Corridor (`receive → delay → payment`)
- `payroll` — Automated Batch Payroll Payouts (`receive → delay → multi-payment`)
- `escrow` — Savings Circle & Timelocked Escrow (`receive → delay → disburse`)
- `soroban` — Soroban Smart Contract Yield Vault (`receive → invoke → webhook`)

---

## 🎨 Mesa Studio — Visual Workflow & App Builder

Open Mesa Studio locally at **[http://localhost:3000/studio](http://localhost:3000/studio)** or via Mesa Runtime at **[http://localhost:3001/studio](http://localhost:3001/studio)**.

### Studio Features:
- **Interactive Drag-and-Drop Canvas:** Connect primitives (`Receive`, `Payment`, `Delay`, `Webhook`, `Anchor`, `Soroban`) visually.
- **Bi-directional Round-Tripping:** Code generator parses visual node graphs into TypeScript SDK syntax and vice versa in real time.
- **Preset Financial Templates:** Load remittance corridors, payroll payout systems, or Soroban vault workflows in one click.
- **1-Click Runnable Workspace Exporter:** Export a 100% runnable monorepo ZIP containing:
  - React Web Frontend (`apps/web`) with interactive **Webhook Deposit Simulator**
  - Auto-registering Runtime Server (`mesa-server.ts`)
  - Flow Definition files (`packages/workflows`)
  - Environment Template (`.env.example`) & Docker Compose setup (`docker-compose.yml`)

---

## 🔒 Security & Replay Protection

Mesa implements production-grade security patterns out of the box:

- **Secret Key Isolation (`secretRef`):** Secret keys are never raw strings or committed to code. Key inputs specify reference names (e.g. `"SENDER_SECRET"`), resolved dynamically at execution time from `process.env`.
- **HMAC SHA-256 Webhook Verification:** Webhook callbacks verify signatures computed over raw body payloads: `X-Mesa-Signature`.
- **Timestamp Drift Tolerance:** Rejects webhook calls older than 5 minutes (`X-Mesa-Timestamp`) to defeat replay attacks.
- **Event Idempotency:** Tracks incoming event IDs (`X-Mesa-Event-Id`) in the database to prevent duplicate execution processing.

---

## 📊 Feature Comparison

| Feature / Challenge | Without Mesa | With Mesa Protocol |
| :--- | :--- | :--- |
| **Workflow State Persistence** | Write custom DB logic for steps & statuses | Built-in PostgreSQL & In-Memory state store |
| **Long-Running Suspension** | Build complex event polling for anchor deposits | Built-in suspension keys with HMAC webhook resume |
| **Distributed Retries** | Write cron workers with custom backoff logic | Built-in scheduler with exponential backoff |
| **App Builder Exporter** | Manually write frontend, backend, & configs | 1-Click runnable monorepo app exporter |
| **Key Security** | Danger of raw private keys in source | `secretRef` environment resolution at execution time |

---

## 🛠️ Monorepo Developer Commands

```bash
# Typecheck all workspaces (schema, sdk, codegen, runtime, cli)
npm run typecheck

# Run full monorepo test suite
npm test

# Build all workspace packages
npm run build

# Run End-to-End Demo Verification test
npx ts-node packages/runtime/src/test/e2e-verification.ts

# Validate a workflow definition JSON file via CLI
npx mesa validate packages/workflows/flow.json
```

---

## 🏛️ Deep Technical Documentation

For detailed architectural specs, crash recovery protocols, and release notes:
- ⚡ **[5-Minute Developer Quickstart](./QUICKSTART.md)** — Step-by-step developer tutorial.
- 📘 **[Architecture & Engine Internals](./ARCHITECTURE.md)** — State machine lifecycle, HMAC cryptographic verification, and pluggable provider interfaces.
- 📐 **[Architecture Decision Records (ADR)](./ADR.md)** — Design trade-offs, monorepo rationale, and Saga pattern decisions.
- 📜 **[Changelog & Releases](./CHANGELOG.md)** — Version history, API changes, and release milestones.
- 🤝 **[Contributing Guide](./CONTRIBUTING.md)** — Contribution workflows and development setup.

---

## ⚖️ License

Mesa Protocol is open-source software licensed under the [MIT License](./LICENSE).

---

<p align="center">Built with ⚡ for the Stellar ecosystem</p>
