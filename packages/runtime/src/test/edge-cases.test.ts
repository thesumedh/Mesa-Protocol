import { 
  MesaErrorCodeSchema, 
  MesaError, 
  FlowDefinitionSchema, 
  StepDefinitionSchema 
} from '@mesaprotocol/schema';
import { Mesa } from '@mesaprotocol/sdk';
import { generateSDKCode, parseSDKCode } from '@mesaprotocol/codegen';
import { 
  registerProvider, 
  getProvider, 
  initProviders, 
  shutdownProviders, 
  MesaProvider, 
  StepDefinition, 
  ExecutionContext, 
  StepResult,
  ExternalEvent
} from '../provider';
import { createServer } from '../server';
import * as store from '../store';
import http from 'http';
import { createHmac } from 'crypto';

process.env.DATABASE_URL = 'mock';
process.env.NODE_ENV = 'test';
process.env.WEBHOOK_HMAC_SECRET = 'super-secret-key-123';

async function runEdgeCasesTestSuite() {
  console.log('===============================================================');
  console.log('🧪 RUNNING MESA PROTOCOL COMPREHENSIVE EDGE CASES & SAFETY TEST');
  console.log('===============================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✔ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
      failedTests++;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 1: Schema & MesaError Edge Cases
  // ───────────────────────────────────────────────────────────────────────────
  console.log('📌 CATEGORY 1: Schema Validation & MesaError Structure');

  // Test 1.1: MesaError Serialization
  const err = new MesaError('ERR_HMAC_INVALID', 'Signature mismatch', 401, { signature: 'bad-sig' });
  assert(err.code === 'ERR_HMAC_INVALID', 'MesaError code assignment');
  assert(err.statusCode === 401, 'MesaError status code');
  assert(err.toJSON().code === 'ERR_HMAC_INVALID', 'MesaError toJSON serialization');

  // Test 1.2: MesaErrorCodeSchema Parsing
  const validCode = MesaErrorCodeSchema.parse('ERR_ANCHOR_TIMEOUT');
  assert(validCode === 'ERR_ANCHOR_TIMEOUT', 'MesaErrorCodeSchema validation');

  // Test 1.3: Zod Schema Rejection on Invalid Stellar Key
  let schemaFailed = false;
  try {
    StepDefinitionSchema.parse({
      name: 'bad-pay',
      provider: 'stellar',
      params: { action: 'payment', amount: 10, to: 'NOT_A_STELLAR_ADDRESS' }
    });
  } catch {
    schemaFailed = true;
  }
  assert(schemaFailed, 'Schema rejects invalid Stellar G address format');

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 2: SDK Fluent Builder & Saga Compensation Edge Cases
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n📌 CATEGORY 2: SDK Fluent Builder & .compensate() Hooks');

  // Test 2.1: Flow construction with .compensate()
  const flow = Mesa.flow('edge-remittance-flow', 'v1.2')
    .receive({
      asset: 'USDC',
      minAmount: 100,
      toAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV'
    })
    .payment({
      amount: 95,
      to: 'GA4UFVDQRWUZIDKB32U2TVZSXSFAPCZV522UY7OYGM27BJ66MHYIIW3P',
      senderSecretRef: 'SENDER_SECRET'
    })
    .compensate({
      provider: 'compensation',
      refundAddress: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV',
      refundAsset: 'USDC'
    })
    .build();

  assert(flow.name === 'edge-remittance-flow', 'SDK Flow name assignment');
  assert(flow.steps.length === 3, 'SDK Flow step count (receive, payment, compensate)');
  assert(flow.steps[2].provider === 'compensation', 'Compensation step provider assignment');

  // Test 2.2: SDK Throw on empty flow name
  let emptyNameThrew = false;
  try {
    Mesa.flow('');
  } catch {
    emptyNameThrew = true;
  }
  assert(emptyNameThrew, 'SDK throws on empty flow name');

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 3: AST Parser & Codegen Round-Tripping Edge Cases
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n📌 CATEGORY 3: AST Parser & Codegen Round-Tripping');

  // Test 3.1: Codegen SDK output generation with preserved flow.id
  const sdkCode = generateSDKCode(flow);
  assert(sdkCode.includes("Mesa.flow('edge-remittance-flow'"), 'Codegen includes flow name');
  assert(sdkCode.includes('.compensate('), 'Codegen preserves .compensate() builder method');

  // Test 3.2: Parse SDK Code back to FlowDefinition AST
  const parsedFlow = parseSDKCode(sdkCode);
  assert(parsedFlow.name === 'edge-remittance-flow', 'AST Parser extracts flow name correctly');
  assert(parsedFlow.steps.length === 3, 'AST Parser preserves step count during roundtrip');

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 4: Provider Lifecycle Hooks (init & shutdown)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n📌 CATEGORY 4: Pluggable Provider Lifecycle Hooks');

  let initCalled = false;
  let shutdownCalled = false;

  class LifecycleTestProvider implements MesaProvider {
    readonly name = 'lifecycle-test';
    async init() {
      initCalled = true;
    }
    async shutdown() {
      shutdownCalled = true;
    }
    async execute(): Promise<StepResult> {
      return { outcome: 'completed' };
    }
  }

  registerProvider(new LifecycleTestProvider());
  await initProviders();
  assert(initCalled, 'initProviders() executes provider.init() hook');

  await shutdownProviders();
  assert(shutdownCalled, 'shutdownProviders() executes provider.shutdown() hook');

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 5: Webhook HMAC Signature & Replay Edge Cases
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n📌 CATEGORY 5: Webhook Cryptographic Verification & Replay Protection');

  class MockWebhookProvider implements MesaProvider {
    readonly name = 'mock-receive';
    async execute(): Promise<StepResult> { return { outcome: 'suspended' }; }
    async resume(): Promise<StepResult> { return { outcome: 'completed' }; }
  }
  registerProvider(new MockWebhookProvider());

  await store.initSchema();
  const app = createServer();
  const server = http.createServer(app);
  const port = 3012;
  await new Promise<void>(resolve => server.listen(port, resolve));

  const secret = 'super-secret-key-123';
  const now = Math.floor(Date.now() / 1000);
  const rawBody = JSON.stringify({ suspensionKey: 'mock:receive:key-101', payload: { deposit: 'ok' } });

  // Calculate valid signature
  const validSignature = createHmac('sha256', secret)
    .update(`${now}.${rawBody}`)
    .digest('hex');

  // Test 5.1: Webhook execution with valid signature
  const validRes = await fetch(`http://localhost:${port}/webhooks/resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Mesa-Signature': validSignature,
      'X-Mesa-Timestamp': String(now),
      'X-Mesa-Event-Id': 'evt-unique-001'
    },
    body: rawBody
  });
  // Since key-101 doesn't exist in mock DB, expect 404 but NOT 401 HMAC failure
  assert(validRes.status === 404, 'Valid HMAC signature passes security middleware (404 step lookup)');

  // Test 5.2: Webhook with TAMPERED signature
  const invalidRes = await fetch(`http://localhost:${port}/webhooks/resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Mesa-Signature': 'invalid-tampered-signature-hash',
      'X-Mesa-Timestamp': String(now),
      'X-Mesa-Event-Id': 'evt-unique-002'
    },
    body: rawBody
  });
  assert(invalidRes.status === 401, 'Tampered HMAC signature rejected with 401 Unauthorized');

  // Test 5.3: Webhook with EXPIRED timestamp (>300 seconds drift)
  const expiredTimestamp = now - 400; // 400 seconds ago
  const expiredSignature = createHmac('sha256', secret)
    .update(`${expiredTimestamp}.${rawBody}`)
    .digest('hex');

  const expiredRes = await fetch(`http://localhost:${port}/webhooks/resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Mesa-Signature': expiredSignature,
      'X-Mesa-Timestamp': String(expiredTimestamp),
      'X-Mesa-Event-Id': 'evt-unique-003'
    },
    body: rawBody
  });
  assert(expiredRes.status === 400, 'Expired timestamp drift (>300s) rejected with 400 Bad Request');

  server.close();

  // ───────────────────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n===============================================================');
  console.log(`📊 EDGE CASES TEST SUMMARY: ${passedTests}/${totalTests} PASSED`);
  console.log('===============================================================');

  if (failedTests > 0) {
    console.error(`❌ ${failedTests} edge case tests failed.`);
    process.exit(1);
  } else {
    console.log('🎉 ALL EDGE CASE & SAFETY TESTS PASSED 100%!');
  }
}

runEdgeCasesTestSuite().catch(err => {
  console.error('Fatal Edge Case Test Runner Error:', err);
  process.exit(1);
});
