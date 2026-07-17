/**
 * Mesa SDK Example: SEP-24 Anchor Deposit Flow
 *
 * This demonstrates how to define a flow that initiates a SEP-24 interactive deposit,
 * automatically suspends waiting for user completion, and resumes via webhooks.
 *
 * Pre-requisites:
 * 1. Start the Mesa Runtime (npm run start --workspace=packages/runtime)
 * 2. Run this script: npx ts-node examples/anchor-deposit/index.ts
 */

import { Mesa } from '@mesa/sdk';
import { Keypair } from '@stellar/stellar-sdk';

const USER_KEYPAIR = Keypair.random();

async function main() {
  // Configure SDK to connect to local Mesa runtime
  Mesa.configure({ runtimeUrl: 'http://localhost:3001' });

  // Define the workflow using the fluent SDK
  const flow = Mesa.flow('anchor-deposit-demo')
    .receive({
      provider: 'anchor',
      action: 'sep24-deposit',
      anchorUrl: 'https://testanchor.stellar.org',
      asset: 'USDC',
      amount: 10,
      userAddress: USER_KEYPAIR.publicKey(),
      userSecret: USER_KEYPAIR.secret(),
    })
    .webhook({
      url: 'https://myapp.example.com/webhooks/deposit-complete',
      events: ['completed', 'failed'],
    })
    .build();

  console.log('Spawning execution for Anchor Deposit workflow...');
  const { executionId } = await Mesa.execute(flow);

  console.log(`✔ Execution created: ${executionId}`);
  console.log(`  Visual timeline: http://localhost:3001/dashboard`);
  console.log('');
  console.log('The runtime will now:');
  console.log('  1. Authenticate with the anchor using SEP-10.');
  console.log('  2. Request a SEP-24 interactive deposit URL.');
  console.log('  3. Suspend execution and output the URL for the user.');
  console.log('  4. Resume automatically once the anchor triggers the callback.');
}

main().catch(err => {
  console.error('Error running deposit example:', err.message);
  process.exit(1);
});
