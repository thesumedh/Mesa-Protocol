/**
 * Mesa MVP Demo: Cross-Border Payment Workflow
 *
 * This demonstrates a complete Mesa flow:
 * 1. Wait to receive XLM at an escrow address
 * 2. Confirm ledger close
 * 3. Transfer USDC to destination
 * 4. Notify application via webhook
 *
 * Run this after starting the Mesa Runtime:
 *   docker compose up
 *
 * Then:
 *   npx ts-node examples/cross-border-payment/index.ts
 */

import { Mesa } from '@mesa/sdk';

const ESCROW_ADDRESS = 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU';
const DESTINATION   = 'GCIE7JJJVTCX4YGSME3FXZQB3GY4MY7PJNW6VXMHPYUDPHBDQN2IYE';
const WEBHOOK_URL   = 'https://myapp.example.com/webhooks/mesa';

async function main() {
  // Configure SDK to point at the local runtime
  Mesa.configure({ runtimeUrl: 'http://localhost:3001' });

  // Define the workflow — this is data, not execution
  const flow = Mesa.flow('cross-border-payment-demo')
    .receive({
      asset: 'XLM',
      minAmount: 10,
      toAddress: ESCROW_ADDRESS,
    })
    .confirm({ ledgerCloses: 2 })
    .transfer({
      to: DESTINATION,
      asset: 'USDC',
      amount: 9.5, // after conversion spread
    })
    .webhook({
      url: WEBHOOK_URL,
      events: ['completed', 'failed'],
    })
    .build();

  console.log('Flow definition:');
  console.log(JSON.stringify(flow, null, 2));
  console.log('');

  // Submit to the runtime — this registers the flow and starts execution
  const { executionId } = await Mesa.execute(flow, {
    note: 'Demo payment for SCF presentation',
  });

  console.log(`✔ Execution started: ${executionId}`);
  console.log(`  Monitor at: http://localhost:3001/executions/${executionId}`);
  console.log('');
  console.log('The runtime will:');
  console.log('  1. Suspend and wait for XLM payment to escrow address');
  console.log('  2. Confirm on-chain (2 ledger closes)');
  console.log('  3. Transfer USDC to destination');
  console.log('  4. POST completion webhook to your app');
  console.log('');
  console.log('To simulate the payment received event:');
  console.log(`  curl -X POST http://localhost:3001/webhooks/resume \\`);
  console.log(`    -H 'Content-Type: application/json' \\`);
  console.log(`    -d '{"suspensionKey":"stellar:receive:${ESCROW_ADDRESS}:${executionId}","payload":{"asset":"XLM","amount":15,"txHash":"abc123"}}'`);
}

main().catch(err => {
  console.error('Demo error:', err.message);
  process.exit(1);
});
