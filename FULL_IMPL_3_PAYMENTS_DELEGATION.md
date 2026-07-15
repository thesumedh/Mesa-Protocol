# Mesa — Full Implementation Reference (Part 3 of 4)
# Topic: Payments (Path Payments, Monitoring) + Delegation Kit

---

## STELLAR PAYMENTS — WHAT WE NEED TO BUILD

The StellarRpcProvider handles all native Stellar payment operations:
- **receive**: Monitor a Stellar address for an incoming payment (suspends until found)
- **transfer**: Submit a direct asset transfer (XLM → XLM, USDC → USDC)
- **pathPayment**: Submit a cross-asset path payment (XLM → USDC, any → any)
- **confirm**: Verify a known txHash reached ledger close

---

## STELLAR RPC PROVIDER — FULL IMPLEMENTATION

### File: packages/providers/soroban/stellar-rpc.ts

```typescript
import { MesaProvider, StepDefinition, ExecutionContext, StepResult, ExternalEvent } from '../../runtime/src/provider';
import {
  Horizon,
  Asset,
  Keypair,
  TransactionBuilder,
  Operation,
  Networks,
  BASE_FEE,
  Memo,
} from '@stellar/stellar-sdk';

export interface StellarRpcConfig {
  horizonUrl: string;         // e.g. 'https://horizon-testnet.stellar.org'
  rpcUrl: string;             // e.g. 'https://soroban-testnet.stellar.org'
  networkPassphrase: string;  // e.g. Networks.TESTNET
  signerSecret?: string;      // Secret key for signing (server-side flows)
}

export class StellarRpcProvider implements MesaProvider {
  readonly name = 'stellar';

  private horizon: Horizon.Server;
  private networkPassphrase: string;
  private signerKeypair?: Keypair;
  private horizonUrl: string;

  constructor(config: StellarRpcConfig) {
    this.horizon = new Horizon.Server(config.horizonUrl);
    this.horizonUrl = config.horizonUrl;
    this.networkPassphrase = config.networkPassphrase;
    if (config.signerSecret) {
      this.signerKeypair = Keypair.fromSecret(config.signerSecret);
    }
  }

  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const action = step.params.action as string;
    switch (action) {
      case 'receive':      return this.awaitPayment(step, context);
      case 'confirm':      return this.confirmTransaction(step, context);
      case 'transfer':     return this.submitTransfer(step, context);
      case 'pathPayment':  return this.submitPathPayment(step, context);
      case 'balance':      return this.getBalance(step, context);
      default:
        throw new Error(`StellarRpcProvider: unknown action "${action}"`);
    }
  }

  // ─── Await Payment ─────────────────────────────────────────────────────────
  // Polls Horizon for recent payments to a given address.
  // Returns suspended if payment not yet seen.
  // Returns completed if payment found and amount >= minAmount.

  private async awaitPayment(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const { toAddress, asset, minAmount, cursor } = step.params as {
      toAddress: string;
      asset: string;        // 'XLM' or 'CODE:ISSUER'
      minAmount: number;
      cursor?: string;      // Horizon cursor for pagination
    };

    const suspensionKey = `stellar:receive:${toAddress}:${context.executionId}`;

    try {
      // Query Horizon for recent payments to this address
      let paymentsBuilder = this.horizon
        .payments()
        .forAccount(toAddress)
        .order('desc')
        .limit(20);

      if (cursor) {
        paymentsBuilder = paymentsBuilder.cursor(cursor);
      }

      const payments = await paymentsBuilder.call();
      const records = payments.records;

      for (const record of records) {
        // Check if it's a payment to our address
        if (record.type !== 'payment' && record.type !== 'path_payment_strict_receive' && record.type !== 'path_payment_strict_send') continue;

        const payment = record as any;
        const isXlm = asset === 'XLM';

        const assetMatches = isXlm
          ? payment.asset_type === 'native'
          : payment.asset_code === asset.split(':')[0] && payment.asset_issuer === asset.split(':')[1];

        if (!assetMatches) continue;
        if (payment.to !== toAddress) continue;

        const amount = parseFloat(payment.amount);
        if (amount >= minAmount) {
          return {
            outcome: 'completed',
            output: {
              receivedAmount: amount,
              receivedAsset: asset,
              txHash: payment.transaction_hash,
              from: payment.from,
              ledger: payment.paging_token,
            },
          };
        }
      }
    } catch (err) {
      // Account may not exist yet (not funded) — suspend and retry
      console.warn(`StellarRpcProvider: could not poll payments for ${toAddress}:`, (err as Error).message);
    }

    // Not found yet — suspend
    return { outcome: 'suspended', suspensionKey };
  }

  // Resume is called when external event triggers (e.g. Horizon webhook or manual resume)
  async resume(event: ExternalEvent, _context: ExecutionContext): Promise<StepResult> {
    const { txHash, amount, asset, from } = event.payload as {
      txHash?: string;
      amount?: number;
      asset?: string;
      from?: string;
    };
    return {
      outcome: 'completed',
      output: { txHash, receivedAmount: amount, receivedAsset: asset, from },
    };
  }

  // ─── Confirm Transaction ────────────────────────────────────────────────────

  private async confirmTransaction(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    // Get txHash either from params or from shared context (output of previous step)
    const txHash = (step.params.txHash as string) ?? (context.shared['txHash'] as string);
    if (!txHash) throw new Error('StellarRpcProvider confirm: txHash not found in params or shared context');

    try {
      const tx = await this.horizon.transactions().transaction(txHash).call();
      if (tx.successful) {
        return {
          outcome: 'completed',
          output: { confirmed: true, txHash, ledger: tx.ledger_attr },
        };
      } else {
        throw new Error(`Transaction ${txHash} failed on-chain`);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Not yet indexed — suspend and retry
        return {
          outcome: 'suspended',
          suspensionKey: `stellar:confirm:${txHash}`,
          output: { txHash, confirming: true },
        };
      }
      throw err;
    }
  }

  // ─── Direct Transfer ────────────────────────────────────────────────────────

  private async submitTransfer(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    if (!this.signerKeypair) throw new Error('StellarRpcProvider: signerSecret required for transfer');

    const { to, asset, amount } = step.params as {
      to: string;
      asset: string;   // 'XLM' or 'CODE:ISSUER'
      amount: number;
    };

    const fromAddress = this.signerKeypair.publicKey();
    const account = await this.horizon.loadAccount(fromAddress);

    const assetObj = asset === 'XLM'
      ? Asset.native()
      : new Asset(asset.split(':')[0], asset.split(':')[1]);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.payment({
        destination: to,
        asset: assetObj,
        amount: amount.toFixed(7),
      }))
      .setTimeout(30)
      .build();

    tx.sign(this.signerKeypair);

    const result = await this.horizon.submitTransaction(tx);
    if (!result.successful) {
      throw new Error(`Transfer failed: ${JSON.stringify(result.extras?.result_codes)}`);
    }

    return {
      outcome: 'completed',
      output: {
        txHash: result.hash,
        to,
        asset,
        amount,
        ledger: result.ledger,
      },
    };
  }

  // ─── Path Payment (Cross-Asset) ────────────────────────────────────────────
  // Converts one asset to another using Stellar's built-in DEX path finding.
  // Example: user has XLM, recipient wants USDC → DEX finds cheapest path.

  private async submitPathPayment(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    if (!this.signerKeypair) throw new Error('StellarRpcProvider: signerSecret required for pathPayment');

    const { to, sendAsset, sendAmount, destAsset, destMin } = step.params as {
      to: string;
      sendAsset: string;    // 'XLM' or 'CODE:ISSUER'
      sendAmount: number;   // max amount to send
      destAsset: string;    // 'USDC:GABC...' — what recipient gets
      destMin: number;      // minimum amount recipient must receive (slippage protection)
    };

    const fromAddress = this.signerKeypair.publicKey();
    const account = await this.horizon.loadAccount(fromAddress);

    const sendAssetObj = sendAsset === 'XLM' ? Asset.native() : new Asset(sendAsset.split(':')[0], sendAsset.split(':')[1]);
    const destAssetObj = destAsset === 'XLM' ? Asset.native() : new Asset(destAsset.split(':')[0], destAsset.split(':')[1]);

    // Find best path using Stellar's strict-send path payment
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.pathPaymentStrictSend({
        sendAsset: sendAssetObj,
        sendAmount: sendAmount.toFixed(7),
        destination: to,
        destAsset: destAssetObj,
        destMin: destMin.toFixed(7),
        path: [], // Stellar DEX finds path automatically when empty
      }))
      .setTimeout(30)
      .build();

    tx.sign(this.signerKeypair);

    const result = await this.horizon.submitTransaction(tx);
    if (!result.successful) {
      throw new Error(`Path payment failed: ${JSON.stringify(result.extras?.result_codes)}`);
    }

    return {
      outcome: 'completed',
      output: {
        txHash: result.hash,
        to,
        sentAsset: sendAsset,
        sentAmount: sendAmount,
        receivedAsset: destAsset,
        ledger: result.ledger,
      },
    };
  }

  // ─── Get Balance ───────────────────────────────────────────────────────────

  private async getBalance(step: StepDefinition, _context: ExecutionContext): Promise<StepResult> {
    const { address, asset } = step.params as { address: string; asset: string };
    const account = await this.horizon.loadAccount(address);

    const isXlm = asset === 'XLM';
    let balance = '0';

    for (const b of account.balances) {
      if (isXlm && b.asset_type === 'native') {
        balance = b.balance;
        break;
      }
      if (!isXlm && b.asset_type !== 'native') {
        const b2 = b as any;
        if (b2.asset_code === asset.split(':')[0] && b2.asset_issuer === asset.split(':')[1]) {
          balance = b2.balance;
          break;
        }
      }
    }

    return {
      outcome: 'completed',
      output: { address, asset, balance },
    };
  }
}
```

