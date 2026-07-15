import { registerProvider, StepDefinition, ExecutionContext, StepResult, ExternalEvent } from '../provider';
import { Scheduler } from '../engine/scheduler';
import * as store from '../store';
import { createServer } from '../server';
import http from 'http';

// Configure environment
process.env.DATABASE_URL = 'mock';
process.env.NODE_ENV = 'test';

// Define mock providers
class MockReceiveProvider {
  readonly name = 'mock-receive';
  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    console.log(`[TestProvider:${this.name}] Executing step: ${step.name}. Suspending...`);
    const suspensionKey = `mock:receive:${context.executionId}`;
    return { outcome: 'suspended', suspensionKey };
  }
  async resume(event: ExternalEvent, _context: ExecutionContext): Promise<StepResult> {
    console.log(`[TestProvider:${this.name}] Resumed with payload:`, event.payload);
    return { outcome: 'completed', output: { receivedAmount: event.payload.amount } };
  }
}

class MockConvertProvider {
  readonly name = 'mock-convert';
  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    console.log(`[TestProvider:${this.name}] Executing step: ${step.name}`);
    const inputAmount = (context.shared.receivedAmount as number) || 10;
    const converted = inputAmount * 0.95; // apply spread
    return { outcome: 'completed', output: { convertedAmount: converted } };
  }
}

class MockTransferProvider {
  readonly name = 'mock-transfer';
  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    console.log(`[TestProvider:${this.name}] Executing step: ${step.name}`);
    const finalAmount = context.shared.convertedAmount;
    console.log(`[TestProvider:${this.name}] Successfully transferred ${finalAmount} to destination.`);
    return { outcome: 'completed', output: { transferred: true, finalAmount } };
  }
}

async function runTest() {
  console.log('==================================================');
  console.log('🧪 RUNNING WORKFLOW RUNTIME FOUNDATION TEST');
  console.log('==================================================\n');

  // Register providers
  registerProvider(new MockReceiveProvider());
  registerProvider(new MockConvertProvider());
  registerProvider(new MockTransferProvider());

  // Initialize DB & Server
  await store.initSchema();
  const app = createServer();
  const server = http.createServer(app);
  
  await new Promise<void>(resolve => server.listen(3002, resolve));
  console.log('✔ Test HTTP server listening on port 3002.');

  // Start scheduler
  const scheduler = new Scheduler();
  scheduler.start();
  console.log('✔ Scheduler started.');

  // 1. Create a flow definition
  const flowId = 'test-flow-123';
  const flowDef = {
    id: flowId,
    name: 'Mock Financial corridor',
    steps: [
      { name: 'receive-payment', provider: 'mock-receive', params: { expected: 100 } },
      { name: 'convert-payment', provider: 'mock-convert', params: { pair: 'USDC/EUR' } },
      { name: 'transfer-payment', provider: 'mock-transfer', params: { to: 'Alice' } },
    ],
  };

  await store.createFlow(flowId, flowDef.name, flowDef);
  console.log('✔ Registered flow definition in Store.');

  // 2. Start flow execution
  const execution = await store.createExecution('exec-456', flowId, { note: 'Milestone 1 test run' });
  await store.appendEvent(execution.id, 'execution.created', { flowId });
  console.log(`✔ Created execution: ${execution.id} (Status: PENDING)`);

  // Wait for scheduler to pick it up and run/suspend step 1
  console.log('\nWaiting for scheduler to pick up execution...');
  await new Promise(r => setTimeout(r, 2500));

  // Check status
  let updated = await store.getExecution(execution.id);
  console.log(`Status after first scheduling tick: ${updated?.status}`);
  
  const step0 = await store.getStepForExecution(execution.id, 0);
  console.log(`Step 0 Status: ${step0?.status}`);
  console.log(`Suspension Key: ${step0?.output?.suspensionKey}`);

  if (step0?.status !== 'SUSPENDED') {
    throw new Error('Step 0 was not suspended correctly');
  }

  // 3. Simulate resume callback via Webhook route
  console.log('\nResuming execution via Webhook resume POST request...');
  const resumePayload = JSON.stringify({
    suspensionKey: step0.output?.suspensionKey,
    payload: { amount: 150 },
  });

  await new Promise<void>((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3002,
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
          console.log(`Resume HTTP response: ${res.statusCode} - ${body}`);
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Resume request failed with status: ${res.statusCode}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(resumePayload);
    req.end();
  });

  // Wait for scheduler to run remaining steps and finish the flow
  console.log('\nWaiting for scheduler to complete workflow execution...');
  await new Promise(r => setTimeout(r, 2500));

  // Fetch final execution state
  updated = await store.getExecution(execution.id);
  console.log(`\nFinal Flow Execution Status: ${updated?.status}`);
  console.log('Final Execution Context:', JSON.stringify(updated?.context, null, 2));

  // Print events log
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
  console.log('\n✔ Test completed successfully!');

  if (updated?.status !== 'COMPLETED') {
    console.error('✗ Test failed: Execution status is not COMPLETED');
    process.exit(1);
  }
}

runTest().catch(e => {
  console.error('✗ Test suite failed with error:', e);
  process.exit(1);
});
