import { generateSDKCode, generateJSON, generateCurl, parseSDKCode, generateRunnableAppZip } from './index';

async function runCodegenTest() {
  console.log('==================================================');
  console.log('🧪 RUNNING MESA CODEGEN & AST PARSER TESTS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  // Build a test flow
  const sampleFlow = {
    id: 'remittance-corridor',
    name: 'remittance-corridor',
    version: '1.0.0',
    steps: [
      {
        name: 'receive',
        provider: 'stellar' as const,
        params: {
          action: 'receive' as const,
          asset: 'XLM',
          minAmount: 50,
          toAddress: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
        }
      },
      {
        name: 'delay',
        provider: 'delay' as const,
        params: {
          seconds: 10,
        }
      },
      {
        name: 'payment',
        provider: 'stellar' as const,
        params: {
          action: 'payment' as const,
          senderSecretRef: 'SENDER_SECRET',
          to: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
          amount: 45,
        }
      },
      {
        name: 'webhook',
        provider: 'webhook' as const,
        params: {
          url: 'https://example.com/webhook',
        }
      }
    ]
  };

  // Test 1: generateSDKCode
  try {
    const tsCode = generateSDKCode(sampleFlow);
    if (tsCode.includes("Mesa.flow('remittance-corridor', 'remittance-corridor')") && tsCode.includes('.receive(') && tsCode.includes('.payment(')) {
      console.log('✔ Test passed: generateSDKCode generates valid TypeScript builder code preserving explicit flow.id');
      passed++;
    } else {
      console.error('✗ Test failed: generateSDKCode output missing expected method calls or flow.id preservation');
      failed++;
    }
  } catch (err: any) {
    console.error('✗ Test failed: generateSDKCode threw error:', err.message);
    failed++;
  }

  // Test 2: generateJSON
  try {
    const jsonStr = generateJSON(sampleFlow);
    const parsed = JSON.parse(jsonStr);
    if (parsed.name === 'remittance-corridor' && parsed.steps.length === 4) {
      console.log('✔ Test passed: generateJSON generates valid FlowDefinition JSON');
      passed++;
    } else {
      console.error('✗ Test failed: generateJSON produced invalid object structure');
      failed++;
    }
  } catch (err: any) {
    console.error('✗ Test failed: generateJSON threw error:', err.message);
    failed++;
  }

  // Test 3: generateCurl
  try {
    const curlCmd = generateCurl(sampleFlow, 'http://localhost:3001');
    if (curlCmd.startsWith('curl -X POST') && curlCmd.includes('http://localhost:3001/flows')) {
      console.log('✔ Test passed: generateCurl generates correct cURL command');
      passed++;
    } else {
      console.error('✗ Test failed: generateCurl format incorrect');
      failed++;
    }
  } catch (err: any) {
    console.error('✗ Test failed: generateCurl threw error:', err.message);
    failed++;
  }

  // Test 4: Bidirectional Round-tripping (parseSDKCode)
  try {
    const originalTs = `
      import { Mesa } from '@mesaprotocol/sdk';
      Mesa.configure({ runtimeUrl: 'http://localhost:3001' });

      const flow = Mesa.flow("payout-flow", "payout-flow")
        .receive({ asset: 'XLM', minAmount: 25, toAddress: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU' })
        .delay({ seconds: 5 })
        .payment({ to: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU', amount: 20, senderSecretRef: 'SECRET' })
        .build();
    `;

    const parsedFlow = parseSDKCode(originalTs);
    if (parsedFlow.name === 'payout-flow' && parsedFlow.steps.length === 3) {
      console.log('✔ Test passed: parseSDKCode parses TS code into FlowDefinition (Round-tripping)');
      passed++;
    } else {
      console.error(`✗ Test failed: parseSDKCode expected 3 steps and name "payout-flow", got ${parsedFlow.steps.length} steps, name "${parsedFlow.name}"`);
      failed++;
    }
  } catch (err: any) {
    console.error('✗ Test failed: parseSDKCode threw error:', err.message);
    failed++;
  }

  // Test 5: generateRunnableAppZip
  try {
    const zipBuffer = await generateRunnableAppZip(sampleFlow);
    if (zipBuffer && (zipBuffer as Buffer).length > 1000) {
      console.log(`✔ Test passed: generateRunnableAppZip generates complete app workspace ZIP (${(zipBuffer as Buffer).length} bytes)`);
      passed++;
    } else {
      console.error('✗ Test failed: generateRunnableAppZip output too small or invalid');
      failed++;
    }
  } catch (err: any) {
    console.error('✗ Test failed: generateRunnableAppZip threw error:', err.message);
    failed++;
  }

  console.log(`\n--------------------------------------------------`);
  console.log(`SUMMARY: Passed: ${passed}/${passed + failed}, Failed: ${failed}`);
  console.log(`--------------------------------------------------\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runCodegenTest();