---

## FULL CROSS-BORDER PAYMENT FLOW (SDK + PROVIDERS)

```typescript
// Scenario: User in Kenya sends XLM → Kenyan receives USDC in bank

const flow = Mesa.flow('kenya-remittance')
  // 1. Wait for sender to pay XLM to our escrow
  .receive({ asset: 'XLM', minAmount: 50, toAddress: ESCROW_ADDRESS })
  // 2. Confirm 2 ledger closes
  .confirm({ ledgerCloses: 2 })
  // 3. Convert XLM → USDC via path payment through DEX
  .pathPayment({
    sendAsset: 'XLM',
    sendAmount: 50,
    destAsset: `USDC:${USDC_ISSUER}`,
    destMin: 9,   // at least 9 USDC (slippage tolerance)
    to: RECIPIENT_ADDRESS,
  })
  // 4. Off-ramp USDC → fiat via anchor
  .offRamp({
    anchorUrl: 'https://testanchor.stellar.org',
    asset: 'USDC',
    userAddress: RECIPIENT_ADDRESS,
  })
  // 5. Notify sender
  .webhook({ url: 'https://myapp.com/webhooks/remittance' })
  .build();
```

Add `.pathPayment()` to FlowBuilder:
```typescript
pathPayment(params: { sendAsset: string; sendAmount: number; destAsset: string; destMin: number; to: string }): this {
  this._steps.push({ name: 'path-payment', provider: 'stellar', params: { action: 'pathPayment', ...params } });
  return this;
}
```

