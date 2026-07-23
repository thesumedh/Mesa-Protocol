# 🔒 Security Policy & Architectural Self-Audit Checklist

> **Security guarantees, cryptographic verification models, key isolation rules, and vulnerability reporting policy for Mesa Protocol.**

---

## 1. Cryptographic Webhook Security

### A. HMAC SHA-256 Signature Verification
Every webhook endpoint (`/webhooks/resume`) validates the `X-Mesa-Signature` header computed over the raw request payload buffer using `WEBHOOK_HMAC_SECRET`:
$$\text{Signature} = \text{HMAC-SHA256}(\text{Secret}, \text{Timestamp} + "." + \text{RawBody})$$

### B. 5-Minute Timestamp Drift Limit
Webhooks with timestamp drift exceeding 300 seconds ($|T_{\text{server}} - T_{\text{header}}| > 300\text{s}$) via `X-Mesa-Timestamp` are rejected immediately to prevent delayed packet injection.

### C. Event Idempotency & Replay Attack Defense
Incoming event IDs (`X-Mesa-Event-Id`) are logged in the PostgreSQL `webhook_events` audit table. Duplicate submissions trigger `409 Conflict`.

---

## 2. Secret Key Isolation (`secretRef`)

- Private keys and secret seeds (`S...`) are **never raw strings** in flow definitions, database records, or client code.
- Workflow definitions use string tokens (e.g. `"SENDER_SECRET"`), resolved dynamically at step execution time from server `process.env`.
- Generated starter apps comment out `# MESA_API_KEY=` in `.env.example` to enforce explicit opt-in authentication.

---

## 3. Production Security Checklist

Before deploying Mesa Protocol to mainnet:

- [x] Configure `WEBHOOK_HMAC_SECRET` in environment variables.
- [x] Configure `MESA_API_KEY` for API route protection.
- [x] Store Stellar secret seeds in a secure vault (e.g. HashiCorp Vault, AWS Secrets Manager, Doppler).
- [x] Deploy PostgreSQL with TLS connections enabled (`sslmode=verify-full`).
- [x] Enforce HTTPS on external webhook URLs.

---

## 4. Reporting Vulnerabilities

If you discover a potential security issue in Mesa Protocol, please report it via email to **security@mesaprotocol.io** or open a confidential security advisory on GitHub.
