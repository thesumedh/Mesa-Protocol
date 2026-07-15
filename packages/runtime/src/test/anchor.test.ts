import { registerProvider } from '../provider';
import { AnchorProvider } from '../../../providers/anchor';
import { Scheduler } from '../engine/scheduler';
import * as store from '../store';
import { createServer } from '../server';
import http from 'http';

// Configure environment
process.env.DATABASE_URL = 'mock';
process.env.NODE_ENV = 'test';

// Define a simple mock receiver/transfer provider since we are testing AnchorProvider integration
class MockStellarProvider {
  readonly name = 'stellar';
  async execute(step: any, context: any): Promise<any> {
    const action = step.params.action;
    console.log(`[MockStellar] Executing action: ${action}`);
    if (action === 'receive') {
      // Complete immediately for this test
      return { outcome: 'completed', output: { receivedAmount: step.params.minAmount } };
    }
    if (action === 'transfer') {
      console.log(`[MockStellar] Successfully transferred ${step.params.amount} to ${step.params.to}`);
      return { outcome: 'completed', output: { txHash: 'mock-tx-hash-stellar-transfer' } };
    }
    return { outcome: 'completed' };
  }
}

async function runAnchorTest() {
  console.log('==================================================');
  console.log('🧪 RUNNING MESA ANCHOR PROVIDER INTEGRATION TEST');
  console.log('==================================================\n');

  // Register providers
  registerProvider(new MockStellarProvider());
  registerProvider(new AnchorProvider());

  // Initialize DB & Server
  await store.initSchema();
  const app = createServer();
  const server = http.createServer(app);
  
  await new Promise<void>(resolve => server.listen(3003, resolve));
  console.log('✔ Test HTTP server listening on port 3003.');

  // Start scheduler
  const scheduler = new Scheduler();
  scheduler.start();
  console.log('✔ Scheduler started.');

  // 1. Create the flow definition
  const flowId = 'anchor-onramp-corridor';
  const flowDef = {
    id: flowId,
    name: 'Real Anchor Onramp Corridor',
    steps: [
      {
        name: 'wait-for-user-deposit',
        provider: 'stellar',
        params: {
          action: 'receive',
          asset: 'USDC:GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
          minAmount: 100,
          toAddress: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
        },
      },
      {
        name: 'convert-sep24-anchor',
        provider: 'anchor',
        params: {
          action: 'sep24-deposit',
          anchorUrl: 'https://api.testanchor.com',
          asset: 'USDC',
          amount: 100,
          userAddress: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
          mock: true, // test mock mode of AnchorProvider
        },
      },
      {
        name: 'transfer-merchant',
        provider: 'stellar',
        params: {
          action: 'transfer',
          to: 'GCIE7JJJVTCX4YGSME3FXZQB3GY4MY7PJNW6VXMHPYUDPHBDQN2IYEQQ',
          asset: 'USDC:GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
          amount: 95,
        },
      },
    ],
  };

  await store.createFlow(flowId, flowDef.name, flowDef);
  console.log('✔ Registered flow definition in Store.');

  // 2. Start flow execution
  const execution = await store.createExecution('exec-anchor-789', flowId, { note: 'Milestone 3 integration test' });
  await store.appendEvent(execution.id, 'execution.created', { flowId });
  console.log(`✔ Created execution: ${execution.id} (Status: PENDING)`);

  // Wait for scheduler to run Step 0 (receive) and Step 1 (anchor deposit - which suspends)
  console.log('\nWaiting for scheduler to run steps...');
  await new Promise(r => setTimeout(r, 2500));

  // Check state
  let updated = await store.getExecution(execution.id);
  console.log(`Execution status: ${updated?.status}`);
  
  const step0 = await store.getStepForExecution(execution.id, 0);
  console.log(`Step 0 (receive) status: ${step0?.status}`);

  const step1 = await store.getStepForExecution(execution.id, 1);
  console.log(`Step 1 (anchor deposit) status: ${step1?.status}`);
  console.log(`Step 1 Interactive URL: ${step1?.output?.interactiveUrl}`);
  console.log(`Step 1 Suspension Key: ${step1?.output?.suspensionKey || step1?.status === 'SUSPENDED' && 'present'}`);

  if (step1?.status !== 'SUSPENDED') {
    throw new Error('Step 1 AnchorProvider was not suspended correctly');
  }

  // 3. Simulate Anchor Callback/Webhook via Webhook resume POST request
  console.log('\nResuming Anchor transaction via webhook resume POST request...');
  
  const suspensionKey = `anchor:sep24:https://api.testanchor.com:mock-tx-${execution.id}`;
  const resumePayload = JSON.stringify({
    suspensionKey,
    payload: {
      status: 'completed',
      amount_out: '100',
      message: 'Transaction completed successfully',
    },
  });

  await new Promise<void>((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3003,
        path: '/webhooks/resume',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(resumePayload),
        },
      },
      res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          console.log(`Resume response: ${res.statusCode} - ${body}`);
          if (res.statusCode === 200) resolve();
          else reject(new Error('Resume failed'));
        });
      }
    );
    req.on('error', reject);
    req.write(resumePayload);
    req.end();
  });

  // Wait for scheduler to run the transfer step and finish the execution
  console.log('\nWaiting for scheduler to complete execution...');
  await new Promise(r => setTimeout(r, 2500));

  // Get final execution state
  updated = await store.getExecution(execution.id);
  console.log(`\nFinal Execution Status: ${updated?.status}`);

  console.log('\n==================================================');
  console.log('📝 EXECUTION HISTORY EVENT LOG:');
  console.log('==================================================');
  const events = await store.getEvents(execution.id);
  for (const ev of events) {
    console.log(`[${ev.timestamp.toISOString()}] ${ev.type}:`, ev.payload ? JSON.stringify(ev.payload) : '');
  }

  // Shutdown
  scheduler.stop();
  server.close();
  console.log('\n✔ Anchor integration test completed successfully!');

  if (updated?.status !== 'COMPLETED') {
    console.error('✗ Test failed: Execution status is not COMPLETED');
    process.exit(1);
  }
}

runAnchorTest().catch(e => {
  console.error('✗ Anchor integration test failed:', e);
  process.exit(1);
});
