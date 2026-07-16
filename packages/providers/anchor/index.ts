import { MesaProvider, StepDefinition, ExecutionContext, StepResult, ExternalEvent } from '../../runtime/src/provider';
import * as store from '../../runtime/src/store';
import { Keypair, TransactionBuilder, Networks, Operation, Asset, Horizon } from '@stellar/stellar-sdk';
import * as https from 'https';
import * as http from 'http';

interface TomlConfig {
  WEB_AUTH_ENDPOINT: string;
  TRANSFER_SERVER_SEP0024: string;
  SIGNING_KEY: string;
}

export class AnchorProvider implements MesaProvider {
  readonly name = 'anchor';

  // ─── Main Dispatcher ───────────────────────────────────────────────────────

  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const action = step.params.action as string || 'sep24-deposit';
    
    // Check if we are in mock mode (either via env or step parameter)
    const isMock = process.env.ANCHOR_MOCK === 'true' || step.params.mock === true || !step.params.anchorUrl;

    if (isMock) {
      return this.executeMock(action, step, context);
    }

    switch (action) {
      case 'sep24-deposit':
        return this.sep24Deposit(step, context);
      case 'sep24-withdraw':
        return this.sep24Withdraw(step, context);
      default:
        throw new Error(`AnchorProvider: Real mode does not support action "${action}" yet.`);
    }
  }

  // ─── Mock Mode Handlers ────────────────────────────────────────────────────

  private async executeMock(action: string, step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    console.log(`[AnchorProvider] Running in MOCK mode for action: ${action}`);
    
    const mockTxId = `mock-tx-${context.executionId}`;
    const anchorUrl = (step.params.anchorUrl as string) || 'https://mock-anchor.stellar.org';
    const suspensionKey = `anchor:sep24:${anchorUrl}:${mockTxId}`;

    if (action === 'sep24-deposit') {
      const mockInteractiveUrl = `https://mock-anchor.stellar.org/sep24/interactive?transaction_id=${mockTxId}&asset_code=${step.params.asset || 'USDC'}`;
      
      return {
        outcome: 'suspended',
        suspensionKey,
        output: {
          anchorTransactionId: mockTxId,
          interactiveUrl: mockInteractiveUrl,
          message: '[MOCK] Open interactiveUrl in browser to complete mock deposit',
        },
      };
    }

    if (action === 'sep24-withdraw') {
      const mockInteractiveUrl = `https://mock-anchor.stellar.org/sep24/interactive/withdraw?transaction_id=${mockTxId}`;
      return {
        outcome: 'suspended',
        suspensionKey,
        output: {
          anchorTransactionId: mockTxId,
          interactiveUrl: mockInteractiveUrl,
          anchorWithdrawAddress: 'GBHTYH2NLVWRAPSC3IRRFPG6CFHP5VLODBQUYVSKJ3BZ3QN6HEXZ5DXU',
          memo: '123456',
          memoType: 'id',
        },
      };
    }

    throw new Error(`AnchorProvider: Unknown mock action "${action}"`);
  }

  // ─── Real SEP-24 interactive deposit ───────────────────────────────────────

  async sep24Deposit(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const { anchorUrl, asset, amount, userAddress, userJwt, userSecret } = step.params as {
      anchorUrl: string;
      asset: string;
      amount?: number;
      userAddress: string;
      userJwt?: string;
      userSecret?: string;
    };

    if (!anchorUrl || !asset || !userAddress) {
      throw new Error('AnchorProvider (sep24Deposit): anchorUrl, asset, and userAddress are required.');
    }

    // Auto-trustline checking and creation
    const autoTrustline = step.params.autoTrustline !== false;
    if (autoTrustline && asset !== 'XLM') {
      let assetCode = asset;
      let assetIssuer = '';
      if (asset.includes(':')) {
        const parts = asset.split(':');
        assetCode = parts[0];
        assetIssuer = parts[1];
      } else if (asset === 'USDC') {
        assetIssuer = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
      }

      if (assetIssuer) {
        try {
          const horizonUrl = step.params.horizonUrl as string || 'https://horizon-testnet.stellar.org';
          console.log(`[AnchorProvider] Checking trustline for ${assetCode} on ${userAddress}...`);
          const accountInfo = await this.httpGet(`${horizonUrl}/accounts/${userAddress}`, {});
          let hasTrustline = false;
          if (accountInfo && accountInfo.balances) {
            hasTrustline = accountInfo.balances.some((bal: any) => 
              bal.asset_code === assetCode && bal.asset_issuer === assetIssuer
            );
          }

          if (!hasTrustline) {
            if (!userSecret) {
              console.warn(`[AnchorProvider] Trustline for ${assetCode}:${assetIssuer} is missing, but userSecret is not provided. Cannot auto-create trustline.`);
              await store.appendEvent(context.executionId, 'trustline.failed', {
                asset: assetCode,
                issuer: assetIssuer,
                error: 'userSecret missing, cannot auto-create trustline.'
              });
            } else {
              console.log(`[AnchorProvider] Trustline missing. Automatically establishing trustline for ${assetCode}:${assetIssuer}...`);
              await store.appendEvent(context.executionId, 'trustline.creating', {
                asset: assetCode,
                issuer: assetIssuer,
                message: `Trustline missing. Establishing changeTrust operation for ${assetCode}...`
              });

              const userKeypair = Keypair.fromSecret(userSecret);
              const server = new Horizon.Server(horizonUrl);
              const account = await server.loadAccount(userAddress);
              
              const usdcAsset = new Asset(assetCode, assetIssuer);
              const tx = new TransactionBuilder(account, {
                fee: '1000',
                networkPassphrase: Networks.TESTNET,
              })
                .addOperation(
                  Operation.changeTrust({
                    asset: usdcAsset,
                  })
                )
                .setTimeout(60)
                .build();
                
              tx.sign(userKeypair);
              const submitResult = await server.submitTransaction(tx);
              console.log(`[AnchorProvider] Trustline successfully established. Hash: ${submitResult.hash}`);
              await store.appendEvent(context.executionId, 'trustline.created', {
                asset: assetCode,
                issuer: assetIssuer,
                txHash: submitResult.hash,
                message: `Confirmed. Trustline for ${assetCode} established successfully.`
              });
            }
          } else {
            console.log(`[AnchorProvider] Trustline for ${assetCode} already exists.`);
            await store.appendEvent(context.executionId, 'trustline.verified', {
              asset: assetCode,
              issuer: assetIssuer,
              message: `Trustline for ${assetCode} is verified.`
            });
          }
        } catch (err: any) {
          console.error(`[AnchorProvider] Failed to check/create trustline:`, err.message);
          await store.appendEvent(context.executionId, 'trustline.failed', {
            asset: assetCode,
            issuer: assetIssuer,
            error: err.message
          });
        }
      }
    }

    console.log(`[AnchorProvider] Initiating real SEP-24 deposit to anchor: ${anchorUrl}`);
    const toml = await this.fetchToml(anchorUrl);
    const jwt = userJwt ?? await this.sep10Auth(context.executionId, toml.WEB_AUTH_ENDPOINT, userAddress, toml.SIGNING_KEY, userSecret);

    const depositRes = await this.httpPost(
      `${toml.TRANSFER_SERVER_SEP0024}/transactions/deposit/interactive`,
      { asset_code: asset, account: userAddress, amount: amount?.toString() },
      { Authorization: `Bearer ${jwt}` }
    );

    console.log('[AnchorProvider] Deposit response:', depositRes);
    if (!depositRes.url || !depositRes.id) {
      throw new Error(`AnchorProvider: deposit did not return interactive url or transaction id. Response: ${JSON.stringify(depositRes)}`);
    }

    await store.appendEvent(context.executionId, 'anchor.sep24.initiated', {
      asset,
      interactiveUrl: depositRes.url,
      message: `Interactive SEP-24 deposit initiated. Session ID: ${depositRes.id}`
    });

    const suspensionKey = `anchor:sep24:${anchorUrl}:${depositRes.id}`;
    return {
      outcome: 'suspended',
      suspensionKey,
      output: {
        anchorTransactionId: depositRes.id,
        interactiveUrl: depositRes.url,
        message: 'Open interactiveUrl in browser to complete deposit',
      },
    };
  }

  // ─── Real SEP-24 interactive withdrawal ────────────────────────────────────

  async sep24Withdraw(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const { anchorUrl, asset, amount, userAddress, userJwt, destinationAccount, userSecret } = step.params as {
      anchorUrl: string;
      asset: string;
      amount?: number;
      userAddress: string;
      userJwt?: string;
      destinationAccount?: string;
      userSecret?: string;
    };

    if (!anchorUrl || !asset || !userAddress) {
      throw new Error('AnchorProvider (sep24Withdraw): anchorUrl, asset, and userAddress are required.');
    }

    console.log(`[AnchorProvider] Initiating real SEP-24 withdraw to anchor: ${anchorUrl}`);
    const toml = await this.fetchToml(anchorUrl);
    const jwt = userJwt ?? await this.sep10Auth(context.executionId, toml.WEB_AUTH_ENDPOINT, userAddress, toml.SIGNING_KEY, userSecret);

    const withdrawRes = await this.httpPost(
      `${toml.TRANSFER_SERVER_SEP0024}/transactions/withdraw/interactive`,
      {
        asset_code: asset,
        account: userAddress,
        amount: amount?.toString(),
        ...(destinationAccount ? { dest: destinationAccount } : {}),
      },
      { Authorization: `Bearer ${jwt}` }
    );

    if (!withdrawRes.url || !withdrawRes.id) {
      throw new Error('AnchorProvider: withdraw did not return interactive url or transaction id');
    }

    await store.appendEvent(context.executionId, 'anchor.sep24.initiated', {
      asset,
      interactiveUrl: withdrawRes.url,
      message: `Interactive SEP-24 withdraw initiated. Session ID: ${withdrawRes.id}`
    });

    const suspensionKey = `anchor:sep24:${anchorUrl}:${withdrawRes.id}`;
    return {
      outcome: 'suspended',
      suspensionKey,
      output: {
        anchorTransactionId: withdrawRes.id,
        interactiveUrl: withdrawRes.url,
        anchorWithdrawAddress: withdrawRes.how,
        memo: withdrawRes.memo,
        memoType: withdrawRes.memo_type,
      },
    };
  }

  // ─── Resume Handler ────────────────────────────────────────────────────────

  async resume(event: ExternalEvent, context: ExecutionContext): Promise<StepResult> {
    console.log(`[AnchorProvider] Resuming flow with key: ${event.suspensionKey}`);
    
    // In both mock and real modes, check the payload status
    const { status, amount_out, amount, message } = event.payload as {
      status?: string;
      amount_out?: string;
      amount?: string;
      message?: string;
    };

    const finalStatus = status || 'completed';

    if (finalStatus === 'completed') {
      return {
        outcome: 'completed',
        output: {
          status: 'completed',
          receivedAmount: parseFloat(amount_out || amount || '100'),
        },
      };
    }

    if (['error', 'failed', 'expired'].includes(finalStatus)) {
      return {
        outcome: 'failed',
        error: `Anchor transaction failed: ${message || 'Unknown reason'}`,
      };
    }

    // Still pending/user transfer - re-suspend
    return {
      outcome: 'suspended',
      suspensionKey: event.suspensionKey,
      output: { status: finalStatus },
    };
  }

  // ─── Health check ──────────────────────────────────────────────────────────

  async health(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    return { status: 'healthy', details: { mode: process.env.ANCHOR_MOCK === 'true' ? 'mock' : 'live' } };
  }

  // ─── SEP-10 Web Authentication Stub ────────────────────────────────────────

  private async sep10Auth(executionId: string, webAuthEndpoint: string, userAddress: string, serverSigningKey: string, userSecret?: string): Promise<string> {
    console.log(`[AnchorProvider] Requesting SEP-10 challenge for ${userAddress} at ${webAuthEndpoint}`);
    await store.appendEvent(executionId, 'anchor.sep10.started', {
      message: `Requesting challenge transaction from SEP-10 Auth endpoint: ${webAuthEndpoint}`
    });
    const challengeRes = await this.httpGet(webAuthEndpoint, { account: userAddress });
    if (!challengeRes.transaction) {
      throw new Error('SEP-10: no challenge transaction returned from auth endpoint.');
    }

    if (!userSecret) {
      console.warn('[AnchorProvider] No secret key provided for SEP-10 challenge signing. Falling back to mock token.');
      await store.appendEvent(executionId, 'anchor.sep10.completed', {
        message: 'No secret key provided. Acquired mock SEP-10 JWT token.'
      });
      return 'mock-sep10-jwt-token';
    }

    try {
      console.log('[AnchorProvider] Decoding and signing SEP-10 challenge transaction...');
      const userKeypair = Keypair.fromSecret(userSecret);
      // Decodes challenge transaction using TESTNET networks passphrase
      const tx = TransactionBuilder.fromXDR(challengeRes.transaction, Networks.TESTNET);
      tx.sign(userKeypair);
      
      const signedXdr = tx.toEnvelope().toXDR('base64');
      
      console.log('[AnchorProvider] Submitting signed transaction back to auth endpoint...');
      const authRes = await this.httpPost(webAuthEndpoint, { transaction: signedXdr });
      if (!authRes.token) {
        throw new Error(`Auth endpoint response missing token: ${JSON.stringify(authRes)}`);
      }
      await store.appendEvent(executionId, 'anchor.sep10.completed', {
        message: 'Successfully signed challenge and acquired SEP-10 JWT token.'
      });
      return authRes.token;
    } catch (err: any) {
      await store.appendEvent(executionId, 'anchor.sep10.failed', {
        error: err.message
      });
      throw new Error(`SEP-10 authentication failed: ${err.message}`);
    }
  }

  // ─── HTTP Utilities ────────────────────────────────────────────────────────

  private fetchToml(anchorUrl: string): Promise<TomlConfig> {
    const cleanUrl = anchorUrl.endsWith('/') ? anchorUrl.slice(0, -1) : anchorUrl;
    const tomlUrl = `${cleanUrl}/.well-known/stellar.toml`;
    
    return new Promise((resolve, reject) => {
      const lib = tomlUrl.startsWith('https') ? https : http;
      lib.get(tomlUrl, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            // Fallback default endpoints for mock/development anchors
            resolve({
              WEB_AUTH_ENDPOINT: `${cleanUrl}/auth`,
              TRANSFER_SERVER_SEP0024: `${cleanUrl}/sep24`,
              SIGNING_KEY: 'G...',
            });
            return;
          }
          // Simple key-value parser for basic stellar.toml config
          const toml: any = {};
          const lines = body.split('\n');
          for (const line of lines) {
            const parts = line.split('=');
            if (parts.length === 2) {
              const k = parts[0].trim();
              const v = parts[1].trim().replace(/"/g, '');
              toml[k] = v;
            }
          }
          resolve({
            WEB_AUTH_ENDPOINT: toml.WEB_AUTH_ENDPOINT || `${cleanUrl}/auth`,
            TRANSFER_SERVER_SEP0024: toml.TRANSFER_SERVER_SEP0024 || `${cleanUrl}/sep24`,
            SIGNING_KEY: toml.SIGNING_KEY || '',
          });
        });
      }).on('error', (err) => {
        // Fallback for offline testing
        resolve({
          WEB_AUTH_ENDPOINT: `${cleanUrl}/auth`,
          TRANSFER_SERVER_SEP0024: `${cleanUrl}/sep24`,
          SIGNING_KEY: 'G...',
        });
      });
    });
  }

  private httpGet(url: string, params: Record<string, string>, headers: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      Object.keys(params).forEach(key => parsed.searchParams.append(key, params[key]));
      
      const lib = parsed.protocol === 'https:' ? https : http;
      lib.get(parsed.toString(), { headers }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        });
      }).on('error', reject);
    });
  }

  private httpPost(url: string, data: Record<string, any>, headers: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const postData = JSON.stringify(data);
      
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...headers,
        },
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}
