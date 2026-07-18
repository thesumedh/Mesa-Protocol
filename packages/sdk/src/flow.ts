import { randomUUID } from 'crypto';
import { MesaClient } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StepDefinition {
  name: string;
  provider: string;
  params: Record<string, unknown>;
}

export interface FlowDefinition {
  id: string;
  name: string;
  steps: StepDefinition[];
}

// ─── FlowBuilder ──────────────────────────────────────────────────────────────

function validateAddress(address: string, fieldName: string): void {
  if (!address) {
    throw new TypeError(`Mesa SDK: "${fieldName}" is required and must be a non-empty string.`);
  }
  const isStellarAddr = /^G[A-Z2-7]{55}$/.test(address);
  if (!isStellarAddr && !address.startsWith('mock-') && address !== 'mock') {
    throw new Error(`Mesa SDK: Invalid Stellar address format for "${fieldName}": "${address}". Must be a 56-character G-address.`);
  }
}

function validateAsset(asset: string, fieldName: string): void {
  if (!asset) {
    throw new TypeError(`Mesa SDK: "${fieldName}" is required and must be a non-empty string.`);
  }
  const parts = asset.split(':');
  if (parts.length === 2) {
    const [code, issuer] = parts;
    if (!code || code.length > 12) {
      throw new Error(`Mesa SDK: Invalid asset code "${code}" in "${fieldName}". Must be 1-12 alphanumeric characters.`);
    }
    validateAddress(issuer, `${fieldName} issuer`);
  }
}

/**
 * Fluent builder that describes a Mesa workflow.
 * Does NOT contain business logic — only data.
 * The runtime executes; the SDK describes.
 */
export class FlowBuilder {
  private readonly _id: string;
  private readonly _name: string;
  private _steps: StepDefinition[] = [];
  private readonly _client?: MesaClient;

  constructor(name?: string, id?: string, client?: MesaClient) {
    if (name === '') {
      throw new TypeError('Mesa SDK: Flow name must be a non-empty string.');
    }
    const flowId = id ?? randomUUID();
    this._name = name ?? `flow-${flowId}`;
    this._id = flowId;
    this._client = client;
  }

  /**
   * Wait for an incoming payment to an address on Stellar.
   * The runtime suspends execution until the payment is detected
   * (via Horizon polling or inbound webhook resume).
   */
  receive(params: {
    asset: string;
    minAmount: number;
    toAddress: string;
  }): this {
    validateAsset(params.asset, 'receive.asset');
    validateAddress(params.toAddress, 'receive.toAddress');
    if (typeof params.minAmount !== 'number' || params.minAmount <= 0) {
      throw new RangeError(`Mesa SDK: minAmount must be a positive number. Got: ${params.minAmount}`);
    }

    this._steps.push({
      name: 'receive-payment',
      provider: 'stellar',
      params: { action: 'receive', ...params },
    });
    return this;
  }

  /**
   * Confirm that a transaction has been included in a ledger close.
   */
  confirm(params: { ledgerCloses?: number } = {}): this {
    const closes = params.ledgerCloses ?? 2;
    if (typeof closes !== 'number' || closes <= 0 || !Number.isInteger(closes)) {
      throw new RangeError(`Mesa SDK: ledgerCloses must be a positive integer. Got: ${closes}`);
    }

    this._steps.push({
      name: 'confirm-on-chain',
      provider: 'stellar',
      params: { action: 'confirm', ledgerCloses: closes },
    });
    return this;
  }

  /**
   * Convert one asset to another using a SEP-24 anchor.
   * The runtime suspends execution and waits for the anchor callback.
   */
  convert(params: {
    from: string;
    to: string;
    anchor: string;
  }): this {
    validateAsset(params.from, 'convert.from');
    validateAsset(params.to, 'convert.to');
    if (!params.anchor || typeof params.anchor !== 'string') {
      throw new TypeError(`Mesa SDK: convert.anchor must be a non-empty string.`);
    }

    this._steps.push({
      name: 'convert-asset',
      provider: 'anchor',
      params: { action: 'sep24-deposit', ...params },
    });
    return this;
  }

  /**
   * Transfer an asset to a destination address on Stellar.
   */
  transfer(params: {
    to: string;
    asset: string;
    amount?: number;
  }): this {
    validateAddress(params.to, 'transfer.to');
    validateAsset(params.asset, 'transfer.asset');
    if (params.amount !== undefined && (typeof params.amount !== 'number' || params.amount <= 0)) {
      throw new RangeError(`Mesa SDK: transfer.amount must be a positive number. Got: ${params.amount}`);
    }

    this._steps.push({
      name: 'transfer-funds',
      provider: 'stellar',
      params: { action: 'transfer', ...params },
    });
    return this;
  }

  /**
   * Send a real Stellar payment transaction.
   *
   * Use `senderSecretRef` to reference an environment variable name rather
   * than embedding the private key directly. The runtime resolves it at
   * execution time — the key is never stored in the workflow definition or DB.
   *
   * Example:
   *   .payment({ senderSecretRef: 'SENDER_SECRET', to: 'G...', asset: 'XLM', amount: 25 })
   *   // Set: process.env.SENDER_SECRET = 'SXXXXX...'
   */
  payment(params: {
    horizonUrl?: string;
    senderSecret?: string;
    senderSecretRef?: string;
    to: string;
    asset?: string;
    amount: number;
  }): this {
    validateAddress(params.to, 'payment.to');
    if (params.amount <= 0) {
      throw new RangeError(`Mesa SDK: payment.amount must be a positive number. Got: ${params.amount}`);
    }
    if (!params.senderSecret && !params.senderSecretRef) {
      throw new TypeError('Mesa SDK: payment requires either senderSecret or senderSecretRef.');
    }

    this._steps.push({
      name: 'stellar-payment',
      provider: 'stellar',
      params: { action: 'payment', ...params },
    });
    return this;
  }

