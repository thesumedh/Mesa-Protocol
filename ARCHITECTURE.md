# 🏛️ Mesa Protocol — Engine Architecture & Internals

> **Technical documentation on Mesa Protocol's durable state machine, scheduler, cryptographic security, and provider architecture.**

---

## 1. High-Level System Architecture

Mesa Protocol separates execution concerns into five decoupled layers:

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

## 2. Execution State Machine Lifecycle

Mesa models workflow executions as durable, crash-resilient state machines. Every execution transition is written atomically to the database store before proceeding.

```
       ┌───────────┐
       │  CREATED  │
       └─────┬─────┘
             │ (scheduler pick up)
             ▼
       ┌───────────┐
 ┌────►│  RUNNING  │◄─────────────────────────────┐
 │     └─────┬─────┘                              │
 │           │                                    │
 │           ├──────────────────────┬─────────────┴────────┐
 │           ▼                      ▼                      │
 │     ┌───────────┐          ┌───────────┐          ┌─────┴─────┐
 │     │ SUSPENDED │          │ SUSPENDED │          │ RETRYING  │
 │     │(APPROVAL) │          │ (WEBHOOK) │          └─────┬─────┘
 │     └─────┬─────┘          └─────┬─────┘                │
 │           │                      │                      │
 │           │ (approve endpoint)   │ (webhook resume)     │ (max attempts)
 │           └──────────┬───────────┘                      │
 │                      ▼                                  ▼
 │                ┌───────────┐                      ┌───────────┐
 └────────────────┤  RUNNING  │                      │  FAILED   │
                  └─────┬─────┘                      └───────────┘
                        │
                        ▼ (all steps complete)
                  ┌───────────┐
                  │ COMPLETED │
                  └───────────┘
```

### State Definitions:
- **`CREATED`**: Flow execution created via `POST /executions`. Initialized with step 0 status `PENDING`.
- **`RUNNING`**: Active execution in progress. The step handler is executing logic or communicating with external networks.
- **`SUSPENDED` / `WAITING_APPROVAL`**: Execution paused at a `manual-approval` step. Requires operator sign-off via `POST /executions/:id/approve`.
- **`SUSPENDED` / `WAITING_WEBHOOK`**: Execution paused waiting for an external callback (e.g. SEP-24 deposit webview callback). Resumed via `POST /webhooks/resume`.
- **`RETRYING`**: Transitory state after a step failure. Scheduled for execution retry using exponential backoff logic.
- **`COMPLETED`**: Terminal status achieved when all steps in the flow definition succeed.
- **`FAILED`**: Terminal status triggered when a step fails permanently or manual approval is rejected.
- **`CANCELLED`**: Terminal status invoked via cancellation API.

---

## 3. Crash Recovery & Resilience Protocol

In-flight workflows can remain in a `SUSPENDED` state for hours or days waiting for user interaction. Mesa runtime guarantees **zero lost state** across server restarts or crashes:

1. **Atomic Step Persistence**: Before invoking a provider step handler, Mesa persists `status = RUNNING` and increments `attempt_count` in PostgreSQL.
2. **Orphan Recovery Sweep**: Upon server startup, the Mesa Scheduler runs an orphan sweep query:
   ```sql
   SELECT id FROM executions 
   WHERE status = 'RUNNING' 
     AND updated_at < NOW() - INTERVAL '5 minutes';
   ```
3. **Automatic Resumption**: Identified orphaned executions are reset to `PENDING` or scheduled for retry, ensuring execution continuity without duplicate side-effects.

---

## 4. Cryptographic Webhook Verification & Replay Protection

Mesa implements strict security protocols for incoming external webhooks:

### A. HMAC SHA-256 Signature Verification
Incoming webhooks must supply the signature computed over the raw request payload:
$$\text{Signature} = \text{HMAC-SHA256}(\text{Secret}, \text{Timestamp} + "." + \text{RawBody})$$
Passed in header: `X-Mesa-Signature`.

### B. 5-Minute Timestamp Drift Tolerance
Rejects requests where $|T_{\text{server}} - T_{\text{header}}| > 300\text{ seconds}$ via `X-Mesa-Timestamp` to prevent delayed replay attacks.

### C. Database Event Idempotency
Unique event IDs (`X-Mesa-Event-Id`) are logged in the `webhook_events` table. Duplicate submissions trigger immediate `409 Conflict` responses.

---

## 5. Pluggable Provider Registry Architecture

Mesa enforces strict separation between core engine orchestration and ledger-specific integrations:

```ts
export interface MesaProvider {
  readonly name: string;
  metadata?: ProviderMetadata;
  execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult>;
  resume?(event: ExternalEvent, context: ExecutionContext): Promise<StepResult>;
}

// Dynamic Registration
registerProvider(new Sep10Provider());
registerProvider(new Sep24AnchorProvider());
registerProvider(new SorobanProvider());
```

This design allows third-party developers to package and publish custom providers without modifying Mesa runtime internals.
