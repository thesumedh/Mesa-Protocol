// src/flow.ts
import { randomUUID } from "crypto";

// src/client.ts
var DEFAULT_RUNTIME_URL = "http://localhost:3001";
var MesaClient = class {
  runtimeUrl;
  constructor(config = {}) {
    this.runtimeUrl = config.runtimeUrl ?? process.env.MESA_RUNTIME_URL ?? DEFAULT_RUNTIME_URL;
  }
  /**
   * Register the flow definition, then start an execution.
   */
  async execute(flow, context = {}) {
    await this._post("/flows", {
      id: flow.id,
      name: flow.name,
      definition: flow
    });
    const result = await this._post("/executions", {
      flowId: flow.id,
      context
    });
    return {
      executionId: result.executionId,
      flowId: flow.id,
      status: result.status
    };
  }
  /**
   * Get status and event log for an execution.
   */
  async status(executionId) {
    return this._get(`/executions/${executionId}`);
  }
  async _post(path, body) {
    const res = await fetch(`${this.runtimeUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mesa Runtime error (${res.status}): ${text}`);
    }
    return res.json();
  }
  async _get(path) {
    const res = await fetch(`${this.runtimeUrl}${path}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mesa Runtime error (${res.status}): ${text}`);
    }
    return res.json();
  }
};

