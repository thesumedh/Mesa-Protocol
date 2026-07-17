import { MesaSDK } from '../packages/mesa-sdk/src/index';

/**
 * Example 3: Auction Payout Bidder Script
 * 
 * Demonstrates how to check active bids in an auction-mode savings circle,
 * calculate a competitive discount bid, and submit it using the Mesa SDK.
 */
async function main() {
  console.log('=== Mesa SDK: Example 3 - Auction Bidder ===');

  // Initialize SDK
  const sdk = new MesaSDK({
    rpcUrl: 'https://soroban-testnet.stellar.org',
    factoryContractId: 'CBFXB5LZB2FJDVK66H7NPZEK2OE6VXNGYORSGE2W4V55UTG5NG63JGDG',
    network: 'testnet',
    networkPassphrase: 'Test SDF Network ; September 2015'
  });

  const circleAddress = 'CCKYJCI3JJIIJAL3PV4G3E3TOTPCZMBIN5QHLKSZB3LAQJ6LA4KQXNEU';
  const bidderAddress = 'GD5T6NNRFZ75T32T6V7UYR3US6K346F46H74PQ4PQ4PQ4PQ4PQ4PQ4PQ';

  // 1. Fetch current bids
  console.log(`Querying current auction bids for Circle: ${circleAddress}...`);
  const bidsRes = await sdk.circle.getAuctionBids(circleAddress);
  
  if (!bidsRes.success) {
    console.error('Failed to get auction bids:', bidsRes.error);
    return;
  }

  const bids = bidsRes.data;
  console.log('Active bids in current round (Member -> Discount Bid):');
  const bidEntries = Object.entries(bids);
  if (bidEntries.length === 0) {
    console.log(' - No bids placed yet in this round.');
  } else {
    bidEntries.forEach(([member, amount]) => {
      console.log(` - ${member}: $${(Number(amount) / 10000000).toFixed(2)} USDC`);
    });
  }

  // 2. Calculate a competitive bid
  // Find highest bid to beat it
  const highestBid = bidEntries.reduce((max, [_, amount]) => {
    const val = Number(amount);
    return val > max ? val : max;
  }, 0);

  const targetBid = highestBid === 0 
    ? 50000000 // Start with $5.00 USDC if no bids exist
    : highestBid + 10000000; // Bid $1.00 higher than highest bid

  console.log(`\nSuggested bid to lead the round: $${(targetBid / 10000000).toFixed(2)} USDC`);
  console.log(`Submitting bid for member: ${bidderAddress}...`);

  // Note: placeBid submits the transaction on-chain
  console.log('\n[SDK Code Pattern]');
  console.log(`
    const txResult = await sdk.circle.placeBid(
      "${circleAddress}",
      "${bidderAddress}",
      "${targetBid}"
    );
    if (txResult.success) {
      console.log("Bid placed successfully! Tx Hash:", txResult.data);
    } else {
      console.error("Failed to place bid:", txResult.error);
    }
  `);

  console.log('\n=== Example completed successfully ===');
}

main().catch(console.error);
