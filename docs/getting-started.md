# Mesa: Developer Documentation & Reference Guide

Welcome to the official developer documentation for **Mesa**. This guide explains what Mesa is, how it works, and how to build, run, and scale resilient financial workflows on the Stellar network from the ground up.

---

## 📖 Table of Contents
1. [What is Mesa?](#-what-is-mesa)
2. [Core Architecture](#-core-architecture)
3. [Quickstart Setup](#-quickstart-setup)
4. [Writing Your First Workflow](#-writing-your-first-workflow)
5. [Pluggable Provider Framework](#-pluggable-provider-framework)
6. [Managing State & Persistence](#-managing-state--persistence)
7. [Developer Console Dashboard](#-developer-console-dashboard)
8. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## ⚡ What is Mesa?

Building financial applications on Stellar usually requires managing complex orchestration logic:
- Acquiring **SEP-10 Web Authentication** tokens.
- Polling anchors for **SEP-24 Interactive Deposits/Withdrawals**.
- Submitting on-chain transactions and handling sequence number mismatches.
- Writing retry queues for Horizon node timeouts.
- Saving state to resume steps after webhooks trigger.

**Mesa is a durable runtime engine that automates this orchestration.** Instead of writing thousands of lines of state machine code, developers describe their corridor using a fluent SDK:

```ts
await Mesa.flow()
  .receive({ anchor: "DemoAnchor", asset: "USDC" })
  .convert({ to: "XLM" })
  .transfer({ destination: recipient })
  .execute();
```

Mesa executes each step, persists the trace to a PostgreSQL database, retries on failures, suspends on interactive flows, and resumes automatically when webhooks callback.

---

## 🏛️ Core Architecture

Mesa splits execution concerns into decoupled, highly focused modules:

```text
       ┌────────────────────────┐
       │   Developer Application│ (Client Layer)
       └───────────┬────────────┘
                   │ Calls SDK methods
                   ▼
       ┌────────────────────────┐
       │        Mesa SDK        │ (Interface Layer)
       └───────────┬────────────┘
                   │ Registers flow definitions & spawns executions
                   ▼
       ┌────────────────────────┐
       │     Workflow Runtime   │ (Orchestration Engine)
       └─────┬────────────┬─────┘
             │            │
             │            │ Polls database and runs executions
             ▼            ▼
       ┌───────────┐┌───────────┐
       │  Scheduler││  Executor │ (Execution Layer)
       └───────────┘└─────┬─────┘
                          │ Invokes target adapters
                          ▼
       ┌────────────────────────┐
       │  Providers (Adapters)  │ (Gateway Layer)
       │  (Anchor, Stellar)     │
       └───────────┬────────────┘
                   │ Submits transactions / signs XDR
                   ▼
       ┌────────────────────────┐
       │     Stellar Network    │ (Settlement Layer)
       └────────────────────────┘
```

1. **Mesa SDK**: The fluent, type-safe API for defining steps and executing flows.
2. **Workflow Runtime**: Exposes the REST API server (`/executions`, `/flows`, `/webhooks/resume`) to receive jobs and serve telemetry.
3. **Scheduler**: A background worker polling the database to dispatch pending steps.
4. **Executor**: Executes steps, counts attempts, manages backoffs, and logs event traces.
5. **Providers**: Adapters containing protocol-specific logic (e.g. SEP-24, testnet Horizon payments).

---

## 🚀 Quickstart Setup

Follow these basic steps to run Mesa locally.

### 1. Requirements
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)
- [Docker](https://www.docker.com/) (for running PostgreSQL)

### 2. Installation
Clone the repository and install dependency workspaces:
```bash
git clone https://github.com/thesumedh/Mesa-Protocol.git
cd Mesa-Protocol
npm install
```

### 3. Start Database Store
Start the pre-configured Postgres container:
```bash
docker compose up -d
```
This launches Postgres on `localhost:5432` and creates the `mesa` database. The database tables (flows, executions, steps, events) are automatically synchronized when the server boots.

### 4. Run the Runtime Server
Compile the workspaces and start the API engine:
```bash
npm run build:runtime
npm run start --workspace=packages/runtime
```
The server will boot and listen on **`http://localhost:3001`**.

---

## 🛠️ Writing Your First Workflow

Let's write a simple custom workflow script.

### 1. Register a Flow
A workflow is a template made of sequential steps. Each step points to a **Provider** and contains JSON **params**.

Save this script as `my_flow.ts` in your test folder:

```ts
import { Keypair } from '@stellar/stellar-sdk';
import axios from 'axios';

async function run() {
  const user = Keypair.random();
  const merchant = Keypair.random();

  // Define the workflow structure
  const flowDefinition = {
    steps: [
      {
        name: 'deposit-usd',
        provider: 'anchor',
        params: {
          action: 'sep24-deposit',
          anchorUrl: 'https://testanchor.stellar.org',
          asset: 'USDC',
          amount: 10,
          userAddress: user.publicKey(),
          userSecret: user.secret()
        }
      },
      {
        name: 'pay-merchant',
        provider: 'stellar',
        params: {
          action: 'payment',
          amount: 5,
          to: merchant.publicKey()
        }
      }
    ]
  };

  // Register the flow with the Mesa Runtime
  const flowRes = await axios.post('http://localhost:3001/flows', {
    id: 'usd-remittance-corridor',
    name: 'USD Remittance Corridor',
    definition: flowDefinition
  });
  console.log('✓ Flow registered:', flowRes.data);

  // Spawn an execution run
  const execRes = await axios.post('http://localhost:3001/executions', {
    flowId: 'usd-remittance-corridor'
  });
  console.log('🚀 Execution started! ID:', execRes.data.id);
}

run().catch(console.error);
```

### 2. Execute & Observe
Run your script:
```bash
npx ts-node my_flow.ts
```
The scheduler will immediately pick up your execution:
1. It reads the first step (`deposit-usd`).
2. It requests a challenge XDR from the anchor, signs it, exchanges it for a JWT token, initiates the interactive deposit, and fetches the interactive URL.
3. It marks the step as `SUSPENDED` and yields execution.

---

## 🔌 Pluggable Provider Framework

Every step in a workflow is handled by a pluggable provider. Mesa defines standard interfaces for creating custom adapters.

### Structure of a Provider
A provider implements the `Provider` interface:

```ts
export interface ExecutionContext {
  executionId: string;
  stepIndex: number;
  store: {
    appendEvent(type: string, payload: any): Promise<void>;
  };
}

export interface StepResult {
  outcome: 'completed' | 'suspended' | 'failed';
  output?: Record<string, any>;
  error?: string;
  suspensionKey?: string;
}

export interface Provider {
  name: string;
  execute(params: any, context: ExecutionContext): Promise<StepResult>;
  resume(event: any, context: ExecutionContext): Promise<StepResult>;
}
```

### Registering a Provider
To register your custom provider with the runtime, add it to `packages/runtime/src/server.ts` before starting the scheduler:

```ts
import { registerProvider } from './provider';

const myCustomProvider = {
  name: 'custom-settler',
  async execute(params: any, context: any) {
    console.log('Executing custom logic with params:', params);
    return { outcome: 'completed', output: { success: true } };
  },
  async resume(event: any, context: any) {
    return { outcome: 'completed' };
  }
};

registerProvider(myCustomProvider);
```

---

## 💾 Managing State & Persistence

Mesa guarantees durability across system crashes. The schema is stored in `packages/runtime/src/store/schema.sql` and tracks:

### 1. `executions`
Maintains the root workflow state:
- `id`: Unique execution UUID.
- `flow_id`: Associated registered flow model.
- `status`: Current state (`CREATED`, `RUNNING`, `SUSPENDED`, `COMPLETED`, `FAILED`).
- `created_at` / `completed_at`: Timestamps.

### 2. `steps`
Tracks individual step outcomes:
- `execution_id`: Parent execution UUID.
- `step_index`: Index sequence number.
- `status`: Current step status (`PENDING`, `RUNNING`, `SUSPENDED`, `COMPLETED`, `FAILED`).
- `attempts`: Count of execution retries.
- `output` / `error`: Logs output objects or stack traces.

### 3. `events`
A complete event ledger trace of the entire execution history (e.g. `anchor.sep10.completed`, `trustline.created`). Excellent for audits and telemetry.

---

## 📊 Developer Console Dashboard

The Mesa Developer Console provides a live, high-fidelity control center for managing your infrastructure.

Access the dashboard at:
👉 **[http://localhost:3001/dashboard](http://localhost:3001/dashboard)**

### Key Features
- **Aggregate Telemetry Row**: At the top, view active flows, providers, total executions, and detailed counts of SEP-10/SEP-24 sessions.
- **Visual Blueprint**: Click on the **Runtime Architecture** widget in the header to view the hierarchical execution blueprint.
- **Workflow State Stepper**: Watch steps progress from `PENDING` to `active` (pulsing blue) to `completed` (green check).
- **Collapsible Technical Details**: Expand parameters and outputs to view exact payload responses, JSON objects, and transaction hashes.
- **Webhook Resumption Sandbox**: Manually trigger webhook callbacks to test interactive resumption flows in a sandbox container.

---

## ❔ Troubleshooting & FAQs

### Q: Why is my step suspended indefinitely?
A: Step suspension occurs when waiting for external webhooks (e.g. a SEP-24 user deposit). To resume the step, post a callback containing the matching suspension key to the resume webhook:
```bash
POST http://localhost:3001/webhooks/resume
Content-Type: application/json

{
  "suspensionKey": "anchor:sep24:...",
  "payload": {
    "status": "completed"
  }
}
```

### Q: How do I change retry configurations?
A: Retry limits are defined in the Scheduler. If a step returns `{ outcome: 'failed' }`, the Scheduler will apply exponential backoff. You can configure limits in `packages/runtime/src/engine/scheduler.ts`.

### Q: Where do I view database tables?
A: You can connect to your Postgres container using any standard GUI client:
- **Host**: `localhost`
- **Port**: `5432`
- **Username**: `postgres`
- **Password**: `postgres`
- **Database**: `mesa`
