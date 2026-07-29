# `@mesaprotocol/cli`

> **Command Line Interface (CLI) for Mesa Protocol — Embedded Finance Engine for Stellar.**

[![npm version](https://img.shields.io/npm/v/@mesaprotocol/cli?color=00dbe9&label=%40mesaprotocol%2Fcli)](https://www.npmjs.com/package/@mesaprotocol/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](https://opensource.org/licenses/MIT)

## 📦 Installation

```bash
# Run directly with npx (recommended):
npx @mesaprotocol/cli create my-stellar-app --template remittance

# Or install globally:
npm install -g @mesaprotocol/cli
```

---

## 🚀 Commands

### 1. `create` — Scaffold a New Financial App

Scaffold a complete, runnable monorepo workspace with React UI (`apps/web`), auto-registering runtime server (`mesa-server.ts`), and pre-configured workflow templates:

```bash
npx mesa create my-app --template remittance
```

#### Available Templates (`--template`):
- **`remittance`**: Cross-Border Remittance Corridor (`receive → delay → payment`)
- **`payroll`**: Automated Corporate Payroll Payouts (`receive → delay → multi-payment`)
- **`escrow`**: Timelocked Escrow & Savings Circle (`receive → delay → disburse`)
- **`soroban`**: Soroban Smart Contract Yield Vault (`receive → soroban-invoke → webhook`)

---

### 2. `validate` — Validate Flow Definition Files

Validate a JSON flow definition file against `@mesaprotocol/schema` Zod specifications:

```bash
npx mesa validate packages/workflows/flow.json
```

---

### 3. `dev` — Start Local Mesa Runtime Server

Launch the local Mesa Protocol runtime engine and dashboard:

```bash
npx mesa dev --port 3001
```

---

## 📄 License

[MIT](./LICENSE)
