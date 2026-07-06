/**
 * Mesa Protocol SDK v3 — Stellar Testnet
 * Freighter API: uses isConnected() + requestAccess() per official docs
 * https://docs.freighter.app
 *
 * Key doc facts:
 *   isConnected()   → { isConnected: boolean }  (NOT a plain boolean)
 *   requestAccess() → { address: string } | { error: string }
 *   signTransaction(xdr, opts) → { signedTxXdr: string } | { error: string }
 */

// ─── Config ───────────────────────────────────────────────────────────────────
const MESA_CONFIG = {
  networkPassphrase: 'Test SDF Network ; September 2015',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  contractId: 'CDWGVPSUXXSGABQ663FVV4TZJH4Q2R3HVAKTKWFFFMWPF23O7KMNS4KU',
  treasury: 'GBBD47IF6LWK7P7MABDHSTIKR3A7Q6NOO524EE3JMG7K343HKT52I6MI',
  assets: {
    USDC: { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MABDHSTIKR3A7Q6NOO524EE3JMG7K343HKT52I6MI' },
    EURC: { code: 'EURC', issuer: 'GBBD47IF6LWK7P7MABDHSTIKR3A7Q6NOO524EE3JMG7K343HKT52I6MI' },
    KES:  { code: 'KES',  issuer: 'GBBD47IF6LWK7P7MABDHSTIKR3A7Q6NOO524EE3JMG7K343HKT52I6MI' },
    XLM:  { code: 'XLM',  issuer: 'native' },
  },
};

// ─── State ────────────────────────────────────────────────────────────────────
const MesaState = {
  walletAddress: null, isConnected: false, balances: {},
  load() {
    try { const d = JSON.parse(localStorage.getItem('mesa_state') || '{}'); this.walletAddress = d.walletAddress || null; this.isConnected = !!d.isConnected; } catch (_) {}
  },
  save() { localStorage.setItem('mesa_state', JSON.stringify({ walletAddress: this.walletAddress, isConnected: this.isConnected })); },
};
MesaState.load();

// ─── Chama Store ──────────────────────────────────────────────────────────────
const ChamaStore = {
  KEY: 'mesa_chamas_v3',
  getAll() { try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch (_) { return []; } },
  save(d) { localStorage.setItem(this.KEY, JSON.stringify(d)); },
  getById(id) { return this.getAll().find(c => c.id === id) || null; },
  upsert(c) { const a = this.getAll(); const i = a.findIndex(x => x.id === c.id); if (i >= 0) a[i] = c; else a.push(c); this.save(a); },
  seedIfEmpty() {
    if (this.getAll().length > 0) return;
    const now = Math.floor(Date.now() / 1000);
    this.save([
      { id: 'chama-family-tanda', name: 'Family Tanda', tokenCode: 'USDC', contributionAmount: 100, roundDuration: 604800, members: ['DEMO_ALICE', 'DEMO_BOB', 'DEMO_CAROL'], rotationOrder: ['DEMO_ALICE', 'DEMO_BOB', 'DEMO_CAROL'], currentRound: 3, deadline: now + 3 * 86400, secDeposits: {}, missedPayments: {}, roundContribs: {}, emergencyMode: false, forfeits: 0, createdAt: now - 90 * 86400, totalRounds: 10, reputation: { 'DEMO_ALICE': 100, 'DEMO_BOB': 80, 'DEMO_CAROL': 100 }, vouches: {} },
      { id: 'chama-tech-circle', name: 'Tech Chama', tokenCode: 'USDC', contributionAmount: 50, roundDuration: 2592000, members: ['DEMO_DAVE', 'DEMO_EVA', 'DEMO_FRANK', 'DEMO_GRACE'], rotationOrder: ['DEMO_DAVE', 'DEMO_EVA', 'DEMO_FRANK', 'DEMO_GRACE'], currentRound: 1, deadline: now + 15 * 86400, secDeposits: {}, missedPayments: {}, roundContribs: {}, emergencyMode: false, forfeits: 0, createdAt: now - 30 * 86400, totalRounds: 4, reputation: { 'DEMO_DAVE': 100, 'DEMO_EVA': 100, 'DEMO_FRANK': 100, 'DEMO_GRACE': 100 }, vouches: {} },
    ]);
  },
};
ChamaStore.seedIfEmpty();

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  document.querySelectorAll('.mesa-toast').forEach(el => el.remove());
  const colors = { success: '#006c49', error: '#ba1a1a', info: '#004395', warning: '#7a5c00' };
  const icons  = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
  const t = document.createElement('div');
  t.className = 'mesa-toast';
  t.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;background:${colors[type]||colors.info};color:#fff;padding:12px 20px;border-radius:12px;font-family:'Public Sans',sans-serif;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;box-shadow:0 4px 24px rgba(0,0,0,0.18);max-width:90vw;transition:opacity .4s`;
  t.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;flex-shrink:0">${icons[type]||icons.info}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 4000);
}

