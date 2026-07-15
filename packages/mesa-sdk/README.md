# @mesa/sdk

The official TypeScript SDK for deploying, managing, and interacting with **Mesa Protocol** savings circles on Stellar/Soroban.

---

## 1. Installation

```bash
npm install @mesa/sdk
```

---

## 2. Quickstarts

### Quickstart 1: Deploy a Savings Circle in 5 Lines

Start saving on-chain in seconds:

```javascript
import { MesaSDK } from '@mesa/sdk';

const sdk = new MesaSDK({ network: 'testnet' });
const circle = await sdk.factory.createChama({ name: 'Lagos Tech 2026', members: 10 });

// Done. Your circle is live on Stellar.
```

### Quickstart 2: Build a Cross-Border Payment App (Path Payments)

Instead of manually checking paths and building complex multi-hop transactions, make atomic path-payment contributions in just a few lines:

```javascript
// Pay contribution in EURC (or XLM) and settle automatically in USDC
await sdk.circle.contributeWithPathPayment(
  "CBFXB...", // Savings Circle contract ID
  "GBBD4...", // Contributor wallet address
  "EURC",     // Asset you pay with
  "GB3Q6...", // Issuer address for EURC
  "10.50",    // Max EURC to spend (limit default protection)
  "USDC",     // Dest asset (circle token)
  "GBBD4...", // Issuer address for USDC
  "10.00",    // Contribution target (10 USDC)
  [{ code: "XLM", issuer: "native" }] // Path hops
);
```

---

## 3. API Reference

### `FactoryWrapper`
Used to deploy, list, and monitor savings circles registered on-chain.

| Method | Arguments | Returns | Description |
|--------|-----------|---------|-------------|
| `listChamas` | `limit: number, offset: number` | `Promise<ChamaSummary[]>` | Fetches a paginated list of registered circle summaries. |
| `getChamasSummary` | — | `Promise<ChamaSummary[]>` | Fetches all active summaries in the registry. |
| `getChama` | `chamaId: number` | `Promise<string>` | Retrieves the contract address of a child circle by its ID. |
| `createChama` | `params: CreateChamaParams, signer: WalletSigner` | `Promise<string>` | Deploys and initializes a new savings circle instance. |
| `syncChama` | `chamaId: number, signer: WalletSigner` | `Promise<void>` | Syncs a child circle's state back to the factory cache. |

---

### `CircleWrapper`
Represents an active savings circle instance. Enables transactions and state checks.

| Method | Arguments | Returns | Description |
|--------|-----------|---------|-------------|
| `getState` | — | `Promise<CircleState>` | Reads the complete on-chain state of the circle. |
| `join` | `sponsor: string \| null, signer: WalletSigner` | `Promise<void>` | Joins membership, locking the required deposit + first contribution. |
| `activate` | `signer: WalletSigner` | `Promise<void>` | Locks membership, creates rotation order, and starts round 1. |
| `contribute` | `signer: WalletSigner` | `Promise<void>` | Pays contribution for the current active round. |
| `distribute` | `signer: WalletSigner` | `Promise<string>` | Pays out the round pot to the current winner and increments the round. |
| `flagMissed` | `member: string, round: number, signer: WalletSigner` | `Promise<void>` | Penalizes/ejects a member for missing a contribution deadline. |
| `flagEmergency` | `signer: WalletSigner` | `Promise<void>` | Registers an emergency flag. Circles pause at >50% votes. |
| `withdrawPrincipal` | `signer: WalletSigner` | `Promise<bigint>` | Refunds locked security deposits if the circle is paused. |

---

## 4. Key TypeScript Types

```typescript
export interface CircleState {
  creator: string;
  name: string;
  contribution_amount: string;
  max_members: number;
  duration: bigint;
  token: string;
  members: string[];
  rotation_order: string[];
  current_round: number;
  deadline: bigint;
  status: number; // 0 = Signup, 1 = Active, 2 = Paused, 3 = Completed
}

export interface ChamaSummary {
  id: number;
  name: string;
  contract_id: string;
  contribution_amount: string;
  max_members: number;
  member_count: number;
  status: number;
  token: string;
}
```
