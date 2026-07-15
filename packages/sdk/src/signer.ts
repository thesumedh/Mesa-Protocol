import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

export interface MesaSigner {
  getAddress(): Promise<string>;
  signTransaction(txXdr: string, networkPassphrase: string): Promise<string>;
}

export class SecretKeySigner implements MesaSigner {
  private keypair: Keypair;

  constructor(secretKey: string) {
    this.keypair = Keypair.fromSecret(secretKey);
  }

  async getAddress(): Promise<string> {
    return this.keypair.publicKey();
  }

  async signTransaction(txXdr: string, networkPassphrase: string): Promise<string> {
    const tx = TransactionBuilder.fromXDR(txXdr, networkPassphrase);
    tx.sign(this.keypair);
    return tx.toXDR();
  }
}

export class FreighterSigner implements MesaSigner {
  private address: string;

  constructor(address: string) {
    this.address = address;
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async signTransaction(txXdr: string, networkPassphrase: string): Promise<string> {
    // Delegates to Freighter browser extension
    if (typeof window === 'undefined') throw new Error('FreighterSigner requires a browser environment.');
    const { signTransaction } = await import('@stellar/freighter-api');
    const result = await signTransaction(txXdr, { networkPassphrase });
    if (typeof result === 'string') return result;
    if (result && 'signedTxXdr' in result) return result.signedTxXdr;
    throw new Error('Unexpected Freighter response');
  }
}
