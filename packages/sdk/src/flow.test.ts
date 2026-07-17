import { Mesa } from './flow';

async function runSdkTest() {
  console.log('==================================================');
  console.log('🧪 RUNNING MESA SDK DEVELOPER EXPERIENCE TESTS (DX)');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assertThrows(fn: () => void, expectedMessageKeyword: string, testName: string) {
    try {
      fn();
      console.error(`✗ Test failed: ${testName} (did not throw)`);
      failed++;
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes(expectedMessageKeyword.toLowerCase())) {
        console.log(`✔ Test passed: ${testName}`);
        passed++;
      } else {
        console.error(`✗ Test failed: ${testName} (unexpected error message: "${err.message}")`);
        failed++;
      }
    }
  }

  // 1. Validate Flow Name
  assertThrows(
    () => Mesa.flow(''),
    'flow name must be a non-empty string',
    'Flow creation with empty name'
  );

  // 2. Validate Receive Asset
  assertThrows(
    () => Mesa.flow('receive-test').receive({ asset: '', minAmount: 10, toAddress: 'GDX...123' }),
    'receive.asset',
    'Receive with empty asset'
  );

  // 3. Validate Receive Address
  assertThrows(
    () => Mesa.flow('receive-test').receive({ asset: 'XLM', minAmount: 10, toAddress: 'invalid-address' }),
    'invalid stellar address format',
    'Receive with invalid toAddress'
  );

  // 4. Validate Receive minAmount
  assertThrows(
    () => Mesa.flow('receive-test').receive({ asset: 'XLM', minAmount: -5, toAddress: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU' }),
    'minAmount must be a positive number',
    'Receive with negative minAmount'
  );

  // 5. Validate Confirm Closes
  assertThrows(
    () => Mesa.flow('confirm-test').confirm({ ledgerCloses: 0 }),
    'ledgerCloses must be a positive integer',
    'Confirm with zero closes'
  );

  // 6. Validate Convert Anchor
  assertThrows(
    () => Mesa.flow('convert-test').convert({ from: 'XLM', to: 'USDC', anchor: '' }),
    'convert.anchor must be a non-empty string',
    'Convert with empty anchor'
  );

  // 7. Validate Transfer Amount
  assertThrows(
    () => Mesa.flow('transfer-test').transfer({ to: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU', asset: 'XLM', amount: -2 }),
    'transfer.amount must be a positive number',
    'Transfer with negative amount'
  );

  // 8. Validate Delay Seconds
  assertThrows(
    () => Mesa.flow('delay-test').delay({ seconds: -1 }),
    'delay.seconds must be a positive number',
    'Delay with negative seconds'
  );

  // 9. Validate Webhook URL
  assertThrows(
    () => Mesa.flow('webhook-test').webhook({ url: 'not-a-url' }),
    'invalid url format',
    'Webhook with invalid URL'
  );

  // 10. Valid Flow construction
  try {
    const builder = Mesa.flow('cross-border-corridor')
      .receive({
        asset: 'XLM',
        minAmount: 50,
        toAddress: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
      })
      .confirm({ ledgerCloses: 3 })
      .convert({
        from: 'XLM',
        to: 'USDC:GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
        anchor: 'mock-anchor-provider',
      })
      .transfer({
        to: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
        asset: 'USDC:GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
        amount: 47.5,
      })
      .delay({ seconds: 5 })
      .webhook({ url: 'https://api.merchant.com/callback' });

    const flow = builder.build();
    if (flow.steps.length === 6) {
      console.log('✔ Test passed: Valid Flow fluent builder chain');
      passed++;
    } else {
      console.error(`✗ Test failed: Valid Flow builder (expected 6 steps, got ${flow.steps.length})`);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ Test failed: Valid Flow builder threw error:', err.message);
    failed++;
  }

  // 11. Class-based Client and Name-less Flow builder pattern
  try {
    const mesa = new Mesa({ endpoint: 'http://localhost:3001' });
    const builder = mesa.flow() // Nameless flow
      .receive({
        asset: 'XLM',
        minAmount: 50,
        toAddress: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
      })
      .transfer({
        to: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
        asset: 'XLM',
        amount: 47.5,
      });

    const flow = builder.build();
    if (flow.steps.length === 2 && flow.name.startsWith('flow-')) {
      console.log('✔ Test passed: Class-based client and name-less flow builder pattern');
      passed++;
    } else {
      console.error(`✗ Test failed: Class-based client and name-less flow builder pattern (got ${flow.steps.length} steps, name: "${flow.name}")`);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ Test failed: Class-based client and name-less flow builder pattern threw error:', err.message);
    failed++;
  }

  console.log('\n==================================================');
  console.log(`📊 TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSdkTest().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
