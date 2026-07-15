import React, { useState } from 'react';
import { WalletConnector } from './WalletConnector';

export function Dashboard() {
  const [vaultBalance, setVaultBalance] = useState(1500);

  const contribute = () => {
    setVaultBalance(prev => prev + 100);
    alert("USDC contribution successful! Vault updated.");
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '40px auto', padding: '20px', background: '#11111B', color: '#CDD6F4', borderRadius: '16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #313244', paddingBottom: '20px' }}>
        <h1 style={{ color: '#89B4FA' }}>🏛️ Mesa Savings App</h1>
        <WalletConnector />
      </header>

      <section style={{ margin: '40px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ padding: '20px', background: '#181825', borderRadius: '12px', border: '1px solid #313244' }}>
          <h4>Active Vault Pool</h4>
          <h2 style={{ fontSize: '36px', color: '#A6E3A1' }}>${vaultBalance} USDC</h2>
          <button onClick={contribute} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#A6E3A1', color: '#11111B', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
            Contribute 100 USDC
          </button>
        </div>

        <div style={{ padding: '20px', background: '#181825', borderRadius: '12px', border: '1px solid #313244' }}>
          <h4>Active Policies</h4>
          <ul style={{ paddingLeft: '20px', lineHeight: '2em' }}>
            <li>Lock Period: 90 Days</li>
            <li>Autoconvert Deposits: Enabled (USDC)</li>
            <li>Slashing Penalty: 10%</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
