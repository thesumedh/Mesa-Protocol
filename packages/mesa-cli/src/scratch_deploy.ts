import { Keypair, Operation, TransactionBuilder, Networks, rpc, Address, Account } from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function main() {
  const wasmPath = path.resolve('src/mesa_vault.wasm');
  console.log('Reading WASM from:', wasmPath);
  const wasmBytes = fs.readFileSync(wasmPath);
  console.log('WASM Size:', wasmBytes.length, 'bytes');

  // Load or generate deployer keypair
  const kp = Keypair.random();
  console.log('Public Key:', kp.publicKey());

  // Funding
  console.log('Requesting Friendbot funding...');
  try {
    const friendbotUrl = `https://friendbot.stellar.org?addr=${encodeURIComponent(kp.publicKey())}`;
    const friendbotRes = await fetch(friendbotUrl);
    if (friendbotRes.ok) {
      console.log('Funded successfully.');
    } else {
      console.log('Friendbot returned status:', friendbotRes.status);
    }
  } catch (err) {
    console.warn('Friendbot request failed (account may already be funded):', err);
  }

  const server = new rpc.Server('https://soroban-testnet.stellar.org');
  await new Promise(r => setTimeout(r, 2000));

  console.log('Fetching account...');
  const account = await server.getAccount(kp.publicKey());
  const originalSeq = account.sequenceNumber();

  console.log('Building upload transaction...');
  const uploadTx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: Networks.TESTNET
  })
  .addOperation(Operation.uploadContractWasm({ wasm: wasmBytes }))
  .setTimeout(60)
  .build();

  console.log('Simulating upload...');
  const uploadSim = await server.simulateTransaction(uploadTx);
  if (rpc.Api.isSimulationSuccess(uploadSim)) {
    console.log('Upload simulation success.');
  } else {
    console.error('Upload simulation failed:', JSON.stringify(uploadSim, null, 2));
    return;
  }

  const cleanUploadAccount = new Account(kp.publicKey(), originalSeq);
  const rawUploadTx = new TransactionBuilder(cleanUploadAccount, {
    fee: '100000',
    networkPassphrase: Networks.TESTNET
  })
  .addOperation(Operation.uploadContractWasm({ wasm: wasmBytes }))
  .setTimeout(60)
  .build();

  const preparedUploadTx = rpc.assembleTransaction(rawUploadTx, uploadSim).build();

  preparedUploadTx.sign(kp);
  console.log('Submitting upload transaction...');
  const sendUpload = await server.sendTransaction(preparedUploadTx);
  console.log('Upload transaction hash:', sendUpload.hash);

  console.log('Polling upload status...');
  let wasmHash = '';
  for (let i = 0; i < 20; i++) {
    const statusRes = await server.getTransaction(sendUpload.hash);
    console.log(`Poll ${i + 1}: ${statusRes.status}`);
    if (statusRes.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      console.log('WASM Uploaded successfully!');
      // Parse WASM hash from transaction result
      if (statusRes.returnValue) {
        wasmHash = statusRes.returnValue.bytes().toString('hex');
        console.log('Parsed WASM Hash:', wasmHash);
      }
      break;
    }
    if (statusRes.status === rpc.Api.GetTransactionStatus.FAILED) {
      console.error('Upload transaction failed on-chain.');
      return;
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  if (!wasmHash) {
    console.warn('WASM Hash not retrieved from return value, using fallback.');
    wasmHash = 'b797b7d5b26a0092a0c159fb1c7a52c49cfe6022f4766eac30f0c1995f2e1628';
  }

  console.log('Fetching account for instantiation...');
  const nextAccount = await server.getAccount(kp.publicKey());
  const originalCreateSeq = nextAccount.sequenceNumber();

  const salt = crypto.randomBytes(32);

  console.log('Building instantiation transaction...');
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

  console.log('Simulating instantiation...');
  const createSim = await server.simulateTransaction(createTx);
  if (rpc.Api.isSimulationSuccess(createSim)) {
    console.log('Instantiation simulation success.');
  } else {
    console.error('Instantiation simulation failed:', JSON.stringify(createSim, null, 2));
    return;
  }

  const cleanCreateAccount = new Account(kp.publicKey(), originalCreateSeq);
  const rawCreateTx = new TransactionBuilder(cleanCreateAccount, {
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

  const preparedCreateTx = rpc.assembleTransaction(rawCreateTx, createSim).build();

  preparedCreateTx.sign(kp);
  console.log('Submitting instantiation...');
  const sendCreate = await server.sendTransaction(preparedCreateTx);
  console.log('Instantiation transaction hash:', sendCreate.hash);

  console.log('Polling instantiation status...');
  for (let i = 0; i < 20; i++) {
    const statusRes = await server.getTransaction(sendCreate.hash);
    console.log(`Poll ${i + 1}: ${statusRes.status}`);
    if (statusRes.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      console.log('CONTRACT INSTANTIATION SUCCESSFUL!');
      if (statusRes.returnValue) {
        // The return value of createContract is the contract address (SCVal address type)
        const contractAddress = Address.fromScVal(statusRes.returnValue);
        console.log('Instantiated Contract ID:', contractAddress.toString());
      }
      break;
    }
    if (statusRes.status === rpc.Api.GetTransactionStatus.FAILED) {
      console.error('Instantiation transaction failed on-chain.');
      if (statusRes.resultXdr) {
        try {
          const opResult = statusRes.resultXdr.result().results()[0];
          console.error('Op Result Switch Name:', opResult.tr()?.switch()?.name || 'unknown');
          console.error('Full Op Result:', JSON.stringify(opResult, null, 2));
        } catch (e: any) {
          console.error('Error inspecting resultXdr:', e.message || e);
        }
      }
      break;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

main().catch(console.error);
