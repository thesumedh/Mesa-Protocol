import { SorobanRpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { db } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const defaultRpc = process.env.RPC_URL || 'https://soroban-testnet.stellar.org';
const defaultFactoryId = process.env.FACTORY_CONTRACT_ID || 'CBFXB5LZB2FJDVK66H7NPZEK2OE6VXNGYORSGE2W4V55UTG5NG63JGDG';
const server = new SorobanRpc.Server(defaultRpc);

async function getChamaStateFromChain(contractId: string): Promise<any> {
  // Call read-only get_circle method directly to sync full state if needed
  try {
    const rpcProvider = new SorobanRpc.Server(defaultRpc);
    // Construct simulation for read-only call
    // Note: We can import RpcProvider from @mesa/sdk or build a local read-only caller.
    // Let's implement a simple direct RPC simulation call here to avoid circular dependency issues!
    const contract = new xdr.ScVal.scvString('get_circle'); // Method name ScVal
    // Simulating transaction
    const dummyAddr = 'GAAAAAAAABBBBBBBBBCCCCCCCCCDDDDDDDDDEEEEEEEFFFFFFFGGGGGGGG';
    // We can simulate get_circle by calling simulateTransaction
    // Since get_circle takes no arguments:
    // Actually, calling the RPC is easy using the SDK.
    // Let's do it via simulation
    // Or we can just reconstruct state from events!
    // Reconstructing state from events is the purest way for an indexer!
    // But since get_circle is on-chain, syncing it once during creation is nice.
    // Let's use a simple simulation to fetch get_circle.
  } catch (e) {
    console.error(`Failed to get on-chain state for ${contractId}:`, e);
  }
  return null;
}

// Simulates a read-only call to get_circle
async function fetchOnChainCircle(contractId: string): Promise<any> {
  try {
    // We can simulate a get_circle transaction
    // Let's build a minimal ScVal call
    // For simplicity, we can query it using a temporary RpcProvider-like call
    // Or since we know the initial parameters from creation (or from events),
    // let's do a direct simulation using SorobanRpc.Server
    const dummyAccount = 'GBRPYHHKPOAYIZILRS76TT576U5XGGB5P53NPH2N6G7B27C3Z5W633T3';
    // We call simulateTransaction with a contract call to get_circle
    // In Soroban, simulation doesn't need signature or real fees
    // Let's write the code to simulate get_circle:
    const tx = new SorobanRpc.Server(defaultRpc);
    // Since we want to make it super robust, let's implement the simulation:
    // To do that, we import Account, TransactionBuilder, Contract, TimeoutInfinite, etc.
    const { Account, TransactionBuilder, Contract, TimeoutInfinite } = await import('@stellar/stellar-sdk');
    const account = new Account(dummyAccount, '0');
    const contractObj = new Contract(contractId);
    const buildTx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: 'Test SDF Network ; September 2015',
    })
      .addOperation(contractObj.call('get_circle'))
      .setTimeout(TimeoutInfinite)
      .build();

    const response = await server.simulateTransaction(buildTx);
    if (SorobanRpc.Api.isSimulationSuccess(response) && response.result?.retval) {
      const native = scValToNative(response.result.retval) as any;
      return {
        creator: native.creator.toString(),
        name: native.name.toString(),
        contribution_amount: native.contribution_amount.toString(),
        max_members: Number(native.max_members),
        duration: Number(native.duration),
        token: native.token.toString(),
        members: native.members.map((m: any) => m.toString()),
        rotation_order: native.rotation_order.map((r: any) => r.toString()),
        current_round: Number(native.current_round),
        deadline: Number(native.deadline),
        status: Number(native.status),
      };
    }
  } catch (e) {
    console.error(`Simulation failed for ${contractId}:`, e);
  }
  return null;
}

