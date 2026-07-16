import { Keypair } from '@stellar/stellar-sdk';
import http from 'http';
import https from 'https';

const RUNTIME_URL = 'http://localhost:3001';

function postRequest(urlPath: string, payload: object): Promise<{ status: number; body: string }> {
  const dataStr = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = http.request(`${RUNTIME_URL}${urlPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

function getRequest(urlPath: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(`${RUNTIME_URL}${urlPath}`, { method: 'GET' }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

function fundAccount(address: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[Friendbot] Requesting funds for: ${address}`);
    https.get(`https://friendbot.stellar.org/?addr=${address}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[Friendbot] Account funded successfully.');
          resolve();
        } else {
          reject(new Error(`Friendbot failed: ${res.statusCode} - ${body}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('==================================================');
  console.log('🚀 STARTING NGO AID DISTRIBUTION LIVE DEMO CLIENT');
  console.log('==================================================\n');

  // 1. Generate keys
  const ngoKeypair = Keypair.random();
  const beneficiaryKeypair = Keypair.random();
  console.log(`NGO Wallet (Sender): ${ngoKeypair.publicKey()}`);
  console.log(`Beneficiary Wallet (Recipient): ${beneficiaryKeypair.publicKey()}`);

  // 2. Fund
  try {
    await fundAccount(ngoKeypair.publicKey());
    await fundAccount(beneficiaryKeypair.publicKey());
  } catch (err: any) {
    console.error('✗ Friendbot funding failed:', err.message);
    process.exit(1);
  }

  // 3. Register Flow
  console.log('\nRegistering NGO Aid Distribution flow definition...');
  const flowId = 'ngo-aid-distribution';
  const flowDef = {
    steps: [
      {
        name: 'ngo-deposit',
        provider: 'anchor',
        params: {
          action: 'sep24-deposit',
          anchorUrl: 'https://testanchor.stellar.org',
          asset: 'USDC',
          amount: 10,
          userAddress: ngoKeypair.publicKey(),
          userSecret: ngoKeypair.secret(),
        }
      },
      {
        name: 'payout-swap',
        provider: 'stellar',
        params: {
          action: 'path-payment',
          sendAsset: 'XLM',
          sendAmount: 2,
          destAsset: 'XLM',
          destMin: 1.9,
          to: beneficiaryKeypair.publicKey(),
          senderSecret: ngoKeypair.secret(),
        }
      }
    ]
  };

  const regRes = await postRequest('/flows', {
    id: flowId,
    name: 'NGO Aid Distribution & Payout Flow',
    definition: flowDef
  });
  if (regRes.status !== 201) {
    console.error('✗ Failed to register flow:', regRes.body);
    process.exit(1);
  }
  console.log('✔ Flow registered successfully.');

  // 4. Create Execution
  console.log('\nSubmitting execution to runtime...');
  const execRes = await postRequest('/executions', {
    flowId,
    context: {}
  });
  if (execRes.status !== 201) {
    console.error('✗ Failed to submit execution:', execRes.body);
    process.exit(1);
  }
  const execData = JSON.parse(execRes.body);
  const execId = execData.executionId;
  console.log(`✔ Execution spawned. ID: ${execId}`);
  console.log(`Open dashboard in your browser to watch it live: ${RUNTIME_URL}/dashboard`);

  // 5. Poll
  let completed = false;
  let webhookTriggered = false;
  let pollRetries = 60;

  while (!completed && pollRetries > 0) {
    await new Promise(r => setTimeout(r, 2000));
    pollRetries--;

    const statusRes = await getRequest(`/executions/${execId}`);
    if (statusRes.status !== 200) {
      console.warn(`[Poll] Failed to fetch execution status: ${statusRes.body}`);
      continue;
    }

    const { execution } = JSON.parse(statusRes.body);
    const steps = execution.steps || [];
    const stepNames = ['ngo-deposit', 'payout-swap'];
    console.log(`[Poll] Execution: ${execution.status} | Steps: ${steps.map((s: any) => `${stepNames[s.step_index] || s.step_index}(${s.status})`).join(', ')}`);

    if (execution.status === 'SUSPENDED' && !webhookTriggered) {
      const suspendedStep = steps.find((s: any) => s.status === 'SUSPENDED');
      const suspKey = suspendedStep?.output?.suspensionKey;
      if (suspKey) {
        webhookTriggered = true;
        console.log(`\n⏳ Step suspended waiting for webhook callback!`);
        console.log(`Interactive URL: ${suspendedStep.output.interactiveUrl}`);
        console.log(`Suspension Key: ${suspKey}`);
        
        console.log('\n[Simulator] Automatically triggering webhook resume callback...');
        const resumeRes = await postRequest('/webhooks/resume', {
          suspensionKey: suspKey,
          payload: {
            status: 'completed',
            amount_out: '10',
            message: 'Interactive deposit completed by client simulation'
          }
        });
        console.log(`[Simulator] Webhook callback response: ${resumeRes.status} | ${resumeRes.body}`);
      }
    }

    if (execution.status === 'COMPLETED') {
      completed = true;
      const payoutStep = steps.find((s: any) => s.step_index === 1);
      console.log('\n==================================================');
      console.log('🎉 NGO AID DISTRIBUTION WORKFLOW COMPLETED SUCCESSFULLY!');
      console.log(`Stellar Swap TX Hash: ${payoutStep?.output?.txHash}`);
      console.log('==================================================');
      break;
    }

    if (execution.status === 'FAILED') {
      completed = true;
      console.error('\n✗ Live execution failed.');
      break;
    }
  }

  if (!completed) {
    console.error('\n✗ Timeout: Execution did not complete in 120 seconds.');
  }
}

main().catch(err => {
  console.error('Fatal error in client execution:', err);
});
