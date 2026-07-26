# Mesa Production Action Plan

This document serves as the single working checklist for Mesa Protocol's architecture, product correctness, generated app reliability, and production hardening.

---

## 🎯 Core Promise
> **Design workflow visually or via SDK ➔ Generate app scaffold ➔ Run app ➔ Workflow executes reliably through runtime.**

---

## 📋 Action Items & Status

### Priority 0: Make Exported / CLI App Truly Runnable ✅ COMPLETED
- [x] Generated `mesa-server.ts` auto-registers generated workflow on startup using `await Mesa.register(flow);`.
- [x] Updated ZIP code generators in `@mesaprotocol/codegen`, `@mesaprotocol/cli`, and `UI/studio.js`.
- [x] Added automated exported app verification test (`packages/codegen/src/codegen.test.ts` Test 6) that extracts exported scaffold and verifies auto-registration logic.

### Priority 1 & 2: Shared Packages & Provider Metadata Driven UI ✅ COMPLETED
- [x] Runtime exposes `GET /providers` with complete metadata (`name`, `description`, `category`, `inputFields`, `outputs`, `mockSupport`, `realSupport`).
- [x] Shared canonical schemas (`@mesaprotocol/schema`), templates (`@mesaprotocol/templates`), and codegen (`@mesaprotocol/codegen`) form single source of truth across CLI, Studio, and SDK.

### Priority 3: Real Condition Branching (`ifTrueStep` / `ifFalseStep`) ✅ COMPLETED
- [x] `ConditionProvider` evaluates expressions using safe operators: `==`, `!=`, `>=`, `>`, `<=`, `<`, `contains`, `exists`.
- [x] Runtime `scheduler.ts` checks `ifTrueStep` and `ifFalseStep` branch targets when `ConditionProvider` completes and jumps directly to target step index.
- [x] Added automated test coverage in Category 6 of `packages/runtime/src/test/edge-cases.test.ts`.

### Priority 4: Real Saga Compensation Behavior ✅ COMPLETED
- [x] Added `runCompensation` helper in `executor.ts` that triggers when a step fails permanently after maximum retries.
- [x] Executes compensation steps for previously completed steps in reverse order.
- [x] Updates execution status to `COMPENSATED` or `COMPENSATION_FAILED`.
- [x] Emits `compensation.started`, `step.compensated`, and `compensation.completed` / `compensation.failed` audit events.
- [x] Verified by automated tests in `packages/runtime/src/test/edge-cases.test.ts`.

### Priority 5: Template-Specific Generated App Frontend UI ✅ COMPLETED
- [x] Implemented `generateAppTsxCode(flow)` in `@mesaprotocol/codegen`.
- [x] **Remittance Template**: Cross-Border Remittance Portal with Sender amount, Destination address, Anchor webview deposit simulator, XLM Payout status.
- [x] **Payroll Template**: Corporate Payroll Portal with Employee list, Treasury XLM deposit, Batch payout status, Audit log.
- [x] **Escrow / Soroban Vault Template**: Multi-Party Escrow Portal with Deposit form, Soroban WASM contract execution, Compliance sign-off, Refund/Compensation trigger.

---

## 🧪 Verification Matrix
- `packages/codegen`: 6/6 tests passing
- `packages/runtime`: 25/25 edge-case & foundation tests passing
- `npm run build`: 100% clean build across all workspace packages (`schema`, `templates`, `sdk`, `codegen`, `runtime`, `cli`)
