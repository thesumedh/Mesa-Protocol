import * as freighter from '@stellar/freighter-api';

export class FreighterWallet {
  private networkPassphrase: string;

  constructor(networkPassphrase: string) {
    this.networkPassphrase = networkPassphrase;
  }

  private _request(type: string, payload = {}, timeoutMs = 5000): Promise<any> {
    const messageId = Date.now() + Math.random();
    if (typeof window === 'undefined') {
      return Promise.resolve({ error: 'Window context not found' });
    }
    window.postMessage({
      source: 'FREIGHTER_EXTERNAL_MSG_REQUEST',
      messageId,
      type,
      ...payload,
    }, window.location.origin);

    return new Promise(resolve => {
      const timer = setTimeout(() => {
        window.removeEventListener('message', listener);
        resolve({ error: 'Freighter did not respond.' });
      }, timeoutMs);

      function listener(event: MessageEvent) {
        if (event.source !== window) return;
        const data = event.data || {};
        if (data.source !== 'FREIGHTER_EXTERNAL_MSG_RESPONSE') return;
        if (data.messagedId !== messageId && data.messageId !== messageId) return;
        clearTimeout(timer);
        window.removeEventListener('message', listener);
        resolve(data);
      }

      window.addEventListener('message', listener, false);
    });
  }

  private _createFallbackAPI() {
    return {
      isConnected: async () => {
        const result = await this._request('REQUEST_CONNECTION_STATUS', {}, 2500);
        if (result.error) return { isConnected: false, error: result.error };
        return { isConnected: result.isConnected === true || result === true };
      },
      isAllowed: async () => {
        const result = await this._request('REQUEST_ALLOWED_STATUS', {}, 2500);
        if (result.error) return { isAllowed: false, error: result.error };
        return { isAllowed: result.isAllowed === true || result === true };
      },
      setAllowed: async () => {
        const result = await this._request('SET_ALLOWED_STATUS', {}, 15000);
        if (result.error) return { isAllowed: false, error: result.error };
        return { isAllowed: result.isAllowed === true || result === true };
      },
      requestAccess: async () => {
        const result = await this._request('REQUEST_ACCESS', {}, 15000);
        if (result.error) return { address: '', error: result.error };
        return { address: result.address || result.publicKey || '' };
      },
      getAddress: async () => {
        const result = await this._request('REQUEST_USER_INFO', {}, 5000);
        if (result.error) return { address: '', error: result.error };
        return { address: result.address || result.publicKey || result.userInfo?.publicKey || '' };
      },
      getPublicKey: async () => {
        const result = await this._request('REQUEST_ACCESS', {}, 15000);
        if (result.error) throw result.error;
        return result.address || result.publicKey || '';
      },
      getNetwork: async () => {
        const result = await this._request('REQUEST_NETWORK', {}, 5000);
        if (result.error) return { network: '', error: result.error };
        return { network: result.network || '' };
      },
      signTransaction: async (xdrStr: string, opts: any = {}) => {
        const result = await this._request('SUBMIT_TRANSACTION', {
          transactionXdr: xdrStr,
          network: opts.network || '',
          networkPassphrase: opts.networkPassphrase || '',
          accountToSign: opts.address || opts.accountToSign || '',
        }, 60000);
        if (result.error) return { error: result.error };
        return {
          signedTxXdr: result.signedTxXdr || result.signedTransaction || '',
          signedTransaction: result.signedTransaction || result.signedTxXdr || '',
        };
      },
    };
  }

  private async _getAPI(maxWaitMs = 1500): Promise<any> {
    if (typeof window === 'undefined') {
      return this._createFallbackAPI();
    }
    const api = (window as any).FreighterAPI || (window as any).freighterApi || freighter;
    if (api && typeof api.isConnected === 'function') {
      return api;
    }
    // Try polling
    const interval = 100;
    let elapsed = 0;
    while (elapsed < maxWaitMs) {
      const polledApi = (window as any).FreighterAPI || (window as any).freighterApi;
      if (polledApi && typeof polledApi.isConnected === 'function') {
        return polledApi;
      }
      await new Promise(r => setTimeout(r, interval));
      elapsed += interval;
    }
    return this._createFallbackAPI();
  }

  private _resultFlag(result: any, key: string): boolean {
    if (result === true) return true;
    if (result === false || result == null) return false;
    if (typeof result === 'object' && key in result) return result[key] === true;
    return false;
  }

  private _errorMessage(result: any, fallback: string): string {
    const error = result && result.error;
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    try { return JSON.stringify(error); } catch (_) { return fallback; }
  }

  private _addressFrom(result: any): string | null {
    if (typeof result === 'string' && result.length > 0) return result;
    if (result && typeof result.address === 'string' && result.address.length > 0) return result.address;
    if (result && typeof result.publicKey === 'string' && result.publicKey.length > 0) return result.publicKey;
    return null;
  }

  async isInstalled(): Promise<boolean> {
    try {
      const api = await this._getAPI(1000);
      const result = await api.isConnected();
      return this._resultFlag(result, 'isConnected');
    } catch (err) {
      console.warn('[MesaSDK] Freighter isInstalled failed', err);
      return false;
    }
  }

  async connect(): Promise<string> {
    const api = await this._getAPI(2000);
    const connResult = await api.isConnected();
    if (!this._resultFlag(connResult, 'isConnected')) {
      throw new Error(this._errorMessage(connResult, 'Freighter extension is not detected in this browser.'));
    }

    if (typeof api.setAllowed === 'function') {
      const allowedResult = await api.setAllowed();
      if (allowedResult && allowedResult.error) {
        throw new Error('Freighter permission failed: ' + this._errorMessage(allowedResult, 'permission rejected'));
      }
    }

    const accessResult = typeof api.requestAccess === 'function'
      ? await api.requestAccess()
      : await api.getPublicKey();

    if (accessResult && accessResult.error) {
      throw new Error('Access denied: ' + this._errorMessage(accessResult, 'request rejected'));
    }

    const requestedAddress = this._addressFrom(accessResult);
    if (requestedAddress) return requestedAddress;

    if (typeof api.getAddress === 'function') {
      const addressResult = await api.getAddress();
      if (addressResult && addressResult.error) {
        throw new Error('Address lookup failed: ' + this._errorMessage(addressResult, 'no address returned'));
      }
      const address = this._addressFrom(addressResult);
      if (address) return address;
    }

    throw new Error('No address returned by Freighter.');
  }

  async signTransaction(xdrStr: string, signerAddress: string): Promise<string> {
    const api = await this._getAPI(1000);
    const result = await api.signTransaction(xdrStr, {
      network: this.networkPassphrase.includes('Test') ? 'TESTNET' : 'PUBLIC',
      networkPassphrase: this.networkPassphrase,
      accountToSign: signerAddress
    });

    if (result && result.error) throw new Error('Sign failed: ' + result.error);
    if (result && result.signedTxXdr) return result.signedTxXdr;
    if (result && result.signedTransaction) return result.signedTransaction;
    if (typeof result === 'string') return result;
    throw new Error('Unexpected response from Freighter sign');
  }
}
