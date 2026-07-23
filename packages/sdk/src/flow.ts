import { randomUUID } from 'crypto';
import { MesaClient, MesaConfig } from './client';
import { 
  FlowDefinition, 
  StepDefinition, 
  FlowDefinitionSchema, 
  StepDefinitionSchema 
} from '@mesaprotocol/schema';

export { FlowDefinition, StepDefinition, MesaConfig };

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
 * Validates steps against canonical Zod schemas.
 */
export class FlowBuilder {
  private readonly _id: string;
  private readonly _name: string;
  private _version: string = '1.0.0';
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

  setVersion(version: string): this {
    this._version = version;
    return this;
  }

  /**
   * Listen for incoming XLM / USDC payment.
   */
  receive(params: {
    asset: string;
    minAmount: number | string;
    toAddress: string;
  }): this {
    validateAsset(params.asset, 'receive.asset');
    validateAddress(params.toAddress, 'receive.toAddress');
    if (typeof params.minAmount === 'number' && params.minAmount <= 0) {
      throw new RangeError(`Mesa SDK: minAmount must be a positive number. Got: ${params.minAmount}`);
    }

    this._steps.push(StepDefinitionSchema.parse({
      name: 'receive-payment',
      provider: 'stellar',
      params: { action: 'receive', ...params },
    }));
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

    this._steps.push(StepDefinitionSchema.parse({
      name: 'confirm-on-chain',
      provider: 'stellar',
      params: { action: 'confirm', ledgerCloses: closes },
    }));
    return this;
  }

  /**
   * Convert / Deposit asset using SEP-24 anchor interface.
   */
  convert(params: {
    from?: string;
    to?: string;
    anchor?: string;
    asset_code?: string;
    home_domain?: string;
    account?: string;
    amount?: number | string;
  }): this {
    const anchorDomain = params.anchor ?? params.home_domain;
    if (anchorDomain === undefined || anchorDomain === '') {
      throw new TypeError('Mesa SDK: convert.anchor must be a non-empty string.');
    }
    const assetCode = params.asset_code || params.to || params.from || 'USDC';
    const homeDomain = anchorDomain || 'testanchor.stellar.org';

    this._steps.push(StepDefinitionSchema.parse({
      name: 'convert-asset',
      provider: 'anchor',
      params: { 
        action: 'sep24-deposit', 
        asset_code: assetCode,
        home_domain: homeDomain,
        anchorUrl: homeDomain.startsWith('http') ? homeDomain : `https://${homeDomain}`,
        account: params.account,
        amount: params.amount,
        ...params 
      },
    }));
    return this;
  }

  /**
   * General SEP-24 Anchor Deposit/Withdrawal invocation.
   */
  anchor(params: {
    action?: 'sep24-deposit' | 'sep24-withdraw';
    asset_code: string;
    home_domain: string;
    account?: string;
    memo?: string;
    amount?: number | string;
  }): this {
    this._steps.push(StepDefinitionSchema.parse({
      name: `anchor-${params.action || 'sep24-deposit'}`,
      provider: 'anchor',
      params: {
        action: params.action || 'sep24-deposit',
        anchorUrl: params.home_domain.startsWith('http') ? params.home_domain : `https://${params.home_domain}`,
        ...params,
      },
    }));
    return this;
  }

  /**
   * Transfer funds to destination on Stellar.
   */
  transfer(params: {
    to: string;
    asset: string;
    amount?: number | string;
    senderSecretRef?: string;
  }): this {
    validateAddress(params.to, 'transfer.to');
    validateAsset(params.asset, 'transfer.asset');
    if (typeof params.amount === 'number' && params.amount <= 0) {
      throw new RangeError(`Mesa SDK: transfer.amount must be a positive number. Got: ${params.amount}`);
    }

    this._steps.push(StepDefinitionSchema.parse({
      name: 'transfer-funds',
      provider: 'stellar',
      params: { action: 'transfer', ...params },
    }));
    return this;
  }

