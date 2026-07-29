# Mesa Protocol — Embedded Financial Workflow Runtime for Stellar

> **An alpha-stage durable execution runtime and visual workflow builder for multi-step financial applications on Stellar.**

[![npm version](https://img.shields.io/npm/v/@mesaprotocol/sdk?color=00dbe9&label=%40mesaprotocol%2Fsdk)](https://www.npmjs.com/package/@mesaprotocol/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](https://opensource.org/licenses/MIT)
[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar-blueviolet)](https://stellar.org)
[![Stage: Alpha](https://img.shields.io/badge/Stage-Alpha%20Prototype-yellow.svg)](https://github.com/thesumedh/Mesa-Protocol)

> 🧪 **Project Status**: Alpha Prototype / Infrastructure Research. Mesa provides durable step execution, HMAC webhook resilience, and saga compensation hooks for developer testing and exploration.

```bash
# 1. Run reproducible multi-step E2E demo (Suspend -> HMAC Resume -> Saga Rollback):
npx ts-node packages/runtime/src/test/public-e2e-demo.ts

# 2. Scaffold a new app workspace:
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

**Mesa Protocol provides a durable execution runtime, TypeScript SDK, CLI generator, and visual workflow studio for Stellar.**

### 🧩 Core Infrastructure Components

| Package / Module | Description | npm Package / Link |
| :--- | :--- | :--- |
| **`@mesaprotocol/runtime`** | State Machine Engine, REST Server, Scheduler & Webhook Receiver | [![npm](https://img.shields.io/npm/v/@mesaprotocol/runtime?color=00dbe9)](https://www.npmjs.com/package/@mesaprotocol/runtime) |
| **`@mesaprotocol/sdk`** | Lightweight Fluent TypeScript Workflow Builder SDK | [![npm](https://img.shields.io/npm/v/@mesaprotocol/sdk?color=00dbe9)](https://www.npmjs.com/package/@mesaprotocol/sdk) |
| **`@mesaprotocol/cli`** | Command Line Tool to scaffold monorepo developer workspaces | [![npm](https://img.shields.io/npm/v/@mesaprotocol/cli?color=00dbe9)](https://www.npmjs.com/package/@mesaprotocol/cli) |
| **`@mesaprotocol/codegen`** | TypeScript AST Parser, cURL Generator & Zip Exporter | [![npm](https://img.shields.io/npm/v/@mesaprotocol/codegen?color=00dbe9)](https://www.npmjs.com/package/@mesaprotocol/codegen) |
| **`@mesaprotocol/schema`** | Zod Schemas & Discriminated Union Types | [![npm](https://img.shields.io/npm/v/@mesaprotocol/schema?color=00dbe9)](https://www.npmjs.com/package/@mesaprotocol/schema) |

---

## 🏗️ Monorepo Architecture

```
                               Mesa Studio UI
                                (studio.html)
                                     │
             ┌───────────────────────┴───────────────────────┐
             ▼                                               ▼
    Mesa CLI (npx mesa)                     Mesa SDK (@mesaprotocol/sdk)
             │                                               │
             └───────────────────────┬───────────────────────┘
                                     ▼
                @mesaprotocol/schema + @mesaprotocol/codegen
                                     │
                                     ▼
                           Mesa Runtime API
                      (Engine + Scheduler + Store)
                                     │
             ┌───────────────────────┼───────────────────────┐
             ▼                       ▼                       ▼
       Stellar Horizon        SEP-24 Anchors        Soroban Contracts
```

---

## 🚀 1-Minute CLI Quickstart

Scaffold a pre-configured developer app workspace with React UI, runtime server, flow auto-registration, and interactive deposit simulator using the Mesa CLI:

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
- **1-Click Developer Workspace Exporter:** Export a pre-configured monorepo ZIP containing:
  - React Web Frontend (`apps/web`) with interactive **Webhook Deposit Simulator**
  - Auto-registering Runtime Server (`mesa-server.ts`)
  - Flow Definition files (`packages/workflows`)
  - Environment Template (`.env.example`) & Docker Compose setup (`docker-compose.yml`)

---

## 🔒 Security & Replay Protection

Mesa implements security patterns out of the box:

- **Secret Key Isolation (`secretRef`):** Secret keys are never raw strings or committed to code. Key inputs specify reference names (e.g. `"SENDER_SECRET"`), resolved dynamically at execution time from `process.env`.
- **HMAC SHA-256 Webhook Verification:** Webhook callbacks verify signatures computed over raw body payloads: `X-Mesa-Signature`.
- **Timestamp Drift Tolerance:** Rejects webhook calls older than 5 minutes (`X-Mesa-Timestamp`) to defeat replay attacks.
- **Event Idempotency:** Tracks incoming event IDs (`X-Mesa-Event-Id`) in the database to prevent duplicate execution processing.

> ⚠️ **Security & Audit Disclaimer**: Soroban smart contracts included in this repository are provided for demonstration, testing, and prototype purposes and have not undergone a formal third-party security audit. Exercise appropriate caution before deploying production capital.

---

## 📊 Feature Comparison

| Feature / Challenge | Without Mesa | With Mesa Protocol |
| :--- | :--- | :--- |
| **State Persistence** | Custom DB logic, prone to process crash loss | Durable execution engine with automated state persistence |
| **Asynchronous Webhooks** | Fragile custom endpoint handlers | HMAC SHA-256 signed suspension & resume key model |
| **Failure Recovery** | Manual database rollbacks & financial reconciliation | Automatic Saga Compensation hooks (`.compensate()`) |
| **Stellar Connectivity** | Boilerplate SDK setup for Horizon + Anchors + Soroban | Unified type-safe SDK primitives (`stellar`, `anchor`, `soroban`) |
| **Visual Design** | Code-only architecture | Bi-directional visual workflow studio & code exporter |

---

## 📦 Reference Integration Contracts (Demo Soroban Apps)

> ℹ️ **Integration Note**: The primary core product of Mesa Protocol is the **TypeScript Durable Execution Runtime Engine**. The Soroban smart contracts below are provided as reference demo contracts to demonstrate how Soroban methods interact with Mesa workflow steps. Smart contract source code is located in [`mesa-protocol/contracts/`](./mesa-protocol/contracts).

### 🛠️ Reference Smart Contracts Included:
1. **`MesaCore` (`mesa-protocol/contracts/mesa-core`)**: Rotating Savings & Credit Association (ROSCA / Chama) contract managing group savings, rotation orders, security deposits, and emergency consensus pauses.
2. **`MesaVault` (`mesa-protocol/contracts/mesa-vault`)**: Policy-based dynamic yield & savings vault contract supporting lock periods, automatic asset conversion, and withdrawal rules.
3. **`MesaFactory` (`mesa-protocol/contracts/mesa-factory`)**: Factory contract for deploying customized `MesaCore` and `MesaVault` instances on demand.

### 🚀 Deployed Contract Addresses (Stellar Public Mainnet):

| Contract | Mainnet Contract ID | Explorer Link | Status |
|---|---|---|---|
| **`MesaCore` Contract** | [`CDIB6CI47O53G4LE5ACZXHKHUGH76VX5WT7Z24G5PK5JP5ARO6GXPI4L`](https://stellar.expert/explorer/public/contract/CDIB6CI47O53G4LE5ACZXHKHUGH76VX5WT7Z24G5PK5JP5ARO6GXPI4L) | [View Mainnet Contract on Stellar Expert](https://stellar.expert/explorer/public/contract/CDIB6CI47O53G4LE5ACZXHKHUGH76VX5WT7Z24G5PK5JP5ARO6GXPI4L) | 🟢 **LIVE ON MAINNET** |
| **XLM (Native SAC)** | [`CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA`](https://stellar.expert/explorer/public/contract/CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA) | [View Native XLM Asset Contract](https://stellar.expert/explorer/public/contract/CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA) | 🟢 **LIVE ON MAINNET** |

### 🧪 Deployed Contract Addresses (Stellar Testnet):

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
| 🚀 **Mainnet** | **Soroban Contract Invocation (`initialize`)** | `300f3635d5c5043d05dc11f4de79a15f8ed0793342c0daa123a0f3e72b7339ce` | `63701369` | [View Mainnet Contract Invocation Tx #300f3635...](https://stellar.expert/explorer/public/tx/300f3635d5c5043d05dc11f4de79a15f8ed0793342c0daa123a0f3e72b7339ce) |
| 🚀 **Mainnet** | **Live Settlement Payment** | `e6632bbf00c546f0d4de86bfa4cf691cdd14ea2318b6b41016d1b76a287a9159` | `63674080` | [View Mainnet Tx #e6632bbf...](https://stellar.expert/explorer/public/tx/e6632bbf00c546f0d4de86bfa4cf691cdd14ea2318b6b41016d1b76a287a9159) |
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
    contractId: "CDIB6CI47O53G4LE5ACZXHKHUGH76VX5WT7Z24G5PK5JP5ARO6GXPI4L",
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

# 3. Deploy WASM binary to Stellar Testnet or Public Mainnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/mesa_core.wasm \
  --source YOUR_STELLAR_SECRET_KEY \
  --network testnet # Use --network mainnet for public mainnet deployment
```

---

## 🛠️ Monorepo Package Reference & Scripts

```bash
# Typecheck all TypeScript workspace packages
npm run typecheck

# Run full unit and integration test suite across packages
npm test

# Run multi-step E2E execution & saga rollback demo
npx ts-node packages/runtime/src/test/public-e2e-demo.ts
```

---

## 📄 License

[MIT](./LICENSE)
