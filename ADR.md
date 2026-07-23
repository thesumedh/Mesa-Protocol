# 📐 Mesa Protocol — Architecture Decision Records (ADR)

> **Documenting key architectural decisions, design trade-offs, and technical rationale driving Mesa Protocol.**

| Index | Title | Status | Date |
|---|---|---|---|
| **ADR-001** | Monorepo Workspace Architecture | `ACCEPTED` | 2026-07-20 |
| **ADR-002** | LIFO Saga Pattern for Distributed Step Compensation | `ACCEPTED` | 2026-07-23 |
| **ADR-003** | Dynamic Pluggable Provider Registry | `ACCEPTED` | 2026-07-23 |
| **ADR-004** | HMAC SHA-256 Webhook Verification & Drift Tolerance | `ACCEPTED` | 2026-07-22 |
| **ADR-005** | Single Source of Truth for Workflow Templates | `ACCEPTED` | 2026-07-23 |

---

## ADR-001: Monorepo Workspace Architecture

- **Status**: `ACCEPTED`
- **Date**: 2026-07-20

### Context
Building financial workflow infrastructure requires coordination between canonical Zod schemas, TypeScript AST codegen, SDK builder interfaces, runtime servers, and CLI tooling. Combining them into a single monolithic package caused SDK bundle bloat (~9.5 MB due to TypeScript compiler dependencies).

### Decision
Split Mesa into decoupled workspace packages:
- `@mesaprotocol/schema`: Lightweight Zod schemas and type definitions.
- `@mesaprotocol/templates`: Single source of truth for flow templates.
- `@mesaprotocol/sdk`: Ultra-lightweight (~10 KB) fluent builder API.
- `@mesaprotocol/codegen`: AST parser and app workspace generator.
- `@mesaprotocol/runtime`: Durable state machine engine and API server.
- `@mesaprotocol/cli`: CLI scaffolding and validation tool.

### Consequences
- **Positive**: `@mesaprotocol/sdk` install bundle dropped from 9.5 MB to ~10 KB.
- **Positive**: Clean separation of concerns; SDK can be embedded in browser dApps without server overhead.

---

## ADR-002: LIFO Saga Pattern for Distributed Step Compensation

- **Status**: `ACCEPTED`
- **Date**: 2026-07-23

### Context
Multi-step payment corridors (e.g. `deposit -> DEX swap -> payout`) can fail midway due to network congestion or account balance errors. If Step 3 fails, executed steps cannot simply be abandoned without leaving user funds stranded.

### Decision
Implement the **Saga Pattern** with LIFO (Last-In, First-Out) step compensation hooks (`.compensate()`). Upon unrecoverable step failure, the engine automatically iterates executed steps in reverse order ($N-1 \dots 0$) and executes registered rollback handlers before transitioning execution status to `COMPENSATED`.

### Consequences
- **Positive**: Multi-step Stellar corridors achieve financial failure atomicity.
- **Positive**: Stranded funds are automatically refunded to sender accounts.

---

## ADR-003: Dynamic Pluggable Provider Registry

- **Status**: `ACCEPTED`
- **Date**: 2026-07-23

### Context
Hardcoding ledger operations directly into core runtime execution loops creates tight coupling and prevents community extensions.

### Decision
Define a minimal `MesaProvider` interface and maintain a dynamic `ProviderRegistry` (`registerProvider()`). Core runtime execution loops do not know what a provider does—they only handle step outcomes (`completed`, `suspended`, `failed`).

### Consequences
- **Positive**: Ecosystem developers can package and register custom providers without modifying runtime source.
- **Positive**: Native providers (`sep10`, `anchor`, `stellar`, `soroban`, `approval`, `condition`, `compensation`) use identical interfaces.

---

## ADR-004: HMAC SHA-256 Webhook Verification & Drift Tolerance

- **Status**: `ACCEPTED`
- **Date**: 2026-07-22

### Context
Webhooks resuming suspended workflow executions must be protected against tampering and replay attacks.

### Decision
Verify incoming webhooks using HMAC SHA-256 signatures (`X-Mesa-Signature`) computed over raw payload buffers. Enforce a 5-minute maximum timestamp drift window (`X-Mesa-Timestamp`) and log unique event IDs (`X-Mesa-Event-Id`) in PostgreSQL for idempotency enforcement.

### Consequences
- **Positive**: High-security guarantees against replay attacks and payload tampering.
- **Positive**: Zero risk of duplicate deposit processing.

---

## ADR-005: Single Source of Truth for Workflow Templates

- **Status**: `ACCEPTED`
- **Date**: 2026-07-23

### Context
Maintaining separate template definitions in CLI scaffolding scripts and visual Studio UI led to drift and inconsistent developer experiences.

### Decision
Extract canonical flow definitions into a dedicated `@mesaprotocol/templates` workspace package. Both `@mesaprotocol/cli` and `UI/studio.js` import from `@mesaprotocol/templates`.

### Consequences
- **Positive**: 100% guarantee that Studio and CLI produce identical, non-drifting template outputs.
