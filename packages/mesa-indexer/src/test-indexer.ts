import { db } from './db.js';

async function runTest() {
  console.log('--- Initializing database schema ---');
  await db.initSchema();
  console.log('✓ Schema initialized');

  console.log('--- Inserting dummy chama ---');
  const contractId = 'CCKYJCI3JJIIJAL3PV4G3E3TOTPCZMBIN5QHLKSZB3LAQJ6LA4KQXNEU';
  await db.insertOrUpdateChama({
    contract_id: contractId,
    chama_id: 1,
    name: 'Test Savings Circle',
    creator: 'GBRPYHHKPOAYIZILRS76TT576U5XGGB5P53NPH2N6G7B27C3Z5W633T3',
    contribution_amount: '100000000',
    max_members: 5,
    member_count: 1,
    current_round: 0,
    deadline: 0,
    status: 0, // Signup
    token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    duration: 3600,
    rotation_order: 'GBRPYHHKPOAYIZILRS76TT576U5XGGB5P53NPH2N6G7B27C3Z5W633T3',
  });
  console.log('✓ Chama inserted');

  console.log('--- Inserting member ---');
  await db.insertOrUpdateMember({
    contract_id: contractId,
    address: 'GBRPYHHKPOAYIZILRS76TT576U5XGGB5P53NPH2N6G7B27C3Z5W633T3',
    reputation: 100,
    joined_at: Date.now(),
  });
  console.log('✓ Member inserted');

  console.log('--- Inserting activity ---');
  await db.insertActivity({
    contract_id: contractId,
    tx_hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    type: 'created',
    member: 'GBRPYHHKPOAYIZILRS76TT576U5XGGB5P53NPH2N6G7B27C3Z5W633T3',
    amount: '100000000',
    round: 0,
    timestamp: Date.now(),
  });
  console.log('✓ Activity inserted');

  console.log('--- Fetching chamas ---');
  const chamas = await db.getChamas();
  console.log('Chamas in DB:', chamas);

  console.log('--- Fetching activities ---');
  const activities = await db.getActivities();
  console.log('Activities in DB:', activities);

  console.log('--- Cleaning up ---');
  await db.close();
  console.log('✓ DB connection closed');
}

runTest().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
