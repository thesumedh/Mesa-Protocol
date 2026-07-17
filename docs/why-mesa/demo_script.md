# 🎬 Mesa Hackathon Video Demo Script (3 Minutes)

This script is structured to guide your video recording or live demo submission.

---

## 🕒 0:00–0:15 | Start with the Problem
**Visual:** Show a slide or a terminal highlighting the following checklist:
```text
Building a Stellar Remittance App requires:
  - SEP-10 Web Authentication
  - SEP-24 Anchor Interactive Deposit
  - Swap / Path Payment Submission
  - Retry & Crash Recovery Logic
  - Inbound & Outbound Webhook Handlers
  - State Persistence Store
```

**Spoken Script:**
> "Building an embedded finance app on Stellar usually means rewriting the same complex orchestration code over and over again—handling SEP authentication, managing state, retrying Horizon timeouts, and tracking interactive anchor deposits. Every Stellar developer has to reinvent this wheel. Mesa lets developers describe the financial workflow instead, leaving orchestration to a robust, durable runtime."

---

## 🕒 0:15–0:35 | Show the Code
**Visual:** Open VS Code. Show only one file (`stellar.demo.ts` or a clean snippet representing the declarative SDK interface):
```ts
await Mesa.flow()
  .receive({
      anchor: "DemoAnchor",
      asset: "USDC"
  })
  .convert({
      to: "XLM"
  })
  .transfer({
      destination: recipient
  })
  .execute();
```
*Tip: Keep the file concise. Do not scroll through the underlying engine implementation details.*

**Spoken Script:**
> "This is the entire corridor workflow. By using Mesa's declarative SDK, developers define the steps, assets, and destinations. The SDK handles signing challenges, fetching interactive anchor URLs, and executing swaps, without exposing low-level transaction builders."

---

## 🕒 0:35–0:50 | Start Runtime
**Visual:** Switch to your terminal window. Run the commands to start the runtime:
```bash
$ npm install
$ npm run dev
```

**Expected Console Output:**
```text
  ███╗   ███╗███████╗███████╗ █████╗ 
  ████╗ ████║██╔════╝██╔════╝██╔══██╗
  ██╔████╔██║█████╗  ███████╗███████║
  ...
  Mesa Runtime connected. Listening on http://localhost:3001
```

**Spoken Script:**
> "Starting the Mesa runtime takes seconds. Once launched, Mesa boots a local polling scheduler, connects to a durable Postgres database, and registers its pluggable Anchor and Stellar adapters."

---

## 🕒 0:50–1:20 | Execute Workflow
**Visual:** Execute the live testnet corridor client script:
```bash
$ npm run demo:stellar
```

**Expected Console Output:**
```text
✓ Workflow Created
✓ STEP 1: Authenticating (SEP-10)...
✓ STEP 2: Deposit Started (SEP-24)...
⏸ Waiting for Anchor interactive deposit (suspended)...
```

**Spoken Script:**
> "Let's run the corridor demo. The workflow starts by obtaining a SEP-10 authentication token, then triggers a SEP-24 Interactive Deposit flow. Because the interactive deposit requires manual user intervention on the anchor's web portal, Mesa automatically suspends the execution thread, saves the state to PostgreSQL, and yields control."

---

## 🕒 1:20–1:45 | The Dashboard
**Visual:** Open your browser to `http://localhost:3001/dashboard`. 
- Point out the **Currently Orchestrating** statistics row at the top.
- Click the **Runtime Architecture** widget to show the vertical blueprint modal.
- Click on the active suspended workflow in the left list.
- Show the visual stepper at the top indicating: `SEP-24 ⏳ Waiting...`
- Highlight the log details on the right: `💸 Anchor Provider: POST /transactions/web/receive`

**Spoken Script:**
> "This is where Mesa becomes memorable. Reviewers and developers can watch the execution flow live. The interactive dashboard shows the timeline of events. We can see that the workflow is currently suspended on the anchor deposit phase, waiting for a webhook callback."

---

## 🕒 1:45–2:10 | Show Failure & Durability
**Visual:** Highlight the retries and logs in the developer console. Explain how Mesa handles network timeouts and retries automatically before completing:
```text
[Simulator] Automatically triggering webhook resume callback...
[Poll] Resuming workflow with key: anchor:sep24:84a7e5...
```

**Spoken Script:**
> "Mesa is designed for durability. If the Horizon node goes down or a provider times out, Mesa will retry with exponential backoff. Once the external event completes, we post the webhook callback to the resume endpoint. Mesa recovers the state from the Postgres database and instantly resumes the flow right where it left off."

---

## 🕒 2:10–2:30 | Final Transaction
**Visual:** Show the terminal concluding with the success code and transaction receipt. Open StellarExpert Testnet to show the transaction with the final hash.
**Spoken Script:**
> "Mesa resumes, executes the path payment, and completes the swap on-chain. Here is the verified transaction on the Stellar Testnet ledger. Reviewers know the settlement is 100% real and verified."

---

## 🕒 2:30–2:50 | Architecture Blueprint
**Visual:** Click the "Show Blueprint" button in the dashboard or show the architecture slide:
```text
      Application
           ↓
       Mesa SDK
           ↓
     Mesa Runtime
           ↓
       Wallet SDK
           ↓
        Anchor
           ↓
    Stellar Network
```

**Spoken Script:**
> "Mesa doesn't replace the Stellar SDK or Wallet SDK. It acts as an orchestration layer on top of them, wrapping complex procedures into clean, durable execution blocks."

---

## 🕒 2:50–3:00 | Close
**Visual:** Display the logo and the tagline:
```text
Mesa Runtime
Embedded Finance Runtime for Stellar
```

**Spoken Script:**
> "Developers describe financial workflows. Mesa handles orchestration, persistence, retries, and execution. Thank you."
