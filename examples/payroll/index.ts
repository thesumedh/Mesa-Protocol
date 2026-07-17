/**
 * Mesa SDK Example: Path Payment Payroll Payout Flow
 *
 * This demonstrates how to build a remittance or payroll distribution workflow
 * that swaps assets dynamically via Path Payment on the Stellar DEX before payouts.
 *
 * Pre-requisites:
 * 1. Start the Mesa Runtime (npm run start --workspace=packages/runtime)
 * 2. Run this script: npx ts-node examples/payroll/index.ts
 */

import { Mesa } from '@mesa/sdk';
import { Keypair } from '@stellar/stellar-sdk';

const EMPLOYEES = [
  { address: 'GAYO4OIPHDF56S754R2SSN7NX65PH3XPF6HUTT2V347FOBVYVSCG6VLV', amount: '1.5' },
  { address: 'GDV5Z4NXEGR67S3XPVV6J6E35F4CBMZ6U4Z54G5P57KOB4U7JVC5YELT', amount: '2.5' }
];

async function main() {
  // Configure SDK to connect to local Mesa runtime
  Mesa.configure({ runtimeUrl: 'http://localhost:3001' });

  // Build the workflow steps
  let flowBuilder = Mesa.flow('payroll-distribution-demo');

  // Add path payment conversion and payout steps for each employee
  for (const emp of EMPLOYEES) {
    flowBuilder = flowBuilder.transfer({
      to: emp.address,
      asset: 'USDC',
      amount: Number(emp.amount),
      // Auto-convert XLM/native funds to destination asset USDC via DEX path routing
      pathPayment: {
        sendAsset: 'native',
        sendMax: (Number(emp.amount) * 1.2).toString(), // account for slippage
      }
    });
  }

  const flow = flowBuilder.build();

  console.log('Spawning execution for Payroll Payout workflow...');
  const { executionId } = await Mesa.execute(flow);

  console.log(`✔ Execution created: ${executionId}`);
  console.log(`  Visual timeline: http://localhost:3001/dashboard`);
}

main().catch(err => {
  console.error('Error running payroll example:', err.message);
  process.exit(1);
});
