# ⚡ Mesa Protocol — 5-Minute Developer Quickstart

> **Learn how to build, visually design, and run a complete Stellar financial workflow app in 5 minutes.**

---

## 1. Prerequisites

Ensure you have [Node.js](https://nodejs.org) (v18 or higher) installed on your system.

---

## 2. Scaffold a New App Workspace

Run the Mesa CLI to create a pre-configured 1-click app workspace:

```bash
npx mesa create my-remittance-app --template remittance
```

### Supported Templates (`--template`):
- `remittance` — Cross-Border Remittance Corridor (`receive → delay → payment`)
- `payroll` — Automated Batch Payroll Payouts (`receive → delay → multi-payment`)
- `escrow` — Savings Circle & Timelocked Escrow (`receive → delay → disburse`)
- `soroban` — Soroban Smart Contract Yield Vault (`receive → invoke → webhook`)

---

## 3. Launch Development Server

Navigate into your newly scaffolded application and launch the development environment:

```bash
cd my-remittance-app
npm install
cp .env.example .env
npm run dev
```

> 💡 **Zero-Dependency Mode**: By default, Mesa Runtime automatically boots in **In-Memory Mode** if PostgreSQL is not detected, allowing you to test workflows instantly with zero local infrastructure setup!

---

## 4. Trigger & Inspect Workflow Execution

Open your browser to:
- **React Frontend**: [http://localhost:5173](http://localhost:5173) (or `apps/web`)
- **Mesa Runtime Console**: [http://localhost:3001/dashboard](http://localhost:3001/dashboard)

1. Click **Launch Flow** on the web UI.
2. Observe the active Execution ID and status transition to `SUSPENDED (Waiting for deposit/webhook)`.
3. Click **Simulate Stellar USD Deposit Callback** to submit a mock webhook event.
4. Watch the execution resume instantly and complete with a real Testnet transaction hash!

---

## 5. Next Steps

- 📘 **[Architecture & Engine Internals](./ARCHITECTURE.md)** — Read about state machine resilience, crash recovery, and HMAC security.
- 📐 **[Architecture Decision Records](./ADR.md)** — Learn why Mesa chose monorepo workspaces and LIFO Saga rollbacks.
- 📜 **[Changelog](./CHANGELOG.md)** — Explore version release notes.
