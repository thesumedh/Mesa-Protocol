import { FlowDefinition, StepDefinition } from '@mesaprotocol/schema';
export * from '@mesaprotocol/schema';
export { FlowDefinition, StepDefinition } from '@mesaprotocol/schema';

interface MesaConfig {
    runtimeUrl?: string;
    endpoint?: string;
    apiKey?: string;
}
interface ExecutionResult {
    executionId: string;
    flowId: string;
    status: string;
}
/**
 * MesaClient
 *
 * Sends flow definitions and execution requests to the Mesa Runtime.
 * Supports API Key authentication and custom runtime endpoints.
 */
declare class MesaClient {
    private runtimeUrl;
    private apiKey?;
    constructor(config?: MesaConfig);
    flow(name?: string, id?: string): FlowBuilder;
    /**
     * Register a flow definition directly with the runtime.
     */
    register(flow: FlowDefinition): Promise<{
        flowId: string;
        name: string;
    }>;
    /**
     * Register the flow definition, then start an execution.
     */
    execute(flow: FlowDefinition, context?: Record<string, unknown>): Promise<ExecutionResult>;
    /**
     * Get status and event log for an execution.
     */
    status(executionId: string): Promise<{
        execution: unknown;
        events: unknown[];
    }>;
    private _post;
    private _get;
}

/**
 * Fluent builder that describes a Mesa workflow.
 * Validates steps against canonical Zod schemas.
 */
declare class FlowBuilder {
    private readonly _id;
    private readonly _name;
    private _version;
    private _steps;
    private readonly _client?;
    constructor(name?: string, id?: string, client?: MesaClient);
    setVersion(version: string): this;
    /**
     * Listen for incoming XLM / USDC payment.
     */
    receive(params: {
        asset: string;
        minAmount: number | string;
        toAddress: string;
    }): this;
    /**
     * Confirm that a transaction has been included in a ledger close.
     */
    confirm(params?: {
        ledgerCloses?: number;
    }): this;
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
    }): this;
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
    }): this;
    /**
     * Transfer funds to destination on Stellar.
     */
    transfer(params: {
        to: string;
        asset: string;
        amount?: number | string;
        senderSecretRef?: string;
    }): this;
    /**
     * Submit direct Stellar Horizon payment.
     */
    payment(params: {
        horizonUrl?: string;
        senderSecretRef?: string;
        to: string;
        amount: number | string;
        asset?: string;
    }): this;
    /**
     * Invoke a Soroban Smart Contract method.
     */
    invoke(params: {
        contractId: string;
        method: string;
        args?: any;
        secretRef?: string;
        rpcUrl?: string;
    }): this;
    /**
     * Delay execution for a specified duration in seconds.
     */
    delay(params: {
        seconds: number;
    }): this;
    /**
     * Send webhook / suspend execution until external callback.
     */
    webhook(params?: {
        url?: string;
        method?: string;
        payload?: Record<string, unknown>;
        suspensionKey?: string;
        hmacSecretRef?: string;
    }): this;
    /**
     * Appends an arbitrary custom step to the flow.
     */
    step(step: StepDefinition): this;
    /**
     * Builds and validates the immutable FlowDefinition object.
     */
    build(): FlowDefinition;
    execute(options?: {
        runtimeUrl?: string;
        context?: Record<string, unknown>;
    }): Promise<{
        executionId: string;
        status: string;
    }>;
}
/**
 * Entry point for creating Mesa workflows.
 */
declare class Mesa {
    private static _defaultClient;
    private _client;
    constructor(config?: MesaConfig);
    flow(name?: string, id?: string): FlowBuilder;
    register(flow: FlowDefinition): Promise<{
        flowId: string;
        name: string;
    }>;
    static configure(config: MesaConfig): void;
    static flow(name?: string, id?: string): FlowBuilder;
    static register(flow: FlowDefinition): Promise<{
        flowId: string;
        name: string;
    }>;
    static execute(flow: FlowDefinition, options?: {
        runtimeUrl?: string;
        context?: Record<string, unknown>;
    }): Promise<{
        executionId: string;
        status: string;
    }>;
}

interface MesaSigner {
    getAddress(): Promise<string>;
    signTransaction(txXdr: string, networkPassphrase: string): Promise<string>;
}
declare class SecretKeySigner implements MesaSigner {
    private keypair;
    constructor(secretKey: string);
    getAddress(): Promise<string>;
    signTransaction(txXdr: string, networkPassphrase: string): Promise<string>;
}
declare class FreighterSigner implements MesaSigner {
    private address;
    constructor(address: string);
    getAddress(): Promise<string>;
    signTransaction(txXdr: string, networkPassphrase: string): Promise<string>;
}

export { type ExecutionResult, FlowBuilder, FreighterSigner, Mesa, MesaClient, type MesaConfig, type MesaSigner, SecretKeySigner };
