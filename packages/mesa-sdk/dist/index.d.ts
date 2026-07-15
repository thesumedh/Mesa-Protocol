import { xdr, rpc } from '@stellar/stellar-sdk';

interface MesaConfig {
    rpcUrl: string;
    factoryContractId: string;
    network: 'testnet' | 'futurenet' | 'mainnet';
    networkPassphrase: string;
    indexerUrl?: string;
}
declare enum CircleStatus {
    Signup = 0,
    Active = 1,
    Paused = 2,
    Completed = 3
}
interface Circle {
    name: string;
    creator: string;
    contribution_amount: string;
    max_members: number;
    duration: number;
    token: string;
    members: string[];
    rotation_order: string[];
    current_round: number;
    deadline: number;
    status: CircleStatus;
    payout_mode: number;
}
interface ChamaSummary {
    id: number;
    name: string;
    contract_id: string;
    contribution_amount: string;
    max_members: number;
    member_count: number;
    status: CircleStatus;
    token: string;
    payout_mode: number;
}
interface Activity {
    hash: string;
    type: string;
    member: string;
    amount?: string;
    timestamp: number;
}
interface Result<T> {
    success: boolean;
    data?: T;
    error?: string;
}
interface MesaDataProvider {
    getChamasSummary(): Promise<Result<ChamaSummary[]>>;
    getCircleState(contractId: string): Promise<Result<Circle>>;
    getActivities(member?: string, limit?: number): Promise<Result<Activity[]>>;
    getTVL(): Promise<Result<string>>;
}

declare function argAddress(addr: string): xdr.ScVal;
declare function argString(str: string): xdr.ScVal;
declare function argU32(val: number): xdr.ScVal;
declare function argU64(val: number | bigint): xdr.ScVal;
declare function argI128(val: number | bigint | string): xdr.ScVal;
declare function argBytes32(hex: string): xdr.ScVal;
declare class RpcProvider {
    private rpc;
    private networkPassphrase;
    constructor(rpcUrl: string, networkPassphrase: string);
    callReadOnly(contractId: string, method: string, args?: xdr.ScVal[], sourceAddress?: string): Promise<xdr.ScVal>;
    getRpc(): rpc.Server;
}

declare class FreighterWallet {
    private networkPassphrase;
    constructor(networkPassphrase: string);
    private _request;
    private _createFallbackAPI;
    private _getAPI;
    private _resultFlag;
    private _errorMessage;
    private _addressFrom;
    isInstalled(): Promise<boolean>;
    connect(): Promise<string>;
    signTransaction(xdrStr: string, signerAddress: string): Promise<string>;
}

declare class FactoryWrapper {
    private provider;
    private freighter;
    private factoryContractId;
    private dataProvider?;
    constructor(provider: RpcProvider, freighter: FreighterWallet, factoryContractId: string, dataProvider?: MesaDataProvider);
    private parseChamaSummary;
    listChamas(limit?: number, offset?: number): Promise<Result<ChamaSummary[]>>;
    getChamasSummary(bypassCache?: boolean): Promise<Result<ChamaSummary[]>>;
    getChama(chamaId: number): Promise<Result<string>>;
    createChama(name: string, contribution: string | number | bigint, maxMembers: number, duration: number, tokenAddress: string, creatorAddress: string, payoutMode?: number): Promise<Result<{
        chamaId: number;
        contractId: string;
    }>>;
    syncChama(chamaId: number, senderAddress: string): Promise<Result<string>>;
    private pollTransaction;
}

declare class CircleWrapper {
    private provider;
    private freighter;
    private dataProvider?;
    constructor(provider: RpcProvider, freighter: FreighterWallet, dataProvider?: MesaDataProvider);
    getState(contractId: string, bypassCache?: boolean): Promise<Result<Circle>>;
    canDistribute(contractId: string): Promise<Result<boolean>>;
    getMemberDeposit(contractId: string, memberAddress: string): Promise<Result<string>>;
    getMemberMisses(contractId: string, memberAddress: string): Promise<Result<number>>;
    hasContributed(contractId: string, round: number, memberAddress: string): Promise<Result<boolean>>;
    getReputation(contractId: string, memberAddress: string): Promise<Result<number>>;
    getSponsor(contractId: string, memberAddress: string): Promise<Result<string>>;
    getAuctionBids(contractId: string): Promise<Result<Record<string, string>>>;
    join(contractId: string, memberAddress: string, sponsorAddress: string): Promise<Result<string>>;
    activate(contractId: string, senderAddress: string): Promise<Result<string>>;
    contribute(contractId: string, contributorAddress: string): Promise<Result<string>>;
    contributeWithPathPayment(contractId: string, contributorAddress: string, sendAssetCode: string, sendAssetIssuer: string | null, sendMax: string, destAssetCode: string, destAssetIssuer: string | null, destAmount: string, pathAssets: {
        code: string;
        issuer: string | null;
    }[]): Promise<Result<string>>;
    distribute(contractId: string, senderAddress: string): Promise<Result<string>>;
    flagEmergency(contractId: string, memberAddress: string): Promise<Result<string>>;
    withdrawPrincipal(contractId: string, memberAddress: string): Promise<Result<string>>;
    flagMissed(contractId: string, memberAddress: string, round: number, senderAddress: string): Promise<Result<string>>;
    placeBid(contractId: string, memberAddress: string, discountAmount: string | number): Promise<Result<string>>;
    private sendTx;
    private pollTransaction;
}

/**
 * Unified Signer Interface for Mesa SDK.
 * Abstracts wallet extensions, hardware keys (Passkeys), and raw secret keys.
 */
