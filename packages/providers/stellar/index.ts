import { MesaProvider, StepDefinition, ExecutionContext, StepResult } from '../../runtime/src/provider';
import { 
  Horizon, 
  Keypair, 
  TransactionBuilder, 
  Operation, 
  Asset, 
  Networks 
} from '@stellar/stellar-sdk';

export class StellarProvider implements MesaProvider {
  readonly name = 'stellar';

  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const action = step.params.action as string || 'payment';
    const hasSecret = Boolean(step.params.senderSecret || (step.params.senderSecretRef && process.env[step.params.senderSecretRef as string]));
    const isMock = step.params.mock === true || step.params.mock === 'true' || process.env.STELLAR_MOCK === 'true' || action === 'receive' || !hasSecret || String(step.params.senderSecret).startsWith('SDUMMY');

    if (isMock) {
      return this.executeMock(action, step, context);
    }

    try {
      switch (action) {
        case 'receive':
          return this.executeMock(action, step, context);
        case 'transfer':
        case 'payment':
          return await this.executePayment(step, context);
        case 'path-payment':
          return await this.executePathPayment(step, context);
        default:
          throw new Error(`StellarProvider: Unknown action "${action}"`);
      }
    } catch (err: any) {
      console.error(`[StellarProvider] Error executing action ${action}:`, err.message);
      return {
        outcome: 'failed',
        error: `Stellar transaction failed: ${err.message}`,
      };
    }
  }

  // ─── Mock Mode Handlers ────────────────────────────────────────────────────

  private executeMock(action: string, step: StepDefinition, context: ExecutionContext): StepResult {
    console.log(`[StellarProvider] Running in MOCK mode for action: ${action}`);

    // SDK .receive() — simulates waiting for an incoming payment
    if (action === 'receive') {
      const minAmount = step.params.minAmount as number || 10;
      const toAddress = step.params.toAddress as string;
      return {
        outcome: 'completed',
        output: {
          receivedAmount: minAmount,
          toAddress,
          txHash: `mock-receive-${Math.random().toString(36).substring(7)}`,
        }
      };
    }

    // SDK .transfer() — simulates sending a payment to a destination
    if (action === 'transfer') {
      const amount = step.params.amount as number || 10;
      const to = step.params.to as string;
      return {
        outcome: 'completed',
        output: {
          txHash: `mock-transfer-${Math.random().toString(36).substring(7)}`,
          amountSent: amount,
          to,
        }
      };
    }

    if (action === 'payment') {
      const amount = step.params.amount as number || 10;
      const to = step.params.to as string;
      return {
        outcome: 'completed',
        output: {
          txHash: `mock-tx-${Math.random().toString(36).substring(7)}`,
          amountSent: amount,
          to,
        }
      };
    }

    if (action === 'path-payment') {
      const sendAmount = step.params.sendAmount as number || 10;
      const destMin = step.params.destMin as number || 9.5;
      return {
        outcome: 'completed',
        output: {
          txHash: `mock-path-tx-${Math.random().toString(36).substring(7)}`,
          swappedAmount: sendAmount,
          destAmountReceived: destMin,
          pathUsed: ['XLM', 'USDC'],
        }
      };
    }

    throw new Error(`StellarProvider: Unknown mock action "${action}"`);
  }

  // ─── Real Payment Execution ────────────────────────────────────────────────

  private async executePayment(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const { horizonUrl, senderSecret, to, amount, asset } = step.params as {
      horizonUrl?: string;
      senderSecret: string;
      to: string;
      amount: number;
      asset?: string; // Format: 'CODE:ISSUER' or 'XLM'
    };

    const serverUrl = horizonUrl || 'https://horizon-testnet.stellar.org';
    const server = new Horizon.Server(serverUrl);
    const senderKeypair = Keypair.fromSecret(senderSecret);

    console.log(`[StellarProvider] Preparing payment of ${amount} ${asset || 'XLM'} to ${to}`);

    // Fetch sender account details to get sequence number
    const account = await server.loadAccount(senderKeypair.publicKey());
    
    // Parse Asset
    const stellarAsset = this.parseAssetString(asset);

    const transaction = new TransactionBuilder(account, {
      fee: '1000', // 0.0001 XLM (high base fee for testnet reliability)
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: to,
          asset: stellarAsset,
          amount: amount.toString(),
        })
      )
      .setTimeout(60) // 1 minute timeout
      .build();

    transaction.sign(senderKeypair);
    
    console.log('[StellarProvider] Submitting payment transaction to Horizon...');
    const result = await server.submitTransaction(transaction);
    console.log(`[StellarProvider] Payment successful. Hash: ${result.hash}`);

    return {
      outcome: 'completed',
      output: {
        txHash: result.hash,
        ledger: result.ledger,
        amountSent: amount,
        to,
      },
    };
  }

  // ─── Real Path Payment Execution ───────────────────────────────────────────

  private async executePathPayment(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const { 
      horizonUrl, 
      senderSecret, 
      sendAsset, 
      sendAmount, 
      destAsset, 
      destMin, 
      to 
    } = step.params as {
      horizonUrl?: string;
      senderSecret: string;
      sendAsset: string;   // 'XLM' or 'USDC:G...'
      sendAmount: number;
      destAsset: string;   // 'USDC:G...' or 'XLM'
      destMin: number;
      to: string;
    };

    const serverUrl = horizonUrl || 'https://horizon-testnet.stellar.org';
    const server = new Horizon.Server(serverUrl);
    const senderKeypair = Keypair.fromSecret(senderSecret);

    console.log(`[StellarProvider] Preparing path payment: send ${sendAmount} ${sendAsset} to convert to min ${destMin} ${destAsset} for recipient ${to}`);

    const account = await server.loadAccount(senderKeypair.publicKey());
    const stellarSendAsset = this.parseAssetString(sendAsset);
    const stellarDestAsset = this.parseAssetString(destAsset);

    const transaction = new TransactionBuilder(account, {
      fee: '1000',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset: stellarSendAsset,
          sendAmount: sendAmount.toString(),
          destination: to,
          destAsset: stellarDestAsset,
          destMin: destMin.toString(),
          path: [], // Empty path lets Horizon find the best swap route
        })
      )
      .setTimeout(60)
      .build();

    transaction.sign(senderKeypair);

    console.log('[StellarProvider] Submitting path payment transaction to Horizon...');
    const result = await server.submitTransaction(transaction);
    console.log(`[StellarProvider] Path payment successful. Hash: ${result.hash}`);

    return {
      outcome: 'completed',
      output: {
        txHash: result.hash,
        ledger: result.ledger,
        swappedAmount: sendAmount,
        destAmountReceived: destMin,
      },
    };
  }

  // ─── Observability & Health Check ──────────────────────────────────────────

  async health(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    try {
      const server = new Horizon.Server('https://horizon-testnet.stellar.org');
      const feeStats = await server.feeStats();
      return { 
        status: 'healthy', 
        details: { 
          horizon: 'https://horizon-testnet.stellar.org', 
          latestLedger: feeStats.last_ledger_base_fee 
        } 
      };
    } catch (e: any) {
      return { 
        status: 'unhealthy', 
        details: { error: e.message } 
      };
    }
  }

  // ─── Helper: Parse Asset Code:Issuer ───────────────────────────────────────

  private parseAssetString(assetStr?: string): Asset {
    if (!assetStr || assetStr.toUpperCase() === 'XLM') {
      return Asset.native();
    }
    const parts = assetStr.split(':');
    if (parts.length !== 2) {
      throw new Error(`Invalid asset format "${assetStr}". Must be "CODE:ISSUER" or "XLM"`);
    }
    return new Asset(parts[0], parts[1]);
  }
}
