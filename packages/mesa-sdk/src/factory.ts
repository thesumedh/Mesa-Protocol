import { Contract, Address, TransactionBuilder, rpc, Account, TimeoutInfinite, scValToNative, xdr } from '@stellar/stellar-sdk';
import { RpcProvider, argU32, argString, argI128, argAddress, argU64 } from './provider';
import { ChamaSummary, Result, CircleStatus, MesaDataProvider } from './types';
import { FreighterWallet } from './freighter';

export class FactoryWrapper {
  private provider: RpcProvider;
  private freighter: FreighterWallet;
  private factoryContractId: string;
  private dataProvider?: MesaDataProvider;

  constructor(provider: RpcProvider, freighter: FreighterWallet, factoryContractId: string, dataProvider?: MesaDataProvider) {
    this.provider = provider;
    this.freighter = freighter;
    this.factoryContractId = factoryContractId;
    this.dataProvider = dataProvider;
  }

  private parseChamaSummary(native: any): ChamaSummary {
    return {
      id: Number(native.id),
      name: native.name.toString(),
      contract_id: native.contract_id.toString(),
      contribution_amount: native.contribution_amount.toString(),
      max_members: Number(native.max_members),
      member_count: Number(native.member_count),
      status: Number(native.status) as CircleStatus,
      token: native.token.toString(),
      payout_mode: Number(native.payout_mode || 0)
    };
  }

  async listChamas(limit = 10, offset = 0): Promise<Result<ChamaSummary[]>> {
    try {
      const scVal = await this.provider.callReadOnly(
        this.factoryContractId,
        'list_chamas',
        [argU32(limit), argU32(offset)]
      );
      const native = scValToNative(scVal) as any[];
      const summaries = native.map(n => this.parseChamaSummary(n));
      return { success: true, data: summaries };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async getChamasSummary(bypassCache = false): Promise<Result<ChamaSummary[]>> {
    if (this.dataProvider && !bypassCache) {
      return await this.dataProvider.getChamasSummary();
    }
    try {
      const scVal = await this.provider.callReadOnly(
        this.factoryContractId,
        'get_chamas_summary'
      );
      const native = scValToNative(scVal) as any[];
      const summaries = native.map(n => this.parseChamaSummary(n));
      return { success: true, data: summaries };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async getChama(chamaId: number): Promise<Result<string>> {
    try {
      const scVal = await this.provider.callReadOnly(
        this.factoryContractId,
        'get_chama',
        [argU32(chamaId)]
      );
      const address = scValToNative(scVal) as string;
      return { success: true, data: address };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async createChama(
    name: string,
    contribution: string | number | bigint,
    maxMembers: number,
    duration: number,
    tokenAddress: string,
    creatorAddress: string,
    payoutMode: number = 0
  ): Promise<Result<{ chamaId: number, contractId: string }>> {
    try {
      const server = this.provider.getRpc();
      const contract = new Contract(this.factoryContractId);
      
      // 1. Fetch current sequence number for the sender
      const accountRes = await server.getLedgerEntries(); // or loadAccount
      // Note: we can load basic account via fetch or server.getAccount
      // Let's load the account sequence from RPC server
      const account = await server.getAccount(creatorAddress);
      
      // 2. Build the initial transaction
      const tx = new TransactionBuilder(account, {
        fee: '1000', // temporary placeholder fee
        networkPassphrase: (this.provider as any).networkPassphrase,
      })
        .addOperation(contract.call(
          'create_chama',
          argString(name),
          argI128(contribution),
          argU32(maxMembers),
          argU64(duration),
          argAddress(tokenAddress),
          argU32(payoutMode)
        ))
        .setTimeout(TimeoutInfinite)
        .build();

      // 3. Prepare transaction (simulate & allocate resources)
      const preparedTx = await server.prepareTransaction(tx);
      
      // 4. Request Freighter signature
      const signedXdr = await this.freighter.signTransaction(preparedTx.toXDR(), creatorAddress);
      
      // 5. Submit transaction
      const submitResponse = await server.sendTransaction(
        TransactionBuilder.fromXDR(signedXdr, (this.provider as any).networkPassphrase)
      );

      if (submitResponse.status === 'ERROR') {
        throw new Error(`Submit error: ${JSON.stringify(submitResponse.errorResult)}`);
      }

      // 6. Poll for transaction completion
      let statusResponse = await this.pollTransaction(submitResponse.hash);
      
      if (statusResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        const successRes = statusResponse as rpc.Api.GetSuccessfulTransactionResponse;
        const val = successRes.returnValue;
        if (!val) {
          throw new Error('Transaction succeeded but returned no value');
        }
        const native = scValToNative(val) as [number, string];
        return {
          success: true,
          data: {
            chamaId: Number(native[0]),
            contractId: native[1]
          }
        };
      }
      
      throw new Error(`Transaction failed or timed out with status: ${statusResponse.status}`);
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  async syncChama(chamaId: number, senderAddress: string): Promise<Result<string>> {
    try {
      const server = this.provider.getRpc();
      const contract = new Contract(this.factoryContractId);
      const account = await server.getAccount(senderAddress);
      
      const tx = new TransactionBuilder(account, {
        fee: '1000',
        networkPassphrase: (this.provider as any).networkPassphrase,
      })
        .addOperation(contract.call('sync_chama', argU32(chamaId)))
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

      let statusResponse = await this.pollTransaction(submitResponse.hash);
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