---

## DELEGATION KIT

### What It Is

Delegation lets one Stellar address authorize another to execute operations on its behalf without sharing the private key.

Use cases:
- A user authorizes Mesa's runtime signer to deposit into their vault automatically
- A business authorizes an employee to sign payments up to a limit
- A smart wallet with social recovery where guardians can approve transactions

### How It Works on Stellar/Soroban

Stellar has native multi-signature. Soroban has custom authorization policies. Mesa's Delegation Kit combines both.

**Option A: Stellar Native Multi-sig**
Add a signer to a Stellar account with limited weight:
```typescript
// Add mesa-runtime's public key as a signer on user's account
Operation.setOptions({
  signer: {
    ed25519PublicKey: MESA_SIGNER_PUBLIC_KEY,
    weight: 1, // can sign transactions that meet threshold
  },
  medThreshold: 1, // medium threshold (payments)
});
```

**Option B: Soroban Authorized Invocation**
Soroban contracts can call `require_auth()` and `require_auth_for_args()`. A delegate can be granted permission to call specific contract methods.

### File: packages/providers/delegation/index.ts

```typescript
import { MesaProvider, StepDefinition, ExecutionContext, StepResult } from '../../runtime/src/provider';
import { Horizon, Keypair, TransactionBuilder, Operation, BASE_FEE } from '@stellar/stellar-sdk';

export class DelegationProvider implements MesaProvider {
  readonly name = 'delegation';

  private horizon: Horizon.Server;
  private networkPassphrase: string;
  private signerKeypair: Keypair;

  constructor(config: { horizonUrl: string; networkPassphrase: string; signerSecret: string }) {
    this.horizon = new Horizon.Server(config.horizonUrl);
    this.networkPassphrase = config.networkPassphrase;
    this.signerKeypair = Keypair.fromSecret(config.signerSecret);
  }

  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const action = step.params.action as string;
    switch (action) {
      case 'grant':   return this.grantDelegation(step, context);
      case 'revoke':  return this.revokeDelegation(step, context);
      case 'check':   return this.checkDelegation(step, context);
      default:
        throw new Error(`DelegationProvider: unknown action "${action}"`);
    }
  }

  // Grant: add Mesa's signer key to user's Stellar account
  private async grantDelegation(step: StepDefinition, _context: ExecutionContext): Promise<StepResult> {
    const { userAddress, delegateTo, weight, thresholdType, userSecret } = step.params as {
      userAddress: string;
      delegateTo: string;  // address to delegate to (e.g. Mesa runtime key)
      weight: number;      // 1 = can co-sign, 10 = full control
      thresholdType: 'low' | 'med' | 'high';
      userSecret: string;  // user must authorize this (their key)
    };

    const userKeypair = Keypair.fromSecret(userSecret);
    const account = await this.horizon.loadAccount(userAddress);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.setOptions({
        signer: { ed25519PublicKey: delegateTo, weight },
        ...(thresholdType === 'low'  ? { lowThreshold: weight }  : {}),
        ...(thresholdType === 'med'  ? { medThreshold: weight }  : {}),
        ...(thresholdType === 'high' ? { highThreshold: weight } : {}),
      }))
      .setTimeout(30)
      .build();

    tx.sign(userKeypair);
    const result = await this.horizon.submitTransaction(tx);

    return {
      outcome: 'completed',
      output: {
        delegationGranted: true,
        delegateTo,
        weight,
        txHash: result.hash,
      },
    };
  }

  // Revoke: set delegate's weight to 0 (removes them)
  private async revokeDelegation(step: StepDefinition, _context: ExecutionContext): Promise<StepResult> {
    const { userAddress, revokeFrom, userSecret } = step.params as {
      userAddress: string;
      revokeFrom: string;
      userSecret: string;
    };

    const userKeypair = Keypair.fromSecret(userSecret);
    const account = await this.horizon.loadAccount(userAddress);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.setOptions({
        signer: { ed25519PublicKey: revokeFrom, weight: 0 }, // weight 0 = removed
      }))
      .setTimeout(30)
      .build();

    tx.sign(userKeypair);
    const result = await this.horizon.submitTransaction(tx);

    return {
      outcome: 'completed',
      output: { delegationRevoked: true, revokedFrom: revokeFrom, txHash: result.hash },
    };
  }

  // Check: verify if a given address has delegate rights on an account
  private async checkDelegation(step: StepDefinition, _context: ExecutionContext): Promise<StepResult> {
    const { userAddress, delegateAddress } = step.params as {
      userAddress: string;
      delegateAddress: string;
    };

    const account = await this.horizon.loadAccount(userAddress);
    const signer = account.signers.find((s: any) => s.key === delegateAddress);

    return {
      outcome: 'completed',
      output: {
        isDelegated: !!signer,
        weight: signer?.weight ?? 0,
        thresholds: account.thresholds,
      },
    };
  }
}
```

