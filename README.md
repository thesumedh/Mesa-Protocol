# Mesa: Embedded Finance Runtime for Stellar

Build resilient financial workflows in minutes.

```ts
await Mesa.flow()
  .receive(...)
  .convert(...)
  .transfer(...)
  .execute();
```

✅ **Runtime**  
✅ **Dashboard**  
✅ **Provider Framework**  
✅ **Real Testnet Integration**

---

## 🏛️ System Architecture

```text
Developer App
       │
       ▼
    Mesa SDK
       │
       ▼
  Mesa Runtime
       │
 ┌─────┼─────┐
 │     │     │
Anchor Wallet Stellar
       │
       ▼
 Stellar Network
```

---

## 📊 Developer Benchmarks

| Metric | Mesa |
|---------|------|
| **Lines of integration code** | ~15 lines |
| **Workflow state persistence** | Built-in (PostgreSQL / In-Memory) |
| **Retry handling** | Built-in (Exponential backoff) |
| **Suspend / Resume** | Built-in (Suspension Keys & Webhooks) |
| **Developer Console Dashboard** | Built-in (Visual timeline & event logs) |

---

## ⚡ What is Mesa?

Stellar developers spend weeks wiring together Wallet Kits, SEP-10 Authentication, SEP-24/SEP-6 anchors, Horizon operations, path payments, event persistence, retries, and webhooks. 

**Mesa orchestrates all of those components into a single durable runtime.** 

If a network call fails, or an interactive anchor deposit takes hours to complete, Mesa persists the execution state to PostgreSQL, schedules retries with exponential backoff, suspends execution when waiting on user interaction, and resumes instantly via webhooks.

---

## ❓ Why Mesa?

Developing embedded finance apps on Stellar usually requires building custom, complex orchestration code. Here is how Mesa changes the developer experience:

| Feature / Challenge | Without Mesa (Custom Orchestration) | With Mesa (Declarative Runtime) |
| :--- | :--- | :--- |
| **SEP-10 Authentication** | Manually requesting challenge XDR, parsing, signing, and managing JWT storage/refresh. | **`Mesa.flow()` automatically signs challenges** and caches tokens on demand. |
| **Workflow State Persistence** | Designing custom DB schemas to save steps, transaction IDs, statuses, and retry state. | **Built-in Postgres store** with standard execution logging. |
| **Long-Running Suspension** | Building complex event loops or polling anchors to wait for user actions (e.g. SEP-24). | **Built-in suspension keys** that pause execution and resume instantly via webhook events. |
| **Distributed Retries** | Writing custom cron jobs or worker queues with backoff logic for failed operations. | **Built-in scheduler** retrying steps with exponential backoff. |
| **Provider Abstractions** | Manually wiring Horizon, MoneyGram, and Soroban API interfaces. | **Standardized Provider adapters** separating ledger calls from core logic. |

---

## 🎬 The 5-Step Demo Path

Watch the end-to-end corridor run execute live:

*   **Step 1: The Declarative SDK:** Developers describe the financial corridor (Anchor Deposit $\rightarrow$ Swap $\rightarrow$ Ledger Payout) using a simple, readable SDK syntax.
*   **Step 2: Start & Observe:** Run the flow. The visual developer console pops up showing the active PENDING $\rightarrow$ RUNNING execution timeline.
*   **Step 3: Interactive Suspension:** The engine halts on Step 0 (SEP-24 deposit) while waiting for the user to complete their deposit on the anchor page.
*   **Step 4: Webhook Resumption:** Simulate the anchor's transaction completion callback using a webhook payload POST to `/webhooks/resume`, resuming step execution.
*   **Step 5: On-Chain Settlement:** The engine advances to Step 1, submits the payment to the live Stellar Testnet ledger, and updates the console with the real transaction hash and ledger slot.

---

## 🚀 5-Minute Quickstart

See Mesa in action on the live Stellar Testnet in under 5 minutes.

### 1. Clone & Install Dependencies
Ensure you have [Node.js](https://nodejs.org) and [Docker](https://www.docker.com) installed.
```bash
git clone https://github.com/thesumedh/Mesa-Protocol.git
cd Mesa-Protocol
npm install
```

### 2. Start PostgreSQL Store
Mesa uses PostgreSQL to durably persist execution steps, states, and history logs.
```bash
docker compose up -d
```

### 3. Run the Live Testnet Corridor
Execute our automated end-to-end corridor test. This script will:
- Dynamically generate two Stellar keypairs (User and Merchant).
- Fund both accounts using **Friendbot** to activate them on Testnet.
- Register a live corridor flow with two steps: a real SEP-24 deposit and a real payment.
- Request and sign a **real SEP-10 challenge transaction** against `testanchor.stellar.org` using the user's private key.
- Submit the SEP-24 deposit request, receive the interactive URL, and **suspend** execution.
- Simulate an external webhook callback to **resume** the flow.
- Retrieve the sender's sequence number and submit a **real payment transaction** to the Testnet ledger, returning the transaction hash and ledger slot.

```bash
npm run build:runtime
npm run test:stellar --workspace=packages/runtime
```

### 4. Run the Live NGO Aid Distribution & Swap Payout
Verify a second, completely separate workflow involving a **Stellar Path Payment swap**:
- Generates random NGO and Beneficiary keypairs and activates them on Testnet via Friendbot.
- Executes a SEP-24 deposit flow to get funding.
- Executes an on-chain **Path Payment Strict Send** operation to convert and settle assets across a routed path on the DEX.

```bash
npm run test:payroll --workspace=packages/runtime
```

---

## 🖥️ Visual Developer Console

Mesa includes a premium developer dashboard to monitor workflow executions, debug active steps, inspect timeline event traces, and simulate external callbacks.

To start the runtime server locally:
```bash
npm run start --workspace=packages/runtime
```
Once running, navigate to:
👉 **[http://localhost:3000/dashboard](http://localhost:3000/dashboard)**

---

## 🏛️ Project Modules

Mesa divides execution concerns into clean, decoupled layers:

- **SDK:** A fluent, type-safe API for defining steps and registering flows.
- **Runtime:** Handles workflow registration and exposes API endpoints for monitoring.
- **Scheduler:** A polling scheduler that polls the Postgres store for pending executions.
- **Executor:** Manages step-level execution, logs event histories, and schedules retries.
- **Providers:** Pluggable adapters encapsulating external protocol logic (e.g. `AnchorProvider`, `StellarProvider`).

---

## 🛠️ Backlog & Future Improvements
See the [BACKLOG.md](file:///f:/Stellar/stitch_mesa_protocol/BACKLOG.md) for details on:
- Compensation & Distributed Saga API
- LISTEN / NOTIFY real-time scheduling
- Dynamic capability discovery
- Event streaming log sinks

---

## ⚖️ License
Mesa is open-source software licensed under the MIT License.