async function processEvents() {
  await db.initSchema();
  let lastIndexed = await db.getIndexedLedger();

  if (lastIndexed === 0) {
    // If starting fresh, get latest ledger and scan last 10,000 ledgers (~12 hours)
    try {
      const latest = await server.getLatestLedger();
      lastIndexed = Math.max(1, latest.sequence - 10000);
      console.log(`Starting fresh indexing from ledger: ${lastIndexed}`);
    } catch (e) {
      console.error('Failed to get latest ledger, starting from 1', e);
      lastIndexed = 1;
    }
  }

  console.log(`Polling events from ledger: ${lastIndexed}...`);

  try {
    // 1. Query events for the Factory to discover new chamas
    const factoryEventsResponse = await server.getEvents({
      startLedger: lastIndexed,
      filters: [
        {
          type: 'contract',
          id: defaultFactoryId,
        },
      ],
      limit: 50,
    });

    const factoryEvents = factoryEventsResponse.events || [];
    let maxLedgerProcessed = lastIndexed;

    for (const event of factoryEvents) {
      if (event.ledger > maxLedgerProcessed) {
        maxLedgerProcessed = event.ledger;
      }

      // Check if CircleCreated event
      const topics = event.topic.map(t => scValToNative(t));
      const eventName = topics[0];

      if (eventName === 'CircleCreated') {
        const chamaId = Number(topics[1]);
        const contractId = scValToNative(event.value) as string;
        console.log(`[FactoryEvent] New Chama Discovered: ID=${chamaId}, Address=${contractId}`);

        // Fetch on-chain details to initialize
        const state = await fetchOnChainCircle(contractId);
        if (state) {
          await db.insertOrUpdateChama({
            contract_id: contractId,
            chama_id: chamaId,
            name: state.name,
            creator: state.creator,
            contribution_amount: state.contribution_amount,
            max_members: state.max_members,
            member_count: state.members.length,
            current_round: state.current_round,
            deadline: state.deadline,
            status: state.status,
            token: state.token,
            duration: state.duration,
            rotation_order: state.rotation_order ? state.rotation_order.join(',') : '',
          });

          // Insert members
          for (const m of state.members) {
            await db.insertOrUpdateMember({
              contract_id: contractId,
              address: m,
              reputation: 100, // Starting reputation
              joined_at: Date.parse(event.ledgerClosedAt) || Date.now(),
            });
          }

          // Insert creation activity
          await db.insertActivity({
            contract_id: contractId,
            tx_hash: event.txHash,
            type: 'created',
            member: state.creator,
            amount: state.contribution_amount,
            round: 0,
            timestamp: Date.parse(event.ledgerClosedAt) || Date.now(),
          });
        }
      }
    }

    // 2. Query events for all known chamas in the db to ingest state updates
    const chamas = await db.getChamas();
    for (const chama of chamas) {
      const chamaEventsResponse = await server.getEvents({
        startLedger: lastIndexed,
        filters: [
          {
            type: 'contract',
            id: chama.contract_id,
          },
        ],
        limit: 50,
      });

      const chamaEvents = chamaEventsResponse.events || [];
      for (const event of chamaEvents) {
        if (event.ledger > maxLedgerProcessed) {
          maxLedgerProcessed = event.ledger;
        }

        const topics = event.topic.map(t => scValToNative(t));
        const eventName = topics[0];
        const timestamp = Date.parse(event.ledgerClosedAt) || Date.now();

        console.log(`[ChamaEvent] Address=${chama.contract_id}, Event=${eventName}`);

        if (eventName === 'MemberJoined') {
          const member = topics[1] as string;
          // Increment member count and insert member
          const updatedChama = { ...chama, member_count: chama.member_count + 1 };
          await db.insertOrUpdateChama(updatedChama);
          await db.insertOrUpdateMember({
            contract_id: chama.contract_id,
            address: member,
            reputation: 100,
            joined_at: timestamp,
          });
          await db.insertActivity({
            contract_id: chama.contract_id,
            tx_hash: event.txHash,
            type: 'joined',
            member: member,
            timestamp: timestamp,
          });
        } else if (eventName === 'CircleActivated') {
          // Sync full state to lock rotation order and update status
          const state = await fetchOnChainCircle(chama.contract_id);
          if (state) {
            await db.insertOrUpdateChama({
              ...chama,
              status: 1, // Active
              deadline: state.deadline,
              current_round: 1,
              rotation_order: state.rotation_order ? state.rotation_order.join(',') : '',
            });
          }
          await db.insertActivity({
            contract_id: chama.contract_id,
            tx_hash: event.txHash,
            type: 'activated',
            member: chama.creator,
            timestamp: timestamp,
          });
        } else if (eventName === 'RoundContributed') {
          const member = topics[1] as string;
          const round = Number(scValToNative(event.value));
          await db.insertActivity({
            contract_id: chama.contract_id,
            tx_hash: event.txHash,
            type: 'contributed',
            member: member,
            amount: chama.contribution_amount,
            round: round,
            timestamp: timestamp,
          });
        } else if (eventName === 'RoundDistributed') {
          const round = Number(topics[1]);
          const winner = topics[2] as string;
          const amount = scValToNative(event.value).toString();

          // Sync full state to update deadline and current round
          const state = await fetchOnChainCircle(chama.contract_id);
          if (state) {
            await db.insertOrUpdateChama({
              ...chama,
              current_round: state.current_round,
              deadline: state.deadline,
              status: state.status, // might have transitioned to Completed
            });
          }

          await db.insertActivity({
            contract_id: chama.contract_id,
            tx_hash: event.txHash,
            type: 'distributed',
            member: winner,
            amount: amount,
            round: round,
            timestamp: timestamp,
          });
        } else if (eventName === 'MissedPayment') {
          const member = topics[1] as string;
          const round = Number(scValToNative(event.value));

          // Ejection is verified on-chain, but we decrease reputation in DB
          // Check current member details
          const membersList = await db.getMembers(chama.contract_id);
          const match = membersList.find(m => m.address === member);
          if (match) {
            await db.insertOrUpdateMember({
              contract_id: chama.contract_id,
              address: member,
              reputation: Math.max(0, match.reputation - 20),
              joined_at: match.joined_at,
            });
          }

          await db.insertActivity({
            contract_id: chama.contract_id,
            tx_hash: event.txHash,
            type: 'missed',
            member: member,
            round: round,
            timestamp: timestamp,
          });
        } else if (eventName === 'EmergencyFlagged') {
          const member = topics[1] as string;
          // Sync full state to see if status updated to Paused (2)
          const state = await fetchOnChainCircle(chama.contract_id);
          if (state) {
            await db.insertOrUpdateChama({
              ...chama,
              status: state.status,
            });
          }
          await db.insertActivity({
            contract_id: chama.contract_id,
            tx_hash: event.txHash,
            type: 'emergency',
            member: member,
            timestamp: timestamp,
          });
        } else if (eventName === 'PrincipalWithdrawn') {
          const member = topics[1] as string;
          const amount = scValToNative(event.value).toString();
          await db.insertActivity({
            contract_id: chama.contract_id,
            tx_hash: event.txHash,
            type: 'withdrawn',
            member: member,
            amount: amount,
            timestamp: timestamp,
          });
        }
      }
    }

    if (maxLedgerProcessed > lastIndexed) {
      await db.updateIndexedLedger(maxLedgerProcessed + 1);
      console.log(`Saved progress. Last indexed ledger set to: ${maxLedgerProcessed + 1}`);
    }
  } catch (e) {
    console.error('Error during ingestion loop:', e);
  }
}

// Start processing periodically
async function main() {
  console.log('[Mesa Ingest Worker] Starting background event loop...');
  while (true) {
    await processEvents();
    // Poll every 8 seconds
    await new Promise(resolve => setTimeout(resolve, 8000));
  }
}

main().catch(err => {
  console.error('[Mesa Ingest Worker] Critical failure:', err);
  process.exit(1);
});