### Delegation Flow Example

```typescript
// Scenario: Grant Mesa runtime permission to auto-deposit on user's behalf

const delegationFlow = Mesa.flow('setup-auto-deposit-delegation')
  // Grant Mesa's server key as a signer on user's account
  .custom('delegation', {
    action: 'grant',
    userAddress: USER_ADDRESS,
    delegateTo: MESA_RUNTIME_PUBLIC_KEY,
    weight: 1,
    thresholdType: 'med',
    userSecret: USER_SECRET, // only for server-side automation; use Freighter for browser
  })
  // Confirm delegation was set
  .custom('delegation', {
    action: 'check',
    userAddress: USER_ADDRESS,
    delegateAddress: MESA_RUNTIME_PUBLIC_KEY,
  })
  .webhook({ url: 'https://myapp.com/hooks/delegation-setup' })
  .build();
```

Add `.custom()` to FlowBuilder:
```typescript
custom(providerName: string, params: Record<string, unknown>): this {
  this._steps.push({ name: `custom-${providerName}`, provider: providerName, params });
  return this;
}
```

---

## SOROBAN PROVIDER (contract invocations)

### File: packages/providers/soroban/index.ts

```typescript
import { MesaProvider, StepDefinition, ExecutionContext, StepResult } from '../../runtime/src/provider';
import {
  SorobanRpc, TransactionBuilder, Keypair, Contract,
  Networks, BASE_FEE, scValToNative, nativeToScVal, xdr
} from '@stellar/stellar-sdk';

export class SorobanProvider implements MesaProvider {
  readonly name = 'soroban';

  private rpc: SorobanRpc.Server;
  private networkPassphrase: string;
  private signerKeypair?: Keypair;

  constructor(config: { rpcUrl: string; networkPassphrase: string; signerSecret?: string }) {
    this.rpc = new SorobanRpc.Server(config.rpcUrl);
    this.networkPassphrase = config.networkPassphrase;
    if (config.signerSecret) this.signerKeypair = Keypair.fromSecret(config.signerSecret);
  }

  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const { contractId, method, args } = step.params as {
      contractId: string;
      method: string;
      args?: Record<string, unknown>;
    };

    if (!this.signerKeypair) throw new Error('SorobanProvider: signerSecret required');

    const contract = new Contract(contractId);
    const account = await this.rpc.getAccount(this.signerKeypair.publicKey());

    // Build args — convert JS values to ScVal
    const scArgs = args ? Object.values(args).map(v => nativeToScVal(v)) : [];

    let tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...scArgs))
      .setTimeout(30)
      .build();

    // Simulate to get footprint + fee
    const simRes = await this.rpc.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simRes)) {
      throw new Error(`Soroban simulation failed: ${simRes.error}`);
    }

    // Assemble and sign
    tx = SorobanRpc.assembleTransaction(tx, simRes).build();
    tx.sign(this.signerKeypair);

    // Submit
    const submitRes = await this.rpc.sendTransaction(tx);
    if (submitRes.status === 'ERROR') {
      throw new Error(`Soroban submit failed: ${submitRes.errorResult?.toXDR('base64')}`);
    }

    // Poll for confirmation
    let pollRes = await this.rpc.getTransaction(submitRes.hash);
    let attempts = 0;
    while (pollRes.status === 'NOT_FOUND' && attempts < 20) {
      await new Promise(r => setTimeout(r, 1000));
      pollRes = await this.rpc.getTransaction(submitRes.hash);
      attempts++;
    }

    if (pollRes.status !== 'SUCCESS') {
      throw new Error(`Soroban transaction did not confirm: ${pollRes.status}`);
    }

    const returnVal = pollRes.returnValue ? scValToNative(pollRes.returnValue) : null;

    return {
      outcome: 'completed',
      output: {
        txHash: submitRes.hash,
        contractId,
        method,
        returnValue: returnVal,
      },
    };
  }
}
```

