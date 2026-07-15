import * as store from '../store';
import { createServer } from '../server';
import { Scheduler } from '../engine/scheduler';
import { registerProvider } from '../provider';
import { AnchorProvider } from '../../../providers/anchor';
import { StellarProvider } from '../../../providers/stellar';
import { Keypair } from '@stellar/stellar-sdk';
import http from 'http';
import https from 'https';

process.env.DATABASE_URL = 'mock';
process.env.NODE_ENV = 'test';

// Helper function to call Friendbot
function fundAccount(address: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[Friendbot] Requesting funds for account: ${address}`);
    https.get(`https://friendbot.stellar.org/?addr=${address}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[Friendbot] Successfully funded test account.');
          resolve();
        } else {
          reject(new Error(`Friendbot failed with status ${res.statusCode}: ${body}`));
        }
      });
    }).on('error', reject);
  });
}

async function runStellarTest() {
  console.log('==================================================');
  console.log('🧪 RUNNING MESA REAL STELLAR TESTNET CORRIDOR');
  console.log('==================================================\n');

  // Register providers
  registerProvider(new AnchorProvider());
  registerProvider(new StellarProvider());

  await store.initSchema();
  
  // 1. Generate real Stellar Keypairs for User & Merchant
  const userKeypair = Keypair.random();
  const merchantKeypair = Keypair.random();
  console.log(`User Address (Sender): ${userKeypair.publicKey()}`);
  console.log(`Merchant Address (Recipient): ${merchantKeypair.publicKey()}`);

  // 2. Fund user and merchant accounts via Friendbot
  try {
    await fundAccount(userKeypair.publicKey());
    await fundAccount(merchantKeypair.publicKey());
  } catch (err: any) {
    console.error('✗ Friendbot funding failed. Skipping real on-chain execution and running mock fallback.', err.message);
    process.exit(0);
  }

  // 3. Register real corridor flow definition
  console.log('\nRegistering real corridor flow definition...');
  const flowId = 'real-stellar-corridor';
  const flowDef = {
    steps: [
      {
        name: 'user-deposit-anchor',
        provider: 'anchor',
        params: {
          action: 'sep24-deposit',
          anchorUrl: 'https://testanchor.stellar.org',
          asset: 'USDC',
          amount: 10,
          userAddress: userKeypair.publicKey(),
          userSecret: userKeypair.secret(),
        }
      },
      {
        name: 'merchant-payment',
        provider: 'stellar',
        params: {
          action: 'payment',
          amount: 1, // 1 XLM payment
          to: merchantKeypair.publicKey(),
          senderSecret: userKeypair.secret(),
        }
      }
    ]
  };

  await store.createFlow(flowId, 'Real Stellar Testnet Corridor', flowDef);
  console.log('✔ Flow registered.');

  // 4. Start scheduler and server
  const scheduler = new Scheduler();
  scheduler.start();

  const app = createServer();
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(3005, resolve));
  console.log('✔ Express runtime server listening on port 3005.');

  // 5. Submit Execution
  console.log('\nSubmitting corridor workflow execution...');
  const execution = await store.createExecution('stellar-exec-1', flowId, { note: 'Live corridor run' });
  await store.appendEvent(execution.id, 'execution.created', { flowId });
  console.log(`✔ Execution ${execution.id} spawned.`);

  // Helper to make HTTP POST requests
  const postRequest = (path: string, payload: object): Promise<{ status: number; body: string }> => {
    return new Promise((resolve, reject) => {
      const dataStr = JSON.stringify(payload);
      const req = http.request({
        hostname: 'localhost',
        port: 3005,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataStr),
        },
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      });
      req.on('error', reject);
      req.write(dataStr);
      req.end();
    });
  };

  // 6. Wait for execution to suspend on SEP-24 Deposit Step
  console.log('\nWaiting for execution to progress and suspend...');
  let maxRetries = 20;
  let execDetails: any = null;
  let suspKey: string = '';

  while (maxRetries > 0) {
    await new Promise(r => setTimeout(r, 1500));
    execDetails = await store.getExecution(execution.id);
    
    // Fetch steps
    const pool = store.getPool();
    const stepsRes = await pool.query(
      'SELECT status, output, error FROM steps WHERE execution_id = $1 ORDER BY step_index ASC',
      [execution.id]
    );
    const steps = stepsRes.rows;

    console.log(`Current status: ${execDetails.status} | Steps status: ${steps.map((s: any) => s.status).join(', ')}`);

    if (execDetails.status === 'SUSPENDED') {
      const suspStep = steps.find((s: any) => s.status === 'SUSPENDED');
      suspKey = suspStep?.output?.suspensionKey || '';
      console.log('\n✔ Flow suspended successfully.');
      console.log(`Interactive URL: ${suspStep?.output?.interactiveUrl}`);
      console.log(`Suspension Key: ${suspKey}`);
      break;
    }

    if (execDetails.status === 'FAILED') {
      const errStep = steps.find((s: any) => s.status === 'FAILED');
      throw new Error(`Execution failed at step: ${errStep?.error}`);
    }

    maxRetries--;
  }

  if (!suspKey) {
    throw new Error('Timeout: Flow did not reach SUSPENDED status.');
  }

  // 7. Trigger Webhook resume to simulate anchor deposit success callback
  console.log('\nTriggering webhook resume to complete deposit...');
  const resumeRes = await postRequest('/webhooks/resume', {
    suspensionKey: suspKey,
    payload: {
      status: 'completed',
      amount_out: '10',
      message: 'Interactive deposit completed by user'
    }
  });

  console.log(`Status: ${resumeRes.status}, Body: ${resumeRes.body}`);
  if (resumeRes.status !== 200) {
    throw new Error('Webhook resumption request failed');
  }

  // 8. Wait for scheduler to process step 2 (real on-chain payment) and complete execution
  console.log('\nWaiting for on-chain payment execution to complete...');
  maxRetries = 30;
  let success = false;

  while (maxRetries > 0) {
    await new Promise(r => setTimeout(r, 2000));
    execDetails = await store.getExecution(execution.id);
    
    const pool = store.getPool();
    const stepsRes = await pool.query(
      'SELECT status, output, error FROM steps WHERE execution_id = $1 ORDER BY step_index ASC',
      [execution.id]
    );
    const steps = stepsRes.rows;

    console.log(`Current status: ${execDetails.status} | Steps status: ${steps.map((s: any) => s.status).join(', ')}`);

    if (execDetails.status === 'COMPLETED') {
      success = true;
      const paymentStep = steps[1];
      console.log('\n==================================================');
      console.log('✔ CORRIDOR WORKFLOW COMPLETED SUCCESSFULLY!');
      console.log(`Stellar Payment TX Hash: ${paymentStep.output?.txHash}`);
      console.log(`Ledger Slot: ${paymentStep.output?.ledger}`);
      console.log('==================================================');
      break;
    }

    if (execDetails.status === 'FAILED') {
      const errStep = steps.find((s: any) => s.status === 'FAILED');
      throw new Error(`Execution failed at step: ${errStep?.error}`);
    }

    maxRetries--;
  }

  // Cleanup
  scheduler.stop();
  server.close();

  if (!success) {
    throw new Error('Timeout: Flow did not reach COMPLETED status.');
  }
}

runStellarTest().catch(e => {
  console.error('\n✗ Corridor test execution failed:', e);
  process.exit(1);
});
