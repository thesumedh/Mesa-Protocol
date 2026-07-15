import React, { useState } from 'react';

export function WalletConnector() {
  const [address, setAddress] = useState<string | null>(null);

  const connect = async () => {
    // Simulator trigger
    setAddress("GADKLZMF5JFLHGY2WW4H4G2XBFUDSJWCDBVFU4AW6QRU6QWRL2VKQL3J");
  };

  return (
    <div style={{ padding: '20px', borderRadius: '12px', background: '#1E1E2E', border: '1px solid #313244', color: '#CDD6F4' }}>
      <h3>Freighter Wallet Connection</h3>
      {address ? (
        <p style={{ color: '#A6E3A1' }}>Connected: {address.substring(0, 6)}...{address.substring(50)}</p>
      ) : (
        <button onClick={connect} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#89B4FA', color: '#11111B', cursor: 'pointer', fontWeight: 'bold' }}>
          Connect Wallet
        </button>
      )}
    </div>
  );
}