---

## REGISTERING ALL PROVIDERS IN RUNTIME

Full `packages/runtime/src/index.ts`:

```typescript
import { registerProvider } from './provider';
import { WebhookProvider } from '../providers/webhook';
import { DelayProvider } from '../providers/delay';
import { AnchorProvider } from '../providers/anchor';
import { StellarRpcProvider } from '../providers/soroban/stellar-rpc';
import { SorobanProvider } from '../providers/soroban';
import { DelegationProvider } from '../providers/delegation';
import { Networks } from '@stellar/stellar-sdk';

// In main():
registerProvider(new WebhookProvider());
registerProvider(new DelayProvider());
registerProvider(new AnchorProvider());
registerProvider(new StellarRpcProvider({
  horizonUrl: process.env.HORIZON_URL ?? 'https://horizon-testnet.stellar.org',
  rpcUrl: process.env.SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org',
  networkPassphrase: process.env.NETWORK_PASSPHRASE ?? Networks.TESTNET,
  signerSecret: process.env.MESA_SIGNER_SECRET,
}));
registerProvider(new SorobanProvider({
  rpcUrl: process.env.SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org',
  networkPassphrase: process.env.NETWORK_PASSPHRASE ?? Networks.TESTNET,
  signerSecret: process.env.MESA_SIGNER_SECRET,
}));
registerProvider(new DelegationProvider({
  horizonUrl: process.env.HORIZON_URL ?? 'https://horizon-testnet.stellar.org',
  networkPassphrase: process.env.NETWORK_PASSPHRASE ?? Networks.TESTNET,
  signerSecret: process.env.MESA_SIGNER_SECRET ?? '',
}));
```

See FULL_IMPL_4_TRACTION_NEXTSTEPS.md for platform traction strategy and exactly what to do next.
