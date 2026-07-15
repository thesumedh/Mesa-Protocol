'use client';

import React, { useState, useEffect } from 'react';
import { MesaSDK } from '@mesa/sdk';

export default function Page() {
  const [balance, setBalance] = useState<string>('0');
  const [vaultName, setVaultName] = useState<string>('Loading...');
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');

  const vaultContractId = 'CBYLLCPFPGLK2H34DYXP66SYWECK5YAA6RLNOKRVMJBKCL6UFOHXAGP7';

  // Initialize SDK pointing to Testnet
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

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ color: '#58a6ff', margin: '0 0 8px 0', fontSize: '24px' }}>Mesa + Next.js</h1>
        <p style={{ color: '#8b949e', margin: '0 0 20px 0', fontSize: '14px' }}>Testnet Savings Portal</p>
        
        <div style={{ background: '#21262d', padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#8b949e', textTransform: 'uppercase' }}>Vault Target</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f0f6fc' }}>{vaultName}</div>
        </div>

        <div style={{ background: '#21262d', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#8b949e', textTransform: 'uppercase' }}>Vault Balance</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f0f6fc' }}>{balance} XLM</div>
        </div>

        <button 
          onClick={fetchVaultState} 
          style={{ width: '100%', padding: '10px', background: '#238636', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Sync Ledger Balance
        </button>

        {status && <div style={{ fontSize: '12px', color: '#e06c75', marginTop: '12px', textAlign: 'center' }}>{status}</div>}
      </div>
    </div>
  );
}
