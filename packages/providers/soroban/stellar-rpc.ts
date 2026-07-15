import { MesaProvider, StepDefinition, ExecutionContext, StepResult, ExternalEvent } from '../../runtime/src/provider';

/**
 * StellarRpcProvider
 *
 * Handles native Stellar operations:
 * - Monitoring an address for an incoming payment (step: receive)
 * - Submitting a path payment transaction (step: transfer)
 * - Confirming ledger close of a known transaction hash (step: confirm)
 *
 * This provider requires @stellar/stellar-sdk at runtime.
 * In the runtime package, it is imported dynamically.
 */
export class StellarRpcProvider implements MesaProvider {
  readonly name = 'stellar';

  private rpcUrl: string;
  private networkPassphrase: string;

  constructor(config: { rpcUrl: string; networkPassphrase: string }) {
    this.rpcUrl = config.rpcUrl;
    this.networkPassphrase = config.networkPassphrase;
  }

  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const action = step.params.action as string;

    switch (action) {
      case 'receive':
        return this.awaitPayment(step, context);
      case 'confirm':
        return this.confirmTransaction(step, context);
      case 'transfer':
        return this.submitTransfer(step, context);
      default:
        throw new Error(`StellarRpcProvider: unknown action "${action}"`);
    }
  }

  /**
   * Checks if a payment to `toAddress` of at least `minAmount` of `asset`
   * has arrived. Suspends the execution if not yet seen.
   */
  private async awaitPayment(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const { toAddress, asset, minAmount } = step.params as {
      toAddress: string;
      asset: string;
      minAmount: number;
    };

    const suspensionKey = `stellar:receive:${toAddress}:${context.executionId}`;

    // In production: poll Horizon for recent payments to toAddress.
    // If found, return completed. If not yet, return suspended.
    // For MVP demo, we check the shared context for an injected payment event.
    const received = context.shared['receivedPayment'] as { asset: string; amount: number } | undefined;
    if (received && received.asset === asset && received.amount >= minAmount) {
      return {
        outcome: 'completed',
        output: { receivedAmount: received.amount, receivedAsset: received.asset },
      };
    }

    // Suspend and wait for webhook resume
    return { outcome: 'suspended', suspensionKey };
  }

  async resume(event: ExternalEvent, _context: ExecutionContext): Promise<StepResult> {
    const { asset, amount, txHash } = event.payload as { asset?: string; amount?: number; txHash?: string };
    return {
      outcome: 'completed',
      output: { receivedAsset: asset, receivedAmount: amount, txHash },
    };
  }

  /**
   * Checks ledger confirmation of a known txHash.
   */
  private async confirmTransaction(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const txHash = (step.params.txHash as string) ?? (context.shared['txHash'] as string);
    if (!txHash) throw new Error('StellarRpcProvider: no txHash in params or shared context');

    // In production: call Horizon GET /transactions/:hash and check status.
    // For MVP: assume confirmed if txHash is in shared context.
    return {
      outcome: 'completed',
      output: { confirmed: true, txHash },
    };
  }

  /**
   * Submits a path payment XDR using the configured signer.
   */
  private async submitTransfer(step: StepDefinition, _context: ExecutionContext): Promise<StepResult> {
    const { to, asset, amount } = step.params as { to: string; asset: string; amount: number };
    if (!to) throw new Error('StellarRpcProvider: transfer requires "to" address');

    // In production: build and sign the transaction, submit to Stellar RPC,
    // poll for ledger confirmation.
    // For MVP: return a deterministic placeholder response.
    const simulatedTxHash = `simulated_transfer_${Date.now()}`;
    return {
      outcome: 'completed',
      output: { txHash: simulatedTxHash, to, asset, amount },
    };
  }
}
