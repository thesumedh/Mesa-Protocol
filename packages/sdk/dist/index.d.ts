interface MesaConfig {
    runtimeUrl?: string;
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
 * For use in server-side code (Node.js). Browser usage goes through
 * the Mesa Runtime directly (never expose runtime to browser clients).
 */
declare class MesaClient {
    private runtimeUrl;
    constructor(config?: MesaConfig);
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

interface StepDefinition {
    name: string;
    provider: string;
    params: Record<string, unknown>;
}
interface FlowDefinition {
    id: string;
    name: string;
    steps: StepDefinition[];
}
/**
 * Fluent builder that describes a Mesa workflow.
 * Does NOT contain business logic — only data.
 * The runtime executes; the SDK describes.
 */
declare class FlowBuilder {
    private readonly _id;
    private readonly _name;
    private _steps;
    private readonly _client?;
    constructor(name?: string, id?: string, client?: MesaClient);
    /**
     * Wait for an incoming payment to an address on Stellar.
     * The runtime suspends execution until the payment is detected
     * (via Horizon polling or inbound webhook resume).
     */
    receive(params: {
        asset: string;
        minAmount: number;
        toAddress: string;
    }): this;
    /**
     * Confirm that a transaction has been included in a ledger close.
     */
    confirm(params?: {
        ledgerCloses?: number;
    }): this;
    /**
     * Convert one asset to another using a SEP-24 anchor.
     * The runtime suspends execution and waits for the anchor callback.
     */
    convert(params: {
        from: string;
        to: string;
        anchor: string;
    }): this;
    /**
     * Transfer an asset to a destination address on Stellar.
     */
    transfer(params: {
        to: string;
        asset: string;
        amount?: number;
    }): this;
    /**
     * Invoke a Soroban smart contract function.
     */
    invoke(params: {
        contractId: string;
        method: string;
        args?: Record<string, unknown>;
    }): this;
    /**
     * Wait for a fixed duration before proceeding.
     */
    delay(params: {
        seconds: number;
    }): this;
    /**
     * Send an HTTP POST notification to a URL when execution reaches this step.
     * Use `waitForCallback: true` to suspend until the recipient responds.
     */
    webhook(params: {
        url: string;
        events?: string[];
        waitForCallback?: boolean;
    }): this;
    /**
     * Add a generic or custom step to the flow definition.
     */
    step(name: string, provider?: string, params?: Record<string, unknown>): this;
    /**
     * Finalize the flow definition.
     * Returns a serializable object the runtime can register and execute.
     */
    build(): FlowDefinition;
    /**
     * Shortcut to build, register, and execute this flow directly.
     */
    execute(context?: Record<string, unknown>): Promise<{
        executionId: string;
    }>;
}
declare class Mesa {
    private _client;
    constructor(config?: {
        endpoint?: string;
        runtimeUrl?: string;
    });
    /**
     * Start building a new flow definition.
     */
    flow(name?: string, id?: string): FlowBuilder;
    /**
     * Register a flow definition with the runtime, then start an execution.
     */
    execute(flow: FlowDefinition, context?: Record<string, unknown>): Promise<{
        executionId: string;
    }>;
    /**
     * Get the current status of a running execution.
     */
    status(executionId: string): Promise<{
        execution: unknown;
        events: unknown[];
    }>;
    /**
     * Configure the default client. Call once at application startup.
     */
    static configure(config: {
        runtimeUrl?: string;
    }): void;
    /**
     * Start building a new flow using the default configuration.
     */
    static flow(name?: string, id?: string): FlowBuilder;
    /**
     * Register and execute a flow definition using the default client.
     */
    static execute(flow: FlowDefinition, context?: Record<string, unknown>): Promise<{
        executionId: string;
    }>;
    /**
     * Get execution status using the default client.
     */
    static status(executionId: string): Promise<{
        execution: unknown;
        events: unknown[];
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

export { type ExecutionResult, FlowBuilder, type FlowDefinition, FreighterSigner, Mesa, MesaClient, type MesaConfig, type MesaSigner, SecretKeySigner, type StepDefinition };
