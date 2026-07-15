# Mesa — SCF Reviewer Q&A (Preparation Document)

These are the four questions SCF reviewers will almost certainly ask.
The answers below are direct and honest. Do not over-engineer these answers.

---

## Q1: "Why wouldn't SDF build this?"

**Answer:**
SDF builds primitives. Their job is Wallet Kit (wallet connectivity), Anchor Platform (anchor infrastructure), Horizon (ledger access), and Soroban (smart contracts). They have said explicitly they do not want to build application-layer tooling.

Mesa is the orchestration layer between those primitives. It does not compete with any SDF product — it wraps them. Every Mesa flow uses Horizon for monitoring, SEP-24 for anchor interactions, and optionally Soroban for contracts. Mesa makes SDF's existing investments more valuable, not redundant.

The analogy: Express.js and Node.js. Node (SDF) provides the HTTP runtime. Express (Mesa) gives developers a composable way to build on top of it. Node never built Express.

---

## Q2: "Who will actually use this?"

**Answer (be specific — do not say "developers"):**

The customer is a developer at a fintech startup building on Stellar that needs on-ramp, cross-border payment, or off-ramp capability and does not want to maintain durable workflow infrastructure themselves.

Three specific archetypes:

**1. Remittance product** (e.g. building a Stellar-based corridor: USD → USDC → KES)
- Problem: The anchor flow is async. Server restarts lose state. Retry logic is manual.
- Mesa gives them: `.onRamp().pathPayment().offRamp()` with automatic suspension + resumption.

**2. Savings app** (e.g. Chama / ROSCA group savings in East Africa)
- Problem: Recurring auto-deposits need coordination between wallet, anchor, and vault contract.
- Mesa gives them: A scheduled flow that deposits on a cadence, retries on failure, notifies the app.

**3. Payroll provider** (e.g. USDC payroll disbursements to contractors in 20 countries)
- Problem: Each disbursement is a multi-step process: convert, transfer, notify, handle failures.
- Mesa gives them: One flow definition per payment type, reused across all disbursements, with full audit logs.

---

## Q3: "Why not just use Temporal?"

**Answer:**
Temporal is a general-purpose workflow engine. It has no concept of:
- SEP-24 (the Stellar standard for anchor interactive deposits)
- Path payments (Stellar's cross-asset DEX routing)
- Soroban transaction construction, simulation, and signing
- Stellar's ledger close cycle (5-second confirmation windows)
- Anchor webhook formats and suspension keys

To use Temporal for a Stellar workflow, a developer must:
1. Learn Temporal's programming model (significant learning curve)
2. Write all Stellar-specific activity implementations from scratch
3. Map SEP-24's async callback model onto Temporal's activity heartbeat model
4. Handle Stellar-specific error types themselves

With Mesa, SEP-24 is a one-liner: `.onRamp({ anchor, asset, amount })`. The `AnchorProvider` handles SEP-10 auth, interactive transaction initiation, webhook suspension, and callback resumption natively.

Mesa is to Temporal what Next.js is to Express: a framework that makes one specific domain dramatically easier, built on top of proven infrastructure patterns.

---

## Q4: "Can I build this myself?"

**Answer (honest):**
Yes. A senior Stellar developer could build equivalent functionality in 4–8 weeks.

That is the point.

Every fintech team building on Stellar is currently building this themselves. Each team writes slightly different retry logic, slightly different SEP-24 polling, slightly different state management. Each team hits the same bugs:
- Server restart loses the anchor transaction ID
- Retry loop doesn't handle Horizon rate limiting
- Webhook arrives after process restart and flow is lost

Mesa exists so this work happens once, correctly, in open source — and every team on Stellar gets it for free.

The comparison to make: nobody asks "can I build my own database?" The answer is yes. The better question is whether building it is the highest-value use of the team's time.

---

## One Additional Question (Likely)

## Q5: "What is your traction / who is using it?"

**Honest answer for now:**
Mesa is at the infrastructure-building stage. We have:
- A working runtime (scheduler, executor, retry, Postgres store)
- A working SDK with the full API surface
- Four native Stellar providers implemented
- MesaVault deployed and verified on Testnet
- `docker compose up` deployment working end-to-end

Current traction is developer-level: the tooling works and is reproducible. We are seeking SCF funding to build the dashboard and run the first live pilot integration with a Stellar-based fintech team.

**What to say if pressed for user numbers:** 
Don't invent numbers. Say: "We are pre-launch. The tooling is complete. We are actively seeking the first integration partners and have interest from [specific contacts if you have any]." Honesty about stage is more credible than inflated metrics.

---

## The Positioning Sentence

Say this at the start of every conversation with a reviewer:

> **"Mesa is an embedded finance runtime for Stellar. Developers write `.onRamp().pathPayment().offRamp()` and we handle durable execution, SEP-24 async flows, retries, and observability. Self-hosted, open source, no custody."**

That is 30 words. It answers: what it is, what it does, how it works, and why to trust it.