interface MesaSigner {
    getAddress(): Promise<string>;
    signTransaction(txXdr: string): Promise<string>;
}
/**
 * Freighter Wallet Signer implementation.
 */
declare class FreighterSigner implements MesaSigner {
    private freighter;
    private address;
    constructor(freighter: FreighterWallet, address: string);
    getAddress(): Promise<string>;
    signTransaction(txXdr: string): Promise<string>;
}
/**
 * Raw Secret Key Signer implementation. Primarily used for scripts and backend flows.
 */
declare class SecretKeySigner implements MesaSigner {
    private keypair;
    constructor(secretKey: string);
    getAddress(): Promise<string>;
    signTransaction(txXdr: string): Promise<string>;
}
/**
 * Passkey/WebAuthn Signer implementing Biometric Passkey Wallet support.
 * Manages TouchID/FaceID credentials and performs cryptographic signing.
 * Provides a secure mock fallback for Node/CLI environments.
 */
declare class PasskeySigner implements MesaSigner {
    private keyId;
    private publicKeyRaw;
    private address;
    private mockKeypair?;
    constructor(keyId: string, publicKeyRaw: string, address: string, mockSecret?: string);
    static create(userName: string): Promise<{
        keyId: string;
        publicKeyRaw: string;
    }>;
    getAddress(): Promise<string>;
    signTransaction(txXdr: string): Promise<string>;
}

declare enum PolicyType {
    Lock = "Lock",
    AutoConvert = "AutoConvert",
    WeeklyDeposit = "WeeklyDeposit",
    Goal = "Goal",
    AllowEmergencyWithdrawal = "AllowEmergencyWithdrawal"
}
type Policy = {
    type: PolicyType.Lock;
    value: number;
} | {
    type: PolicyType.AutoConvert;
    value: string;
} | {
    type: PolicyType.WeeklyDeposit;
    value: string;
} | {
    type: PolicyType.Goal;
    value: string;
} | {
    type: PolicyType.AllowEmergencyWithdrawal;
    value: boolean;
};
interface VaultState {
    creator: string;
    name: string;
    token: string;
    policies: Policy[];
    total_balance: string;
    emergency_active: boolean;
}
declare function policyToScVal(policy: Policy): xdr.ScVal;
declare function nativeToPolicy(native: any): Policy;
declare class VaultWrapper {
    private provider;
    constructor(provider: RpcProvider);
    getState(contractId: string): Promise<Result<VaultState>>;
    initialize(contractId: string, signer: MesaSigner, name: string, tokenAddress: string, policies: Policy[]): Promise<Result<string>>;
    deposit(contractId: string, signer: MesaSigner, amount: string | number): Promise<Result<string>>;
    withdraw(contractId: string, signer: MesaSigner, amount: string | number): Promise<Result<string>>;
    voteEmergency(contractId: string, signer: MesaSigner): Promise<Result<string>>;
    private sendTx;
    private pollTransaction;
}

declare function formatAddress(address: string): string;
declare function calculateTVL(summaries: ChamaSummary[]): string;
declare function calculateReputation(missed: number, totalRounds: number): number;

declare class MesaSDK {
    config: MesaConfig;
    provider: RpcProvider;
    freighter: FreighterWallet;
    factory: FactoryWrapper;
    circle: CircleWrapper;
    vault: VaultWrapper;
    dataProvider: MesaDataProvider;
    state: {
        walletAddress: string | null;
        isConnected: boolean;
        balances: Record<string, string>;
        save(): void;
        load(): void;
    };
    constructor(config: MesaConfig);
    features(): string[];
    supports(feature: string): boolean;
    protocolVersion(): string;
    network(): string;
    static connect(config: MesaConfig): Promise<MesaSDK>;
    showToast(message: string, type?: 'success' | 'error' | 'warning' | 'info'): void;
    showSpinner(message: string): void;
    hideSpinner(): void;
    connectWallet(): Promise<string>;
    disconnectWallet(): void;
    fetchBalances(address: string): Promise<Record<string, string>>;
    populateDashboard(): void;
    private populateDashboardMetrics;
    createChama(formData: {
        name: string;
        tokenCode: string;
        contributionAmount: number;
        roundDuration: number;
        membersRaw?: string;
        payoutMode?: number;
    }): Promise<any>;
    join(contractId: string, sponsorAddress?: string): Promise<boolean>;
    activateCircle(contractId: string): Promise<boolean>;
    contribute(contractId: string): Promise<boolean>;
    placeBid(contractId: string, discountAmount: number): Promise<boolean>;
    distribute(contractId: string): Promise<boolean>;
    flagEmergency(contractId: string): Promise<boolean>;
    withdraw(contractId: string): Promise<boolean>;
    private syncChamaRegistry;
    checkPathPayment(fromAssetCode: string, fromAssetIssuer: string | null, toAssetCode: string, toAssetIssuer: string | null, amount: string): Promise<any>;
    contributeWithPathPayment(contractId: string, sendAssetCode: string, sendAssetIssuer: string | null, sendMax: string, destAssetCode: string, destAssetIssuer: string | null, destAmount: string, pathAssets: {
        code: string;
        issuer: string | null;
    }[]): Promise<boolean>;
}

export { type Activity, type ChamaSummary, type Circle, CircleStatus, CircleWrapper, FactoryWrapper, FreighterSigner, type MesaConfig, type MesaDataProvider, MesaSDK, type MesaSigner, PasskeySigner, type Policy, PolicyType, type Result, RpcProvider, SecretKeySigner, type VaultState, VaultWrapper, argAddress, argBytes32, argI128, argString, argU32, argU64, calculateReputation, calculateTVL, formatAddress, nativeToPolicy, policyToScVal };
