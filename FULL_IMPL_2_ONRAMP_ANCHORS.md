# Mesa — Full Implementation Reference (Part 2 of 4)
# Topic: On-Ramp / Off-Ramp + Anchor Integration (SEP-24, SEP-6)

---

## WHY ANCHORS ARE THE CORE SCF PRIORITY

Stellar anchors are the bridge between fiat money and on-chain assets. Without them, Stellar is just token transfers. With them, you get:
- USD → USDC on-chain (on-ramp)
- USDC on-chain → USD in bank (off-ramp)
- EURC, BRLA, ARST, NGNC — any fiat stablecoin
- MoneyGram, Circle, Bitso, Anclap — real-world anchor operators

Mesa's AnchorProvider makes all of this composable. Instead of writing custom SEP-24 polling code in every app, developers write `.onRamp()` or `.offRamp()` in a flow.

---

## SEP-24 PROTOCOL OVERVIEW

SEP-24 is the Stellar Ecosystem Proposal for interactive deposit/withdrawal.

**On-Ramp (Deposit) Flow:**
```
1. App calls GET /.well-known/stellar.toml          → finds anchor's auth server
2. App calls POST /auth (SEP-10)                     → gets JWT token
3. App calls POST /transactions/deposit/interactive  → gets interactive_url + transaction_id
4. User opens interactive_url in browser             → fills KYC/payment form
5. Anchor sends webhook OR user polls GET /transaction → status changes to completed
6. Anchor sends USDC to user's Stellar address
```

**Off-Ramp (Withdrawal) Flow:**
```
1-2. Same SEP-10 auth
3. App calls POST /transactions/withdraw/interactive → gets interactive_url + transaction_id
4. User opens interactive_url                        → enters bank details
5. User sends USDC to anchor's Stellar address
6. Anchor polls for payment, sends fiat to bank
```

---

## ANCHOR PROVIDER — FULL IMPLEMENTATION

### File: packages/providers/anchor/index.ts

