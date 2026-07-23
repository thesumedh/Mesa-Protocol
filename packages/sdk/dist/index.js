"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  FlowBuilder: () => FlowBuilder,
  FreighterSigner: () => FreighterSigner,
  Mesa: () => Mesa,
  MesaClient: () => MesaClient,
  SecretKeySigner: () => SecretKeySigner
});
module.exports = __toCommonJS(index_exports);

// src/flow.ts
var import_crypto = require("crypto");

// src/client.ts
var DEFAULT_RUNTIME_URL = "http://localhost:3001";
var MesaClient = class {
  runtimeUrl;
  apiKey;
  constructor(config = {}) {
    this.runtimeUrl = config.runtimeUrl ?? config.endpoint ?? process.env.MESA_RUNTIME_URL ?? DEFAULT_RUNTIME_URL;
    this.apiKey = config.apiKey ?? process.env.MESA_API_KEY;
  }
  flow(name, id) {
    return new FlowBuilder(name, id, this);
  }
  /**
   * Register a flow definition directly with the runtime.
   */
  async register(flow) {
    return this._post("/flows", {
      id: flow.id,
      name: flow.name,
      definition: flow
    });
  }
  /**
   * Register the flow definition, then start an execution.
   */
  async execute(flow, context = {}) {
    await this.register(flow);
    const result = await this._post("/executions", {
      flowId: flow.id,
      context
    });
    return {
      executionId: result.executionId,
      flowId: flow.id || flow.name,
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
    const headers = { "Content-Type": "application/json" };
    if (this.apiKey) {
      headers["X-Mesa-Api-Key"] = this.apiKey;
    }
    const res = await fetch(`${this.runtimeUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`MesaRuntime POST ${path} failed (${res.status}): ${errText}`);
    }
    return res.json();
  }
  async _get(path) {
    const headers = {};
    if (this.apiKey) {
      headers["X-Mesa-Api-Key"] = this.apiKey;
    }
    const res = await fetch(`${this.runtimeUrl}${path}`, { headers });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`MesaRuntime GET ${path} failed (${res.status}): ${errText}`);
    }
    return res.json();
  }
};

// src/flow.ts
var import_schema = require("@mesaprotocol/schema");
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
  _version = "1.0.0";
  _steps = [];
  _client;
  constructor(name, id, client) {
    if (name === "") {
      throw new TypeError("Mesa SDK: Flow name must be a non-empty string.");
    }
    const flowId = id ?? (0, import_crypto.randomUUID)();
    this._name = name ?? `flow-${flowId}`;
    this._id = flowId;
    this._client = client;
  }
  setVersion(version) {
    this._version = version;
    return this;
  }
  /**
   * Listen for incoming XLM / USDC payment.
   */
  receive(params) {
    validateAsset(params.asset, "receive.asset");
    validateAddress(params.toAddress, "receive.toAddress");
    if (typeof params.minAmount === "number" && params.minAmount <= 0) {
      throw new RangeError(`Mesa SDK: minAmount must be a positive number. Got: ${params.minAmount}`);
    }
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: "receive-payment",
      provider: "stellar",
      params: { action: "receive", ...params }
    }));
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
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: "confirm-on-chain",
      provider: "stellar",
      params: { action: "confirm", ledgerCloses: closes }
    }));
    return this;
  }
  /**
   * Convert / Deposit asset using SEP-24 anchor interface.
   */
  convert(params) {
    const anchorDomain = params.anchor ?? params.home_domain;
    if (anchorDomain === void 0 || anchorDomain === "") {
      throw new TypeError("Mesa SDK: convert.anchor must be a non-empty string.");
    }
    const assetCode = params.asset_code || params.to || params.from || "USDC";
    const homeDomain = anchorDomain || "testanchor.stellar.org";
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: "convert-asset",
      provider: "anchor",
      params: {
        action: "sep24-deposit",
        asset_code: assetCode,
        home_domain: homeDomain,
        anchorUrl: homeDomain.startsWith("http") ? homeDomain : `https://${homeDomain}`,
        account: params.account,
        amount: params.amount,
        ...params
      }
    }));
    return this;
  }
  /**
   * General SEP-24 Anchor Deposit/Withdrawal invocation.
   */
  anchor(params) {
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: `anchor-${params.action || "sep24-deposit"}`,
      provider: "anchor",
      params: {
        action: params.action || "sep24-deposit",
        anchorUrl: params.home_domain.startsWith("http") ? params.home_domain : `https://${params.home_domain}`,
        ...params
      }
    }));
    return this;
  }
  /**
   * Transfer funds to destination on Stellar.
   */
  transfer(params) {
    validateAddress(params.to, "transfer.to");
    validateAsset(params.asset, "transfer.asset");
    if (typeof params.amount === "number" && params.amount <= 0) {
      throw new RangeError(`Mesa SDK: transfer.amount must be a positive number. Got: ${params.amount}`);
    }
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: "transfer-funds",
      provider: "stellar",
      params: { action: "transfer", ...params }
    }));
    return this;
  }
  /**
   * Submit direct Stellar Horizon payment.
   */
  payment(params) {
    validateAddress(params.to, "payment.to");
    if (typeof params.amount === "number" && params.amount <= 0) {
      throw new RangeError(`Mesa SDK: payment.amount must be a positive number. Got: ${params.amount}`);
    }
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: "stellar-payment",
      provider: "stellar",
      params: { action: "payment", ...params }
    }));
    return this;
  }
  /**
   * Invoke a Soroban Smart Contract method.
   */
  invoke(params) {
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: `invoke-${params.method}`,
      provider: "soroban",
      params: { action: "invoke", ...params }
    }));
    return this;
  }
  /**
   * Delay execution for a specified duration in seconds.
   */
  delay(params) {
    if (typeof params.seconds !== "number" || params.seconds <= 0) {
      throw new RangeError(`Mesa SDK: delay.seconds must be a positive number. Got: ${params.seconds}`);
    }
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: `delay-${params.seconds}s`,
      provider: "delay",
      params: { seconds: params.seconds }
    }));
    return this;
  }
  /**
   * Send webhook / suspend execution until external callback.
   */
  webhook(params = {}) {
    if (params.url) {
      try {
        new URL(params.url);
      } catch {
        throw new Error(`Mesa SDK: Invalid URL format for webhook.url: "${params.url}". Must be a valid HTTP/HTTPS URL.`);
      }
    }
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: "send-webhook",
      provider: "webhook",
      params
    }));
    return this;
  }
  /**
   * SEP-10 Authentication challenge & JWT token acquisition.
   */
  sep10Auth(params) {
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: `sep10-auth-${params.domain}`,
      provider: "sep10",
      params: { action: "auth", ...params }
    }));
    return this;
  }
  /**
   * SEP-24 Interactive Anchor Deposit.
   */
  anchorDeposit(params) {
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: `sep24-deposit-${params.assetCode}`,
      provider: "anchor",
      params: { action: "sep24-deposit", ...params }
    }));
    return this;
  }
  /**
   * Stellar Horizon DEX Path Payment.
   */
  pathPayment(params) {
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: `path-payment-${params.sendAsset}-to-${params.destAsset}`,
      provider: "stellar",
      params: { action: "path-payment", ...params }
    }));
    return this;
  }
  /**
   * Pause execution for Manual Operator Approval sign-off.
   */
  manualApproval(params = {}) {
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: "manual-approval",
      provider: "approval",
      params: { action: "manual-approval", ...params }
    }));
    return this;
  }
  /**
   * Evaluate dynamic expression for condition branching.
   */
  condition(params) {
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name: "evaluate-condition",
      provider: "condition",
      params: { action: "evaluate", ...params }
    }));
    return this;
  }
  /**
   * Add a Saga Compensation Rollback handler step.
   */
  compensate(params = {}) {
    const { name = "rollback-compensation", provider = "compensation", action = "compensate", ...rest } = params;
    this._steps.push(import_schema.StepDefinitionSchema.parse({
      name,
      provider,
      params: { action, ...rest }
    }));
    return this;
  }
  /**
   * Appends an arbitrary custom step to the flow.
   */
  step(step) {
    const parsed = import_schema.StepDefinitionSchema.parse(step);
    this._steps.push(parsed);
    return this;
  }
  /**
   * Builds and validates the immutable FlowDefinition object.
   */
  build() {
    if (this._steps.length === 0) {
      throw new Error(`Mesa SDK: Flow "${this._name}" has no steps. At least one step is required.`);
    }
    const flowObj = {
      id: this._id,
      name: this._name,
      version: this._version,
      steps: this._steps
    };
    return import_schema.FlowDefinitionSchema.parse(flowObj);
  }
  async execute(options) {
    const flow = this.build();
    if (this._client) {
      return this._client.execute(flow, options?.context);
    }
    return Mesa.execute(flow, options);
  }
};
var Mesa = class _Mesa {
  static _defaultClient = new MesaClient();
  _client;
  constructor(config = {}) {
    this._client = new MesaClient(config);
  }
  flow(name, id) {
    return new FlowBuilder(name, id, this._client);
  }
  async register(flow) {
    return this._client.register(flow);
  }
  static configure(config) {
    _Mesa._defaultClient = new MesaClient(config);
  }
  static flow(name, id) {
    return new FlowBuilder(name, id, _Mesa._defaultClient);
  }
  static async register(flow) {
    return _Mesa._defaultClient.register(flow);
  }
  static async execute(flow, options) {
    if (options?.runtimeUrl) {
      const customClient = new MesaClient({ runtimeUrl: options.runtimeUrl });
      return customClient.execute(flow, options.context);
    }
    return _Mesa._defaultClient.execute(flow, options?.context);
  }
};

// src/signer.ts
var import_stellar_sdk = require("@stellar/stellar-sdk");
var SecretKeySigner = class {
  keypair;
  constructor(secretKey) {
    this.keypair = import_stellar_sdk.Keypair.fromSecret(secretKey);
  }
  async getAddress() {
    return this.keypair.publicKey();
  }
  async signTransaction(txXdr, networkPassphrase) {
    const tx = import_stellar_sdk.TransactionBuilder.fromXDR(txXdr, networkPassphrase);
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

// src/index.ts
__reExport(index_exports, require("@mesaprotocol/schema"), module.exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FlowBuilder,
  FreighterSigner,
  Mesa,
  MesaClient,
  SecretKeySigner,
  ...require("@mesaprotocol/schema")
});
