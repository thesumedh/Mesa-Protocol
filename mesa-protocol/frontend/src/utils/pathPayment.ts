import { Asset, SUPPORTED_ASSETS } from './config';

export interface PathResult {
  sourceAsset: Asset;
  sourceAmount: number;
  destinationAsset: Asset;
  destinationAmount: number;
  exchangeRate: number;
  path: string[]; // intermediate assets
}

// Simulated mock rates for Testnet when Horizon pathfinder is unavailable
const MOCK_EXCHANGE_RATES: Record<string, number> = {
  'EURC_USDC': 0.92, // 1 USDC = 0.92 EURC
  'KES_USDC': 130.5, // 1 USDC = 130.5 KES
  'XLM_USDC': 8.2,   // 1 USDC = 8.2 XLM
  'USDC_USDC': 1.0,
};

export async function findStrictReceivePath(
  sourceAssetCode: string,
  destAssetCode: string,
  destAmount: number,
  userAddress?: string
): Promise<PathResult> {
  const sourceAsset = SUPPORTED_ASSETS[sourceAssetCode];
  const destAsset = SUPPORTED_ASSETS[destAssetCode];

  if (!sourceAsset || !destAsset) {
    throw new Error('Unsupported asset code');
  }

  // Attempt real Horizon Pathfinding call
  try {
    const sourceAssetQuery = sourceAsset.issuer === 'native' 
      ? 'native' 
      : `${sourceAsset.code}:${sourceAsset.issuer}`;
    const destAssetQuery = destAsset.issuer === 'native' 
      ? 'native' 
      : `${destAsset.code}:${destAsset.issuer}`;

    const url = `https://horizon-testnet.stellar.org/paths/strict-receive?source_assets=${sourceAssetQuery}&destination_asset_type=${destAsset.issuer === 'native' ? 'native' : 'credit_alphanum4'}&destination_asset_code=${destAsset.code}&destination_asset_issuer=${destAsset.issuer}&destination_amount=${destAmount}`;

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data._embedded && data._embedded.records && data._embedded.records.length > 0) {
        const record = data._embedded.records[0];
        const sourceAmount = parseFloat(record.source_amount);
        return {
          sourceAsset,
          sourceAmount,
          destinationAsset: destAsset,
          destinationAmount: destAmount,
          exchangeRate: sourceAmount / destAmount,
          path: record.path || [],
        };
      }
    }
  } catch (err) {
    console.warn("Horizon Pathfinder call failed. Using mock exchange rate:", err);
  }

  // Fallback to simulated rates
  const key = `${sourceAssetCode}_${destAssetCode}`;
  const inverseKey = `${destAssetCode}_${sourceAssetCode}`;
  let rate = 1.0;

  if (MOCK_EXCHANGE_RATES[key]) {
    rate = MOCK_EXCHANGE_RATES[key];
  } else if (MOCK_EXCHANGE_RATES[inverseKey]) {
    rate = 1.0 / MOCK_EXCHANGE_RATES[inverseKey];
  } else {
    // Arbitrary cross-rate
    rate = 1.5;
  }

  const sourceAmount = parseFloat((destAmount * rate).toFixed(4));
  return {
    sourceAsset,
    sourceAmount,
    destinationAsset: destAsset,
    destinationAmount: destAmount,
    exchangeRate: rate,
    path: [],
  };
}

export interface UserBalance {
  assetCode: string;
  balance: number;
}

export async function fetchUserBalances(userAddress: string): Promise<UserBalance[]> {
  try {
    const url = `https://horizon-testnet.stellar.org/accounts/${userAddress}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      const balances = data.balances.map((b: any) => {
        if (b.asset_type === 'native') {
          return { assetCode: 'XLM', balance: parseFloat(b.balance) };
        }
        return { assetCode: b.asset_code, balance: parseFloat(b.balance) };
      });
      return balances;
    }
  } catch (err) {
    console.warn("Could not fetch user balances from testnet:", err);
  }

  // Default mock balances for user wallet
  return [
    { assetCode: 'XLM', balance: 500.0 },
    { assetCode: 'USDC', balance: 120.0 },
    { assetCode: 'EURC', balance: 80.0 },
    { assetCode: 'KES', balance: 15000.0 },
  ];
}