// src/flow.ts
function validateAddress(address, fieldName) {
  if (!address) {
    throw new TypeError(`Mesa SDK: "${fieldName}" is required and must be a non-empty string.`);
  }
  const isStellarAddr = /^G[A-Z2-7]{55}$/.test(address);
  if (!isStellarAddr && !address.startsWith("mock-") && address !== "mock") {
    throw new Error(`Mesa SDK: Invalid Stellar address format for "${fieldName}": "${address}". Must be a 56-character G-address.`);
  }
}
function validateAsset(asset, fieldName) {
  if (!asset) {
    throw new TypeError(`Mesa SDK: "${fieldName}" is required and must be a non-empty string.`);
  }
  const parts = asset.split(":");
  if (parts.length === 2) {
    const [code, issuer] = parts;
    if (!code || code.length > 12) {
      throw new Error(`Mesa SDK: Invalid asset code "${code}" in "${fieldName}". Must be 1-12 alphanumeric characters.`);
    }
    validateAddress(issuer, `${fieldName} issuer`);
  }
}
var FlowBuilder = class {
  _id;
  _name;
  _steps = [];
  _client;
  constructor(name, id, client) {
    if (name === "") {
      throw new TypeError("Mesa SDK: Flow name must be a non-empty string.");
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
  receive(params) {
    validateAsset(params.asset, "receive.asset");
    validateAddress(params.toAddress, "receive.toAddress");
    if (typeof params.minAmount !== "number" || params.minAmount <= 0) {
      throw new RangeError(`Mesa SDK: minAmount must be a positive number. Got: ${params.minAmount}`);
    }
    this._steps.push({
      name: "receive-payment",
      provider: "stellar",
      params: { action: "receive", ...params }
    });
    return this;
  }
  /**
   * Confirm that a transaction has been included in a ledger close.
   */
  confirm(params = {}) {
    const closes = params.ledgerCloses ?? 2;
    if (typeof closes !== "number" || closes <= 0 || !Number.isInteger(closes)) {
      throw new RangeError(`Mesa SDK: ledgerCloses must be a positive integer. Got: ${closes}`);
    }
    this._steps.push({
      name: "confirm-on-chain",
      provider: "stellar",
      params: { action: "confirm", ledgerCloses: closes }
    });
    return this;
  }
  /**
   * Convert one asset to another using a SEP-24 anchor.
   * The runtime suspends execution and waits for the anchor callback.
   */
  convert(params) {
    validateAsset(params.from, "convert.from");
    validateAsset(params.to, "convert.to");
    if (!params.anchor || typeof params.anchor !== "string") {
      throw new TypeError(`Mesa SDK: convert.anchor must be a non-empty string.`);
    }
    this._steps.push({
      name: "convert-asset",
      provider: "anchor",
      params: { action: "sep24-deposit", ...params }
    });
    return this;
  }
  /**
   * Transfer an asset to a destination address on Stellar.
   */
  transfer(params) {
    validateAddress(params.to, "transfer.to");
    validateAsset(params.asset, "transfer.asset");
    if (params.amount !== void 0 && (typeof params.amount !== "number" || params.amount <= 0)) {
      throw new RangeError(`Mesa SDK: transfer.amount must be a positive number. Got: ${params.amount}`);
    }
    this._steps.push({
      name: "transfer-funds",
      provider: "stellar",
      params: { action: "transfer", ...params }
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
  payment(params) {
    validateAddress(params.to, "payment.to");
    if (params.amount <= 0) {
      throw new RangeError(`Mesa SDK: payment.amount must be a positive number. Got: ${params.amount}`);
    }
    if (!params.senderSecret && !params.senderSecretRef) {
      throw new TypeError("Mesa SDK: payment requires either senderSecret or senderSecretRef.");
    }
    this._steps.push({
      name: "stellar-payment",
      provider: "stellar",
      params: { action: "payment", ...params }
    });
    return this;
  }
  /**
   * Invoke a Soroban smart contract function.
   */
  invoke(params) {
    if (!params.contractId || typeof params.contractId !== "string") {
      throw new TypeError(`Mesa SDK: invoke.contractId must be a non-empty string.`);
    }
    if (!params.method || typeof params.method !== "string") {
      throw new TypeError(`Mesa SDK: invoke.method must be a non-empty string.`);
    }
    this._steps.push({
      name: `invoke-${params.method}`,
      provider: "soroban",
      params
    });
    return this;
  }
  /**
   * Wait for a fixed duration before proceeding.
   */
  delay(params) {
    if (typeof params.seconds !== "number" || params.seconds <= 0) {
      throw new RangeError(`Mesa SDK: delay.seconds must be a positive number. Got: ${params.seconds}`);
    }
    this._steps.push({
      name: `delay-${params.seconds}s`,
      provider: "delay",
      params
    });
    return this;
  }
  /**
   * Send an HTTP POST notification to a URL when execution reaches this step.
   * Use `waitForCallback: true` to suspend until the recipient responds.
   */
  webhook(params) {
    if (!params.url || typeof params.url !== "string") {
      throw new TypeError(`Mesa SDK: webhook.url is required.`);
    }
    try {
      new URL(params.url);
    } catch {
      throw new Error(`Mesa SDK: Invalid URL format for webhook.url: "${params.url}".`);
    }
    this._steps.push({
      name: "send-webhook",
      provider: "webhook",
      params
    });
    return this;
  }
  /**
   * Add a generic or custom step to the flow definition.
   */
  step(name, provider, params = {}) {
    this._steps.push({
      name,
      provider: provider ?? name,
      params
    });
    return this;
  }
  /**
   * Finalize the flow definition.
   * Returns a serializable object the runtime can register and execute.
   */
  build() {
    if (this._steps.length === 0) {
      throw new Error(`Flow "${this._name}" has no steps. Add at least one step before calling .build().`);
    }
    return {
      id: this._id,
      name: this._name,
      steps: [...this._steps]
    };
  }
  /**
   * Shortcut to build, register, and execute this flow directly.
   */
  async execute(context = {}) {
    if (this._client) {
      return this._client.execute(this.build(), context);
    }
    return Mesa.execute(this.build(), context);
  }
};
var _defaultClient = null;
var Mesa = class {
  _client;
  constructor(config) {
    const url = config?.endpoint ?? config?.runtimeUrl;
    this._client = new MesaClient({ runtimeUrl: url });
  }
  /**
   * Start building a new flow definition.
   */
  flow(name, id) {
    if (name === "") {
      throw new TypeError("Mesa SDK: Flow name must be a non-empty string.");
    }
    return new FlowBuilder(name, id, this._client);
  }
  /**
   * Register a flow definition with the runtime, then start an execution.
   */
  async execute(flow, context = {}) {
    return this._client.execute(flow, context);
  }
  /**
   * Get the current status of a running execution.
   */
  async status(executionId) {
    return this._client.status(executionId);
  }
  // --- Static methods (for backwards compatibility with global configure flow) ---
  /**
   * Configure the default client. Call once at application startup.
   */
  static configure(config) {
    _defaultClient = new MesaClient(config);
  }
  /**
   * Start building a new flow using the default configuration.
   */
  static flow(name, id) {
    if (name === "") {
      throw new TypeError("Mesa SDK: Flow name must be a non-empty string.");
    }
    return new FlowBuilder(name, id, _defaultClient ?? void 0);
  }
  /**
   * Register and execute a flow definition using the default client.
   */
  static async execute(flow, context = {}) {
    const client = _defaultClient ?? new MesaClient({});
    return client.execute(flow, context);
  }
  /**
   * Get execution status using the default client.
   */
  static async status(executionId) {
    const client = _defaultClient ?? new MesaClient({});
    return client.status(executionId);
  }
};

// src/signer.ts
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
var SecretKeySigner = class {
  keypair;
  constructor(secretKey) {
    this.keypair = Keypair.fromSecret(secretKey);
  }
  async getAddress() {
    return this.keypair.publicKey();
  }
  async signTransaction(txXdr, networkPassphrase) {
    const tx = TransactionBuilder.fromXDR(txXdr, networkPassphrase);
    tx.sign(this.keypair);
    return tx.toXDR();
  }
};
var FreighterSigner = class {
  address;
  constructor(address) {
    this.address = address;
  }
  async getAddress() {
    return this.address;
  }
  async signTransaction(txXdr, networkPassphrase) {
    if (typeof window === "undefined") throw new Error("FreighterSigner requires a browser environment.");
    const { signTransaction } = await import("@stellar/freighter-api");
    const result = await signTransaction(txXdr, { networkPassphrase });
    if (typeof result === "string") return result;
    if (result && "signedTxXdr" in result) return result.signedTxXdr;
    throw new Error("Unexpected Freighter response");
  }
};
export {
  FlowBuilder,
  FreighterSigner,
  Mesa,
  MesaClient,
  SecretKeySigner
};
