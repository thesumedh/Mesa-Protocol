# `@mesaprotocol/sdk`

> **Lightweight Fluent TypeScript SDK for Mesa Protocol.**

[![npm version](https://img.shields.io/npm/v/@mesaprotocol/sdk?color=00dbe9&label=%40mesaprotocol%2Fsdk)](https://www.npmjs.com/package/@mesaprotocol/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](https://opensource.org/licenses/MIT)

## 📦 Installation

```bash
npm install @mesaprotocol/sdk
```

## 📖 Quickstart

```ts
import { Mesa } from '@mesaprotocol/sdk';

Mesa.configure({ runtimeUrl: 'http://localhost:3001' });

export const flow = Mesa.flow('Cross-Border Remittance', 'remittance-corridor')
  .receive({ asset: 'USDC', minAmount: 100, toAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV' })
  .delay({ seconds: 5 })
  .payment({ amount: 95, to: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P', senderSecretRef: 'SENDER_SECRET' })
  .compensate({ provider: 'stellar', refundAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV', refundAsset: 'USDC' })
  .build();

await Mesa.register(flow);
const { executionId } = await Mesa.execute(flow);
```

## 📄 License

[MIT](./LICENSE)
