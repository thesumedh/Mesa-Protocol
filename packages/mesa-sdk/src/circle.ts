import { Contract, Address, TransactionBuilder, rpc, Account, TimeoutInfinite, scValToNative, xdr, Asset, Operation } from '@stellar/stellar-sdk';
import { RpcProvider, argAddress, argU32, argString, argI128 } from './provider';
import { Circle, Result, CircleStatus, MesaDataProvider } from './types';
import { FreighterWallet } from './freighter';

export class CircleWrapper {
  private provider: RpcProvider;
  private freighter: FreighterWallet;
  private dataProvider?: MesaDataProvider;

  constructor(provider: RpcProvider, freighter: FreighterWallet, dataProvider?: MesaDataProvider) {
    this.provider = provider;
    this.freighter = freighter;
    this.dataProvider = dataProvider;
  }

  // --- Read-Only Methods ---

  async getState(contractId: string, bypassCache = false): Promise<Result<Circle>> {
    if (this.dataProvider && !bypassCache) {
      return await this.dataProvider.getCircleState(contractId);
    }
    try {
      const scVal = await this.provider.callReadOnly(contractId, 'get_circle');
      const native = scValToNative(scVal) as any;
      const state: Circle = {
        creator: native.creator.toString(),
        name: native.name.toString(),
        contribution_amount: native.contribution_amount.toString(),
        max_members: Number(native.max_members),
        duration: Number(native.duration),
        token: native.token.toString(),
        members: native.members.map((m: any) => m.toString()),
        rotation_order: native.rotation_order.map((r: any) => r.toString()),
        current_round: Number(native.current_round),
        deadline: Number(native.deadline),
        status: Number(native.status) as CircleStatus,
        payout_mode: Number(native.payout_mode || 0),
      };
      return { success: true, data: state };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async canDistribute(contractId: string): Promise<Result<boolean>> {
    try {
      const scVal = await this.provider.callReadOnly(contractId, 'can_distribute');
      return { success: true, data: scValToNative(scVal) as boolean };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async getMemberDeposit(contractId: string, memberAddress: string): Promise<Result<string>> {
    try {
      const scVal = await this.provider.callReadOnly(
        contractId,
        'get_member_deposit',
        [argAddress(memberAddress)]
      );
      return { success: true, data: scValToNative(scVal).toString() };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async getMemberMisses(contractId: string, memberAddress: string): Promise<Result<number>> {
    try {
      const scVal = await this.provider.callReadOnly(
        contractId,
        'get_member_misses',
        [argAddress(memberAddress)]
      );
      return { success: true, data: Number(scValToNative(scVal)) };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async hasContributed(contractId: string, round: number, memberAddress: string): Promise<Result<boolean>> {
    try {
      const scVal = await this.provider.callReadOnly(
        contractId,
        'has_contributed',
        [argU32(round), argAddress(memberAddress)]
      );
      return { success: true, data: scValToNative(scVal) as boolean };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async getReputation(contractId: string, memberAddress: string): Promise<Result<number>> {
    try {
      const scVal = await this.provider.callReadOnly(
        contractId,
        'get_reputation',
        [argAddress(memberAddress)]
      );
      return { success: true, data: Number(scValToNative(scVal)) };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async getSponsor(contractId: string, memberAddress: string): Promise<Result<string>> {
    try {
      const scVal = await this.provider.callReadOnly(
        contractId,
        'get_sponsor',
        [argAddress(memberAddress)]
      );
      return { success: true, data: scValToNative(scVal).toString() };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async getAuctionBids(contractId: string): Promise<Result<Record<string, string>>> {
    try {
      const scVal = await this.provider.callReadOnly(contractId, 'get_auction_bids');
      const native = scValToNative(scVal);
      const bids: Record<string, string> = {};
      if (native && native instanceof Map) {
        for (const [key, value] of native.entries()) {
          bids[key.toString()] = value.toString();
        }
      }
      return { success: true, data: bids };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  // --- Mutation Methods (Sends Transactions) ---

  async join(contractId: string, memberAddress: string, sponsorAddress: string): Promise<Result<string>> {
    return this.sendTx(contractId, 'join', [argAddress(memberAddress), argAddress(sponsorAddress)], memberAddress);
  }

  async activate(contractId: string, senderAddress: string): Promise<Result<string>> {
    // Contract now requires caller Address arg for creator auth check
    return this.sendTx(contractId, 'activate', [argAddress(senderAddress)], senderAddress);
  }

  async contribute(contractId: string, contributorAddress: string): Promise<Result<string>> {
    return this.sendTx(contractId, 'contribute', [argAddress(contributorAddress)], contributorAddress);
  }

  async contributeWithPathPayment(
    contractId: string,
    contributorAddress: string,
    sendAssetCode: string,
    sendAssetIssuer: string | null,
    sendMax: string,
    destAssetCode: string,
    destAssetIssuer: string | null,
    destAmount: string,
    pathAssets: { code: string; issuer: string | null }[]
  ): Promise<Result<string>> {
    try {
      const server = this.provider.getRpc();
      const account = await server.getAccount(contributorAddress);
      const contract = new Contract(contractId);

      const sendAssetObj = sendAssetCode === 'XLM' || sendAssetCode === 'native'
        ? Asset.native()
        : new Asset(sendAssetCode, sendAssetIssuer!);

      const destAssetObj = destAssetCode === 'XLM' || destAssetCode === 'native'
        ? Asset.native()
        : new Asset(destAssetCode, destAssetIssuer!);

      const pathObjs = pathAssets.map(p => {
        return p.code === 'XLM' || p.code === 'native'
          ? Asset.native()
          : new Asset(p.code, p.issuer!);
      });

      const tx = new TransactionBuilder(account, {
        fee: '2000',
        networkPassphrase: (this.provider as any).networkPassphrase,
      })
        .addOperation(
          Operation.pathPaymentStrictReceive({
            sendAsset: sendAssetObj,
            sendMax: sendMax,
            destination: contributorAddress,
            destAsset: destAssetObj,
            destAmount: destAmount,
            path: pathObjs,
          })
        )
        .addOperation(
          contract.call('contribute', argAddress(contributorAddress))
        )
        .setTimeout(TimeoutInfinite)
        .build();

      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await this.freighter.signTransaction(preparedTx.toXDR(), contributorAddress);
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

  async distribute(contractId: string, senderAddress: string): Promise<Result<string>> {
    // Contract now requires caller Address arg for creator auth check
    return this.sendTx(contractId, 'distribute', [argAddress(senderAddress)], senderAddress);
  }

  async flagEmergency(contractId: string, memberAddress: string): Promise<Result<string>> {
    return this.sendTx(contractId, 'flag_emergency', [argAddress(memberAddress)], memberAddress);
  }

  async withdrawPrincipal(contractId: string, memberAddress: string): Promise<Result<string>> {
    return this.sendTx(contractId, 'withdraw_principal', [argAddress(memberAddress)], memberAddress);
  }

  async flagMissed(contractId: string, memberAddress: string, round: number, senderAddress: string): Promise<Result<string>> {
    return this.sendTx(contractId, 'flag_missed', [argAddress(memberAddress), argU32(round)], senderAddress);
  }

  async placeBid(contractId: string, memberAddress: string, discountAmount: string | number): Promise<Result<string>> {
    return this.sendTx(contractId, 'place_bid', [argAddress(memberAddress), argI128(discountAmount)], memberAddress);
  }

  // --- Transaction Submission Helper ---

  private async sendTx(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
    senderAddress: string
  ): Promise<Result<string>> {
    try {
      const server = this.provider.getRpc();
      const contract = new Contract(contractId);
      const account = await server.getAccount(senderAddress);

      const tx = new TransactionBuilder(account, {
        fee: '1000',
        networkPassphrase: (this.provider as any).networkPassphrase,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(TimeoutInfinite)
        .build();

      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await this.freighter.signTransaction(preparedTx.toXDR(), senderAddress);
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
