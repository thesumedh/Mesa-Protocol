import { Contract, TransactionBuilder, rpc, TimeoutInfinite, scValToNative, xdr } from '@stellar/stellar-sdk';
import { RpcProvider, argAddress, argString, argI128, argU64 } from './provider';
import { MesaSigner } from './signer';
import { Result } from './types';

export enum PolicyType {
  Lock = 'Lock',
  AutoConvert = 'AutoConvert',
  WeeklyDeposit = 'WeeklyDeposit',
  Goal = 'Goal',
  AllowEmergencyWithdrawal = 'AllowEmergencyWithdrawal'
}

export type Policy =
  | { type: PolicyType.Lock; value: number }
  | { type: PolicyType.AutoConvert; value: string }
  | { type: PolicyType.WeeklyDeposit; value: string }
  | { type: PolicyType.Goal; value: string }
  | { type: PolicyType.AllowEmergencyWithdrawal; value: boolean };

export interface VaultState {
  creator: string;
  name: string;
  token: string;
  policies: Policy[];
  total_balance: string;
  emergency_active: boolean;
}

export function policyToScVal(policy: Policy): xdr.ScVal {
  const sym = xdr.ScVal.scvSymbol(policy.type);
  let val: xdr.ScVal;
  switch (policy.type) {
    case PolicyType.Lock:
      val = argU64(policy.value);
      break;
    case PolicyType.AutoConvert:
      val = argAddress(policy.value);
      break;
    case PolicyType.WeeklyDeposit:
    case PolicyType.Goal:
      val = argI128(policy.value);
      break;
    case PolicyType.AllowEmergencyWithdrawal:
      val = xdr.ScVal.scvBool(policy.value);
      break;
    default:
      throw new Error(`Unsupported policy type: ${(policy as any).type}`);
  }
  return xdr.ScVal.scvVec([sym, val]);
}

export function nativeToPolicy(native: any): Policy {
  if (!Array.isArray(native) || native.length < 2) {
    throw new Error('Invalid policy native format');
  }
  const type = native[0].toString() as PolicyType;
  const rawVal = native[1];
  switch (type) {
    case PolicyType.Lock:
      return { type: PolicyType.Lock, value: Number(rawVal) };
    case PolicyType.AutoConvert:
      return { type: PolicyType.AutoConvert, value: rawVal.toString() };
    case PolicyType.WeeklyDeposit:
      return { type: PolicyType.WeeklyDeposit, value: rawVal.toString() };
    case PolicyType.Goal:
      return { type: PolicyType.Goal, value: rawVal.toString() };
    case PolicyType.AllowEmergencyWithdrawal:
      return { type: PolicyType.AllowEmergencyWithdrawal, value: !!rawVal };
    default:
      throw new Error(`Unknown policy type: ${type}`);
  }
}

export class VaultWrapper {
  private provider: RpcProvider;

  constructor(provider: RpcProvider) {
    this.provider = provider;
  }

  // --- Read-Only Methods ---

  async getState(contractId: string): Promise<Result<VaultState>> {
    try {
      const scVal = await this.provider.callReadOnly(contractId, 'get_vault_state');
      const native = scValToNative(scVal) as any;
      const state: VaultState = {
        creator: native.creator.toString(),
        name: native.name.toString(),
        token: native.token.toString(),
        policies: (native.policies || []).map((p: any) => nativeToPolicy(p)),
        total_balance: native.total_balance.toString(),
        emergency_active: !!native.emergency_active,
      };
      return { success: true, data: state };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  // --- Write Operations ---

  async initialize(
    contractId: string,
    signer: MesaSigner,
    name: string,
    tokenAddress: string,
    policies: Policy[]
  ): Promise<Result<string>> {
    const scPolicies = xdr.ScVal.scvVec(policies.map(policyToScVal));
    return this.sendTx(
      contractId,
      'initialize',
      [
        argAddress(await signer.getAddress()),
        argString(name),
        argAddress(tokenAddress),
        scPolicies
      ],
      signer
    );
  }

  async deposit(
    contractId: string,
    signer: MesaSigner,
    amount: string | number
  ): Promise<Result<string>> {
    const sender = await signer.getAddress();
    return this.sendTx(
      contractId,
      'deposit',
      [argAddress(sender), argI128(amount)],
      signer
    );
  }

  async withdraw(
    contractId: string,
    signer: MesaSigner,
    amount: string | number
  ): Promise<Result<string>> {
    const sender = await signer.getAddress();
    return this.sendTx(
      contractId,
      'withdraw',
      [argAddress(sender), argI128(amount)],
      signer
    );
  }

  async voteEmergency(
    contractId: string,
    signer: MesaSigner
  ): Promise<Result<string>> {
    const sender = await signer.getAddress();
    return this.sendTx(
      contractId,
      'vote_emergency',
      [argAddress(sender)],
      signer
    );
  }

  // --- Transaction Submission Helper ---

  private async sendTx(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
    signer: MesaSigner
  ): Promise<Result<string>> {
    try {
      const server = this.provider.getRpc();
      const contract = new Contract(contractId);
      const senderAddress = await signer.getAddress();
      const account = await server.getAccount(senderAddress);

      const tx = new TransactionBuilder(account, {
        fee: '1000',
        networkPassphrase: (this.provider as any).networkPassphrase,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(TimeoutInfinite)
        .build();

      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await signer.signTransaction(preparedTx.toXDR());
      const submitResponse = await server.sendTransaction(
        TransactionBuilder.fromXDR(signedXdr, (this.provider as any).networkPassphrase)
      );

      if (submitResponse.status === 'ERROR') {
        throw new Error(`Submit error: ${JSON.stringify(submitResponse.errorResult)}`);
      }

      const statusResponse = await this.pollTransaction(submitResponse.hash);
      if (statusResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return { success: true, data: submitResponse.hash };
      }
      throw new Error(`Transaction failed with status: ${statusResponse.status}`);
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  private async pollTransaction(hash: string): Promise<rpc.Api.GetTransactionResponse> {
    const server = this.provider.getRpc();
    for (let i = 0; i < 25; i++) {
      const res = await server.getTransaction(hash);
      if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return res;
      }
      if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction failed: ${JSON.stringify(res.resultXdr)}`);
      }
      await new Promise(r => setTimeout(r, 1200));
    }
    throw new Error('Transaction polling timed out');
  }
}