  /**
   * Submit direct Stellar Horizon payment.
   */
  payment(params: {
    horizonUrl?: string;
    senderSecretRef?: string;
    to: string;
    amount: number | string;
    asset?: string;
  }): this {
    validateAddress(params.to, 'payment.to');
    if (typeof params.amount === 'number' && params.amount <= 0) {
      throw new RangeError(`Mesa SDK: payment.amount must be a positive number. Got: ${params.amount}`);
    }

    this._steps.push(StepDefinitionSchema.parse({
      name: 'stellar-payment',
      provider: 'stellar',
      params: { action: 'payment', ...params },
    }));
    return this;
  }

  /**
   * Invoke a Soroban Smart Contract method.
   */
  invoke(params: {
    contractId: string;
    method: string;
    args?: any;
    secretRef?: string;
    rpcUrl?: string;
  }): this {
    this._steps.push(StepDefinitionSchema.parse({
      name: `invoke-${params.method}`,
      provider: 'soroban',
      params: { action: 'invoke', ...params },
    }));
    return this;
  }

  /**
   * Delay execution for a specified duration in seconds.
   */
  delay(params: { seconds: number }): this {
    if (typeof params.seconds !== 'number' || params.seconds <= 0) {
      throw new RangeError(`Mesa SDK: delay.seconds must be a positive number. Got: ${params.seconds}`);
    }

    this._steps.push(StepDefinitionSchema.parse({
      name: `delay-${params.seconds}s`,
      provider: 'delay',
      params: { seconds: params.seconds },
    }));
    return this;
  }

  /**
   * Send webhook / suspend execution until external callback.
   */
  webhook(params: {
    url?: string;
    method?: string;
    payload?: Record<string, unknown>;
    suspensionKey?: string;
    hmacSecretRef?: string;
  } = {}): this {
    if (params.url) {
      try {
        new URL(params.url);
      } catch {
        throw new Error(`Mesa SDK: Invalid URL format for webhook.url: "${params.url}". Must be a valid HTTP/HTTPS URL.`);
      }
    }

    this._steps.push(StepDefinitionSchema.parse({
      name: 'send-webhook',
      provider: 'webhook',
      params,
    }));
    return this;
  }

  /**
   * Appends an arbitrary custom step to the flow.
   */
  step(step: StepDefinition): this {
    const parsed = StepDefinitionSchema.parse(step);
    this._steps.push(parsed);
    return this;
  }

  /**
   * Builds and validates the immutable FlowDefinition object.
   */
  build(): FlowDefinition {
    if (this._steps.length === 0) {
      throw new Error(`Mesa SDK: Flow "${this._name}" has no steps. At least one step is required.`);
    }

    const flowObj = {
      id: this._id,
      name: this._name,
      version: this._version,
      steps: this._steps,
    };

    return FlowDefinitionSchema.parse(flowObj);
  }

  async execute(options?: { runtimeUrl?: string; context?: Record<string, unknown> }): Promise<{ executionId: string; status: string }> {
    const flow = this.build();
    if (this._client) {
      return this._client.execute(flow, options?.context);
    }
    return Mesa.execute(flow, options);
  }
}

/**
 * Entry point for creating Mesa workflows.
 */
export class Mesa {
  private static _defaultClient: MesaClient = new MesaClient();
  private _client: MesaClient;

  constructor(config: MesaConfig = {}) {
    this._client = new MesaClient(config);
  }

  flow(name?: string, id?: string): FlowBuilder {
    return new FlowBuilder(name, id, this._client);
  }

  async register(flow: FlowDefinition): Promise<{ flowId: string; name: string }> {
    return this._client.register(flow);
  }

  static configure(config: MesaConfig): void {
    Mesa._defaultClient = new MesaClient(config);
  }

  static flow(name?: string, id?: string): FlowBuilder {
    return new FlowBuilder(name, id, Mesa._defaultClient);
  }

  static async register(flow: FlowDefinition): Promise<{ flowId: string; name: string }> {
    return Mesa._defaultClient.register(flow);
  }

  static async execute(
    flow: FlowDefinition,
    options?: { runtimeUrl?: string; context?: Record<string, unknown> }
  ): Promise<{ executionId: string; status: string }> {
    if (options?.runtimeUrl) {
      const customClient = new MesaClient({ runtimeUrl: options.runtimeUrl });
      return customClient.execute(flow, options.context);
    }
    return Mesa._defaultClient.execute(flow, options?.context);
  }
}
