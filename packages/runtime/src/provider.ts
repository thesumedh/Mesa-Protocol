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
  /**
   * If outcome is 'suspended', the runtime parks the execution and waits
   * for an external event to call resume() with this suspensionKey.
   */
  suspensionKey?: string;
}

export interface ExternalEvent {
  suspensionKey: string;
  payload: Record<string, unknown>;
}

export interface MesaProvider {
  readonly name: string;
  metadata?: ProviderMetadata;
  execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult>;
  resume?(event: ExternalEvent, context: ExecutionContext): Promise<StepResult>;
  cancel?(context: ExecutionContext): Promise<void>;
  health?(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }>;
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

  // Default fallback metadata
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
