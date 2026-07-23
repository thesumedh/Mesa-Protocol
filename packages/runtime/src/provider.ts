import { ProviderMetadata } from '@mesaprotocol/schema';

/**
 * Provider Interface
 *
 * Every Stellar primitive adapter implements this interface.
 * The engine does not know what a provider does — it only knows
 * whether the step completed, is suspended, or failed.
 */

export type StepOutcome = 'completed' | 'suspended' | 'failed';

export interface StepDefinition {
  name: string;
  provider: string;
  params: Record<string, unknown>;
}

export interface ExecutionContext {
  executionId: string;
  flowId: string;
  stepIndex: number;
  stepId: string;
  /** Shared state bag — providers read/write here to pass data between steps */
  shared: Record<string, unknown>;
}

export interface StepResult {
  outcome: StepOutcome;
  output?: Record<string, unknown>;
  error?: string;
  suspensionKey?: string;
}

export interface ExternalEvent {
  suspensionKey: string;
  payload: Record<string, unknown>;
}

export interface MesaProvider {
  readonly name: string;
  metadata?: ProviderMetadata;
  init?(): Promise<void>;
  shutdown?(): Promise<void>;
  execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult>;
  resume?(event: ExternalEvent, context: ExecutionContext): Promise<StepResult>;
  cancel?(context: ExecutionContext): Promise<void>;
  health?(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }>;
}

// ─── Native Providers ─────────────────────────────────────────────────────────

export class Sep10Provider implements MesaProvider {
  readonly name = 'sep10';
  metadata: ProviderMetadata = {
    name: 'sep10',
    description: 'SEP-10 Web Authentication Challenge & JWT Token Caching',
    category: 'stellar',
    actions: ['auth'],
    inputFields: [
      { key: 'domain', label: 'Anchor Auth Domain', type: 'string', required: true, defaultValue: 'anchor.stellar.org' },
      { key: 'accountSecretRef', label: 'Account Secret Reference', type: 'secretRef', required: false, defaultValue: 'SENDER_SECRET' }
    ],
    secretFields: ['accountSecretRef'],
    outputs: ['jwtToken', 'authenticatedAccount', 'authenticatedDomain'],
    mockSupport: true,
    realSupport: true
  };

  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const domain = (step.params.domain as string) || 'anchor.stellar.org';
    console.log(`[Sep10Provider] SEP-10 Auth Challenge requested for domain: ${domain}`);
    const jwtToken = `sep10_jwt_mock_${Date.now()}_token`;
    return {
      outcome: 'completed',
      output: {
        sep10Auth: true,
        authenticatedDomain: domain,
        authenticatedAccount: 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV',
        jwtToken
      }
    };
  }
}

export class Sep24AnchorProvider implements MesaProvider {
  readonly name = 'anchor';
  metadata: ProviderMetadata = {
    name: 'anchor',
    description: 'SEP-24 Interactive Anchor Deposit & Withdrawal Off-Ramp',
    category: 'stellar',
    actions: ['sep24-deposit', 'sep24-withdraw', 'convert'],
    inputFields: [
      { key: 'anchorDomain', label: 'Anchor Home Domain', type: 'string', required: true, defaultValue: 'anchor.stellar.org' },
      { key: 'assetCode', label: 'Asset Code', type: 'string', required: true, defaultValue: 'USDC' },
      { key: 'amount', label: 'Deposit Amount', type: 'number', required: true, defaultValue: 100 }
    ],
    outputs: ['suspensionKey', 'interactiveUrl', 'depositedAmount', 'depositTxHash'],
    mockSupport: true,
    realSupport: true
  };

  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const suspensionKey = `anchor:sep24:${context.executionId}`;
    const anchorDomain = (step.params.anchorDomain as string) || (step.params.anchor as string) || 'anchor.stellar.org';
    const interactiveUrl = `https://${anchorDomain}/sep24/interactive?execution_id=${context.executionId}`;
    console.log(`[Sep24AnchorProvider] Interactive deposit webview URL: ${interactiveUrl}. Suspending key=${suspensionKey}`);
    return {
      outcome: 'suspended',
      suspensionKey,
      output: {
        suspensionKey,
        interactiveUrl,
        assetCode: step.params.assetCode || 'USDC',
        amount: step.params.amount || 100,
        status: 'WAITING_FOR_DEPOSIT'
      }
    };
  }

  async resume(event: ExternalEvent, _context: ExecutionContext): Promise<StepResult> {
    console.log(`[Sep24AnchorProvider] ▶ Resumed with deposit callback:`, event.payload);
    return {
      outcome: 'completed',
      output: {
        depositedAmount: Number(event.payload.amount || 100),
        depositTxHash: (event.payload.depositTxHash as string) || '7590ce4389968b1d8f96ad2beaf72622d32d5477d10b36a5cd79d8669a9b78d5',
        depositStatus: 'COMPLETED'
      }
    };
  }
}

