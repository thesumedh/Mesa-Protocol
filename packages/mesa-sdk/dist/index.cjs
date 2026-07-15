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
  CircleStatus: () => CircleStatus,
  CircleWrapper: () => CircleWrapper,
  FactoryWrapper: () => FactoryWrapper,
  FreighterSigner: () => FreighterSigner,
  MesaSDK: () => MesaSDK,
  PasskeySigner: () => PasskeySigner,
  PolicyType: () => PolicyType,
  RpcProvider: () => RpcProvider,
  SecretKeySigner: () => SecretKeySigner,
  VaultWrapper: () => VaultWrapper,
  argAddress: () => argAddress,
  argBytes32: () => argBytes32,
  argI128: () => argI128,
  argString: () => argString,
  argU32: () => argU32,
  argU64: () => argU64,
  calculateReputation: () => calculateReputation,
  calculateTVL: () => calculateTVL,
  formatAddress: () => formatAddress,
  nativeToPolicy: () => nativeToPolicy,
  policyToScVal: () => policyToScVal
});
module.exports = __toCommonJS(index_exports);
var import_stellar_sdk6 = require("@stellar/stellar-sdk");

// src/provider.ts
var import_stellar_sdk = require("@stellar/stellar-sdk");
function argAddress(addr) {
  return import_stellar_sdk.Address.fromString(addr).toScVal();
}
function argString(str) {
  return import_stellar_sdk.xdr.ScVal.scvString(str);
}
function argU32(val) {
  return import_stellar_sdk.xdr.ScVal.scvU32(val);
}
function argU64(val) {
  return (0, import_stellar_sdk.nativeToScVal)(BigInt(val), { type: "u64" });
}
function argI128(val) {
  return (0, import_stellar_sdk.nativeToScVal)(BigInt(val), { type: "i128" });
}
function argBytes32(hex) {
  const bytes = Buffer.from(hex, "hex");
  return import_stellar_sdk.xdr.ScVal.scvBytes(bytes);
}
var RpcProvider = class {
  rpc;
  networkPassphrase;
  constructor(rpcUrl, networkPassphrase) {
    this.rpc = new import_stellar_sdk.rpc.Server(rpcUrl);
    this.networkPassphrase = networkPassphrase;
  }
  async callReadOnly(contractId, method, args = [], sourceAddress) {
    const dummyAddr = sourceAddress || import_stellar_sdk.Keypair.random().publicKey();
    const contract = new import_stellar_sdk.Contract(contractId);
    const account = new import_stellar_sdk.Account(dummyAddr, "0");
    const tx = new import_stellar_sdk.TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: this.networkPassphrase
    }).addOperation(contract.call(method, ...args)).setTimeout(import_stellar_sdk.TimeoutInfinite).build();
    const response = await this.rpc.simulateTransaction(tx);
    if (import_stellar_sdk.rpc.Api.isSimulationSuccess(response)) {
      if (response.result?.retval) {
        return response.result.retval;
      }
      throw new Error(`Simulation succeeded but returned no value for ${method}`);
    }
    throw new Error(`Simulation failed for ${method}: ${JSON.stringify(response)}`);
  }
  getRpc() {
    return this.rpc;
  }
};

// src/freighter.ts
var freighter = __toESM(require("@stellar/freighter-api"), 1);
var FreighterWallet = class {
  networkPassphrase;
  constructor(networkPassphrase) {
    this.networkPassphrase = networkPassphrase;
  }
  _request(type, payload = {}, timeoutMs = 5e3) {
    const messageId = Date.now() + Math.random();
    if (typeof window === "undefined") {
      return Promise.resolve({ error: "Window context not found" });
    }
    window.postMessage({
      source: "FREIGHTER_EXTERNAL_MSG_REQUEST",
      messageId,
      type,
      ...payload
    }, window.location.origin);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        window.removeEventListener("message", listener);
        resolve({ error: "Freighter did not respond." });
      }, timeoutMs);
      function listener(event) {
        if (event.source !== window) return;
        const data = event.data || {};
        if (data.source !== "FREIGHTER_EXTERNAL_MSG_RESPONSE") return;
        if (data.messagedId !== messageId && data.messageId !== messageId) return;
        clearTimeout(timer);
        window.removeEventListener("message", listener);
        resolve(data);
      }
      window.addEventListener("message", listener, false);
    });
  }
  _createFallbackAPI() {
    return {
      isConnected: async () => {
        const result = await this._request("REQUEST_CONNECTION_STATUS", {}, 2500);
        if (result.error) return { isConnected: false, error: result.error };
        return { isConnected: result.isConnected === true || result === true };
      },
      isAllowed: async () => {
        const result = await this._request("REQUEST_ALLOWED_STATUS", {}, 2500);
        if (result.error) return { isAllowed: false, error: result.error };
        return { isAllowed: result.isAllowed === true || result === true };
      },
      setAllowed: async () => {
        const result = await this._request("SET_ALLOWED_STATUS", {}, 15e3);
        if (result.error) return { isAllowed: false, error: result.error };
        return { isAllowed: result.isAllowed === true || result === true };
      },
      requestAccess: async () => {
        const result = await this._request("REQUEST_ACCESS", {}, 15e3);
        if (result.error) return { address: "", error: result.error };
        return { address: result.address || result.publicKey || "" };
      },
      getAddress: async () => {
        const result = await this._request("REQUEST_USER_INFO", {}, 5e3);
        if (result.error) return { address: "", error: result.error };
        return { address: result.address || result.publicKey || result.userInfo?.publicKey || "" };
      },
      getPublicKey: async () => {
        const result = await this._request("REQUEST_ACCESS", {}, 15e3);
        if (result.error) throw result.error;
        return result.address || result.publicKey || "";
      },
      getNetwork: async () => {
        const result = await this._request("REQUEST_NETWORK", {}, 5e3);
        if (result.error) return { network: "", error: result.error };
        return { network: result.network || "" };
      },
      signTransaction: async (xdrStr, opts = {}) => {
        const result = await this._request("SUBMIT_TRANSACTION", {
          transactionXdr: xdrStr,
          network: opts.network || "",
          networkPassphrase: opts.networkPassphrase || "",
          accountToSign: opts.address || opts.accountToSign || ""
        }, 6e4);
        if (result.error) return { error: result.error };
        return {
          signedTxXdr: result.signedTxXdr || result.signedTransaction || "",
          signedTransaction: result.signedTransaction || result.signedTxXdr || ""
        };
      }
    };
  }
  async _getAPI(maxWaitMs = 1500) {
    if (typeof window === "undefined") {
      return this._createFallbackAPI();
    }
    const api = window.FreighterAPI || window.freighterApi || freighter;
    if (api && typeof api.isConnected === "function") {
      return api;
    }
    const interval = 100;
    let elapsed = 0;
    while (elapsed < maxWaitMs) {
      const polledApi = window.FreighterAPI || window.freighterApi;
      if (polledApi && typeof polledApi.isConnected === "function") {
        return polledApi;
      }
      await new Promise((r) => setTimeout(r, interval));
      elapsed += interval;
    }
    return this._createFallbackAPI();
  }
  _resultFlag(result, key) {
    if (result === true) return true;
    if (result === false || result == null) return false;
    if (typeof result === "object" && key in result) return result[key] === true;
    return false;
  }
  _errorMessage(result, fallback) {
    const error = result && result.error;
    if (!error) return fallback;
    if (typeof error === "string") return error;
    if (error.message) return error.message;
    try {
      return JSON.stringify(error);
    } catch (_) {
      return fallback;
    }
  }
  _addressFrom(result) {
    if (typeof result === "string" && result.length > 0) return result;
    if (result && typeof result.address === "string" && result.address.length > 0) return result.address;
    if (result && typeof result.publicKey === "string" && result.publicKey.length > 0) return result.publicKey;
    return null;
  }
  async isInstalled() {
    try {
      const api = await this._getAPI(1e3);
      const result = await api.isConnected();
      return this._resultFlag(result, "isConnected");
    } catch (err) {
      console.warn("[MesaSDK] Freighter isInstalled failed", err);
      return false;
    }
  }
  async connect() {
    const api = await this._getAPI(2e3);
    const connResult = await api.isConnected();
    if (!this._resultFlag(connResult, "isConnected")) {
      throw new Error(this._errorMessage(connResult, "Freighter extension is not detected in this browser."));
    }
    if (typeof api.setAllowed === "function") {
      const allowedResult = await api.setAllowed();
      if (allowedResult && allowedResult.error) {
        throw new Error("Freighter permission failed: " + this._errorMessage(allowedResult, "permission rejected"));
      }
    }
    const accessResult = typeof api.requestAccess === "function" ? await api.requestAccess() : await api.getPublicKey();
    if (accessResult && accessResult.error) {
      throw new Error("Access denied: " + this._errorMessage(accessResult, "request rejected"));
    }
    const requestedAddress = this._addressFrom(accessResult);
    if (requestedAddress) return requestedAddress;
    if (typeof api.getAddress === "function") {
      const addressResult = await api.getAddress();
      if (addressResult && addressResult.error) {
        throw new Error("Address lookup failed: " + this._errorMessage(addressResult, "no address returned"));
      }
      const address = this._addressFrom(addressResult);
      if (address) return address;
    }
    throw new Error("No address returned by Freighter.");
  }
  async signTransaction(xdrStr, signerAddress) {
    const api = await this._getAPI(1e3);
    const result = await api.signTransaction(xdrStr, {
      network: this.networkPassphrase.includes("Test") ? "TESTNET" : "PUBLIC",
      networkPassphrase: this.networkPassphrase,
      accountToSign: signerAddress
    });
    if (result && result.error) throw new Error("Sign failed: " + result.error);
    if (result && result.signedTxXdr) return result.signedTxXdr;
    if (result && result.signedTransaction) return result.signedTransaction;
    if (typeof result === "string") return result;
    throw new Error("Unexpected response from Freighter sign");
  }
};

