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

## 📜 Soroban Smart Contracts

Mesa Protocol natively integrates with compiled Soroban Rust smart contracts on Stellar. Smart contract source code is located in [`mesa-protocol/contracts/`](./mesa-protocol/contracts).

### 🛠️ Smart Contracts Included:
1. **`MesaCore` (`mesa-protocol/contracts/mesa-core`)**: Rotating Savings & Credit Association (ROSCA / Chama) contract managing trustless group savings, rotation orders, security deposits, and emergency consensus pauses.
2. **`MesaVault` (`mesa-protocol/contracts/mesa-vault`)**: Policy-based dynamic yield & savings vault contract supporting lock periods, automatic asset conversion, and withdrawal rules.
3. **`MesaFactory` (`mesa-protocol/contracts/mesa-factory`)**: Factory contract for deploying customized `MesaCore` and `MesaVault` instances on demand.

### 📍 Deployed Contract Addresses (Stellar Testnet):

| Contract / Asset | Deployed ID / Address | Type / Description |
|---|---|---|
| **`MesaCore` Contract** | [`CDWGVPSUXXSGABQ663FVV4TZJH4Q2R3HVAKTKWFFFMWPF23O7KMNS4KU`](https://stellar.expert/explorer/testnet/contract/CDWGVPSUXXSGABQ663FVV4TZJH4Q2R3HVAKTKWFFFMWPF23O7KMNS4KU) | Soroban Smart Contract (`WASM Hash: 6e72...92bb`) |
| **XLM (Native SAC)** | [`CDLZFC3SYJYDZT7K67VZ75HPJGWAM3BT2CH4XRVT62JZJU3CLSHQTY2W`](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJGWAM3BT2CH4XRVT62JZJU3CLSHQTY2W) | Wrapped Native XLM Token |
| **USDC (SAC)** | `CCW67CX2SC62R25746RRJV5HK5B2S27EV6G7JUW7K3HQT67WVPF5EUSDC` | Wrapped USDC Token |
| **EURC (SAC)** | `CCW67CX2SC62R25746RRJV5HK5B2S27EV6G7JUW7K3HQT67WVPF5EEURC` | Wrapped EURC Token |
| **KES (SAC)** | `CCW67CX2SC62R25746RRJV5HK5B2S27EV6G7JUW7K3HQT67WVPF5EEKES` | Wrapped KES Token |

### ⚡ Verified On-Chain Stellar Transactions (Live Credibility Proof):

| Network | Transaction Type | On-Chain Tx Hash | Ledger | Stellar Expert Explorer |
|---|---|---|---|---|
| 🚀 **Mainnet** | **Live Settlement** | `e6632bbf00c546f0d4de86bfa4cf691cdd14ea2318b6b41016d1b76a287a9159` | `63674080` | [View Mainnet Tx #e6632bbf...](https://stellar.expert/explorer/public/tx/e6632bbf00c546f0d4de86bfa4cf691cdd14ea2318b6b41016d1b76a287a9159) |
| 🚀 **Mainnet** | **Account Activation** | `14f96d0252aa35e2e0780b05dc03032e6b24aec0da569c2e71d099a8012fccdd` | `63674055` | [View Mainnet Tx #14f96d02...](https://stellar.expert/explorer/public/tx/14f96d0252aa35e2e0780b05dc03032e6b24aec0da569c2e71d099a8012fccdd) |
| 🧪 **Testnet** | **Payment Settlement** | `fdbb959095303a9a6f92de4ec22dac2b35456d1b25002772f9b76ec142b33397` | `3829431` | [View Testnet Tx #fdbb9590...](https://stellar.expert/explorer/testnet/tx/fdbb959095303a9a6f92de4ec22dac2b35456d1b25002772f9b76ec142b33397) |
| 🧪 **Testnet** | **Account Creation + Transfer** | `b71f98f2d778bfc86eeec2401f553da0cae25c9bab3b1da819c282499ca471f1` | `3829438` | [View Testnet Tx #b71f98f2...](https://stellar.expert/explorer/testnet/tx/b71f98f2d778bfc86eeec2401f553da0cae25c9bab3b1da819c282499ca471f1) |

> 🌐 Complete on-chain transaction logs & deployer keypair details are documented in **[`docs/MAINNET_VERIFICATION.md`](./docs/MAINNET_VERIFICATION.md)** and **[`docs/TESTNET_VERIFICATION.md`](./docs/TESTNET_VERIFICATION.md)**.

### 💻 Invoking Soroban Contracts via Mesa SDK

```ts
import { Mesa } from "@mesaprotocol/sdk";

export const sorobanFlow = Mesa.flow("Soroban Vault Invocation", "soroban-yield-vault")
  .receive({ asset: "USDC", minAmount: 50, toAddress: "GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV" })
  .soroban({
    contractId: "CDWGVPSUXXSGABQ663FVV4TZJH4Q2R3HVAKTKWFFFMWPF23O7KMNS4KU",
    method: "pay_contribution",
    args: { amount: 50 }
  })
  .build();
```

### 🔨 Build & Deploy Smart Contracts

```bash
# 1. Compile Soroban Rust contracts to WASM
cd mesa-protocol
cargo build --target wasm32-unknown-unknown --release

# 2. Run Soroban smart contract unit tests
cargo test

# 3. Deploy WASM binary to Stellar Testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/mesa_core.wasm \
  --source YOUR_STELLAR_SECRET_KEY \
  --network testnet
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

### Architectural Decision Record (ADR) Summary

| Record | Architectural Decision | Status | Technical Rationale |
|---|---|---|---|
| **[ADR-001](./ADR.md#adr-001-monorepo-workspace-architecture)** | Monorepo Workspace Split | `ACCEPTED` | Reduced SDK bundle size from 9.5 MB to 10 KB by separating AST codegen. |
| **[ADR-002](./ADR.md#adr-002-lifo-saga-pattern-for-distributed-step-compensation)** | LIFO Saga Rollback Steps | `ACCEPTED` | Prevents stranded funds by executing refund steps in reverse order upon failure. |
| **[ADR-003](./ADR.md#adr-003-dynamic-pluggable-provider-registry)** | Dynamic Provider Registry | `ACCEPTED` | Allows community adapters to extend Mesa primitives without touching runtime core. |
| **[ADR-004](./ADR.md#adr-004-hmac-sha-256-webhook-verification--drift-tolerance)** | HMAC SHA-256 Webhooks | `ACCEPTED` | Prevents webhook tampering, replay attacks, and duplicate event processing. |
| **[ADR-005](./ADR.md#adr-005-single-source-of-truth-for-workflow-templates)** | `@mesaprotocol/templates` | `ACCEPTED` | Guarantees visual Studio UI and CLI create identical workflow app scaffolds. |

---

## ⚖️ License

Mesa Protocol is open-source software licensed under the [MIT License](./LICENSE).

---

<p align="center">Built with ⚡ for the Stellar ecosystem</p>