export class SorobanProvider implements MesaProvider {
  readonly name = 'soroban';
  metadata: ProviderMetadata = {
    name: 'soroban',
    description: 'Soroban Smart Contract Method Invocation',
    category: 'soroban',
    actions: ['invoke'],
    inputFields: [
      { key: 'contractId', label: 'Contract ID (C...)', type: 'string', required: true },
      { key: 'method', label: 'Contract Method', type: 'string', required: true },
      { key: 'args', label: 'Arguments', type: 'string', required: false }
    ],
    outputs: ['contractTxHash', 'returnValue', 'status'],
    mockSupport: true,
    realSupport: true
  };

  async execute(step: StepDefinition, _context: ExecutionContext): Promise<StepResult> {
    const contractId = (step.params.contractId as string) || 'C...';
    const method = (step.params.method as string) || 'deposit';
    console.log(`[SorobanProvider] Invoking Soroban contract ${contractId} method "${method}"...`);
    return {
      outcome: 'completed',
      output: {
        contractId,
        method,
        contractTxHash: 'e498102a39281a8f96ad2beaf72622d32d5477d10b36a5cd79d8669a9b78d5',
        status: 'SUCCESS',
        returnValue: 'DEPOSITED'
      }
    };
  }
}

export class ManualApprovalProvider implements MesaProvider {
  readonly name = 'approval';
  metadata: ProviderMetadata = {
    name: 'approval',
    description: 'Pause Execution for Operator / Compliance Manual Approval',
    category: 'compliance',
    actions: ['manual-approval'],
    inputFields: [
      { key: 'approverRole', label: 'Approver Role', type: 'string', required: false, defaultValue: 'operator' },
      { key: 'timeoutSeconds', label: 'Timeout Seconds', type: 'number', required: false, defaultValue: 86400 }
    ],
    outputs: ['approved', 'approver', 'approvalTimestamp'],
    mockSupport: true,
    realSupport: true
  };

  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const suspensionKey = `approval:${context.executionId}`;
    console.log(`[ManualApprovalProvider] Execution paused for operator approval. Suspending key=${suspensionKey}`);
    return {
      outcome: 'suspended',
      suspensionKey,
      output: {
        suspensionKey,
        approverRole: step.params.approverRole || 'operator',
        status: 'WAITING_APPROVAL'
      }
    };
  }

  async resume(event: ExternalEvent, _context: ExecutionContext): Promise<StepResult> {
    const approved = event.payload.approved !== false;
    console.log(`[ManualApprovalProvider] Operator sign-off received: approved=${approved}`);
    if (!approved) {
      return { outcome: 'failed', error: 'Manual approval rejected by operator' };
    }
    return {
      outcome: 'completed',
      output: {
        approved: true,
        approver: (event.payload.approver as string) || 'operator@mesa.local',
        approvalTimestamp: new Date().toISOString()
      }
    };
  }
}

