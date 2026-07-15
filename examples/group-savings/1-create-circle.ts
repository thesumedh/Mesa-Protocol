import { MesaSDK } from '../packages/mesa-sdk/src/index';

/**
 * Example 1: Creating a Group Savings Circle (ROSCA) on Stellar
 * 
 * This example shows how to initialize the Mesa SDK, list existing circles,
 * and spawn a new savings circle via the MesaFactory.
 */
async function main() {
  console.log('=== Mesa SDK: Example 1 - Create Savings Circle ===');

  // 1. Initialize the SDK pointing to Stellar Testnet
  const sdk = new MesaSDK({
    rpcUrl: 'https://soroban-testnet.stellar.org',
    factoryContractId: 'CBFXB5LZB2FJDVK66H7NPZEK2OE6VXNGYORSGE2W4V55UTG5NG63JGDG',
    network: 'testnet',
    networkPassphrase: 'Test SDF Network ; September 2015'
  });

  // 2. Fetch existing savings circles registered in the protocol
  console.log('Fetching active circles from factory registry...');
  const listRes = await sdk.factory.listChamas(5, 0);
  if (listRes.success) {
    console.log(`Found ${listRes.data.length} registered circles:`);
    listRes.data.forEach(c => {
      console.log(` - ID #${c.id}: "${c.name}" | Pot contribution: ${c.contribution_amount} USDC | Members: ${c.member_count}/${c.max_members}`);
    });
  } else {
    console.warn('Failed to retrieve circles registry:', listRes.error);
  }

  // 3. Define the parameters for our new Circle
  const circleConfig = {
    name: 'Nairobi Savers Circle',
    contributionAmount: '100000000', // $100.00 USDC (7 decimals)
    maxMembers: 5,
    duration: 604800, // 1 week in seconds
    tokenAddress: 'CCW677VEEOT3RMA7TE6CX2TT3UYR3US6K346F46H74PQ4PQ4PQ4PQ4PQ', // Mock USDC
    creatorAddress: 'GD5T6NNRFZ75T32T6V7UYR3US6K346F46H74PQ4PQ4PQ4PQ4PQ4PQ4PQ',
    payoutMode: 1 // 0 = Fixed Rotation, 1 = Auction Bid Payout
  };

  console.log(`\nSpawning a new circle: "${circleConfig.name}"...`);
  console.log(` - Type: ${circleConfig.payoutMode === 1 ? 'Auction Payout' : 'Fixed Rotation'}`);
  console.log(` - Contribution Target: $100.00 USDC`);

  // Note: Spawning a circle requires signing transaction using Freighter or a local Keypair
  // Here, we simulate the structure a developer would call:
  console.log('\n[SDK Code Pattern]');
  console.log(`
    const result = await sdk.factory.createChama(
      "${circleConfig.name}",
      "${circleConfig.contributionAmount}",
      ${circleConfig.maxMembers},
      ${circleConfig.duration},
      "${circleConfig.tokenAddress}",
      "${circleConfig.creatorAddress}",
      ${circleConfig.payoutMode}
    );
    if (result.success) {
      console.log("Deployed successfully! Contract Address:", result.data.contractId);
    }
  `);

  console.log('\n=== Example completed successfully ===');
}

main().catch(console.error);
