import { MesaSDK } from '../packages/mesa-sdk/src/index';

/**
 * Example 2: Auto-Contribution & Verification Script
 * 
 * Demonstrates how to check if a user has contributed to the current round
 * and perform automated contributions using the Mesa SDK.
 */
async function main() {
  console.log('=== Mesa SDK: Example 2 - Auto-Contribution Checker ===');

  // Initialize SDK
  const sdk = new MesaSDK({
    rpcUrl: 'https://soroban-testnet.stellar.org',
    factoryContractId: 'CBFXB5LZB2FJDVK66H7NPZEK2OE6VXNGYORSGE2W4V55UTG5NG63JGDG',
    network: 'testnet',
    networkPassphrase: 'Test SDF Network ; September 2015'
  });

  const circleAddress = 'CCKYJCI3JJIIJAL3PV4G3E3TOTPCZMBIN5QHLKSZB3LAQJ6LA4KQXNEU';
  const userAddress = 'GD5T6NNRFZ75T32T6V7UYR3US6K346F46H74PQ4PQ4PQ4PQ4PQ4PQ4PQ';

  console.log(`Checking status of Circle: ${circleAddress}...`);

  // 1. Get current circle state
  const stateRes = await sdk.circle.getState(circleAddress);
  if (!stateRes.success) {
    console.error('Failed to query circle state:', stateRes.error);
    return;
  }

  const circle = stateRes.data;
  console.log(` - Current Round: ${circle.current_round}`);
  console.log(` - Round Deadline: ${new Date(circle.deadline * 1000).toLocaleString()}`);
  console.log(` - Members count: ${circle.members.length}/${circle.max_members}`);

  // 2. Check if the user has contributed to this round
  console.log(`\nVerifying contribution status for user: ${userAddress}...`);
  const checkRes = await sdk.circle.hasContributed(circleAddress, circle.current_round, userAddress);
  
  if (checkRes.success) {
    const contributed = checkRes.data;
    if (contributed) {
      console.log(`✓ User ${userAddress} has ALREADY contributed to Round ${circle.current_round}. No action needed.`);
    } else {
      console.log(`⚠ User ${userAddress} has NOT contributed to Round ${circle.current_round} yet!`);
      console.log('Triggering automated SDK contribution transaction...');

      // Note: Auto-contribute triggers transaction
      console.log('\n[SDK Code Pattern]');
      console.log(`
        const txResult = await sdk.circle.contribute(
          "${circleAddress}",
          "${userAddress}"
        );
        if (txResult.success) {
          console.log("Auto-contribution successful! Tx Hash:", txResult.data);
        } else {
          console.error("Failed to deposit contribution:", txResult.error);
        }
      `);
    }
  } else {
    console.error('Failed to verify user contribution status:', checkRes.error);
  }

  console.log('\n=== Example completed successfully ===');
}

main().catch(console.error);
