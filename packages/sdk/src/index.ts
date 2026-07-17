/**
 * @mesaprotocol/sdk
 *
 * Mesa is a financial workflow orchestration platform for Stellar.
 * This SDK lets developers describe workflows as code.
 * The Mesa Runtime executes them durably.
 *
 * Usage:
 *   import { Mesa } from '@mesaprotocol/sdk';
 *
 *   const flow = Mesa.flow('cross-border-payment')
 *     .receive({ asset: 'XLM', minAmount: 10, toAddress: '...' })
 *     .delay({ seconds: 5 })
 *     .transfer({ to: '...', asset: 'USDC', amount: 10 })
 *     .webhook({ url: 'https://myapp.com/webhooks/mesa' })
 *     .build();
 *
 *   const { executionId } = await Mesa.execute(flow);
 */

export { FlowBuilder, Mesa } from './flow';
export type { FlowDefinition, StepDefinition } from './flow';
export type { MesaConfig, ExecutionResult } from './client';
export { MesaClient } from './client';

// Re-export signer types for convenience
export type { MesaSigner } from './signer';
export { SecretKeySigner, FreighterSigner } from './signer';