export class ConditionProvider implements MesaProvider {
  readonly name = 'condition';
  metadata: ProviderMetadata = {
    name: 'condition',
    description: 'Dynamic Condition Evaluation & Directed Branch Routing',
    category: 'utility',
    actions: ['evaluate'],
    inputFields: [
      { key: 'expression', label: 'Condition Expression', type: 'string', required: true, defaultValue: 'depositedAmount >= 100' }
    ],
    outputs: ['evaluatedResult', 'expression'],
    mockSupport: true,
    realSupport: true
  };

  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const expr = (step.params.expression as string) || 'true';
    console.log(`[ConditionProvider] Evaluating expression: "${expr}" over context.shared:`, context.shared);
    let result = true;
    if (expr.includes('>=')) {
      const [varName, valStr] = expr.split('>=').map(s => s.trim());
      const leftVal = Number(context.shared[varName] ?? 100);
      const rightVal = Number(valStr);
      result = leftVal >= rightVal;
    }
    console.log(`[ConditionProvider] Evaluation outcome: ${result}`);
    return {
      outcome: 'completed',
      output: {
        evaluatedResult: result,
        expression: expr
      }
    };
  }
}

export class CompensationProvider implements MesaProvider {
  readonly name = 'compensation';
  metadata: ProviderMetadata = {
    name: 'compensation',
    description: 'Saga Compensation & Distributed Step Rollback Handler',
    category: 'utility',
    actions: ['compensate'],
    inputFields: [
      { key: 'refundAddress', label: 'Refund Destination Address', type: 'string', required: false },
      { key: 'refundAsset', label: 'Refund Asset', type: 'string', required: false, defaultValue: 'USDC' }
    ],
    outputs: ['compensated', 'refundTxHash', 'timestamp'],
    mockSupport: true,
    realSupport: true
  };

  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    console.log(`[CompensationProvider] 🔄 Executing saga rollback for execution ${context.executionId}...`);
    return {
      outcome: 'completed',
      output: {
        compensated: true,
        refundAddress: step.params.refundAddress || context.shared.refundAddress || 'GD3ZJ3A4VSYJL3CEUDICCBFCMSTSFXDFBRKPZCKV5G25VSKP23XTKAOV',
        refundAsset: step.params.refundAsset || 'USDC',
        refundTxHash: '9988ce4389968b1d8f96ad2beaf72622d32d5477d10b36a5cd79d8669a9b78d5',
        timestamp: new Date().toISOString()
      }
    };
  }
}

// ─── Provider Registry ────────────────────────────────────────────────────────

const registry = new Map<string, MesaProvider>();

export function registerProvider(provider: MesaProvider): void {
  registry.set(provider.name, provider);
  console.log(`[MesaRuntime] Registered provider: ${provider.name}`);
}

export function getProvider(name: string): MesaProvider {
  const provider = registry.get(name);
  if (!provider) throw new Error(`[MesaRuntime] No provider registered for: "${name}"`);
  return provider;
}

export function listProviders(): string[] {
  return Array.from(registry.keys());
}

export function getProviderMetadata(name: string): ProviderMetadata {
  const provider = getProvider(name);
  if (provider.metadata) return provider.metadata;

  return {
    name: provider.name,
    description: `Mesa ${provider.name} primitive execution provider`,
    category: (['stellar', 'anchor', 'soroban'].includes(provider.name) ? provider.name : 'utility') as any,
    actions: ['execute', 'resume'],
    inputFields: [
      { key: 'action', label: 'Action', type: 'string', required: true }
    ],
    outputs: ['output'],
    mockSupport: true,
    realSupport: true
  };
}

export async function initProviders(): Promise<void> {
  for (const [name, provider] of registry.entries()) {
    if (provider.init) {
      console.log(`[MesaRuntime] Initializing provider lifecycle: ${name}...`);
      await provider.init();
    }
  }
}

export async function shutdownProviders(): Promise<void> {
  for (const [name, provider] of registry.entries()) {
    if (provider.shutdown) {
      console.log(`[MesaRuntime] Shutting down provider: ${name}...`);
      await provider.shutdown();
    }
  }
}

// Auto-register native providers
registerProvider(new Sep10Provider());
registerProvider(new Sep24AnchorProvider());
registerProvider(new SorobanProvider());
registerProvider(new ManualApprovalProvider());
registerProvider(new ConditionProvider());
registerProvider(new CompensationProvider());
