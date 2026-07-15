import React, { useState, useEffect } from 'react';
import { MesaSDK } from '@mesa/sdk';

export default function App() {
  const [balance, setBalance] = useState<string>('0');
  const [vaultName, setVaultName] = useState<string>('Loading...');
  const [depositAmount, setDepositAmount] = useState<string>('1.0');
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');

  const vaultContractId = 'CBYLLCPFPGLK2H34DYXP66SYWECK5YAA6RLNOKRVMJBKCL6UFOHXAGP7';

  // Initialize SDK
  const sdk = new MesaSDK({
    rpcUrl: 'https://soroban-testnet.stellar.org',
    factoryContractId: 'CBZTVZJRNFQ6Q7RLZCKCAXMMOMW3J3TGNY6PDHSD2UGX7MD2NPKWK5U3',
    network: 'testnet',
    networkPassphrase: 'Test SDF Network ; September 2015'
  });

  const vault = sdk.vault(vaultContractId);

  async function fetchVaultState() {
    try {
      const state = await vault.getState();
      setVaultName(state.name);
      // Balance is in stroops (10^7)
      setBalance((Number(state.balance) / 10000000).toFixed(2));
    } catch (e: any) {
      setStatus(`Error fetching state: ${e.message}`);
    }
  }

  useEffect(() => {
    fetchVaultState();
    const interval = setInterval(fetchVaultState, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleDeposit() {
    setLoading(true);
    setStatus('Simulating transaction...');
    try {
      // In a real browser app, the developer would trigger Freighter
      // Here, we log the SDK function call
      setStatus(`SDK deposit call: vault.deposit("${(Number(depositAmount) * 10000000).toFixed(0)}")`);
      setTimeout(() => {
        setStatus('Ready! (Freighter wallet signature required for broadcast)');
        setLoading(false);
      }, 1500);
    } catch (e: any) {
      setStatus(`Deposit failed: ${e.message}`);
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Mesa Savings Vault</h1>
        <p>Connected to Stellar Testnet</p>
      </div>

      <div className="card">
        <div className="card-title">Vault Name</div>
        <div className="card-value">{vaultName}</div>
      </div>

      <div className="card">
        <div className="card-title">Current Balance</div>
        <div className="card-value">{balance} XLM</div>
      </div>

      <div className="card">
        <div className="card-title">Active Contract ID</div>
        <div className="card-value" style={{ fontSize: '10px', wordBreak: 'break-all' }}>
          {vaultContractId}
        </div>
      </div>

      <div className="input-group">
        <label htmlFor="amount">Deposit Amount (XLM)</label>
        <input
          id="amount"
          type="number"
          step="0.1"
          min="0.1"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          disabled={loading}
        />
      </div>

      <button className="btn" onClick={handleDeposit} disabled={loading}>
        {loading ? 'Processing...' : 'Deposit via SDK'}
      </button>

      <button className="btn btn-secondary" onClick={fetchVaultState} disabled={loading}>
        Refresh Balance
      </button>

      {status && <div className="status-text">{status}</div>}
    </div>
  );
}
