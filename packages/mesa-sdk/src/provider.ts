import { Contract, Address, TransactionBuilder, Operation, rpc, Account, TimeoutInfinite, xdr, nativeToScVal, Keypair } from '@stellar/stellar-sdk';

export function argAddress(addr: string): xdr.ScVal {
  return Address.fromString(addr).toScVal();
}

export function argString(str: string): xdr.ScVal {
  return xdr.ScVal.scvString(str);
}

export function argU32(val: number): xdr.ScVal {
  return xdr.ScVal.scvU32(val);
}

export function argU64(val: number | bigint): xdr.ScVal {
  return nativeToScVal(BigInt(val), { type: 'u64' });
}

export function argI128(val: number | bigint | string): xdr.ScVal {
  return nativeToScVal(BigInt(val), { type: 'i128' });
}

export function argBytes32(hex: string): xdr.ScVal {
  const bytes = Buffer.from(hex, 'hex');
  return xdr.ScVal.scvBytes(bytes);
}

export class RpcProvider {
  private rpc: rpc.Server;
  private networkPassphrase: string;

  constructor(rpcUrl: string, networkPassphrase: string) {
    this.rpc = new rpc.Server(rpcUrl);
    this.networkPassphrase = networkPassphrase;
  }

  async callReadOnly(contractId: string, method: string, args: xdr.ScVal[] = [], sourceAddress?: string): Promise<xdr.ScVal> {
    const dummyAddr = sourceAddress || Keypair.random().publicKey();
    const contract = new Contract(contractId);
    const account = new Account(dummyAddr, '0');
    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(TimeoutInfinite)
      .build();

    const response = await this.rpc.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(response)) {
      if (response.result?.retval) {
        return response.result.retval;
      }
      throw new Error(`Simulation succeeded but returned no value for ${method}`);
    }
    throw new Error(`Simulation failed for ${method}: ${JSON.stringify(response)}`);
  }

  getRpc(): rpc.Server {
    return this.rpc;
  }
}
