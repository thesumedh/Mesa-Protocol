# Mesa — System Architecture Specification

Mesa is an **embedded finance runtime for Stellar**. It allows developers to compose complex, multi-step financial workflows (such as fiat on-ramps, path payments across the DEX, direct transfers, and webhooks) into resilient, durable, and observable pipelines.

---

## 🏛️ Core Design Decisions (Frozen Scope)

The following architectural choices define the core scope of the Mesa MVP:

1. **Self-Hosted Runtime Engine:**
   Mesa is designed to be hosted locally next to the developer's application using Docker Compose. There is no central Mesa server, custody of keys, or dependency on proprietary cloud services.
   
2. **Postgres-Backed Durable State:**
   The control flow, step status, and event logs are stored in a Postgres database. This guarantees that if the server crashes or restarts mid-workflow, execution resumes from the exact last persisted step. On-chain consensus is reserved for settlements (e.g. transfers), not state machine coordination.

3. **Client-Side SEP-10 Auth (JWT Extraction):**
   Mesa's runtime does *not* custody users' private keys or perform interactive SEP-10 challenge signing. Instead, the user authenticates with their wallet (e.g. Freighter, Ledger) in the frontend application. The resulting JWT authentication token is passed to the SDK and runtime as part of the execution context parameters.

4. **HMAC Webhook Verification:**
   All inbound callbacks (e.g. anchor status updates or external app responses) that target `/webhooks/resume` verify authenticity using HMAC-SHA256 signatures to prevent malicious payload injection.

5. **Durable Retries without Invariant Rollbacks:**
   The runtime supports automatic exponential backoff (e.g., 1s, 2s, 4s, 8s, 16s) for transient network or RPC failures. Compensation workflows (reverting already completed transactions on downstream failure) are out of scope for the core engine and deferred as a future client-side extension.

---

## 🏗️ High-Level System Architecture

```
Developer App
    │
    │  npm install @mesa/sdk
    │
    ▼
Mesa SDK              ← Describes the workflow (pure data)
    │
    │  HTTP POST /flows  +  POST /executions
    │
    ▼
Mesa Runtime          ← Executes durably (self-hosted Docker)
    │
    ├── Scheduler     ← Polls Postgres, advances executions
    ├── Executor      ← Runs steps, handles retries/suspension
    └── Store         ← Postgres: flows, executions, steps, events
    │
    ▼
Providers (Stellar primitives)
    ├── anchor        ← SEP-24 deposit/withdraw + webhook resume
    ├── stellar       ← transfers, path payments, Horizon monitoring
    └── webhook       ← HTTP notifications + callback suspension
```

---

## 📁 Repository Layout

```
packages/
├── sdk/                      # @mesa/sdk (fluent FlowBuilder, client, types)
├── runtime/                  # @mesa/runtime (durable execution engine, Postgres schema)
└── providers/                # Primitive adapters (anchor, stellar, webhook, delay)

examples/
└── cross-border-payment/     # MVP end-to-end demo (receive → pathPayment → offRamp)
```

*(Note: Advanced community saving contracts, vaults, and CLI add-on scripts are deferred to [BACKLOG.md](file:///f:/Stellar/stitch_mesa_protocol/BACKLOG.md).)*

---

## 🔄 Execution State Machine

Workflows advance step-by-step through a state machine managed by the Scheduler:

```
PENDING → RUNNING → COMPLETED
              │
              ├── SUSPENDED (waiting for external callback, e.g. SEP-24 user deposit)
              │       └── RUNNING (resumed via HMAC-verified webhook)
              │
              └── FAILED → RETRYING (exponential backoff) → RUNNING
                               │
                               └── PERMANENTLY_FAILED (after max attempts)
```

---

## 🔌 Provider Interface

Every adapter (primitive bridge) implements a unified interface:

```typescript
export interface MesaProvider {
  readonly name: string;
  execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult>;
  resume?(event: ExternalEvent, context: ExecutionContext): Promise<StepResult>;
}
```

- **`execute()`:** Invoked by the executor to start the step. Returns `completed`, `suspended` (with a suspension key), or throws an error (triggering retry).
- **`resume()`:** Invoked by the server when a webhook callback matches a waiting `suspensionKey`.

---

## 🔒 Security Model

- **Signer Custody:** Only the runtime signer key (`MESA_SIGNER_SECRET`) is stored in the environment. Client wallets are used only to generate signatures for actions initiated on the frontend.
- **Workflow Integrity:** Workflows are immutable once registered in the database.
- **Database Safety:** All raw database queries are fully parameterized.
