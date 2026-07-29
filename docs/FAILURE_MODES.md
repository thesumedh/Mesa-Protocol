# 🛡️ Mesa Protocol — Failure Modes & Security Resilience Proof

> **Comprehensive documentation and reproducible tests for engine failure handling, replay attack protection, HMAC security, and saga compensation rollbacks.**

---

## 1. Webhook Security & Replay Attack Defense

Mesa Protocol implements multi-layered cryptographic security for external event resumption (`POST /webhooks/resume`).

### A. HMAC SHA-256 Signature Verification (HTTP 401 Unauthorized)
Every webhook request is signed over raw request body payload buffer using `WEBHOOK_HMAC_SECRET`:
$$\text{Signature} = \text{HMAC-SHA256}(\text{Secret}, \text{Timestamp} + "." + \text{RawBody})$$

- **Tampered Payload / Bad Signature**: Rejected immediately with `HTTP 401 Unauthorized`.

```bash
# Example Tampered Request:
curl -X POST http://localhost:3001/webhooks/resume \
  -H "X-Mesa-Signature: invalid_tampered_signature" \
  -H "X-Mesa-Timestamp: 1722240000" \
  -d '{"suspensionKey":"stellar:receive:123","payload":{}}'

# Response: HTTP 401 {"error":"Invalid HMAC signature"}
```

---

### B. Timestamp Drift Tolerance (HTTP 400 Bad Request)
Requests older than 300 seconds ($|T_{\text{server}} - T_{\text{header}}| > 300\text{s}$) via `X-Mesa-Timestamp` are rejected immediately to block delayed packet replay attacks.

```bash
# Response: HTTP 400 {"error":"Timestamp drift exceeds tolerance limit (300s)"}
```

---

### C. Event Idempotency & Duplicate Replay Protection (HTTP 409 Conflict)
Incoming event IDs (`X-Mesa-Event-Id`) are logged in the database audit log. Duplicate submissions trigger `HTTP 409 Conflict`:

```json
{
  "error": "Duplicate webhook event ID: event_991823. Event already processed.",
  "code": "EVENT_IDEMPOTENCY_CONFLICT"
}
```

---

## 2. Automated Saga Compensation Rollback (`.compensate()`)

Financial workflows are non-atomic across off-chain anchors and on-chain ledgers. When a downstream step fails (e.g. invalid account, insufficient balance, network error), Mesa executes **LIFO Saga Rollbacks**.

```ts
// Flow Definition with Saga Compensation
export const flow = Mesa.flow("Remittance", "corridor-v1")
  .receive({ asset: "USDC", minAmount: 100, toAddress: "G..." })
  .payment({ to: "G...", amount: 50, asset: "XLM" }) // Downstream payment step
  .compensate({ refundAddress: "G...", refundAsset: "USDC" }) // Compensation hook
  .build();
```

### Saga Execution Sequence on Failure:
1. `Step 0` (`receive`): Deposit collected ($100\text{ USDC}$).
2. `Step 1` (`payment`): Payout fails due to invalid destination or network error.
3. **Engine Trigger**: Engine traps exception, sets execution status to `COMPENSATING`, and executes `Step 2` (`compensate`) to issue refund to `refundAddress`.
4. **Final Status**: Execution marked `COMPENSATED` with full audit log event history.

---

## 🧪 Reproducible Verification Command

Run the full multi-step execution & failure recovery suite locally:

```bash
npx ts-node packages/runtime/src/test/public-e2e-demo.ts
```