```typescript
import { MesaProvider, StepDefinition, ExecutionContext, StepResult, ExternalEvent } from '../../runtime/src/provider';
import * as https from 'https';
import * as http from 'http';

interface TomlConfig {
  WEB_AUTH_ENDPOINT: string;
  TRANSFER_SERVER_SEP0024: string;
  SIGNING_KEY: string;
}

interface Sep10Token {
  token: string;
  expiresAt: number;
}

export class AnchorProvider implements MesaProvider {
  readonly name = 'anchor';

  // ─── Main execute dispatcher ─────────────────────────────────────────────

  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const action = step.params.action as string;
    switch (action) {
      case 'sep24-deposit':   return this.sep24Deposit(step, context);
      case 'sep24-withdraw':  return this.sep24Withdraw(step, context);
      case 'sep6-deposit':    return this.sep6Deposit(step, context);
      case 'check-status':    return this.checkTransactionStatus(step, context);
      default:
        throw new Error(`AnchorProvider: unknown action "${action}"`);
    }
  }

  // ─── SEP-24 Interactive Deposit (On-Ramp) ────────────────────────────────

  async sep24Deposit(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const { anchorUrl, asset, amount, userAddress, userJwt } = step.params as {
      anchorUrl: string;
      asset: string;         // e.g. 'USDC'
      amount?: number;
      userAddress: string;   // user's Stellar address
      userJwt?: string;      // pre-obtained SEP-10 JWT (or provider fetches one)
    };

    // Step 1: Fetch anchor TOML config
    const toml = await this.fetchToml(anchorUrl);

    // Step 2: Get SEP-10 JWT (auth token)
    const jwt = userJwt ?? await this.sep10Auth(toml.WEB_AUTH_ENDPOINT, userAddress, toml.SIGNING_KEY);

    // Step 3: Initiate interactive deposit
    const depositRes = await this.httpPost(
      `${toml.TRANSFER_SERVER_SEP0024}/transactions/deposit/interactive`,
      { asset_code: asset, account: userAddress, amount: amount?.toString() },
      { Authorization: `Bearer ${jwt}` }
    );

    if (!depositRes.url || !depositRes.id) {
      throw new Error('AnchorProvider: deposit did not return interactive url or transaction id');
    }

    // Step 4: Suspend — user must complete the interactive flow in browser
    // The suspensionKey encodes anchor + txId so resume() can look it up
    const suspensionKey = `anchor:sep24:${anchorUrl}:${depositRes.id}`;
    return {
      outcome: 'suspended',
      suspensionKey,
      output: {
        anchorTransactionId: depositRes.id,
        interactiveUrl: depositRes.url,
        message: 'Open interactiveUrl in browser to complete deposit',
      },
    };
  }

  // ─── SEP-24 Interactive Withdrawal (Off-Ramp) ────────────────────────────

  async sep24Withdraw(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const { anchorUrl, asset, amount, userAddress, userJwt, destinationAccount } = step.params as {
      anchorUrl: string;
      asset: string;
      amount?: number;
      userAddress: string;
      userJwt?: string;
      destinationAccount?: string; // bank account info (handled by interactive form)
    };

    const toml = await this.fetchToml(anchorUrl);
    const jwt = userJwt ?? await this.sep10Auth(toml.WEB_AUTH_ENDPOINT, userAddress, toml.SIGNING_KEY);

    const withdrawRes = await this.httpPost(
      `${toml.TRANSFER_SERVER_SEP0024}/transactions/withdraw/interactive`,
      {
        asset_code: asset,
        account: userAddress,
        amount: amount?.toString(),
        ...(destinationAccount ? { dest: destinationAccount } : {}),
      },
      { Authorization: `Bearer ${jwt}` }
    );

    if (!withdrawRes.url || !withdrawRes.id) {
      throw new Error('AnchorProvider: withdraw did not return interactive url or transaction id');
    }

    const suspensionKey = `anchor:sep24:${anchorUrl}:${withdrawRes.id}`;
    return {
      outcome: 'suspended',
      suspensionKey,
      output: {
        anchorTransactionId: withdrawRes.id,
        interactiveUrl: withdrawRes.url,
        anchorWithdrawAddress: withdrawRes.how, // stellar address to send USDC to
        memo: withdrawRes.memo,
        memoType: withdrawRes.memo_type,
      },
    };
  }

  // ─── SEP-6 Non-Interactive Deposit (programmatic) ─────────────────────────

  async sep6Deposit(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const { anchorUrl, asset, amount, userAddress, type } = step.params as {
      anchorUrl: string;
      asset: string;
      amount: number;
      userAddress: string;
      type: string; // 'bank_account' | 'cash' | 'crypto'
    };

    const toml = await this.fetchToml(anchorUrl);
    const transferServer = (toml as any).TRANSFER_SERVER ?? toml.TRANSFER_SERVER_SEP0024.replace('/sep24', '');

    const depositRes = await this.httpGet(
      `${transferServer}/deposit`,
      {
        asset_code: asset,
        account: userAddress,
        amount: amount.toString(),
        type,
      }
    );

    if (depositRes.how) {
      // SEP-6 returns bank details or instructions directly
      return {
        outcome: 'completed',
        output: {
          how: depositRes.how,            // bank account to wire to
          instructions: depositRes.extra_info,
          transactionId: depositRes.id,
        },
      };
    }

    // If requires interaction, return suspended
    const suspensionKey = `anchor:sep6:${anchorUrl}:${depositRes.id}`;
    return {
      outcome: 'suspended',
      suspensionKey,
      output: { anchorTransactionId: depositRes.id },
    };
  }

  // ─── Poll transaction status ───────────────────────────────────────────────

  async checkTransactionStatus(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const { anchorUrl, transactionId, jwt } = step.params as {
      anchorUrl: string;
      transactionId: string;
      jwt: string;
    };

    const toml = await this.fetchToml(anchorUrl);
    const txRes = await this.httpGet(
      `${toml.TRANSFER_SERVER_SEP0024}/transaction`,
      { id: transactionId },
      { Authorization: `Bearer ${jwt}` }
    );

    const tx = txRes.transaction;
    if (!tx) throw new Error('AnchorProvider: no transaction in response');

    // Stellar anchor status values:
    // incomplete, pending_user_transfer_start, pending_anchor, pending_stellar,
    // pending_external, pending_trust, completed, expired, error, refunded

    if (tx.status === 'completed') {
      return {
        outcome: 'completed',
        output: {
          status: tx.status,
          stellarTransactionId: tx.stellar_transaction_id,
          amountIn: tx.amount_in,
          amountOut: tx.amount_out,
          fee: tx.amount_fee,
        },
      };
    }

    if (['error', 'expired', 'refunded'].includes(tx.status)) {
      throw new Error(`Anchor transaction ${tx.status}: ${tx.message || 'no details'}`);
    }

    // Still pending — return suspended so scheduler retries
    const suspensionKey = `anchor:poll:${anchorUrl}:${transactionId}`;
    return { outcome: 'suspended', suspensionKey, output: { status: tx.status } };
  }

  // ─── Resume from external event (anchor webhook callback) ─────────────────

  async resume(event: ExternalEvent, _context: ExecutionContext): Promise<StepResult> {
    // Anchor platforms like Anchor Platform send webhooks when status changes.
    // The payload contains the transaction status and details.
    const { status, stellar_transaction_id, amount_out, message } = event.payload as {
      status?: string;
      stellar_transaction_id?: string;
      amount_out?: string;
      message?: string;
    };

    if (status === 'completed') {
      return {
        outcome: 'completed',
        output: {
          status: 'completed',
          stellarTransactionId: stellar_transaction_id,
          amountReceived: amount_out,
        },
      };
    }

    if (status === 'error' || status === 'expired') {
      return {
        outcome: 'failed',
        error: `Anchor transaction failed with status: ${status}. ${message ?? ''}`,
      };
    }

    // Status update but not final — re-suspend and wait for next callback
    return {
      outcome: 'suspended',
      suspensionKey: event.suspensionKey,
      output: { status },
    };
  }

  // ─── SEP-10 Web Authentication ────────────────────────────────────────────

  async sep10Auth(webAuthEndpoint: string, userAddress: string, serverSigningKey: string): Promise<string> {
    // Step 1: Get challenge transaction
    const challengeRes = await this.httpGet(webAuthEndpoint, { account: userAddress });
    const challengeXdr = challengeRes.transaction;
    if (!challengeXdr) throw new Error('SEP-10: no challenge transaction returned');

    // Step 2: Sign the challenge with user's key
    // In production: user signs via FreighterSigner or SecretKeySigner
    // The calling flow must pass userJwt from their signer context
    // For now we return a placeholder — real apps pass pre-auth JWT
    // TODO: integrate MesaSigner here

    // Step 3: Submit signed transaction to get JWT
    const tokenRes = await this.httpPost(webAuthEndpoint, { transaction: challengeXdr });
    const token = tokenRes.token;
    if (!token) throw new Error('SEP-10: no token in auth response');
    return token;
  }

  // ─── Stellar TOML parser ──────────────────────────────────────────────────

  async fetchToml(anchorUrl: string): Promise<TomlConfig> {
    const tomlUrl = `${anchorUrl.replace(/\/$/, '')}/.well-known/stellar.toml`;
    const raw = await this.httpGetRaw(tomlUrl);

    // Minimal TOML parser for the fields we need
    const lines = raw.split('\n');
    const config: Record<string, string> = {};
    for (const line of lines) {
      const match = line.match(/^(\w+)\s*=\s*"(.+)"\s*$/);
      if (match) config[match[1]] = match[2];
    }

    if (!config.TRANSFER_SERVER_SEP0024 && !config.TRANSFER_SERVER) {
      throw new Error(`AnchorProvider: could not find TRANSFER_SERVER_SEP0024 in ${tomlUrl}`);
    }

    return {
      WEB_AUTH_ENDPOINT: config.WEB_AUTH_ENDPOINT ?? '',
      TRANSFER_SERVER_SEP0024: config.TRANSFER_SERVER_SEP0024 ?? config.TRANSFER_SERVER ?? '',
      SIGNING_KEY: config.SIGNING_KEY ?? '',
    };
  }

  // ─── HTTP helpers ─────────────────────────────────────────────────────────

  private httpGetRaw(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const lib = url.startsWith('https') ? https : http;
      lib.get(url, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    });
  }

  private httpGet(url: string, params: Record<string, string> = {}, headers: Record<string, string> = {}): Promise<any> {
    const query = new URLSearchParams(params).toString();
    const fullUrl = query ? `${url}?${query}` : url;
    return new Promise((resolve, reject) => {
      const lib = fullUrl.startsWith('https') ? https : http;
      const parsed = new URL(fullUrl);
      lib.get({ hostname: parsed.hostname, port: parsed.port, path: parsed.pathname + parsed.search, headers }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error(`AnchorProvider: invalid JSON from ${url}`)); }
        });
      }).on('error', reject);
    });
  }

  private httpPost(url: string, body: object, headers: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const bodyStr = JSON.stringify(body);
      const parsed = new URL(url);
      const lib = url.startsWith('https') ? https : http;
      const req = lib.request({
        hostname: parsed.hostname, port: parsed.port,
        path: parsed.pathname + parsed.search, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), ...headers },
      }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error(`AnchorProvider: invalid JSON from ${url}`)); }
        });
      });
      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    });
  }
}
```

