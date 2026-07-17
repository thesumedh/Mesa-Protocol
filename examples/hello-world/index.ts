import { Mesa } from '@mesaprotocol/sdk';

// 1. Configure the SDK to point to the local Mesa runtime
Mesa.configure({ runtimeUrl: 'http://localhost:3001' });

async function main() {
  console.log('==================================================');
  console.log('🚀 MESA HELLO WORLD FLOW');
  console.log('==================================================\n');

  // 2. Define a simple 3-step workflow
  const flow = Mesa.flow('hello-world-flow')
    // Step 1: Wait for a deposit of XLM
    .receive({
      asset: 'XLM',
      minAmount: 10,
      toAddress: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU'
    })
    // Step 2: Delay for 5 seconds
    .delay({ seconds: 5 })
    // Step 3: Payout to destination
    .transfer({
      to: 'GCIE7JJJVTCX4YGSME3FXZQB3GY4MY7PJNW6VXMHPYUDPHBDQN2IYE5Z',
      asset: 'XLM',
      amount: 10
    })
    .build();

  console.log('Registering and executing flow on Mesa runtime...');
  const { executionId } = await Mesa.execute(flow);

  console.log(`✔ Flow execution started successfully!`);
  console.log(`Execution ID: ${executionId}`);
  console.log(`Monitor it live on the Mesa Developer Console: http://localhost:3001/dashboard`);
}

main().catch(console.error);
