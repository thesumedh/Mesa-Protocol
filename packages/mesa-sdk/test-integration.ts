import { MesaSDK } from './src/index';

async function run() {
  console.log('--- MesaSDK Integration Test ---');
  
  const sdk = new MesaSDK({
    rpcUrl: 'https://soroban-testnet.stellar.org',
    factoryContractId: 'CBFXB5LZB2FJDVK66H7NPZEK2OE6VXNGYORSGE2W4V55UTG5NG63JGDG',
    network: 'testnet',
    networkPassphrase: 'Test SDF Network ; September 2015'
  });

  console.log('1. Querying list of chamas from factory...');
  const listRes = await sdk.factory.listChamas(10, 0);
  if (!listRes.success) {
    console.error('Failed to list chamas:', listRes.error);
    process.exit(1);
  }

  console.log('✓ Found Chamas:', JSON.stringify(listRes.data, null, 2));

  const templateIds = [
    'CCKYJCI3JJIIJAL3PV4G3E3TOTPCZMBIN5QHLKSZB3LAQJ6LA4KQXNEU',
    'CCHCSWU2NRRPJNAK22MAQCD535QJQW4BSNRNNVIW3Q6E2PGJ2F2GAZ5V'
  ];

  for (const id of templateIds) {
    console.log(`\nQuerying state of template ID: ${id}...`);
    const stateRes = await sdk.circle.getState(id);
    if (stateRes.success) {
      console.log(`✓ State for ${id}:`, JSON.stringify(stateRes.data, null, 2));
    } else {
      console.error(`Failed to get state for ${id}:`, stateRes.error);
    }
  }
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