---

## HOW TO REGISTER THE ANCHOR PROVIDER IN RUNTIME

In `packages/runtime/src/index.ts`, add:

```typescript
import { AnchorProvider } from '../providers/anchor';

// In main():
registerProvider(new AnchorProvider());
```

---

## ONRAMP FLOW EXAMPLE (FULL SDK USAGE)

```typescript
import { Mesa } from '@mesa/sdk';

Mesa.configure({ runtimeUrl: 'http://localhost:3001' });

const onRamp = Mesa.flow('usdc-onramp')
  .onRamp({
    anchorUrl: 'https://testanchor.stellar.org',
    asset: 'USDC',
    amount: 100,
    userAddress: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
  })
  // After anchor confirms USDC delivery, save to vault
  .invoke({
    contractId: 'CAI7GBF5H3ESZ7OBGANBL63B3SRA3MXK3REHYHN6LA6DUC7D3QFJIKYZ',
    method: 'deposit',
    args: { amount: '100000000' }, // 100 USDC in stroops
  })
  .webhook({ url: 'https://myapp.com/hooks/onramp-complete' })
  .build();

const { executionId } = await Mesa.execute(onRamp);
// Returns interactiveUrl in execution context for user to open
```

To add `.onRamp()` to the FlowBuilder in `packages/sdk/src/flow.ts`:
```typescript
onRamp(params: { anchorUrl: string; asset: string; amount: number; userAddress: string; userJwt?: string }): this {
  this._steps.push({ name: 'on-ramp', provider: 'anchor', params: { action: 'sep24-deposit', ...params } });
  return this;
}

offRamp(params: { anchorUrl: string; asset: string; amount: number; userAddress: string; userJwt?: string }): this {
  this._steps.push({ name: 'off-ramp', provider: 'anchor', params: { action: 'sep24-withdraw', ...params } });
  return this;
}
```

