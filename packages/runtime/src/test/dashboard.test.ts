import * as store from '../store';
import { createServer } from '../server';
import { registerProvider } from '../provider';
import { WebhookProvider } from '../../../providers/webhook';
import { DelayProvider } from '../../../providers/delay';
import { AnchorProvider } from '../../../providers/anchor';
import { StellarProvider } from '../../../providers/stellar';
import http from 'http';

process.env.DATABASE_URL = 'mock';
process.env.NODE_ENV = 'test';

async function runDashboardTest() {
  console.log('==================================================');
  console.log('🧪 RUNNING MESA DEVELOPER DASHBOARD API TESTS');
  console.log('==================================================\n');

  // Register providers to test GET /providers endpoint
  registerProvider(new WebhookProvider());
  registerProvider(new DelayProvider());
  registerProvider(new AnchorProvider());
  registerProvider(new StellarProvider());

  await store.initSchema();
  const app = createServer();
  const server = http.createServer(app);
  
  await new Promise<void>(resolve => server.listen(3004, resolve));
  console.log('✔ Test HTTP server listening on port 3004.');

  // Helper function to make HTTP requests
  const request = (method: string, path: string, payload?: object): Promise<{ status: number; body: string }> => {
    return new Promise((resolve, reject) => {
      const dataStr = payload ? JSON.stringify(payload) : '';
      const req = http.request({
        hostname: 'localhost',
        port: 3004,
        path,
        method,
        headers: payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataStr),
        } : {},
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      });
      req.on('error', reject);
      if (payload) req.write(dataStr);
      req.end();
    });
  };

  try {
    // 1. Verify health endpoint
    console.log('Testing GET /health...');
    const health = await request('GET', '/health');
    console.log(`Status: ${health.status}, Body: ${health.body}`);
    if (health.status !== 200) throw new Error('Health check failed');

    // 2. Verify dashboard page endpoint
    console.log('\nTesting GET /dashboard page...');
    const dashboard = await request('GET', '/dashboard');
    console.log(`Status: ${dashboard.status}`);
    if (dashboard.status !== 200) throw new Error('Dashboard page endpoint failed');
    if (!dashboard.body.includes('MESA') || !dashboard.body.includes('Vue')) {
      throw new Error('Dashboard page response does not contain expected HTML console markers');
    }
    console.log('✔ GET /dashboard returned valid interactive HTML page.');

    // 3. Verify empty flow list
    console.log('\nTesting GET /flows...');
    const emptyFlows = await request('GET', '/flows');
    console.log(`Status: ${emptyFlows.status}, Body: ${emptyFlows.body}`);
    const flowsArr = JSON.parse(emptyFlows.body);
    if (!Array.isArray(flowsArr)) throw new Error('GET /flows did not return array');

    // 4. Register a flow
    console.log('\nTesting flow registration POST /flows...');
    const regRes = await request('POST', '/flows', {
      id: 'test-dash-flow',
      name: 'Dashboard UI Test Flow',
      definition: {
        steps: [
          { name: 'delay-step', provider: 'delay', params: { seconds: 1 } }
        ]
      }
    });
    console.log(`Status: ${regRes.status}, Body: ${regRes.body}`);
    if (regRes.status !== 201) throw new Error('Flow registration failed');

    // 5. Submit an execution
    console.log('\nTesting execution submission POST /executions...');
    const execRes = await request('POST', '/executions', {
      flowId: 'test-dash-flow',
      context: { note: 'Dashboard test run' }
    });
    console.log(`Status: ${execRes.status}, Body: ${execRes.body}`);
    if (execRes.status !== 201) throw new Error('Execution submission failed');
    const { executionId } = JSON.parse(execRes.body);

    // 6. Verify list executions
    console.log('\nTesting GET /executions list...');
    const execsList = await request('GET', '/executions');
    console.log(`Status: ${execsList.status}`);
    const execsArr = JSON.parse(execsList.body);
    if (!Array.isArray(execsArr) || execsArr.length === 0) {
      throw new Error('GET /executions did not return list with active executions');
    }
    const targetExec = execsArr.find(e => e.id === executionId);
    if (!targetExec) throw new Error('Submitted execution not found in executions list');
    console.log(`✔ Found execution ${executionId} in list with status ${targetExec.status}`);

    // 7. Verify list providers and healthcheck statuses
    console.log('\nTesting GET /providers...');
    const provsRes = await request('GET', '/providers');
    console.log(`Status: ${provsRes.status}, Body: ${provsRes.body}`);
    const provsList = JSON.parse(provsRes.body);
    if (!Array.isArray(provsList)) throw new Error('GET /providers did not return array');
    
    const anchorInfo = provsList.find(p => p.name === 'anchor');
    if (!anchorInfo || anchorInfo.health.status !== 'healthy') {
      throw new Error('Provider list did not report AnchorProvider as healthy');
    }
    console.log('✔ Providers list and dynamic health checks validated successfully.');

    console.log('\n==================================================');
    console.log('✔ ALL DEVELOPER DASHBOARD API TESTS PASSED!');
    console.log('==================================================');
  } catch (err) {
    console.error('\n✗ Test validation failed:', err);
    server.close();
    process.exit(1);
  }

  server.close();
}

runDashboardTest().catch(e => {
  console.error('Test execution error:', e);
  process.exit(1);
});
