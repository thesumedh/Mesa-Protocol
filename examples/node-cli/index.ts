import { MesaSDK, SecretKeySigner } from '@mesa/sdk';
import { Keypair, Networks } from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('==================================================');
  console.log('🚀 MESA SDK NODE CLI EXAMPLE');
  console.log('==================================================');

  // 1. Generate a temporary keypair
  const kp = Keypair.random();
  const publicKey = kp.publicKey();
  console.log(`Generated Keypair:`);
  console.log(` - Public Key: ${publicKey}`);
  console.log(` - Secret Key: [REDACTED]`);

  // 2. Fund the account via Stellar Friendbot
  console.log('\nFunding account via Friendbot...');
  const friendbotUrl = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;
  const friendbotRes = await fetch(friendbotUrl);
  if (!friendbotRes.ok) {
    throw new Error(`Friendbot funding failed: ${friendbotRes.statusText}`);
  }
  console.log('✔ Account funded successfully!');

  // 3. Connect the Mesa SDK
  const sdk = await MesaSDK.connect({
    rpcUrl: 'https://soroban-testnet.stellar.org',
    factoryContractId: 'CBZTVZJRNFQ6Q7RLZCKCAXMMOMW3J3TGNY6PDHSD2UGX7MD2NPKWK5U3', // Testnet Factory ID
    network: 'testnet',
    networkPassphrase: Networks.TESTNET
  });
  console.log('✔ Connected to Mesa SDK!');

  // 4. Read Vault WASM Bytecode (or reference mock deploy)
  console.log('\nDeploying a new vault on-chain...');
  // For the sake of a clean runnable example, we connect to a deployed instance
  // or show how a vault wrapper is initialized.
  const signer = new SecretKeySigner(kp.secret());
  
  // Here we use the vault ID that we verified in E2E integration test
  const vaultContractId = 'CBYLLCPFPGLK2H34DYXP66SYWECK5YAA6RLNOKRVMJBKCL6UFOHXAGP7';
  console.log(`Using Vault Contract: ${vaultContractId}`);

  const vault = sdk.vault(vaultContractId);

  // 5. Query Initial Vault State
  const state = await vault.getState();
  console.log('\nRetrieved Vault State:');
  console.log(` - Name: ${state.name}`);
  console.log(` - Token: ${state.token}`);
  console.log(` - Balance: ${state.balance} Stroops`);
  console.log(` - Policies: ${JSON.stringify(state.policies)}`);

  // 6. Deposit 1 XLM (10,000,000 Stroops)
  console.log('\nDepositing 1 XLM (10,000,000 Stroops) via SDK...');
  const depositRes = await vault.deposit('10000000', signer);
  if (depositRes.success) {
    console.log(`✔ Deposit succeeded! Tx Hash: ${depositRes.data}`);
  } else {
    console.warn(`❌ Deposit failed: ${depositRes.error}`);
  }

  // 7. Query Updated Balance
  const updatedState = await vault.getState();
  console.log(`Updated Vault Balance: ${updatedState.balance} Stroops`);

  // 8. Attempt Early Withdrawal (Should violate lock policy depending on state)
  console.log('\nAttempting withdrawal of 0.5 XLM...');
  const withdrawRes = await vault.withdraw('5000000', signer);
  if (withdrawRes.success) {
    console.log(`✔ Withdrawal succeeded! Tx Hash: ${withdrawRes.data}`);
  } else {
    console.log(`❌ Withdrawal rejected (Expected behavior under Lock policy):`);
    console.log(`   Reason: ${withdrawRes.error}`);
  }

  console.log('\n==================================================');
  console.log('🎉 Node CLI Example completed!');
  console.log('==================================================');
}

main().catch(e => {
  console.error('Fatal Error running example:', e);
});
