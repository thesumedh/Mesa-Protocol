# 📜 Mesa Protocol — Changelog

All notable changes to Mesa Protocol will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] - 2026-07-23

### 🔄 Distributed Saga Pattern, Multi-Package Publishing & Engine Hardening

#### Added
- **Saga Pattern Rollback Hooks (`.compensate()`)**: Multi-step payment failure resilience. In the event of an unrecoverable step error, Mesa automatically executes registered compensation steps in LIFO reverse order ($N-1 \dots 0$), setting execution state to `COMPENSATED`.
- **`CompensationProvider`**: Native provider for handling asset refunds and saga state rollbacks.
- **`COMPENSATED` State Machine Status**: Added `COMPENSATED` state to `ExecutionStatusSchema` and engine state transitions.
- **NPM Package Publishing Script (`npm run publish:packages`)**: Single-command script to publish all 6 workspace packages (`schema`, `templates`, `sdk`, `codegen`, `runtime`, `cli`) to npm.
- **Saga Compensation Documentation**: Added distributed saga rollback atomicity and partial failure isolation details to `ARCHITECTURE.md` and `README.md`.

---

## [0.2.0] - 2026-07-23

### 🚀 Production Overhaul & Monorepo Architecture

#### Added
- **`@mesaprotocol/templates` Package (`packages/templates`)**: Canonical workflow template library (`remittance`, `payroll`, `vault`, `escrow`, `invoice`, `subscription`) consumed as the single source of truth by both CLI and Mesa Studio.
- **Pluggable Provider Architecture (`registerProvider`)**: Decoupled primitive execution providers (`Sep10Provider`, `Sep24AnchorProvider`, `StellarPathPaymentProvider`, `SorobanProvider`, `ManualApprovalProvider`, `ConditionProvider`).
- **Native Operator Manual Approval Engine**: Execution state suspension waiting for operator sign-offs (`WAITING_APPROVAL`), resumed natively via `POST /executions/:id/approve`.
- **DAG Graph Routing & Condition Primitives**: Dynamic expression evaluation (`ConditionProvider`) over execution shared state (`context.shared`).
- **Mesa Studio Template Marketplace**: Single-click template gallery in Studio UI (`UI/studio.html`) and expanded node palette for all Stellar primitives.
- **CLI Multi-Template Support**: `npx mesa create <app-name> --template <template>` supporting 6 preset financial workflow scaffolds.
- **Zero-Friction Dev Fallback**: Automatic Postgres failure detection falling back to `InMemoryPool` so developers can run `npx mesa dev` out of the box with zero external dependencies.

#### Hardened
- **Flow Versioning Preservation**: Registered flow IDs and explicit creation-time versions (`flow.version`) are preserved through codegen and frontend requests.
- **HMAC Webhook Security & Replay Defense**: `X-Mesa-Signature` verification, 5-minute `X-Mesa-Timestamp` drift tolerance, and `X-Mesa-Event-Id` idempotency checks.
- **TypeScript AST Generator & Parser**: Bi-directional round-tripping between visual node graphs and `@mesaprotocol/sdk` code.

---

## [0.1.0] - 2026-07-15

### Initial Release
- Initial core engine proof-of-concept, `@mesaprotocol/sdk` fluent builder, and basic runtime execution loop.