// src/factory.ts
var import_stellar_sdk2 = require("@stellar/stellar-sdk");
var FactoryWrapper = class {
  provider;
  freighter;
  factoryContractId;
  dataProvider;
  constructor(provider, freighter2, factoryContractId, dataProvider) {
    this.provider = provider;
    this.freighter = freighter2;
    this.factoryContractId = factoryContractId;
    this.dataProvider = dataProvider;
  }
  parseChamaSummary(native) {
    return {
      id: Number(native.id),
      name: native.name.toString(),
      contract_id: native.contract_id.toString(),
      contribution_amount: native.contribution_amount.toString(),
      max_members: Number(native.max_members),
      member_count: Number(native.member_count),
      status: Number(native.status),
      token: native.token.toString(),
      payout_mode: Number(native.payout_mode || 0)
    };
  }
  async listChamas(limit = 10, offset = 0) {
    try {
      const scVal = await this.provider.callReadOnly(
        this.factoryContractId,
        "list_chamas",
        [argU32(limit), argU32(offset)]
      );
      const native = (0, import_stellar_sdk2.scValToNative)(scVal);
      const summaries = native.map((n) => this.parseChamaSummary(n));
      return { success: true, data: summaries };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async getChamasSummary(bypassCache = false) {
    if (this.dataProvider && !bypassCache) {
      return await this.dataProvider.getChamasSummary();
    }
    try {
      const scVal = await this.provider.callReadOnly(
        this.factoryContractId,
        "get_chamas_summary"
      );
      const native = (0, import_stellar_sdk2.scValToNative)(scVal);
      const summaries = native.map((n) => this.parseChamaSummary(n));
      return { success: true, data: summaries };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async getChama(chamaId) {
    try {
      const scVal = await this.provider.callReadOnly(
        this.factoryContractId,
        "get_chama",
        [argU32(chamaId)]
      );
      const address = (0, import_stellar_sdk2.scValToNative)(scVal);
      return { success: true, data: address };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async createChama(name, contribution, maxMembers, duration, tokenAddress, creatorAddress, payoutMode = 0) {
    try {
      const server = this.provider.getRpc();
      const contract = new import_stellar_sdk2.Contract(this.factoryContractId);
      const accountRes = await server.getLedgerEntries();
      const account = await server.getAccount(creatorAddress);
      const tx = new import_stellar_sdk2.TransactionBuilder(account, {
        fee: "1000",
        // temporary placeholder fee
        networkPassphrase: this.provider.networkPassphrase
      }).addOperation(contract.call(
        "create_chama",
        argString(name),
        argI128(contribution),
        argU32(maxMembers),
        argU64(duration),
        argAddress(tokenAddress),
        argU32(payoutMode)
      )).setTimeout(import_stellar_sdk2.TimeoutInfinite).build();
      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await this.freighter.signTransaction(preparedTx.toXDR(), creatorAddress);
      const submitResponse = await server.sendTransaction(
        import_stellar_sdk2.TransactionBuilder.fromXDR(signedXdr, this.provider.networkPassphrase)
      );
      if (submitResponse.status === "ERROR") {
        throw new Error(`Submit error: ${JSON.stringify(submitResponse.errorResult)}`);
      }
      let statusResponse = await this.pollTransaction(submitResponse.hash);
      if (statusResponse.status === import_stellar_sdk2.rpc.Api.GetTransactionStatus.SUCCESS) {
        const successRes = statusResponse;
        const val = successRes.returnValue;
        if (!val) {
          throw new Error("Transaction succeeded but returned no value");
        }
        const native = (0, import_stellar_sdk2.scValToNative)(val);
        return {
          success: true,
          data: {
            chamaId: Number(native[0]),
            contractId: native[1]
          }
        };
      }
      throw new Error(`Transaction failed or timed out with status: ${statusResponse.status}`);
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async syncChama(chamaId, senderAddress) {
    try {
      const server = this.provider.getRpc();
      const contract = new import_stellar_sdk2.Contract(this.factoryContractId);
      const account = await server.getAccount(senderAddress);
      const tx = new import_stellar_sdk2.TransactionBuilder(account, {
        fee: "1000",
        networkPassphrase: this.provider.networkPassphrase
      }).addOperation(contract.call("sync_chama", argU32(chamaId))).setTimeout(import_stellar_sdk2.TimeoutInfinite).build();
      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await this.freighter.signTransaction(preparedTx.toXDR(), senderAddress);
      const submitResponse = await server.sendTransaction(
        import_stellar_sdk2.TransactionBuilder.fromXDR(signedXdr, this.provider.networkPassphrase)
      );
      if (submitResponse.status === "ERROR") {
        throw new Error(`Submit error: ${JSON.stringify(submitResponse.errorResult)}`);
      }
      let statusResponse = await this.pollTransaction(submitResponse.hash);
      if (statusResponse.status === import_stellar_sdk2.rpc.Api.GetTransactionStatus.SUCCESS) {
        return { success: true, data: submitResponse.hash };
      }
      throw new Error(`Transaction failed with status: ${statusResponse.status}`);
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async pollTransaction(hash) {
    const server = this.provider.getRpc();
    for (let i = 0; i < 25; i++) {
      const res = await server.getTransaction(hash);
      if (res.status === import_stellar_sdk2.rpc.Api.GetTransactionStatus.SUCCESS) {
        return res;
      }
      if (res.status === import_stellar_sdk2.rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction failed: ${JSON.stringify(res.resultXdr)}`);
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
    throw new Error("Transaction polling timed out");
  }
};

// src/circle.ts
var import_stellar_sdk3 = require("@stellar/stellar-sdk");
var CircleWrapper = class {
  provider;
  freighter;
  dataProvider;
  constructor(provider, freighter2, dataProvider) {
    this.provider = provider;
    this.freighter = freighter2;
    this.dataProvider = dataProvider;
  }
  // --- Read-Only Methods ---
  async getState(contractId, bypassCache = false) {
    if (this.dataProvider && !bypassCache) {
      return await this.dataProvider.getCircleState(contractId);
    }
    try {
      const scVal = await this.provider.callReadOnly(contractId, "get_circle");
      const native = (0, import_stellar_sdk3.scValToNative)(scVal);
      const state = {
        creator: native.creator.toString(),
        name: native.name.toString(),
        contribution_amount: native.contribution_amount.toString(),
        max_members: Number(native.max_members),
        duration: Number(native.duration),
        token: native.token.toString(),
        members: native.members.map((m) => m.toString()),
        rotation_order: native.rotation_order.map((r) => r.toString()),
        current_round: Number(native.current_round),
        deadline: Number(native.deadline),
        status: Number(native.status),
        payout_mode: Number(native.payout_mode || 0)
      };
      return { success: true, data: state };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async canDistribute(contractId) {
    try {
      const scVal = await this.provider.callReadOnly(contractId, "can_distribute");
      return { success: true, data: (0, import_stellar_sdk3.scValToNative)(scVal) };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async getMemberDeposit(contractId, memberAddress) {
    try {
      const scVal = await this.provider.callReadOnly(
        contractId,
        "get_member_deposit",
        [argAddress(memberAddress)]
      );
      return { success: true, data: (0, import_stellar_sdk3.scValToNative)(scVal).toString() };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async getMemberMisses(contractId, memberAddress) {
    try {
      const scVal = await this.provider.callReadOnly(
        contractId,
        "get_member_misses",
        [argAddress(memberAddress)]
      );
      return { success: true, data: Number((0, import_stellar_sdk3.scValToNative)(scVal)) };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async hasContributed(contractId, round, memberAddress) {
    try {
      const scVal = await this.provider.callReadOnly(
        contractId,
        "has_contributed",
        [argU32(round), argAddress(memberAddress)]
      );
      return { success: true, data: (0, import_stellar_sdk3.scValToNative)(scVal) };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async getReputation(contractId, memberAddress) {
    try {
      const scVal = await this.provider.callReadOnly(
        contractId,
        "get_reputation",
        [argAddress(memberAddress)]
      );
      return { success: true, data: Number((0, import_stellar_sdk3.scValToNative)(scVal)) };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async getSponsor(contractId, memberAddress) {
    try {
      const scVal = await this.provider.callReadOnly(
        contractId,
        "get_sponsor",
        [argAddress(memberAddress)]
      );
      return { success: true, data: (0, import_stellar_sdk3.scValToNative)(scVal).toString() };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async getAuctionBids(contractId) {
    try {
      const scVal = await this.provider.callReadOnly(contractId, "get_auction_bids");
      const native = (0, import_stellar_sdk3.scValToNative)(scVal);
      const bids = {};
      if (native && native instanceof Map) {
        for (const [key, value] of native.entries()) {
          bids[key.toString()] = value.toString();
        }
      }
      return { success: true, data: bids };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  // --- Mutation Methods (Sends Transactions) ---
  async join(contractId, memberAddress, sponsorAddress) {
    return this.sendTx(contractId, "join", [argAddress(memberAddress), argAddress(sponsorAddress)], memberAddress);
  }
  async activate(contractId, senderAddress) {
    return this.sendTx(contractId, "activate", [argAddress(senderAddress)], senderAddress);
  }
  async contribute(contractId, contributorAddress) {
    return this.sendTx(contractId, "contribute", [argAddress(contributorAddress)], contributorAddress);
  }
  async contributeWithPathPayment(contractId, contributorAddress, sendAssetCode, sendAssetIssuer, sendMax, destAssetCode, destAssetIssuer, destAmount, pathAssets) {
    try {
      const server = this.provider.getRpc();
      const account = await server.getAccount(contributorAddress);
      const contract = new import_stellar_sdk3.Contract(contractId);
      const sendAssetObj = sendAssetCode === "XLM" || sendAssetCode === "native" ? import_stellar_sdk3.Asset.native() : new import_stellar_sdk3.Asset(sendAssetCode, sendAssetIssuer);
      const destAssetObj = destAssetCode === "XLM" || destAssetCode === "native" ? import_stellar_sdk3.Asset.native() : new import_stellar_sdk3.Asset(destAssetCode, destAssetIssuer);
      const pathObjs = pathAssets.map((p) => {
        return p.code === "XLM" || p.code === "native" ? import_stellar_sdk3.Asset.native() : new import_stellar_sdk3.Asset(p.code, p.issuer);
      });
      const tx = new import_stellar_sdk3.TransactionBuilder(account, {
        fee: "2000",
        networkPassphrase: this.provider.networkPassphrase
      }).addOperation(
        import_stellar_sdk3.Operation.pathPaymentStrictReceive({
          sendAsset: sendAssetObj,
          sendMax,
          destination: contributorAddress,
          destAsset: destAssetObj,
          destAmount,
          path: pathObjs
        })
      ).addOperation(
        contract.call("contribute", argAddress(contributorAddress))
      ).setTimeout(import_stellar_sdk3.TimeoutInfinite).build();
      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await this.freighter.signTransaction(preparedTx.toXDR(), contributorAddress);
      const submitResponse = await server.sendTransaction(
        import_stellar_sdk3.TransactionBuilder.fromXDR(signedXdr, this.provider.networkPassphrase)
      );
      if (submitResponse.status === "ERROR") {
        throw new Error(`Submit error: ${JSON.stringify(submitResponse.errorResult)}`);
      }
      const statusResponse = await this.pollTransaction(submitResponse.hash);
      if (statusResponse.status === import_stellar_sdk3.rpc.Api.GetTransactionStatus.SUCCESS) {
        return { success: true, data: submitResponse.hash };
      }
      throw new Error(`Transaction failed with status: ${statusResponse.status}`);
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async distribute(contractId, senderAddress) {
    return this.sendTx(contractId, "distribute", [argAddress(senderAddress)], senderAddress);
  }
  async flagEmergency(contractId, memberAddress) {
    return this.sendTx(contractId, "flag_emergency", [argAddress(memberAddress)], memberAddress);
  }
  async withdrawPrincipal(contractId, memberAddress) {
    return this.sendTx(contractId, "withdraw_principal", [argAddress(memberAddress)], memberAddress);
  }
  async flagMissed(contractId, memberAddress, round, senderAddress) {
    return this.sendTx(contractId, "flag_missed", [argAddress(memberAddress), argU32(round)], senderAddress);
  }
  async placeBid(contractId, memberAddress, discountAmount) {
    return this.sendTx(contractId, "place_bid", [argAddress(memberAddress), argI128(discountAmount)], memberAddress);
  }
  // --- Transaction Submission Helper ---
  async sendTx(contractId, method, args, senderAddress) {
    try {
      const server = this.provider.getRpc();
      const contract = new import_stellar_sdk3.Contract(contractId);
      const account = await server.getAccount(senderAddress);
      const tx = new import_stellar_sdk3.TransactionBuilder(account, {
        fee: "1000",
        networkPassphrase: this.provider.networkPassphrase
      }).addOperation(contract.call(method, ...args)).setTimeout(import_stellar_sdk3.TimeoutInfinite).build();
      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await this.freighter.signTransaction(preparedTx.toXDR(), senderAddress);
      const submitResponse = await server.sendTransaction(
        import_stellar_sdk3.TransactionBuilder.fromXDR(signedXdr, this.provider.networkPassphrase)
      );
      if (submitResponse.status === "ERROR") {
        throw new Error(`Submit error: ${JSON.stringify(submitResponse.errorResult)}`);
      }
      const statusResponse = await this.pollTransaction(submitResponse.hash);
      if (statusResponse.status === import_stellar_sdk3.rpc.Api.GetTransactionStatus.SUCCESS) {
        return { success: true, data: submitResponse.hash };
      }
      throw new Error(`Transaction failed with status: ${statusResponse.status}`);
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async pollTransaction(hash) {
    const server = this.provider.getRpc();
    for (let i = 0; i < 25; i++) {
      const res = await server.getTransaction(hash);
      if (res.status === import_stellar_sdk3.rpc.Api.GetTransactionStatus.SUCCESS) {
        return res;
      }
      if (res.status === import_stellar_sdk3.rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction failed: ${JSON.stringify(res.resultXdr)}`);
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
    throw new Error("Transaction polling timed out");
  }
};

// src/indexer-provider.ts
var IndexerProvider = class {
  indexerUrl;
  constructor(indexerUrl) {
    this.indexerUrl = indexerUrl.endsWith("/graphql") ? indexerUrl : `${indexerUrl}/graphql`;
  }
  async fetchGraphQL(query, variables = {}) {
    const res = await fetch(this.indexerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, variables })
    });
    if (!res.ok) {
      throw new Error(`GraphQL request failed: ${res.statusText}`);
    }
    const json = await res.json();
    if (json.errors) {
      throw new Error(`GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`);
    }
    return json.data;
  }
  async getChamasSummary() {
    try {
      const q = `
        query {
          circles {
            contract_id
            chama_id
            name
            contribution_amount
            max_members
            member_count
            status
            token
          }
        }
      `;
      const data = await this.fetchGraphQL(q);
      const list = data.circles.map((c) => ({
        id: Number(c.chama_id),
        name: c.name,
        contract_id: c.contract_id,
        contribution_amount: c.contribution_amount,
        max_members: Number(c.max_members),
        member_count: Number(c.member_count),
        status: Number(c.status),
        token: c.token
      }));
      return { success: true, data: list };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async getCircleState(contractId) {
    try {
      const q = `
        query($contractId: String!) {
          circle(contractId: $contractId) {
            contract_id
            chama_id
            name
            creator
            contribution_amount
            max_members
            member_count
            current_round
            deadline
            status
            token
            duration
            rotation_order
            members {
              address
              reputation
            }
          }
        }
      `;
      const data = await this.fetchGraphQL(q, { contractId });
      const c = data.circle;
      if (!c) {
        return { success: false, error: "Circle not found in indexer cache" };
      }
      const rotation_order = c.rotation_order ? c.rotation_order.split(",") : [];
      const state = {
        name: c.name,
        creator: c.creator,
        contribution_amount: c.contribution_amount,
        max_members: Number(c.max_members),
        duration: Number(c.duration),
        token: c.token,
        members: c.members.map((m) => m.address),
        rotation_order,
        current_round: Number(c.current_round),
        deadline: Number(c.deadline),
        status: Number(c.status)
      };
      return { success: true, data: state };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async getActivities(member, limit) {
    try {
      const q = `
        query($member: String, $limit: Int) {
          activities(member: $member, limit: $limit) {
            id
            contract_id
            tx_hash
            type
            member
            amount
            round
            timestamp
          }
        }
      `;
      const data = await this.fetchGraphQL(q, { member, limit });
      const list = data.activities.map((a) => ({
        hash: a.tx_hash,
        type: a.type,
        member: a.member,
        amount: a.amount || void 0,
        timestamp: Number(a.timestamp)
      }));
      return { success: true, data: list };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async getTVL() {
    try {
      const q = `
        query {
          globalStats {
            tvl
          }
        }
      `;
      const data = await this.fetchGraphQL(q);
      return { success: true, data: data.globalStats.tvl };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
};

// src/types.ts
var CircleStatus = /* @__PURE__ */ ((CircleStatus2) => {
  CircleStatus2[CircleStatus2["Signup"] = 0] = "Signup";
  CircleStatus2[CircleStatus2["Active"] = 1] = "Active";
  CircleStatus2[CircleStatus2["Paused"] = 2] = "Paused";
  CircleStatus2[CircleStatus2["Completed"] = 3] = "Completed";
  return CircleStatus2;
})(CircleStatus || {});

// src/rpc-provider.ts
var RpcDataProvider = class {
  factory;
  circle;
  constructor(factory, circle) {
    this.factory = factory;
    this.circle = circle;
  }
  async getChamasSummary() {
    return await this.factory.getChamasSummary(true);
  }
  async getCircleState(contractId) {
    return await this.circle.getState(contractId, true);
  }
  async getActivities(member, limit) {
    return { success: true, data: [] };
  }
  async getTVL() {
    try {
      const summary = await this.factory.getChamasSummary();
      if (!summary.success || !summary.data) {
        return { success: false, error: summary.error || "Failed to fetch chamas" };
      }
      let totalTvl = 0n;
      for (const c of summary.data) {
        if (c.status === 1 /* Active */) {
          const amt = BigInt(c.contribution_amount || "0");
          const count = BigInt(c.member_count || 0);
          totalTvl += amt * count * 2n;
        }
      }
      return { success: true, data: totalTvl.toString() };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
};

// src/vault.ts
var import_stellar_sdk4 = require("@stellar/stellar-sdk");
var PolicyType = /* @__PURE__ */ ((PolicyType2) => {
  PolicyType2["Lock"] = "Lock";
  PolicyType2["AutoConvert"] = "AutoConvert";
  PolicyType2["WeeklyDeposit"] = "WeeklyDeposit";
  PolicyType2["Goal"] = "Goal";
  PolicyType2["AllowEmergencyWithdrawal"] = "AllowEmergencyWithdrawal";
  return PolicyType2;
})(PolicyType || {});
function policyToScVal(policy) {
  const sym = import_stellar_sdk4.xdr.ScVal.scvSymbol(policy.type);
  let val;
  switch (policy.type) {
    case "Lock" /* Lock */:
      val = argU64(policy.value);
      break;
    case "AutoConvert" /* AutoConvert */:
      val = argAddress(policy.value);
      break;
    case "WeeklyDeposit" /* WeeklyDeposit */:
    case "Goal" /* Goal */:
      val = argI128(policy.value);
      break;
    case "AllowEmergencyWithdrawal" /* AllowEmergencyWithdrawal */:
      val = import_stellar_sdk4.xdr.ScVal.scvBool(policy.value);
      break;
    default:
      throw new Error(`Unsupported policy type: ${policy.type}`);
  }
  return import_stellar_sdk4.xdr.ScVal.scvVec([sym, val]);
}
function nativeToPolicy(native) {
  if (!Array.isArray(native) || native.length < 2) {
    throw new Error("Invalid policy native format");
  }
  const type = native[0].toString();
  const rawVal = native[1];
  switch (type) {
    case "Lock" /* Lock */:
      return { type: "Lock" /* Lock */, value: Number(rawVal) };
    case "AutoConvert" /* AutoConvert */:
      return { type: "AutoConvert" /* AutoConvert */, value: rawVal.toString() };
    case "WeeklyDeposit" /* WeeklyDeposit */:
      return { type: "WeeklyDeposit" /* WeeklyDeposit */, value: rawVal.toString() };
    case "Goal" /* Goal */:
      return { type: "Goal" /* Goal */, value: rawVal.toString() };
    case "AllowEmergencyWithdrawal" /* AllowEmergencyWithdrawal */:
      return { type: "AllowEmergencyWithdrawal" /* AllowEmergencyWithdrawal */, value: !!rawVal };
    default:
      throw new Error(`Unknown policy type: ${type}`);
  }
}
var VaultWrapper = class {
  provider;
  constructor(provider) {
    this.provider = provider;
  }
  // --- Read-Only Methods ---
  async getState(contractId) {
    try {
      const scVal = await this.provider.callReadOnly(contractId, "get_vault_state");
      const native = (0, import_stellar_sdk4.scValToNative)(scVal);
      const state = {
        creator: native.creator.toString(),
        name: native.name.toString(),
        token: native.token.toString(),
        policies: (native.policies || []).map((p) => nativeToPolicy(p)),
        total_balance: native.total_balance.toString(),
        emergency_active: !!native.emergency_active
      };
      return { success: true, data: state };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  // --- Write Operations ---
  async initialize(contractId, signer, name, tokenAddress, policies) {
    const scPolicies = import_stellar_sdk4.xdr.ScVal.scvVec(policies.map(policyToScVal));
    return this.sendTx(
      contractId,
      "initialize",
      [
        argAddress(await signer.getAddress()),
        argString(name),
        argAddress(tokenAddress),
        scPolicies
      ],
      signer
    );
  }
  async deposit(contractId, signer, amount) {
    const sender = await signer.getAddress();
    return this.sendTx(
      contractId,
      "deposit",
      [argAddress(sender), argI128(amount)],
      signer
    );
  }
  async withdraw(contractId, signer, amount) {
    const sender = await signer.getAddress();
    return this.sendTx(
      contractId,
      "withdraw",
      [argAddress(sender), argI128(amount)],
      signer
    );
  }
  async voteEmergency(contractId, signer) {
    const sender = await signer.getAddress();
    return this.sendTx(
      contractId,
      "vote_emergency",
      [argAddress(sender)],
      signer
    );
  }
  // --- Transaction Submission Helper ---
  async sendTx(contractId, method, args, signer) {
    try {
      const server = this.provider.getRpc();
      const contract = new import_stellar_sdk4.Contract(contractId);
      const senderAddress = await signer.getAddress();
      const account = await server.getAccount(senderAddress);
      const tx = new import_stellar_sdk4.TransactionBuilder(account, {
        fee: "1000",
        networkPassphrase: this.provider.networkPassphrase
      }).addOperation(contract.call(method, ...args)).setTimeout(import_stellar_sdk4.TimeoutInfinite).build();
      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await signer.signTransaction(preparedTx.toXDR());
      const submitResponse = await server.sendTransaction(
        import_stellar_sdk4.TransactionBuilder.fromXDR(signedXdr, this.provider.networkPassphrase)
      );
      if (submitResponse.status === "ERROR") {
        throw new Error(`Submit error: ${JSON.stringify(submitResponse.errorResult)}`);
      }
      const statusResponse = await this.pollTransaction(submitResponse.hash);
      if (statusResponse.status === import_stellar_sdk4.rpc.Api.GetTransactionStatus.SUCCESS) {
        return { success: true, data: submitResponse.hash };
      }
      throw new Error(`Transaction failed with status: ${statusResponse.status}`);
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }
  async pollTransaction(hash) {
    const server = this.provider.getRpc();
    for (let i = 0; i < 25; i++) {
      const res = await server.getTransaction(hash);
      if (res.status === import_stellar_sdk4.rpc.Api.GetTransactionStatus.SUCCESS) {
        return res;
      }
      if (res.status === import_stellar_sdk4.rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction failed: ${JSON.stringify(res.resultXdr)}`);
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
    throw new Error("Transaction polling timed out");
  }
};

// src/utils.ts
function formatAddress(address) {
  if (!address || address.length < 10) return address || "";
  return address.slice(0, 6) + "\u2026" + address.slice(-4);
}
function calculateTVL(summaries) {
  let total = 0;
  for (const s of summaries) {
    const amt = parseFloat(s.contribution_amount) || 0;
    total += amt * s.member_count;
  }
  return total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function calculateReputation(missed, totalRounds) {
  if (missed >= 2) return 0;
  const base = 100 - missed * 20;
  return Math.max(0, base);
}

// src/signer.ts
var import_stellar_sdk5 = require("@stellar/stellar-sdk");
var FreighterSigner = class {
  freighter;
  address;
  constructor(freighter2, address) {
    this.freighter = freighter2;
    this.address = address;
  }
  async getAddress() {
    return this.address;
  }
  async signTransaction(txXdr) {
    return await this.freighter.signTransaction(txXdr, this.address);
  }
};
var SecretKeySigner = class {
  keypair;
  constructor(secretKey) {
    this.keypair = import_stellar_sdk5.Keypair.fromSecret(secretKey);
  }
  async getAddress() {
    return this.keypair.publicKey();
  }
  async signTransaction(txXdr) {
    const tx = import_stellar_sdk5.TransactionBuilder.fromXDR(txXdr, "Test SDF Network ; September 2015");
    tx.sign(this.keypair);
    return tx.toXDR();
  }
};
var PasskeySigner = class {
  keyId;
  publicKeyRaw;
  // Hex representation of secp256r1 public key coordinates
  address;
  // Smart contract wallet address associated with the passkey
  mockKeypair;
  // Used for CLI/Node testing fallback
  constructor(keyId, publicKeyRaw, address, mockSecret) {
    this.keyId = keyId;
    this.publicKeyRaw = publicKeyRaw;
    this.address = address;
    if (mockSecret || typeof window === "undefined") {
      this.mockKeypair = mockSecret ? import_stellar_sdk5.Keypair.fromSecret(mockSecret) : import_stellar_sdk5.Keypair.random();
    }
  }
  static async create(userName) {
    if (typeof window === "undefined" || !navigator.credentials) {
      const keyId = Buffer.from(Math.random().toString()).toString("hex");
      const publicKeyRaw = Buffer.from(Math.random().toString()).toString("hex");
      return { keyId, publicKeyRaw };
    }
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Mesa Protocol", id: window.location.hostname },
        user: {
          id: new Uint8Array(16),
          name: userName,
          displayName: userName
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }
          // ES256 (secp256r1)
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 6e4
      }
    });
    if (!credential) {
      throw new Error("Passkey creation failed");
    }
    const rawId = Buffer.from(credential.rawId).toString("hex");
    let pubKeyHex = "00".repeat(64);
    if (typeof credential.response.getPublicKey === "function") {
      const spki = credential.response.getPublicKey();
      pubKeyHex = Buffer.from(spki).toString("hex");
    }
    return { keyId: rawId, publicKeyRaw: pubKeyHex };
  }
  async getAddress() {
    return this.address;
  }
  async signTransaction(txXdr) {
    if (this.mockKeypair) {
      const tx2 = import_stellar_sdk5.TransactionBuilder.fromXDR(txXdr, "Test SDF Network ; September 2015");
      tx2.sign(this.mockKeypair);
      return tx2.toXDR();
    }
    if (typeof window === "undefined" || !navigator.credentials) {
      throw new Error("WebAuthn not supported in this environment");
    }
    const tx = import_stellar_sdk5.TransactionBuilder.fromXDR(txXdr, "Test SDF Network ; September 2015");
    const challenge = new Uint8Array(tx.hash());
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: "public-key",
            id: new Uint8Array(Buffer.from(this.keyId, "hex"))
          }
        ],
        userVerification: "required"
      }
    });
    if (!assertion) {
      throw new Error("Passkey signature failed");
    }
    return txXdr;
  }
};

// src/index.ts
var MesaSDK = class _MesaSDK {
  config;
  provider;
  freighter;
  factory;
  circle;
  vault;
  dataProvider;
  state = {
    walletAddress: null,
    isConnected: false,
    balances: {},
    save() {
      if (typeof window !== "undefined") {
        localStorage.setItem("mesa_state", JSON.stringify({
          walletAddress: this.walletAddress,
          isConnected: this.isConnected
        }));
      }
    },
    load() {
      if (typeof window !== "undefined") {
        try {
          const d = JSON.parse(localStorage.getItem("mesa_state") || "{}");
          this.walletAddress = d.walletAddress || null;
          this.isConnected = !!d.isConnected;
        } catch (_) {
        }
      }
    }
  };
  constructor(config) {
    this.config = config;
    this.provider = new RpcProvider(config.rpcUrl, config.networkPassphrase);
    this.freighter = new FreighterWallet(config.networkPassphrase);
    if (config.indexerUrl) {
      console.log(`[MesaSDK] Using GraphQL indexer at: ${config.indexerUrl}`);
      this.dataProvider = new IndexerProvider(config.indexerUrl);
    } else {
      console.log("[MesaSDK] Indexer URL not provided. Falling back to direct Soroban RPC.");
      this.dataProvider = null;
    }
    this.factory = new FactoryWrapper(this.provider, this.freighter, config.factoryContractId, this.dataProvider);
    this.circle = new CircleWrapper(this.provider, this.freighter, this.dataProvider);
    this.vault = new VaultWrapper(this.provider);
    if (!config.indexerUrl) {
      this.dataProvider = new RpcDataProvider(this.factory, this.circle);
      this.factory.dataProvider = this.dataProvider;
      this.circle.dataProvider = this.dataProvider;
    }
    this.state.load();
    if (this.state.isConnected && this.state.walletAddress) {
      setTimeout(() => {
        this.connectWallet().catch(() => {
        });
      }, 500);
    }
  }
  // --- Feature Registry & Capability Detection ---
  features() {
    return [
      "vaults",
      "recurring",
      "goal",
      "auto-convert",
      "group-savings",
      "analytics",
      "biometric-passkeys",
      "emergency-withdrawals"
    ];
  }
  supports(feature) {
    return this.features().includes(feature.toLowerCase());
  }
  protocolVersion() {
    return "v1.0.0";
  }
  network() {
    return this.config.network || "testnet";
  }
  static async connect(config) {
    const sdk = new _MesaSDK(config);
    try {
      const server = new import_stellar_sdk6.rpc.Server(config.rpcUrl);
      await server.getNetwork();
    } catch (_) {
    }
    return sdk;
  }
  // --- UI Overlay Helpers (Premium Toasts & Spinners) ---
  showToast(message, type = "info") {
    if (typeof document === "undefined") return;
    let container = document.getElementById("mesa-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "mesa-toast-container";
      container.className = "fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm pointer-events-none";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "mesa-toast pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl transition-all duration-300 transform translate-y-2 opacity-0 ";
    let icon = "info";
    if (type === "success") {
      toast.className += "bg-emerald-500 text-white border border-emerald-600/30";
      icon = "check_circle";
    } else if (type === "error") {
      toast.className += "bg-red-500 text-white border border-red-600/30";
      icon = "error";
    } else if (type === "warning") {
      toast.className += "bg-amber-500 text-white border border-amber-600/30";
      icon = "warning";
    } else {
      toast.className += "bg-slate-800 text-white border border-slate-700/30";
      icon = "info";
    }
    toast.innerHTML = `
      <span class="material-symbols-outlined text-[20px]">${icon}</span>
      <span class="font-sans text-sm font-semibold">${message}</span>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove("translate-y-2", "opacity-0");
      toast.classList.add("translate-y-0", "opacity-100");
    });
    setTimeout(() => {
      toast.classList.remove("translate-y-0", "opacity-100");
      toast.classList.add("translate-y-2", "opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 4e3);
  }
  showSpinner(message) {
    if (typeof document === "undefined") return;
    this.hideSpinner();
    const overlay = document.createElement("div");
    overlay.id = "mesa-spinner-overlay";
    overlay.className = "fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9998] flex flex-col items-center justify-center text-center p-6";
    overlay.innerHTML = `
      <div class="relative w-16 h-16 mb-4">
        <svg class="animate-spin w-full h-full text-emerald-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p class="font-sans text-lg font-bold text-white mb-1">Stellar Soroban Execution</p>
      <p class="font-sans text-sm text-slate-300 max-w-sm">${message}</p>
    `;
    document.body.appendChild(overlay);
  }
  hideSpinner() {
    if (typeof document === "undefined") return;
    const overlay = document.getElementById("mesa-spinner-overlay");
    if (overlay) overlay.remove();
  }
  // --- Wallet Operations ---
  async connectWallet() {
    try {
      this.showSpinner("Connecting Freighter Wallet...");
      const address = await this.freighter.connect();
      this.state.walletAddress = address;
      this.state.isConnected = true;
      this.state.save();
      this.state.balances = await this.fetchBalances(address);
      this.hideSpinner();
      this.showToast("Freighter Wallet connected successfully!", "success");
      this.populateDashboard();
      return address;
    } catch (e) {
      this.hideSpinner();
      this.showToast(e.message || "Freighter connection failed", "error");
      throw e;
    }
  }
  disconnectWallet() {
    this.state.walletAddress = null;
    this.state.isConnected = false;
    this.state.balances = {};
    this.state.save();
    this.showToast("Wallet disconnected", "warning");
    this.populateDashboard();
  }
  async fetchBalances(address) {
    try {
      const horizonUrl = this.config.rpcUrl.includes("testnet") ? "https://horizon-testnet.stellar.org" : "https://horizon.stellar.org";
      const res = await fetch(`${horizonUrl}/accounts/${address}`);
      if (!res.ok) return {};
      const data = await res.json();
      const out = {};
      for (const b of data.balances || []) {
        if (b.asset_type === "native") out["XLM"] = parseFloat(b.balance).toFixed(2);
        else out[b.asset_code] = parseFloat(b.balance).toFixed(2);
      }
      return out;
    } catch (_) {
      return {};
    }
  }
  // --- Dynamic Dashboard & UI Population ---
  populateDashboard() {
    if (typeof document === "undefined") return;
    const balEl = document.getElementById("mesa-wallet-balance");
    const btn = document.getElementById("mesa-wallet-connect-btn");
    if (balEl) {
      if (this.state.isConnected && this.state.walletAddress) {
        const short = formatAddress(this.state.walletAddress);
        const xlm = this.state.balances["XLM"] ? `${this.state.balances["XLM"]} XLM` : "Connected";
        balEl.textContent = `${short} \xB7 ${xlm}`;
        if (btn) {
          btn.onclick = () => this.disconnectWallet();
        }
      } else {
        balEl.textContent = "Connect Wallet";
        if (btn) {
          btn.onclick = () => this.connectWallet();
        }
      }
    }
    if (typeof window.renderChamaPage === "function") {
      window.renderChamaPage();
    }
    this.populateDashboardMetrics().catch(() => {
    });
  }
  async populateDashboardMetrics() {
    if (typeof document === "undefined") return;
    const tvlEl = document.getElementById("mesa-tvl");
    const greetingEl = document.getElementById("mesa-greeting");
    const gridEl = document.getElementById("mesa-active-circles-grid");
    if (greetingEl) {
      if (this.state.isConnected && this.state.walletAddress) {
        greetingEl.textContent = `Good morning, ${formatAddress(this.state.walletAddress)}.`;
      } else {
        greetingEl.textContent = `Good morning, guest.`;
      }
    }
    const summaryRes = await this.factory.getChamasSummary();
    if (!summaryRes.success || !summaryRes.data) return;
    const summaries = summaryRes.data;
    if (tvlEl) {
      const tvl = calculateTVL(summaries);
      tvlEl.textContent = `$${tvl} USDC`;
    }
    if (gridEl) {
      gridEl.innerHTML = "";
      if (summaries.length === 0) {
        gridEl.innerHTML = `
          <div class="col-span-3 p-6 text-center border border-dashed border-slate-300 rounded-2xl">
            <p class="text-slate-500 font-sans">No savings circles deployed yet. Be the first to create one!</p>
          </div>
        `;
        return;
      }
      for (const s of summaries) {
        const rawAmt = parseFloat(s.contribution_amount) || 0;
        const displayAmt = rawAmt >= 1e5 ? rawAmt / 1e7 : rawAmt;
        let statusText = "SIGNUP";
        let statusClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
        if (s.status === 1) {
          statusText = "ACTIVE";
          statusClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
        } else if (s.status === 2) {
          statusText = "PAUSED";
          statusClass = "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
        } else if (s.status === 3) {
          statusText = "COMPLETED";
          statusClass = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
        }
        const payoutModeText = s.payout_mode === 1 ? "Auction" : "Fixed";
        const payoutModeClass = s.payout_mode === 1 ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
        const card = document.createElement("div");
        card.className = "bg-white dark:bg-slate-850 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col hover:shadow-md transition-all duration-300 cursor-pointer";
        card.setAttribute("onclick", `window.location.hash = '#circle?contract=${s.contract_id}'`);
        card.innerHTML = `
          <div class="flex justify-between items-start mb-4">
            <div>
              <div class="flex gap-1.5 mb-1 items-center">
                <span class="inline-block px-2 py-[2px] rounded ${statusClass} font-bold text-[10px] uppercase">${statusText}</span>
                <span class="inline-block px-2 py-[2px] rounded ${payoutModeClass} font-bold text-[10px] uppercase">${payoutModeText}</span>
              </div>
              <h3 class="font-sans text-lg font-bold text-slate-900 dark:text-white">${s.name}</h3>
            </div>
            <div class="flex -space-x-2">
              <div class="w-8 h-8 rounded-full bg-emerald-500 text-white border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold">${s.member_count}</div>
              <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">/ ${s.max_members}</div>
            </div>
          </div>
          <div class="space-y-2 mb-6">
            <div class="flex justify-between text-xs">
              <span class="text-slate-500">Members Registered</span>
              <span class="font-bold text-slate-700 dark:text-slate-300">${s.member_count} / ${s.max_members}</span>
            </div>
            <div class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-emerald-500" style="width: ${s.member_count / s.max_members * 100}%"></div>
            </div>
          </div>
          <div class="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p class="text-[10px] text-slate-400 uppercase font-semibold">Contribution</p>
              <p class="font-bold text-slate-900 dark:text-white">${displayAmt.toFixed(2)} USDC</p>
            </div>
            <button onclick="window.location.hash = '#circle?contract=${s.contract_id}'" class="px-4 py-2 bg-slate-900 dark:bg-emerald-500 text-white rounded-lg font-bold text-xs hover:opacity-90 transition-opacity">View Circle</button>
          </div>
        `;
        gridEl.appendChild(card);
      }
    }
  }
  // --- Dynamic Circle Creation Wizard ---
  async createChama(formData) {
    if (!this.state.walletAddress) {
      this.showToast("Please connect your wallet first", "warning");
      return;
    }
    let tokenAddress = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
    const amountScaled = BigInt(Math.round(formData.contributionAmount)) * 10000000n;
    let durationSec = formData.roundDuration;
    if (isNaN(durationSec)) {
      const freq = String(formData.roundDuration).toLowerCase();
      if (freq === "weekly") durationSec = 604800;
      else if (freq === "biweekly") durationSec = 1209600;
      else if (freq === "monthly") durationSec = 2592e3;
      else if (freq === "quarterly") durationSec = 7776e3;
      else durationSec = 3600;
    }
    this.showSpinner(`Deploying circle "${formData.name}" to Stellar Testnet...`);
    const res = await this.factory.createChama(
      formData.name,
      amountScaled.toString(),
      5,
      // max members default for demo
      durationSec,
      tokenAddress,
      this.state.walletAddress,
      formData.payoutMode ?? 0
    );
    this.hideSpinner();
    if (res.success && res.data) {
      this.showToast(`\u{1F389} "${formData.name}" successfully deployed!`, "success");
      const contractId = res.data.contractId;
      setTimeout(() => {
        window.location.hash = `#circle?contract=${contractId}`;
      }, 1200);
      return res.data;
    } else {
      this.showToast(`Deployment failed: ${res.error}`, "error");
      throw new Error(res.error);
    }
  }
  // --- Circle Room Mutation Wrappers (with spinners & toasts) ---
  async join(contractId, sponsorAddress) {
    if (!this.state.walletAddress) {
      this.showToast("Wallet not connected", "warning");
      return false;
    }
    const member = this.state.walletAddress;
    const sponsor = sponsorAddress || member;
    this.showSpinner("Submitting Join & Collateral Lock transaction...");
    const res = await this.circle.join(contractId, member, sponsor);
    this.hideSpinner();
    if (res.success) {
      this.showToast("Successfully joined the Savings Circle!", "success");
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Join transaction failed: ${res.error}`, "error");
      return false;
    }
  }
  async activateCircle(contractId) {
    if (!this.state.walletAddress) {
      this.showToast("Wallet not connected", "warning");
      return false;
    }
    this.showSpinner("Activating savings circle and locking rotation order...");
    const res = await this.circle.activate(contractId, this.state.walletAddress);
    this.hideSpinner();
    if (res.success) {
      this.showToast("Savings Circle is now ACTIVE!", "success");
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Activation failed: ${res.error}`, "error");
      return false;
    }
  }
  async contribute(contractId) {
    if (!this.state.walletAddress) {
      this.showToast("Wallet not connected", "warning");
      return false;
    }
    this.showSpinner("Paying contribution to circle escrow...");
    const res = await this.circle.contribute(contractId, this.state.walletAddress);
    this.hideSpinner();
    if (res.success) {
      this.showToast("Contribution paid successfully!", "success");
      this.syncChamaRegistry(contractId).catch(() => {
      });
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Contribution failed: ${res.error}`, "error");
      return false;
    }
  }
  async placeBid(contractId, discountAmount) {
    if (!this.state.walletAddress) {
      this.showToast("Wallet not connected", "warning");
      return false;
    }
    this.showSpinner("Submitting sealed discount bid...");
    const bidScaled = BigInt(Math.round(discountAmount)) * 10000000n;
    const res = await this.circle.placeBid(contractId, this.state.walletAddress, bidScaled.toString());
    this.hideSpinner();
    if (res.success) {
      this.showToast("Discount bid submitted successfully!", "success");
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Bid submission failed: ${res.error}`, "error");
      return false;
    }
  }
  async distribute(contractId) {
    if (!this.state.walletAddress) {
      this.showToast("Wallet not connected", "warning");
      return false;
    }
    this.showSpinner("Executing round distribution payload...");
    const res = await this.circle.distribute(contractId, this.state.walletAddress);
    this.hideSpinner();
    if (res.success) {
      this.showToast("Payout distributed to the round beneficiary!", "success");
      this.syncChamaRegistry(contractId).catch(() => {
      });
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Distribution failed: ${res.error}`, "error");
      return false;
    }
  }
  async flagEmergency(contractId) {
    if (!this.state.walletAddress) {
      this.showToast("Wallet not connected", "warning");
      return false;
    }
    this.showSpinner("Flagging emergency pause event...");
    const res = await this.circle.flagEmergency(contractId, this.state.walletAddress);
    this.hideSpinner();
    if (res.success) {
      this.showToast("Emergency flag submitted.", "warning");
      this.syncChamaRegistry(contractId).catch(() => {
      });
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Flag transaction failed: ${res.error}`, "error");
      return false;
    }
  }
  async withdraw(contractId) {
    if (!this.state.walletAddress) {
      this.showToast("Wallet not connected", "warning");
      return false;
    }
    this.showSpinner("Withdrawing security deposits from paused circle...");
    const res = await this.circle.withdrawPrincipal(contractId, this.state.walletAddress);
    this.hideSpinner();
    if (res.success) {
      this.showToast("Escrow funds withdrawn successfully!", "success");
      this.syncChamaRegistry(contractId).catch(() => {
      });
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Withdrawal failed: ${res.error}`, "error");
      return false;
    }
  }
  // Helper to sync registry stats
  async syncChamaRegistry(contractId) {
    if (!this.state.walletAddress) return;
    try {
      const summariesRes = await this.factory.getChamasSummary();
      if (!summariesRes.success || !summariesRes.data) return;
      const found = summariesRes.data.find((s) => s.contract_id === contractId);
      if (found) {
        await this.factory.syncChama(found.id, this.state.walletAddress);
      }
    } catch (_) {
    }
  }
  // --- Strict Receive Path Payments ---
  async checkPathPayment(fromAssetCode, fromAssetIssuer, toAssetCode, toAssetIssuer, amount) {
    this.showSpinner(`Finding conversion path for ${amount} ${toAssetCode}...`);
    try {
      const horizonUrl = "https://horizon-testnet.stellar.org";
      const sourceAssetStr = fromAssetCode === "XLM" || fromAssetCode === "native" ? "native" : `${fromAssetCode}:${fromAssetIssuer}`;
      const destAssetType = toAssetCode === "XLM" || toAssetCode === "native" ? "native" : "credit_alphanum4";
      let queryUrl = `${horizonUrl}/paths/strict-receive?source_assets=${sourceAssetStr}&destination_asset_type=${destAssetType}&destination_amount=${amount}`;
      if (toAssetCode !== "XLM" && toAssetCode !== "native") {
        queryUrl += `&destination_asset_code=${toAssetCode}&destination_asset_issuer=${toAssetIssuer}`;
      }
      console.log(`[MesaSDK] Path finding URL: ${queryUrl}`);
      const res = await fetch(queryUrl).then((r) => r.json());
      this.hideSpinner();
      const records = res._embedded?.records || [];
      if (records.length === 0) {
        console.warn(`[MesaSDK] No paths found from Horizon. Using 1:1 fallback path.`);
        let fallbackRate = 1;
        if (fromAssetCode === "EURC") fallbackRate = 0.95;
        if (fromAssetCode === "XLM") fallbackRate = 4.5;
        const sourceAmount2 = (parseFloat(amount) * fallbackRate).toFixed(7);
        const hops2 = [fromAssetCode, toAssetCode];
        this.showToast(`Path Payment Found (Testnet Fallback): ${sourceAmount2} ${fromAssetCode} converts to ${amount} ${toAssetCode}`, "info");
        return {
          success: true,
          source_amount: sourceAmount2,
          rate: fallbackRate,
          path: [],
          hops: hops2,
          isFallback: true
        };
      }
      const sorted = records.sort((a, b) => parseFloat(a.source_amount) - parseFloat(b.source_amount));
      const best = sorted[0];
      const sourceAmount = best.source_amount;
      const rate = parseFloat(sourceAmount) / parseFloat(amount);
      const intermediatePath = best.path.map((p) => ({
        code: p.asset_code || "XLM",
        issuer: p.asset_issuer || null
      }));
      const hops = [fromAssetCode, ...best.path.map((p) => p.asset_code || "XLM"), toAssetCode];
      this.showToast(`Path Payment Found: ${parseFloat(sourceAmount).toFixed(4)} ${fromAssetCode} converts to ${parseFloat(amount).toFixed(2)} ${toAssetCode}`, "success");
      return {
        success: true,
        source_amount: sourceAmount,
        rate,
        path: intermediatePath,
        hops,
        isFallback: false
      };
    } catch (e) {
      this.hideSpinner();
      console.error("[MesaSDK] checkPathPayment error:", e);
      this.showToast(`Path payment query failed: ${e.message}`, "error");
      return { success: false, error: e.message || String(e) };
    }
  }
  async contributeWithPathPayment(contractId, sendAssetCode, sendAssetIssuer, sendMax, destAssetCode, destAssetIssuer, destAmount, pathAssets) {
    if (!this.state.walletAddress) {
      this.showToast("Wallet not connected", "warning");
      return false;
    }
    this.showSpinner(`Submitting Cross-Border Contribution (${sendAssetCode} -> ${destAssetCode})...`);
    const res = await this.circle.contributeWithPathPayment(
      contractId,
      this.state.walletAddress,
      sendAssetCode,
      sendAssetIssuer,
      sendMax,
      destAssetCode,
      destAssetIssuer,
      destAmount,
      pathAssets
    );
    this.hideSpinner();
    if (res.success) {
      this.showToast("Cross-border contribution paid successfully!", "success");
      this.syncChamaRegistry(contractId).catch(() => {
      });
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Cross-border contribution failed: ${res.error}`, "error");
      return false;
    }
  }
};
if (typeof window !== "undefined") {
  const defaultPassphrase = "Test SDF Network ; September 2015";
  const defaultRpc = "https://soroban-testnet.stellar.org";
  const defaultFactoryId = "CBFXB5LZB2FJDVK66H7NPZEK2OE6VXNGYORSGE2W4V55UTG5NG63JGDG";
  const sdk = new MesaSDK({
    rpcUrl: defaultRpc,
    factoryContractId: defaultFactoryId,
    network: "testnet",
    networkPassphrase: defaultPassphrase,
    indexerUrl: "http://localhost:4000/graphql"
  });
  window.MesaSDK = sdk;
  console.log("[MesaSDK TS] Initialized on-chain global instance.");
  window.addEventListener("load", () => {
    setTimeout(() => sdk.populateDashboard(), 500);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CircleStatus,
  CircleWrapper,
  FactoryWrapper,
  FreighterSigner,
  MesaSDK,
  PasskeySigner,
  PolicyType,
  RpcProvider,
  SecretKeySigner,
  VaultWrapper,
  argAddress,
  argBytes32,
  argI128,
  argString,
  argU32,
  argU64,
  calculateReputation,
  calculateTVL,
  formatAddress,
  nativeToPolicy,
  policyToScVal
});
//# sourceMappingURL=index.cjs.map