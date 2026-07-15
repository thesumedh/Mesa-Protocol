import { MesaConfig, MesaDataProvider } from './types';
import { Horizon, Asset, rpc } from '@stellar/stellar-sdk';
import { RpcProvider } from './provider';
import { FreighterWallet } from './freighter';
import { FactoryWrapper } from './factory';
import { CircleWrapper } from './circle';
import { IndexerProvider } from './indexer-provider';
import { RpcDataProvider } from './rpc-provider';
import { VaultWrapper } from './vault';
import { formatAddress, calculateTVL, calculateReputation } from './utils';

export * from './types';
export * from './provider';
export * from './signer';
export * from './vault';
export * from './circle';
export * from './factory';

export class MesaSDK {
  public config: MesaConfig;
  public provider: RpcProvider;
  public freighter: FreighterWallet;
  public factory: FactoryWrapper;
  public circle: CircleWrapper;
  public vault: VaultWrapper;
  public dataProvider: MesaDataProvider;

  public state = {
    walletAddress: null as string | null,
    isConnected: false,
    balances: {} as Record<string, string>,
    save() {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mesa_state', JSON.stringify({
          walletAddress: this.walletAddress,
          isConnected: this.isConnected
        }));
      }
    },
    load() {
      if (typeof window !== 'undefined') {
        try {
          const d = JSON.parse(localStorage.getItem('mesa_state') || '{}');
          this.walletAddress = d.walletAddress || null;
          this.isConnected = !!d.isConnected;
        } catch (_) {}
      }
    }
  };

  constructor(config: MesaConfig) {
    this.config = config;
    this.provider = new RpcProvider(config.rpcUrl, config.networkPassphrase);
    this.freighter = new FreighterWallet(config.networkPassphrase);

    if (config.indexerUrl) {
      console.log(`[MesaSDK] Using GraphQL indexer at: ${config.indexerUrl}`);
      this.dataProvider = new IndexerProvider(config.indexerUrl);
    } else {
      console.log('[MesaSDK] Indexer URL not provided. Falling back to direct Soroban RPC.');
      // Temporary stub for dataProvider so we can construct wrappers
      // We will re-assign it to RpcDataProvider once the wrappers are constructed!
      this.dataProvider = null as any;
    }

    this.factory = new FactoryWrapper(this.provider, this.freighter, config.factoryContractId, this.dataProvider);
    this.circle = new CircleWrapper(this.provider, this.freighter, this.dataProvider);
    this.vault = new VaultWrapper(this.provider);

    if (!config.indexerUrl) {
      this.dataProvider = new RpcDataProvider(this.factory, this.circle);
      // Update wrapper references as well
      (this.factory as any).dataProvider = this.dataProvider;
      (this.circle as any).dataProvider = this.dataProvider;
    }

    this.state.load();

    // Auto-restore connection if possible
    if (this.state.isConnected && this.state.walletAddress) {
      setTimeout(() => {
        this.connectWallet().catch(() => {});
      }, 500);
    }
  }

  // --- Feature Registry & Capability Detection ---

  public features(): string[] {
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

  public supports(feature: string): boolean {
    return this.features().includes(feature.toLowerCase());
  }

  public protocolVersion(): string {
    return 'v1.0.0';
  }

  public network(): string {
    return this.config.network || 'testnet';
  }

  public static async connect(config: MesaConfig): Promise<MesaSDK> {
    const sdk = new MesaSDK(config);
    try {
      const server = new rpc.Server(config.rpcUrl);
      await server.getNetwork();
    } catch (_) {}
    return sdk;
  }


  // --- UI Overlay Helpers (Premium Toasts & Spinners) ---

  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    if (typeof document === 'undefined') return;
    
    // Check or create container
    let container = document.getElementById('mesa-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mesa-toast-container';
      container.className = 'fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'mesa-toast pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl transition-all duration-300 transform translate-y-2 opacity-0 ';
    
    // Styles matching Material Design 3 and premium aesthetics
    let icon = 'info';
    if (type === 'success') {
      toast.className += 'bg-emerald-500 text-white border border-emerald-600/30';
      icon = 'check_circle';
    } else if (type === 'error') {
      toast.className += 'bg-red-500 text-white border border-red-600/30';
      icon = 'error';
    } else if (type === 'warning') {
      toast.className += 'bg-amber-500 text-white border border-amber-600/30';
      icon = 'warning';
    } else {
      toast.className += 'bg-slate-800 text-white border border-slate-700/30';
      icon = 'info';
    }

    toast.innerHTML = `
      <span class="material-symbols-outlined text-[20px]">${icon}</span>
      <span class="font-sans text-sm font-semibold">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animate-in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto-destroy
    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  showSpinner(message: string) {
    if (typeof document === 'undefined') return;
    this.hideSpinner();

    const overlay = document.createElement('div');
    overlay.id = 'mesa-spinner-overlay';
    overlay.className = 'fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9998] flex flex-col items-center justify-center text-center p-6';
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
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('mesa-spinner-overlay');
    if (overlay) overlay.remove();
  }

  // --- Wallet Operations ---

  async connectWallet(): Promise<string> {
    try {
      this.showSpinner('Connecting Freighter Wallet...');
      const address = await this.freighter.connect();
      this.state.walletAddress = address;
      this.state.isConnected = true;
      this.state.save();
      
      this.state.balances = await this.fetchBalances(address);
      this.hideSpinner();
      this.showToast('Freighter Wallet connected successfully!', 'success');
      this.populateDashboard();
      return address;
    } catch (e: any) {
      this.hideSpinner();
      this.showToast(e.message || 'Freighter connection failed', 'error');
      throw e;
    }
  }

  disconnectWallet() {
    this.state.walletAddress = null;
    this.state.isConnected = false;
    this.state.balances = {};
    this.state.save();
    this.showToast('Wallet disconnected', 'warning');
    this.populateDashboard();
  }

  async fetchBalances(address: string): Promise<Record<string, string>> {
    try {
      const horizonUrl = this.config.rpcUrl.includes('testnet') 
        ? 'https://horizon-testnet.stellar.org' 
        : 'https://horizon.stellar.org';
      const res = await fetch(`${horizonUrl}/accounts/${address}`);
      if (!res.ok) return {};
      const data = await res.json();
      const out: Record<string, string> = {};
      for (const b of data.balances || []) {
        if (b.asset_type === 'native') out['XLM'] = parseFloat(b.balance).toFixed(2);
        else out[b.asset_code] = parseFloat(b.balance).toFixed(2);
      }
      return out;
    } catch (_) {
      return {};
    }
  }

  // --- Dynamic Dashboard & UI Population ---

  populateDashboard() {
    if (typeof document === 'undefined') return;

    // 1. Update wallet balance top-bar indicator
    const balEl = document.getElementById('mesa-wallet-balance');
    const btn = document.getElementById('mesa-wallet-connect-btn');
    if (balEl) {
      if (this.state.isConnected && this.state.walletAddress) {
        const short = formatAddress(this.state.walletAddress);
        const xlm = this.state.balances['XLM'] ? `${this.state.balances['XLM']} XLM` : 'Connected';
        balEl.textContent = `${short} · ${xlm}`;
        if (btn) {
          btn.onclick = () => this.disconnectWallet();
        }
      } else {
        balEl.textContent = 'Connect Wallet';
        if (btn) {
          btn.onclick = () => this.connectWallet();
        }
      }
    }

    // 2. Refresh page components if present
    if (typeof (window as any).renderChamaPage === 'function') {
      (window as any).renderChamaPage();
    }

    // 3. Populate welcome dashboard metrics and circle list
    this.populateDashboardMetrics().catch(() => {});
  }

  private async populateDashboardMetrics() {
    if (typeof document === 'undefined') return;

    const tvlEl = document.getElementById('mesa-tvl');
    const greetingEl = document.getElementById('mesa-greeting');
    const gridEl = document.getElementById('mesa-active-circles-grid');

    // Update greeting
    if (greetingEl) {
      if (this.state.isConnected && this.state.walletAddress) {
        greetingEl.textContent = `Good morning, ${formatAddress(this.state.walletAddress)}.`;
      } else {
        greetingEl.textContent = `Good morning, guest.`;
      }
    }

    // Fetch summaries from factory registry
    const summaryRes = await this.factory.getChamasSummary();
    if (!summaryRes.success || !summaryRes.data) return;

    const summaries = summaryRes.data;

    // Update TVL
    if (tvlEl) {
      const tvl = calculateTVL(summaries);
      tvlEl.textContent = `$${tvl} USDC`;
    }

    // Populate active circles list dynamically (NO HARDCODING)
    if (gridEl) {
      gridEl.innerHTML = '';
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
        const displayAmt = rawAmt >= 100000 ? rawAmt / 10000000 : rawAmt;

        let statusText = 'SIGNUP';
        let statusClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        if (s.status === 1) {
          statusText = 'ACTIVE';
          statusClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
        } else if (s.status === 2) {
          statusText = 'PAUSED';
          statusClass = 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
        } else if (s.status === 3) {
          statusText = 'COMPLETED';
          statusClass = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
        }

        const payoutModeText = s.payout_mode === 1 ? 'Auction' : 'Fixed';
        const payoutModeClass = s.payout_mode === 1 
          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';

        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-slate-850 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col hover:shadow-md transition-all duration-300 cursor-pointer';
        card.setAttribute('onclick', `window.location.hash = '#circle?contract=${s.contract_id}'`);
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
              <div class="h-full bg-emerald-500" style="width: ${(s.member_count / s.max_members) * 100}%"></div>
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

  async createChama(formData: {
    name: string;
    tokenCode: string;
    contributionAmount: number;
    roundDuration: number;
    membersRaw?: string;
    payoutMode?: number;
  }): Promise<any> {
    if (!this.state.walletAddress) {
      this.showToast('Please connect your wallet first', 'warning');
      return;
    }

    // Standard native wrap on Stellar Testnet (SAC)
    let tokenAddress = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

    // Scale contribution: 7 decimals (e.g. 50 becomes 500,000,000)
    const amountScaled = BigInt(Math.round(formData.contributionAmount)) * 10000000n;

    // Convert wizard duration keywords to seconds
    let durationSec = formData.roundDuration;
    if (isNaN(durationSec)) {
      const freq = String(formData.roundDuration).toLowerCase();
      if (freq === 'weekly') durationSec = 604800;
      else if (freq === 'biweekly') durationSec = 1209600;
      else if (freq === 'monthly') durationSec = 2592000;
      else if (freq === 'quarterly') durationSec = 7776000;
      else durationSec = 3600; // default 1 hour
    }

    this.showSpinner(`Deploying circle "${formData.name}" to Stellar Testnet...`);

    const res = await this.factory.createChama(
      formData.name,
      amountScaled.toString(),
      5, // max members default for demo
      durationSec,
      tokenAddress,
      this.state.walletAddress,
      formData.payoutMode ?? 0
    );

    this.hideSpinner();

    if (res.success && res.data) {
      this.showToast(`🎉 "${formData.name}" successfully deployed!`, 'success');
      const contractId = res.data.contractId;
      setTimeout(() => {
        window.location.hash = `#circle?contract=${contractId}`;
      }, 1200);
      return res.data;
    } else {
      this.showToast(`Deployment failed: ${res.error}`, 'error');
      throw new Error(res.error);
    }
  }

  // --- Circle Room Mutation Wrappers (with spinners & toasts) ---

  async join(contractId: string, sponsorAddress?: string): Promise<boolean> {
    if (!this.state.walletAddress) {
      this.showToast('Wallet not connected', 'warning');
      return false;
    }
    const member = this.state.walletAddress;
    const sponsor = sponsorAddress || member;

    this.showSpinner('Submitting Join & Collateral Lock transaction...');
    const res = await this.circle.join(contractId, member, sponsor);
    this.hideSpinner();

    if (res.success) {
      this.showToast('Successfully joined the Savings Circle!', 'success');
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Join transaction failed: ${res.error}`, 'error');
      return false;
    }
  }

  async activateCircle(contractId: string): Promise<boolean> {
    if (!this.state.walletAddress) {
      this.showToast('Wallet not connected', 'warning');
      return false;
    }
    this.showSpinner('Activating savings circle and locking rotation order...');
    const res = await this.circle.activate(contractId, this.state.walletAddress);
    this.hideSpinner();

    if (res.success) {
      this.showToast('Savings Circle is now ACTIVE!', 'success');
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Activation failed: ${res.error}`, 'error');
      return false;
    }
  }

  async contribute(contractId: string): Promise<boolean> {
    if (!this.state.walletAddress) {
      this.showToast('Wallet not connected', 'warning');
      return false;
    }
    this.showSpinner('Paying contribution to circle escrow...');
    const res = await this.circle.contribute(contractId, this.state.walletAddress);
    this.hideSpinner();

    if (res.success) {
      this.showToast('Contribution paid successfully!', 'success');
      
      // Auto-sync chama summary back to factory registry
      this.syncChamaRegistry(contractId).catch(() => {});
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Contribution failed: ${res.error}`, 'error');
      return false;
    }
  }

  async placeBid(contractId: string, discountAmount: number): Promise<boolean> {
    if (!this.state.walletAddress) {
      this.showToast('Wallet not connected', 'warning');
      return false;
    }
    this.showSpinner('Submitting sealed discount bid...');
    
    // Scale discount: 7 decimals (e.g. 20 becomes 200,000,000)
    const bidScaled = BigInt(Math.round(discountAmount)) * 10000000n;

    const res = await this.circle.placeBid(contractId, this.state.walletAddress, bidScaled.toString());
    this.hideSpinner();

    if (res.success) {
      this.showToast('Discount bid submitted successfully!', 'success');
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Bid submission failed: ${res.error}`, 'error');
      return false;
    }
  }

  async distribute(contractId: string): Promise<boolean> {
    if (!this.state.walletAddress) {
      this.showToast('Wallet not connected', 'warning');
      return false;
    }
    this.showSpinner('Executing round distribution payload...');
    const res = await this.circle.distribute(contractId, this.state.walletAddress);
    this.hideSpinner();

    if (res.success) {
      this.showToast('Payout distributed to the round beneficiary!', 'success');
      this.syncChamaRegistry(contractId).catch(() => {});
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Distribution failed: ${res.error}`, 'error');
      return false;
    }
  }

  async flagEmergency(contractId: string): Promise<boolean> {
    if (!this.state.walletAddress) {
      this.showToast('Wallet not connected', 'warning');
      return false;
    }
    this.showSpinner('Flagging emergency pause event...');
    const res = await this.circle.flagEmergency(contractId, this.state.walletAddress);
    this.hideSpinner();

    if (res.success) {
      this.showToast('Emergency flag submitted.', 'warning');
      this.syncChamaRegistry(contractId).catch(() => {});
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Flag transaction failed: ${res.error}`, 'error');
      return false;
    }
  }

  async withdraw(contractId: string): Promise<boolean> {
    if (!this.state.walletAddress) {
      this.showToast('Wallet not connected', 'warning');
      return false;
    }
    this.showSpinner('Withdrawing security deposits from paused circle...');
    const res = await this.circle.withdrawPrincipal(contractId, this.state.walletAddress);
    this.hideSpinner();

    if (res.success) {
      this.showToast('Escrow funds withdrawn successfully!', 'success');
      this.syncChamaRegistry(contractId).catch(() => {});
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Withdrawal failed: ${res.error}`, 'error');
      return false;
    }
  }

  // Helper to sync registry stats
  private async syncChamaRegistry(contractId: string) {
    if (!this.state.walletAddress) return;
    try {
      const summariesRes = await this.factory.getChamasSummary();
      if (!summariesRes.success || !summariesRes.data) return;
      const found = summariesRes.data.find(s => s.contract_id === contractId);
      if (found) {
        await this.factory.syncChama(found.id, this.state.walletAddress);
      }
    } catch (_) {}
  }

  // --- Strict Receive Path Payments ---

  async checkPathPayment(
    fromAssetCode: string,
    fromAssetIssuer: string | null,
    toAssetCode: string,
    toAssetIssuer: string | null,
    amount: string
  ): Promise<any> {
    this.showSpinner(`Finding conversion path for ${amount} ${toAssetCode}...`);
    try {
      const horizonUrl = 'https://horizon-testnet.stellar.org';
      
      const sourceAssetStr = fromAssetCode === 'XLM' || fromAssetCode === 'native'
        ? 'native'
        : `${fromAssetCode}:${fromAssetIssuer}`;

      const destAssetType = toAssetCode === 'XLM' || toAssetCode === 'native'
        ? 'native'
        : 'credit_alphanum4';

      let queryUrl = `${horizonUrl}/paths/strict-receive?source_assets=${sourceAssetStr}&destination_asset_type=${destAssetType}&destination_amount=${amount}`;
      if (toAssetCode !== 'XLM' && toAssetCode !== 'native') {
        queryUrl += `&destination_asset_code=${toAssetCode}&destination_asset_issuer=${toAssetIssuer}`;
      }

      console.log(`[MesaSDK] Path finding URL: ${queryUrl}`);
      const res = await fetch(queryUrl).then(r => r.json());
      this.hideSpinner();

      const records = res._embedded?.records || [];
      if (records.length === 0) {
        console.warn(`[MesaSDK] No paths found from Horizon. Using 1:1 fallback path.`);
        
        let fallbackRate = 1.0;
        if (fromAssetCode === 'EURC') fallbackRate = 0.95;
        if (fromAssetCode === 'XLM') fallbackRate = 4.5;

        const sourceAmount = (parseFloat(amount) * fallbackRate).toFixed(7);
        const hops = [fromAssetCode, toAssetCode];
        
        this.showToast(`Path Payment Found (Testnet Fallback): ${sourceAmount} ${fromAssetCode} converts to ${amount} ${toAssetCode}`, 'info');
        return {
          success: true,
          source_amount: sourceAmount,
          rate: fallbackRate,
          path: [],
          hops: hops,
          isFallback: true
        };
      }

      const sorted = records.sort((a: any, b: any) => parseFloat(a.source_amount) - parseFloat(b.source_amount));
      const best = sorted[0];
      
      const sourceAmount = best.source_amount;
      const rate = parseFloat(sourceAmount) / parseFloat(amount);
      const intermediatePath = best.path.map((p: any) => ({
        code: p.asset_code || 'XLM',
        issuer: p.asset_issuer || null
      }));

      const hops = [fromAssetCode, ...best.path.map((p: any) => p.asset_code || 'XLM'), toAssetCode];

      this.showToast(`Path Payment Found: ${parseFloat(sourceAmount).toFixed(4)} ${fromAssetCode} converts to ${parseFloat(amount).toFixed(2)} ${toAssetCode}`, 'success');
      return {
        success: true,
        source_amount: sourceAmount,
        rate: rate,
        path: intermediatePath,
        hops: hops,
        isFallback: false
      };
    } catch (e: any) {
      this.hideSpinner();
      console.error('[MesaSDK] checkPathPayment error:', e);
      this.showToast(`Path payment query failed: ${e.message}`, 'error');
      return { success: false, error: e.message || String(e) };
    }
  }

  async contributeWithPathPayment(
    contractId: string,
    sendAssetCode: string,
    sendAssetIssuer: string | null,
    sendMax: string,
    destAssetCode: string,
    destAssetIssuer: string | null,
    destAmount: string,
    pathAssets: { code: string; issuer: string | null }[]
  ): Promise<boolean> {
    if (!this.state.walletAddress) {
      this.showToast('Wallet not connected', 'warning');
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
      this.showToast('Cross-border contribution paid successfully!', 'success');
      this.syncChamaRegistry(contractId).catch(() => {});
      this.populateDashboard();
      return true;
    } else {
      this.showToast(`Cross-border contribution failed: ${res.error}`, 'error');
      return false;
    }
  }
}

// Auto-bind to window if running in browser
if (typeof window !== 'undefined') {
  const defaultPassphrase = 'Test SDF Network ; September 2015';
  const defaultRpc = 'https://soroban-testnet.stellar.org';
  const defaultFactoryId = 'CBFXB5LZB2FJDVK66H7NPZEK2OE6VXNGYORSGE2W4V55UTG5NG63JGDG';

  const sdk = new MesaSDK({
    rpcUrl: defaultRpc,
    factoryContractId: defaultFactoryId,
    network: 'testnet',
    networkPassphrase: defaultPassphrase,
    indexerUrl: 'http://localhost:4000/graphql'
  });

  (window as any).MesaSDK = sdk;
  console.log('[MesaSDK TS] Initialized on-chain global instance.');

  // Populate UI elements on initial page load
  window.addEventListener('load', () => {
    setTimeout(() => sdk.populateDashboard(), 500);
  });
}
export { formatAddress, calculateTVL, calculateReputation };