  /**
   * Invoke a Soroban smart contract function.
   */
  invoke(params: {
    contractId: string;
    method: string;
    args?: Record<string, unknown>;
  }): this {
    if (!params.contractId || typeof params.contractId !== 'string') {
      throw new TypeError(`Mesa SDK: invoke.contractId must be a non-empty string.`);
    }
    if (!params.method || typeof params.method !== 'string') {
      throw new TypeError(`Mesa SDK: invoke.method must be a non-empty string.`);
    }

    this._steps.push({
      name: `invoke-${params.method}`,
      provider: 'soroban',
      params,
    });
    return this;
  }

  /**
   * Wait for a fixed duration before proceeding.
   */
  delay(params: { seconds: number }): this {
    if (typeof params.seconds !== 'number' || params.seconds <= 0) {
      throw new RangeError(`Mesa SDK: delay.seconds must be a positive number. Got: ${params.seconds}`);
    }

    this._steps.push({
      name: `delay-${params.seconds}s`,
      provider: 'delay',
      params,
    });
    return this;
  }

  /**
   * Send an HTTP POST notification to a URL when execution reaches this step.
   * Use `waitForCallback: true` to suspend until the recipient responds.
   */
  webhook(params: {
    url: string;
    events?: string[];
    waitForCallback?: boolean;
  }): this {
    if (!params.url || typeof params.url !== 'string') {
      throw new TypeError(`Mesa SDK: webhook.url is required.`);
    }
    try {
      new URL(params.url);
    } catch {
      throw new Error(`Mesa SDK: Invalid URL format for webhook.url: "${params.url}".`);
    }

    this._steps.push({
      name: 'send-webhook',
      provider: 'webhook',
      params,
    });
    return this;
  }

  /**
   * Add a generic or custom step to the flow definition.
   */
  step(name: string, provider?: string, params: Record<string, unknown> = {}): this {
    this._steps.push({
      name,
      provider: provider ?? name,
      params,
    });
    return this;
  }

  /**
   * Finalize the flow definition.
   * Returns a serializable object the runtime can register and execute.
   */
  build(): FlowDefinition {
    if (this._steps.length === 0) {
      throw new Error(`Flow "${this._name}" has no steps. Add at least one step before calling .build().`);
    }
    return {
      id: this._id,
      name: this._name,
      steps: [...this._steps],
    };
  }

  /**
   * Shortcut to build, register, and execute this flow directly.
   */
  async execute(context: Record<string, unknown> = {}): Promise<{ executionId: string }> {
    if (this._client) {
      return this._client.execute(this.build(), context);
    }
    return Mesa.execute(this.build(), context);
  }
}

// ─── Mesa Class / Namespace ───────────────────────────────────────────────────

let _defaultClient: MesaClient | null = null;

export class Mesa {
  private _client: MesaClient;

  constructor(config?: { endpoint?: string; runtimeUrl?: string }) {
    const url = config?.endpoint ?? config?.runtimeUrl;
    this._client = new MesaClient({ runtimeUrl: url });
  }

  /**
   * Start building a new flow definition.
   */
  flow(name?: string, id?: string): FlowBuilder {
    if (name === '') {
      throw new TypeError('Mesa SDK: Flow name must be a non-empty string.');
    }
    return new FlowBuilder(name, id, this._client);
  }

  /**
   * Register a flow definition with the runtime, then start an execution.
   */
  async execute(flow: FlowDefinition, context: Record<string, unknown> = {}): Promise<{ executionId: string }> {
    return this._client.execute(flow, context);
  }

  /**
   * Get the current status of a running execution.
   */
  async status(executionId: string): Promise<{ execution: unknown; events: unknown[] }> {
    return this._client.status(executionId);
  }

  // --- Static methods (for backwards compatibility with global configure flow) ---

  /**
   * Configure the default client. Call once at application startup.
   */
  static configure(config: { runtimeUrl?: string }): void {
    _defaultClient = new MesaClient(config);
  }

  /**
   * Start building a new flow using the default configuration.
   */
  static flow(name?: string, id?: string): FlowBuilder {
    if (name === '') {
      throw new TypeError('Mesa SDK: Flow name must be a non-empty string.');
    }
    return new FlowBuilder(name, id, _defaultClient ?? undefined);
  }

  /**
   * Register and execute a flow definition using the default client.
   */
  static async execute(flow: FlowDefinition, context: Record<string, unknown> = {}): Promise<{ executionId: string }> {
    const client = _defaultClient ?? new MesaClient({});
    return client.execute(flow, context);
  }

  /**
   * Get execution status using the default client.
   */
  static async status(executionId: string): Promise<{ execution: unknown; events: unknown[] }> {
    const client = _defaultClient ?? new MesaClient({});
    return client.status(executionId);
  }
}
