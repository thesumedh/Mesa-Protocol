import { Keypair, Operation, TransactionBuilder, Networks, rpc, Address, Account } from '@stellar/stellar-sdk';
import { MesaSDK, PolicyType, SecretKeySigner } from './index';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runIntegrationTest() {
  console.log('==================================================');
  console.log('🚀 STARTING MESA SDK E2E INTEGRATION TEST (TESTNET)');
  console.log('==================================================\n');

  // Resolve WASM from CLI package directory
  const wasmPath = path.resolve(__dirname, '../../mesa-cli/src/mesa_vault.wasm');
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`WASM file not found at: ${wasmPath}`);
  }
  const wasmBytes = fs.readFileSync(wasmPath);
  console.log(`✔ Read MesaVault WASM. Size: ${wasmBytes.length} bytes`);

  // Generate a random keypair for deployment and funding
  const kp = Keypair.random();
  console.log(`✔ Generated Testnet account public key: ${kp.publicKey()}`);

  console.log('✔ Funding account via Friendbot...');
  const fundRes = await fetch(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`);
  if (!fundRes.ok) {
    throw new Error('Friendbot rate-limited or offline');
  }
  console.log('✔ Funded successfully!');

  // Stellar testnet setup
  const server = new rpc.Server('https://soroban-testnet.stellar.org');
  console.log('✔ Fetching account info...');
  const account = await server.getAccount(kp.publicKey());
  const originalSeq = account.sequenceNumber();

  // 1. Upload WASM bytecode
  console.log('✔ Uploading WASM bytecode...');
  const uploadTx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: Networks.TESTNET
  })
  .addOperation(Operation.uploadContractWasm({ wasm: wasmBytes }))
  .setTimeout(60)
  .build();

  const uploadSim = await server.simulateTransaction(uploadTx);
  if (!rpc.Api.isSimulationSuccess(uploadSim)) {
    throw new Error('Upload simulation failed');
  }

  const cleanUploadAccount = new Account(kp.publicKey(), originalSeq);
  const preparedUploadTx = rpc.assembleTransaction(
    new TransactionBuilder(cleanUploadAccount, {
      fee: '100000',
      networkPassphrase: Networks.TESTNET
    })
    .addOperation(Operation.uploadContractWasm({ wasm: wasmBytes }))
    .setTimeout(60)
    .build(),
    uploadSim
  ).build();

  preparedUploadTx.sign(kp);
  const sendUpload = await server.sendTransaction(preparedUploadTx);
  if (sendUpload.status === 'ERROR') {
    throw new Error(`Upload transaction failed: ${JSON.stringify(sendUpload.errorResult)}`);
  }

  console.log('✔ Polling upload transaction receipt...');
  let wasmHash = '';
  for (let i = 0; i < 20; i++) {
    const txRes = await server.getTransaction(sendUpload.hash);
    if (txRes.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      if (txRes.returnValue) {
        wasmHash = txRes.returnValue.bytes().toString('hex');
      }
      break;
    }
    if (txRes.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error('Upload transaction failed on-chain');
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  if (!wasmHash) {
    throw new Error('Failed to retrieve WASM hash');
  }
  console.log(`✔ WASM Uploaded successfully. Hash: ${wasmHash}`);
  console.log(`   Upload Transaction Hash: ${sendUpload.hash}`);

  // 2. Instantiate Contract
  console.log('✔ Instantiating contract on-chain...');
  const nextAccount = await server.getAccount(kp.publicKey());
  const originalCreateSeq = nextAccount.sequenceNumber();
  const salt = crypto.randomBytes(32);

  const createTx = new TransactionBuilder(nextAccount, {
    fee: '100000',
    networkPassphrase: Networks.TESTNET
  })
  .addOperation(Operation.createCustomContract({
    wasmHash: Buffer.from(wasmHash, 'hex'),
    address: Address.fromString(kp.publicKey()),
    salt: salt
  }))
  .setTimeout(60)
  .build();

  const createSim = await server.simulateTransaction(createTx);
  if (!rpc.Api.isSimulationSuccess(createSim)) {
    throw new Error('Instantiation simulation failed');
  }

  const cleanCreateAccount = new Account(kp.publicKey(), originalCreateSeq);
  const preparedCreateTx = rpc.assembleTransaction(
    new TransactionBuilder(cleanCreateAccount, {
      fee: '100000',
      networkPassphrase: Networks.TESTNET
    })
    .addOperation(Operation.createCustomContract({
      wasmHash: Buffer.from(wasmHash, 'hex'),
      address: Address.fromString(kp.publicKey()),
      salt: salt
    }))
    .setTimeout(60)
    .build(),
    createSim
  ).build();

  preparedCreateTx.sign(kp);
  const sendCreate = await server.sendTransaction(preparedCreateTx);
  if (sendCreate.status === 'ERROR') {
    throw new Error(`Instantiation transaction failed: ${JSON.stringify(sendCreate.errorResult)}`);
  }

  console.log('✔ Polling instantiation transaction receipt...');
  let contractId = '';
  for (let i = 0; i < 20; i++) {
    const txRes = await server.getTransaction(sendCreate.hash);
    if (txRes.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      if (txRes.returnValue) {
        contractId = Address.fromScVal(txRes.returnValue).toString();
      }
      break;
    }
    if (txRes.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error('Instantiation transaction failed on-chain');
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  if (!contractId) {
    throw new Error('Failed to retrieve contract ID');
  }
  console.log(`✔ Contract instantiated. ID: ${contractId}`);
  console.log(`   Instantiation Transaction Hash: ${sendCreate.hash}`);

  // 3. Connect to Mesa SDK & Perform Operations
  console.log('\n==================================================');
  console.log('✔ CONNECTING VIA MESA SDK...');
  console.log('==================================================');
  const sdk = new MesaSDK({
    network: 'testnet',
    currency: 'XLM',
    factoryContractId: 'CBFXB5LZB2FJDVK66H7NPZEK2OE6VXNGYORSGE2W4V55UTG5NG63JGDG',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: Networks.TESTNET
  });

  const signer = new SecretKeySigner(kp.secret());

  // 4. Initialize Vault via SDK
  console.log('✔ SDK: Initializing vault...');
  // Native XLM Token Address on testnet:
  const tokenAddress = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
  const initRes = await sdk.vault.initialize(
    contractId,
    signer,
    'E2E Savings Vault',
    tokenAddress,
    [
      { type: PolicyType.Goal, value: '50000000' }, // 5 XLM goal limit
      { type: PolicyType.Lock, value: 10 }         // 10 seconds lock period
    ]
  );
  if (!initRes.success) {
    throw new Error(`Vault init failed: ${initRes.error}`);
  }
  console.log('✔ SDK: Vault initialized successfully!');
  console.log(`   Initialization Transaction Hash: ${initRes.data}`);

  // 5. Query Initial State
  let stateRes = await sdk.vault.getState(contractId);
  if (!stateRes.success || !stateRes.data) {
    throw new Error(`Failed to fetch state: ${stateRes.error}`);
  }
  console.log('✔ SDK: Retrieved Vault State:');
  console.log(`   - Name: ${stateRes.data.name}`);
  console.log(`   - Token: ${stateRes.data.token}`);
  console.log(`   - Balance: ${stateRes.data.total_balance}`);
  console.log(`   - Policies: ${JSON.stringify(stateRes.data.policies)}`);

  // 6. Deposit Funds
  console.log('\n✔ SDK: Depositing 2 XLM (20,000,000 Stroops)...');
  const depositRes = await sdk.vault.deposit(contractId, signer, '20000000');
  if (!depositRes.success) {
    throw new Error(`Deposit failed: ${depositRes.error}`);
  }
  console.log('✔ SDK: Deposit completed successfully!');
  console.log(`   Deposit Transaction Hash: ${depositRes.data}`);

  stateRes = await sdk.vault.getState(contractId);
  console.log(`✔ SDK: Current balance after deposit: ${stateRes.data?.total_balance} Stroops`);

  // 7. Withdraw pre-lock expiration (Expecting Lock Failure)
  console.log('\n✔ SDK: Attempting early withdrawal of 1 XLM (Should fail due to Lock policy)...');
  const failWithdrawRes = await sdk.vault.withdraw(contractId, signer, '10000000');
  if (failWithdrawRes.success) {
    throw new Error('Withdrawal succeeded when it should have failed due to active lock period!');
  }
  console.log(`✔ SDK: Withdrawal rejected correctly! Reason: ${failWithdrawRes.error}`);

  // 8. Wait for Lock to expire
  console.log('\n✔ SDK: Waiting 10 seconds for Lock to expire...');
  await new Promise(r => setTimeout(r, 11000));

  // 9. Withdraw successfully
  console.log('✔ SDK: Withdrawing 1 XLM (Should succeed now)...');
  const successWithdrawRes = await sdk.vault.withdraw(contractId, signer, '10000000');
  if (!successWithdrawRes.success) {
    throw new Error(`Withdraw failed: ${successWithdrawRes.error}`);
  }
  console.log('✔ SDK: Withdrawal completed successfully!');
  console.log(`   Withdrawal Transaction Hash: ${successWithdrawRes.data}`);

  stateRes = await sdk.vault.getState(contractId);
  console.log(`✔ SDK: Final balance after withdrawal: ${stateRes.data?.total_balance} Stroops`);

  console.log('\n==================================================');
  console.log('🎉 ALL SDK-CONTRACT INTEGRATION TESTS PASSED!');
  console.log('==================================================');
}

runIntegrationTest().catch(e => {
  console.error('\n❌ Integration Test Failed:', e);
  process.exit(1);
});