function showSpinner(msg = 'Processing on Stellar…') {
  hideSpinner();
  const el = document.createElement('div');
  el.id = 'mesa-spinner';
  el.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center';
  el.innerHTML = `<div style="background:#fff;border-radius:16px;padding:32px;display:flex;flex-direction:column;align-items:center;gap:16px;box-shadow:0 8px 32px rgba(0,0,0,.2);min-width:220px"><div style="width:44px;height:44px;border:4px solid #006c49;border-top-color:transparent;border-radius:50%;animation:mspin .8s linear infinite"></div><p style="font-family:'Public Sans',sans-serif;font-size:14px;font-weight:600;color:#191c1e;margin:0;text-align:center">${msg}</p></div><style>@keyframes mspin{to{transform:rotate(360deg)}}</style>`;
  document.body.appendChild(el);
}
function hideSpinner() { document.getElementById('mesa-spinner')?.remove(); }

// ─── Freighter Wallet ─────────────────────────────────────────────────────────
/**
 * Official API (per docs.freighter.app):
 *   isConnected()   → { isConnected: boolean }
 *   requestAccess() → { address: string } | { error: string }
 *   signTransaction(xdr, { network, networkPassphrase }) → { signedTxXdr } | { error }
 *
 * These functions are loaded via ESM into window.FreighterAPI by index.html.
 * We poll for up to 3s because the <script type="module"> is async.
 */