---

## ANCHOR WEBHOOK RESUME — HOW IT WORKS END-TO-END

When the anchor completes the deposit, they POST to Mesa runtime:

```bash
POST http://your-runtime:3001/webhooks/resume
Content-Type: application/json

{
  "suspensionKey": "anchor:sep24:https://testanchor.stellar.org:TXID123",
  "payload": {
    "status": "completed",
    "stellar_transaction_id": "abc123...",
    "amount_out": "99.5 USDC",
    "transaction_id": "TXID123"
  }
}
```

The runtime's `server.ts` `/webhooks/resume` endpoint:
1. Queries `steps` table for row where `status='SUSPENDED'` and `output->>'suspensionKey' = 'anchor:sep24:...'`
2. Calls `provider.resume(event, context)` on the AnchorProvider
3. AnchorProvider checks `payload.status === 'completed'` → returns `{ outcome: 'completed' }`
4. Runtime marks step COMPLETED, resets execution to PENDING
5. Scheduler picks up execution, advances to next step (e.g. vault deposit)

---

## TESTANCHOR.STELLAR.ORG — TESTING ANCHORS NOW

Use Stellar's test anchor for development:
- TOML: https://testanchor.stellar.org/.well-known/stellar.toml
- SEP-10 Auth: https://testanchor.stellar.org/auth
- SEP-24 Transfer: https://testanchor.stellar.org/sep24
- Assets: USDC (test), SRT (Stellar Reference Token)
- Does not require real KYC
- Issues test tokens to any testnet address

Test the anchor manually:
```bash
# Get TOML
curl https://testanchor.stellar.org/.well-known/stellar.toml

# Get challenge (replace with your testnet address)
curl "https://testanchor.stellar.org/auth?account=GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU"

# Start deposit
curl -X POST https://testanchor.stellar.org/sep24/transactions/deposit/interactive \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"asset_code":"SRT","account":"GBHTYH..."}'
```

See FULL_IMPL_3_PAYMENTS_DELEGATION.md for path payments and delegation kit.
