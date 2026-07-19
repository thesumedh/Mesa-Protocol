import * as dotenv from 'dotenv';
dotenv.config();

import { Mesa } from '@mesaprotocol/sdk';

// 1. Configure SDK to point to the local Mesa Runtime
Mesa.configure({ runtimeUrl: 'http://localhost:3001' });

const SENDER_PUBLIC  = 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV';
const RECEIVER_PUBLIC = 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P';

async function main() {
  console.log('==================================================');
  console.log('🚀 MESA HELLO WORLD — STELLAR TESTNET');
  console.log('==================================================\n');
  console.log(`Sender:   https://stellar.expert/explorer/testnet/account/${SENDER_PUBLIC}`);
  console.log(`Receiver: https://stellar.expert/explorer/testnet/account/${RECEIVER_PUBLIC}`);
  console.log('');

  // 2. Build a real 3-step cross-border payment workflow
  //    Step 1: Receive payment confirmation (mock — represents incoming deposit)
  //    Step 2: Wait 5 seconds (represents processing / compliance check)
  //    Step 3: Send real XLM on Stellar testnet
  
  const flow = Mesa.flow('hello-world-testnet-flow')
    .receive({
      asset: 'XLM',
      minAmount: 25,
      toAddress: SENDER_PUBLIC,
    })
    .delay({ seconds: 5 })

    .payment({
      horizonUrl:   'https://horizon-testnet.stellar.org',
      senderSecretRef: 'SENDER_SECRET',   // resolved from environment — never stored in DB
      to:           RECEIVER_PUBLIC,
      asset:        'XLM',
      amount:       25,
    })
    .build();

  console.log('Submitting workflow to Mesa Runtime...');
  const { executionId } = await Mesa.execute(flow);

  console.log(`✔ Flow registered and execution started!`);
  console.log(`  Execution ID: ${executionId}`);
  console.log(`  Dashboard:    http://localhost:3001/dashboard`);
  console.log('');
  console.log('Mesa is now orchestrating the workflow:');
  console.log('  Step 1 — receive-deposit    → confirms incoming XLM');
  console.log('  Step 2 — compliance-delay   → 5s processing window');
  console.log('  Step 3 — stellar-payment    → real testnet transaction');
  console.log('');
  console.log('Watch the transaction on Stellar testnet:');
  console.log(`  https://stellar.expert/explorer/testnet/account/${RECEIVER_PUBLIC}`);
}

main().catch(console.error);