const FreighterWallet = {
  _request(type, payload = {}, timeoutMs = 5000) {
    const messageId = Date.now() + Math.random();
    window.postMessage({
      source: 'FREIGHTER_EXTERNAL_MSG_REQUEST',
      messageId,
      type,
      ...payload,
    }, window.location.origin);

    return new Promise(resolve => {
      const timer = setTimeout(() => {
        window.removeEventListener('message', listener);
        resolve({ error: 'Freighter did not respond. Check that the extension is enabled for this site and this browser profile.' });
      }, timeoutMs);

      function listener(event) {
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
  },

  _createFallbackAPI() {
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
      signTransaction: async (xdrStr, opts = {}) => {
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
  },

  // Poll until window.FreighterAPI is ready (set by the ESM module import in index.html)
  async _getAPI(maxWaitMs = 3000) {
    const interval = 100;
    let elapsed = 0;
    while (elapsed < maxWaitMs) {
      const api = window.FreighterAPI || window.freighterApi;
      if (api && typeof api.isConnected === 'function') {
        return api;
      }
      await new Promise(r => setTimeout(r, interval));
      elapsed += interval;
    }
    return this._createFallbackAPI();
  },

  _resultFlag(result, key) {
    if (result === true) return true;
    if (result === false || result == null) return false;
    if (typeof result === 'object' && key in result) return result[key] === true;
    return false;
  },

  _errorMessage(result, fallback) {
    const error = result && result.error;
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    try { return JSON.stringify(error); } catch (_) { return fallback; }
  },

  _addressFrom(result) {
    if (typeof result === 'string' && result.length > 0) return result;
    if (result && typeof result.address === 'string' && result.address.length > 0) return result.address;
    if (result && typeof result.publicKey === 'string' && result.publicKey.length > 0) return result.publicKey;
    return null;
  },

  // Check extension is installed — uses isConnected() which returns { isConnected: bool }
  async isInstalled() {
    const api = await this._getAPI(2500);
    if (!api) return false;
    try {
      const result = await api.isConnected();
      return this._resultFlag(result, 'isConnected');
    } catch (err) {
      console.warn('[Mesa] Freighter isConnected failed', err);
      return false;
    }
  },

  async debug() {
    const api = await this._getAPI(500);
    const info = {
      origin: window.location.origin,
      protocol: window.location.protocol,
      hasFreighterAPI: !!window.FreighterAPI,
      hasFreighterApiGlobal: !!window.freighterApi,
      apiKeys: api ? Object.keys(api) : [],
      isConnected: null,
      isAllowed: null,
      getAddress: null,
    };
    if (!api) return info;
    try { info.isConnected = await api.isConnected(); } catch (err) { info.isConnected = String(err && err.message || err); }
    if (typeof api.isAllowed === 'function') {
      try { info.isAllowed = await api.isAllowed(); } catch (err) { info.isAllowed = String(err && err.message || err); }
    }
    if (typeof api.getAddress === 'function') {
      try { info.getAddress = await api.getAddress(); } catch (err) { info.getAddress = String(err && err.message || err); }
    }
    if (typeof api.getPublicKey === 'function') {
      try { info.getPublicKey = await api.getPublicKey(); } catch (err) { info.getPublicKey = String(err && err.message || err); }
    }
    return info;
  },

  // Connect wallet — uses requestAccess() which returns { address } per docs
  async connect() {
    const api = await this._getAPI(3000);
    if (!api) {
      throw new Error(
        'Mesa Freighter bridge is unavailable. Refresh the localhost page and make sure Freighter is enabled for this browser profile.'
      );
    }

    // Confirm extension is installed
    const connResult = await api.isConnected();
    if (!this._resultFlag(connResult, 'isConnected')) {
      throw new Error(this._errorMessage(connResult, 'Freighter extension is not detected in this browser. Open this page in the same browser/profile where Freighter is installed.'));
    }

    if (typeof api.setAllowed === 'function') {
      const allowedResult = await api.setAllowed();
      if (allowedResult && allowedResult.error) {
        throw new Error('Freighter permission failed: ' + this._errorMessage(allowedResult, 'permission rejected'));
      }
    }

    // requestAccess prompts the user and returns { address } or { error }.
    // Older Freighter browser bundles expose the same flow as getPublicKey().
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

    throw new Error('No address returned by Freighter. Try again.');
  },

  async signTransaction(xdrStr) {
    const api = await this._getAPI(2000);
    if (!api) throw new Error('Freighter not available');

    const result = await api.signTransaction(xdrStr, {
      network: 'TESTNET',
      networkPassphrase: MESA_CONFIG.networkPassphrase,
    });

    if (result && result.error) throw new Error('Sign failed: ' + result.error);
    if (result && result.signedTxXdr) return result.signedTxXdr;
    if (result && result.signedTransaction) return result.signedTransaction;
    if (typeof result === 'string') return result;
    throw new Error('Unexpected response from Freighter sign');
  },
};

// ─── Stellar / Horizon ────────────────────────────────────────────────────────
const StellarNet = {
  _server: null,

  server() {
    if (!this._server && window.StellarSdk) {
      const Srv = window.StellarSdk.Horizon?.Server || window.StellarSdk.Server;
      if (Srv) this._server = new Srv(MESA_CONFIG.horizonUrl);
    }
    return this._server;
  },

  async fetchBalances(address) {
    try {
      const res = await fetch(`${MESA_CONFIG.horizonUrl}/accounts/${address}`);
      if (!res.ok) return {};
      const data = await res.json();
      const out = {};
      for (const b of data.balances || []) {
        if (b.asset_type === 'native') out['XLM'] = parseFloat(b.balance).toFixed(2);
        else out[b.asset_code] = parseFloat(b.balance).toFixed(2);
      }
      return out;
    } catch (_) { return {}; }
  },

  async sendPayment(sourceAddress, destAddress, amountXLM) {
    const srv = this.server();
    if (!srv || !window.StellarSdk) throw new Error('Stellar SDK not loaded yet');
    const account = await srv.loadAccount(sourceAddress);
    const fee = await srv.fetchBaseFee();
    const tx = new window.StellarSdk.TransactionBuilder(account, {
      fee, networkPassphrase: MESA_CONFIG.networkPassphrase,
    })
      .addOperation(window.StellarSdk.Operation.payment({
        destination: destAddress,
        asset: window.StellarSdk.Asset.native(),
        amount: String(parseFloat(amountXLM).toFixed(7)),
      }))
      .addMemo(window.StellarSdk.Memo.text('Mesa ROSCA Contribution'))
      .setTimeout(30).build();

    const signedXdr = await FreighterWallet.signTransaction(tx.toXDR());
    const signed = window.StellarSdk.TransactionBuilder.fromXDR(signedXdr, MESA_CONFIG.networkPassphrase);
    return await srv.submitTransaction(signed);
  },

  async findPaths(srcAddress, destCode, destAmount) {
    try {
      const a = MESA_CONFIG.assets[destCode];
      if (!a) return [];
      const type = destCode === 'XLM' ? 'native' : 'credit_alphanum4';
      let url = `${MESA_CONFIG.horizonUrl}/paths/strict-receive?source_account=${srcAddress}&destination_amount=${destAmount}&destination_asset_type=${type}`;
      if (type !== 'native') url += `&destination_asset_code=${a.code}&destination_asset_issuer=${a.issuer}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const d = await res.json();
      return d._embedded?.records || [];
    } catch (_) { return []; }
  },
};

// ─── Mesa API ────────────────────────────────────────────────────────────────
const MesaAPI = {
  getAllChamas()  { return ChamaStore.getAll(); },
  getChama(id)   { return ChamaStore.getById(id); },
  getMyChamas()  { if (!MesaState.walletAddress) return []; return ChamaStore.getAll().filter(c => c.members.includes(MesaState.walletAddress)); },

  async createChama({ name, tokenCode, contributionAmount, roundDuration, membersRaw }) {
    if (!MesaState.isConnected) throw new Error('Connect your wallet first');
    const addr = MesaState.walletAddress;
    const extra = (membersRaw || '').split(',').map(s => s.trim()).filter(Boolean);
    const members = [addr, ...extra];
    const now = Math.floor(Date.now() / 1000);
    const id  = 'chama-' + Date.now();
    
    // Set initial reputation for all initial members to 100
    const reputation = {};
    members.forEach(m => { reputation[m] = 100; });
    
    const chama = { 
      id, name, tokenCode, 
      contributionAmount: +contributionAmount, 
      roundDuration: +roundDuration, 
      members, rotationOrder: [...members], 
      currentRound: 0, 
      deadline: now + +roundDuration, 
      secDeposits: {}, 
      missedPayments: {}, 
      roundContribs: {}, 
      emergencyMode: false, 
      forfeits: 0, 
      createdAt: now, 
      totalRounds: members.length,
      reputation,
      vouches: {}
    };
    
    // Owner doesn't need sponsor, but set their deposit
    chama.secDeposits[addr] = +contributionAmount;
    
    ChamaStore.upsert(chama);
    return chama;
  },

  async joinChama(id, sponsor) {
    if (!MesaState.isConnected) throw new Error('Connect your wallet first');
    const c = ChamaStore.getById(id);
    if (!c) throw new Error('Circle not found');
    const addr = MesaState.walletAddress;
    if (c.members.includes(addr)) throw new Error('Already a member');
    
    // Determine sponsor (default to self if not provided or empty)
    const sponsorAddr = (sponsor && sponsor.trim()) ? sponsor.trim() : addr;
    
    // Verify sponsor is already a member if they are not self
    if (sponsorAddr !== addr && !c.members.includes(sponsorAddr)) {
      throw new Error('Sponsor must be an existing member of this Circle');
    }
    
    c.members.push(addr); 
    c.rotationOrder.push(addr); 
    c.secDeposits[addr] = c.contributionAmount;
    
    if (!c.reputation) c.reputation = {};
    c.reputation[addr] = 100; // Start at 100 reputation
    
    if (!c.vouches) c.vouches = {};
    if (sponsorAddr !== addr) {
      c.vouches[addr] = sponsorAddr;
    }
    
    ChamaStore.upsert(c); 
    return c;
  },

  async contribute(id) {
    if (!MesaState.isConnected) throw new Error('Connect your wallet first');
    const c = ChamaStore.getById(id);
    if (!c) throw new Error('Circle not found');
    if (c.emergencyMode) throw new Error('Emergency mode — no contributions');
    const addr = MesaState.walletAddress;
    if (c.roundContribs[addr]) throw new Error('Already contributed this round');
    showSpinner('Signing 1 XLM contribution on Stellar Testnet…');
    try {
      const tx = await StellarNet.sendPayment(addr, MESA_CONFIG.treasury, '1');
      
      if (!c.reputation) c.reputation = {};
      if (!c.missedPayments) c.missedPayments = {};
      if (!c.vouches) c.vouches = {};
      if (!c.secDeposits) c.secDeposits = {};
      
      const now = Math.floor(Date.now() / 1000);
      const isLate = now > c.deadline;
      
      if (isLate) {
        // Late contribution
        const missed = (c.missedPayments[addr] || 0) + 1;
        c.missedPayments[addr] = missed;
        
        const currentRep = c.reputation[addr] !== undefined ? c.reputation[addr] : 100;
        c.reputation[addr] = Math.max(0, currentRep - 20);
        
        if (missed >= 2) {
          // Eject member
          c.reputation[addr] = 0;
          
          // Halve security deposit (50% treasury, 50% pot forfeits)
          const dep = c.secDeposits[addr] || 0;
          if (dep > 0) {
            c.secDeposits[addr] = 0;
            c.forfeits = (c.forfeits || 0) + (dep / 2);
          }
          
          // Sponsor slashing
          const sponsor = c.vouches[addr];
          if (sponsor && sponsor !== addr) {
            const sponsorDep = c.secDeposits[sponsor] || 0;
            if (sponsorDep > 0) {
              const slashAmt = Math.floor(sponsorDep / 4);
              c.secDeposits[sponsor] = sponsorDep - slashAmt;
              c.forfeits = (c.forfeits || 0) + slashAmt;
            }
            const sponsorRep = c.reputation[sponsor] !== undefined ? c.reputation[sponsor] : 100;
            c.reputation[sponsor] = Math.max(0, sponsorRep - 50);
          }
          
          // Remove from list
          c.members = c.members.filter(m => m !== addr);
          c.rotationOrder = c.rotationOrder.filter(m => m !== addr);
          
          showToast(`⚠️ Ejected due to 2 missed payments. Sponsor penalized if applicable.`, 'warning');
        } else {
          showToast(`⚠️ Contributed late. Missed count: ${missed}/2. Reputation: ${c.reputation[addr]}%`, 'warning');
        }
      } else {
        // On-time contribution
        const currentRep = c.reputation[addr] !== undefined ? c.reputation[addr] : 100;
        c.reputation[addr] = Math.min(100, currentRep + 5);
      }
      
      c.roundContribs[addr] = true;
      ChamaStore.upsert(c);
      return { c, txHash: tx.hash };
    } finally { hideSpinner(); }
  },

  async distributeRound(id) {
    const c = ChamaStore.getById(id);
    if (!c) throw new Error('Circle not found');
    if (c.emergencyMode) throw new Error('Emergency mode active');
    const allPaid = c.members.every(m => c.roundContribs[m]);
    if (!allPaid) throw new Error('Not all members have contributed this round');
    const round  = c.currentRound;
    const winner = c.rotationOrder[round % c.rotationOrder.length];
    const pot    = c.contributionAmount * c.members.length + (c.forfeits || 0);
    c.currentRound++; c.roundContribs = {}; c.forfeits = 0;
    c.deadline = Math.floor(Date.now() / 1000) + c.roundDuration;
    ChamaStore.upsert(c);
    return { winner, pot, round };
  },

  async flagEmergency(id) {
    if (!MesaState.isConnected) throw new Error('Connect your wallet first');
    const c = ChamaStore.getById(id);
    if (!c) throw new Error('Circle not found');
    const addr = MesaState.walletAddress;
    if (!c.members.includes(addr)) throw new Error('Not a member');
    if (!c._flags) c._flags = [];
    if (!c._flags.includes(addr)) c._flags.push(addr);
    if (c._flags.length > c.members.length / 2) c.emergencyMode = true;
    ChamaStore.upsert(c); return c;
  },

  async withdrawPrincipal(id) {
    if (!MesaState.isConnected) throw new Error('Connect your wallet first');
    const c = ChamaStore.getById(id);
    if (!c) throw new Error('Circle not found');
    if (!c.emergencyMode) throw new Error('Not in emergency mode');
    const addr = MesaState.walletAddress;
    const dep = c.secDeposits[addr] || 0;
    if (dep === 0) throw new Error('No funds to withdraw');
    c.secDeposits[addr] = 0; ChamaStore.upsert(c); return dep;
  },
};

// ─── Wallet UI ────────────────────────────────────────────────────────────────
function _updateWalletUI() {
  const balEl = document.getElementById('mesa-wallet-balance');
  const btn   = document.getElementById('mesa-wallet-connect-btn');
  if (!balEl) return;
  if (MesaState.isConnected && MesaState.walletAddress) {
    const short = MesaState.walletAddress.slice(0, 6) + '…' + MesaState.walletAddress.slice(-4);
    const xlm   = MesaState.balances['XLM'] ? `${MesaState.balances['XLM']} XLM` : 'Testnet';
    balEl.textContent = `${short} · ${xlm}`;
    if (btn) btn.onclick = mesaDisconnectWallet;
  } else {
    balEl.textContent = 'Connect Wallet';
    if (btn) btn.onclick = mesaConnectWallet;
  }
}

async function mesaConnectWallet() {
  const balEl = document.getElementById('mesa-wallet-balance');
  if (balEl) balEl.textContent = 'Connecting…';

  showSpinner('Waiting for Freighter…');
  try {
    const address = await FreighterWallet.connect();
    MesaState.walletAddress = address;
    MesaState.isConnected   = true;
    MesaState.save();

    if (balEl) balEl.textContent = 'Fetching balance…';
    MesaState.balances = await StellarNet.fetchBalances(address);
    hideSpinner();

    showToast('✓ Wallet connected: ' + address.slice(0, 6) + '…' + address.slice(-4), 'success');
    _updateWalletUI();
  } catch (err) {
    hideSpinner();
    if (balEl) balEl.textContent = 'Connect Wallet';
    showToast(err.message, 'error');
  }
}

function mesaDisconnectWallet() {
  MesaState.walletAddress = null; MesaState.isConnected = false; MesaState.balances = {};
  MesaState.save();
  showToast('Wallet disconnected', 'info');
  _updateWalletUI();
}

// ─── Action wrappers ──────────────────────────────────────────────────────────
async function mesaContributeAction(id) {
  try { return await MesaAPI.contribute(id || 'chama-family-tanda'); }
  catch (err) { showToast(err.message, 'error'); }
}
async function mesaDistributeAction(id) {
  try {
    showSpinner('Distributing round payout…');
    const r = await MesaAPI.distributeRound(id || 'chama-family-tanda');
    hideSpinner();
    showToast(`🎉 Round ${r.round + 1} paid! ${r.pot} USDC → ${r.winner.slice(0, 10)}…`, 'success');
    return r;
  } catch (err) { hideSpinner(); showToast(err.message, 'error'); }
}
async function mesaJoinAction(id, sponsor) {
  try {
    showSpinner('Joining circle…');
    const c = await MesaAPI.joinChama(id, sponsor);
    hideSpinner(); showToast(`Joined ${c.name}!`, 'success'); return c;
  } catch (err) { hideSpinner(); showToast(err.message, 'error'); }
}
async function mesaFlagEmergencyAction(id) {
  try {
    const c = await MesaAPI.flagEmergency(id || 'chama-family-tanda');
    showToast(c.emergencyMode ? '🚨 Emergency activated' : 'Emergency flag submitted', c.emergencyMode ? 'warning' : 'info');
    return c;
  } catch (err) { showToast(err.message, 'error'); }
}
async function mesaWithdrawAction(id) {
  try {
    showSpinner('Withdrawing…');
    const amt = await MesaAPI.withdrawPrincipal(id || 'chama-family-tanda');
    hideSpinner(); showToast(`Withdrawn ${amt} USDC`, 'success'); return amt;
  } catch (err) { hideSpinner(); showToast(err.message, 'error'); }
}
async function mesaCheckPathPayment(from, to, amount) {
  if (!MesaState.walletAddress) { showToast('Connect wallet first', 'warning'); return; }
  showToast(`Finding path: ${from} → ${to} for ${amount}…`, 'info');
  const paths = await StellarNet.findPaths(MesaState.walletAddress, to, amount);
  if (paths.length > 0) {
    const best = paths[0];
    showToast(`✓ Best path: ${parseFloat(best.source_amount).toFixed(4)} ${from} → ${amount} ${to}`, 'success');
  } else {
    showToast(`No path found: ${from} → ${to} on Testnet`, 'warning');
  }
  return paths;
}
async function mesaCreateChamaSubmit(formData) {
  try {
    showSpinner('Creating circle on Stellar Testnet…');
    const c = await MesaAPI.createChama(formData);
    hideSpinner(); showToast(`🎉 "${c.name}" created!`, 'success');
    setTimeout(() => { window.location.hash = '#circle'; }, 1200);
    return c;
  } catch (err) { hideSpinner(); showToast(err.message, 'error'); }
}
function mesaPopulateDashboard() { _updateWalletUI(); }

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  _updateWalletUI();
  // Attempt silent session restore after ESM module loads
  setTimeout(async () => {
    if (!MesaState.isConnected) {
      const api = window.FreighterAPI;
      if (api && typeof api.isConnected === 'function') {
        try {
          const r = await api.isConnected();
          if (r && r.isConnected) {
            // Check if already allowed (no popup)
            if (typeof api.isAllowed === 'function') {
              const allowed = await api.isAllowed();
              if (allowed && allowed.isAllowed) {
                const acc = await api.requestAccess();
                if (acc && acc.address) {
                  MesaState.walletAddress = acc.address;
                  MesaState.isConnected   = true;
                  MesaState.save();
                  MesaState.balances = await StellarNet.fetchBalances(acc.address);
                  _updateWalletUI();
                }
              }
            }
          }
        } catch (_) { /* silent */ }
      }
    }
  }, 800);
});

// ─── Globals ──────────────────────────────────────────────────────────────────
window.MesaSDK = {
  config: MESA_CONFIG, state: MesaState, api: MesaAPI, store: ChamaStore, net: StellarNet,
  walletDebug: () => FreighterWallet.debug(),
  connectWallet: mesaConnectWallet, disconnectWallet: mesaDisconnectWallet,
  contribute: mesaContributeAction, distribute: mesaDistributeAction,
  join: mesaJoinAction, flagEmergency: mesaFlagEmergencyAction, withdraw: mesaWithdrawAction,
  checkPathPayment: mesaCheckPathPayment, createChama: mesaCreateChamaSubmit,
  populateDashboard: mesaPopulateDashboard, showToast,
};

console.log('[MesaSDK v3] Loaded — Freighter API via ESM, Stellar Testnet ready');
