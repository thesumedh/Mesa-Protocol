# Mesa — Architecture Frozen Spec & Milestones

**No architectural changes without explicit review.**

---

## 🏷️ Product Overview
*   **Name:** Mesa
*   **Tagline:** Embedded Finance Runtime for Stellar
*   **One-liner:** Build resilient embedded finance workflows on Stellar with a durable execution runtime.

---

## 🏛️ Core Principles
1. **Declarative SDK:** The SDK's only job is to generate a serializable workflow definition (data representation). It contains almost no business logic.
2. **Durable Runtime:** The self-hosted runtime executes workflows step-by-step.
3. **State Persistence:** Workflow states, execution traces, steps, and events are stored in PostgreSQL.
4. **Decoupled Providers:** Provider adapters encapsulate all Stellar integrations (Horizon, SEP-24, Soroban RPC).
5. **Observability:** A visual dashboard monitors and interacts with execution logs.

---

## 🏗️ Execution Architecture Flow

```
     SDK (Declarative Flow API)
                │
                ▼
      Runtime Server (Express API)
                │
                ▼
      Scheduler Polling Loop
                │
                ▼
        Executor Engine
                │
                ▼
        Provider Adapters (Anchor, Stellar)
                │
                ▼
      Stellar Testnet Ledger
```

---

## 🗺️ Phased Roadmap

### Phase A — Core Runtime (Completed)
- **Milestone 1 — Runtime Foundation:** Durable execution scheduler, executor, Postgres schema, and state transitions.
- **Milestone 2 — SDK (Fluent API):** Fluent `.flow().receive().convert().transfer().execute()` API.
- **Milestone 3 — Provider Framework:** Decoupled `MesaProvider` interface with lifecycle hooks and mock adapters.
- **Milestone 4 — Developer Dashboard:** Express visual console showing flows, executions, steps, events, and webhook simulator.
- **Milestone 5 — Real Stellar Integration:** Real Horizon connection, real SEP-10 challenge transaction signing, and live Testnet verification.

### Phase B — Developer Polish & Validation (In Progress)
- **Milestone 6 — Developer Polish (Current):** Production root `README.md`, 5-Minute Quickstart, API examples.
- **Milestone 7 — Demo Polish:** Presentation scripts, clean repository docker-compose validation instructions.
- **Milestone 8 — Validation:** Build Station teams feedback, Stellar developer and mentor reviews.
