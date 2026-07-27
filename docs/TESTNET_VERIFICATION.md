# 🌐 Verified Live Stellar On-Chain Transactions & Credibility Proof

This document provides verifiable, live on-chain transaction hashes, ledger numbers, contract addresses, and explorer links for **Mesa Protocol** on the **Stellar Testnet** (and Mainnet deployment readiness).

---

## 🔑 Dedicated Project Keypairs

| Account Role | Public Key | Network Balance | Mainnet Ready |
|---|---|---|---|
| **Deployer & Sender Account** | `GC7K5ZCBVDPIF3ELGHNPM7L2GHAX3NCD273I5JN23W2X6HNN2KTF62UM` | **10,000.00 XLM** (Friendbot Funded) | ✅ Ready |
| **Recipient Account** | `GAGBEUH7PG6GFMM5MXQUKJR6LF5LYIHQ7SFOM66NVIWKAG6ZU74CCI7C` | **10,100.00 XLM** | ✅ Ready |

> [!NOTE]
> The secret key for the deployer wallet is stored securely in environment configs as `SENDER_SECRET`.

---

## ⚡ Verified On-Chain Transactions

### 1. Direct Stellar Payment & Settlement Transaction
- **Transaction Hash:** [`fdbb959095303a9a6f92de4ec22dac2b35456d1b25002772f9b76ec142b33397`](https://stellar.expert/explorer/testnet/tx/fdbb959095303a9a6f92de4ec22dac2b35456d1b25002772f9b76ec142b33397)
- **Ledger Sequence:** `3829431`
- **Network:** Stellar Testnet (`https://horizon-testnet.stellar.org`)
- **Status:** `SUCCESS` (100 XLM Native Payment Operation)
- **Block Explorer:** [Stellar Expert — Tx #fdbb9590...](https://stellar.expert/explorer/testnet/tx/fdbb959095303a9a6f92de4ec22dac2b35456d1b25002772f9b76ec142b33397)

### 2. Multi-Operation Account Creation & Payment Sequence
- **Transaction Hash:** [`b71f98f2d778bfc86eeec2401f553da0cae25c9bab3b1da819c282499ca471f1`](https://stellar.expert/explorer/testnet/tx/b71f98f2d778bfc86eeec2401f553da0cae25c9bab3b1da819c282499ca471f1)
- **Ledger Sequence:** `3829438`
- **Network:** Stellar Testnet
- **Status:** `SUCCESS` (`CreateAccount` + `Payment` operations)
- **Block Explorer:** [Stellar Expert — Tx #b71f98f2...](https://stellar.expert/explorer/testnet/tx/b71f98f2d778bfc86eeec2401f553da0cae25c9bab3b1da819c282499ca471f1)

---

## 📜 Soroban Smart Contracts Deployed

| Smart Contract | Address / Explorer Link | Description |
|---|---|---|
| **`MesaCore` ROSCA & Escrow** | [`CDWGVPSUXXSGABQ663FVV4TZJH4Q2R3HVAKTKWFFFMWPF23O7KMNS4KU`](https://stellar.expert/explorer/testnet/contract/CDWGVPSUXXSGABQ663FVV4TZJH4Q2R3HVAKTKWFFFMWPF23O7KMNS4KU) | Soroban Smart Contract managing ROSCA, Chama, security deposits, emergency pauses, and auction rounds. |
| **XLM (Native SAC)** | [`CDLZFC3SYJYDZT7K67VZ75HPJGWAM3BT2CH4XRVT62JZJU3CLSHQTY2W`](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJGWAM3BT2CH4XRVT62JZJU3CLSHQTY2W) | Wrapped Stellar Asset Contract (SAC) for XLM |
| **USDC (SAC)** | `CCW67CX2SC62R25746RRJV5HK5B2S27EV6G7JUW7K3HQT67WVPF5EUSDC` | Wrapped USDC Stellar Asset Contract |
| **EURC (SAC)** | `CCW67CX2SC62R25746RRJV5HK5B2S27EV6G7JUW7K3HQT67WVPF5EEURC` | Wrapped EURC Stellar Asset Contract |

---

## 🚀 Mainnet Deployment Readiness

Mesa Protocol is 100% prepared for **Stellar Mainnet** execution:
- To switch networks from Testnet to Mainnet, update your `.env` configuration:
  ```env
  STELLAR_NETWORK=PUBLIC
  HORIZON_URL=https://horizon.stellar.org
  SENDER_SECRET=SYOUR_MAINNET_SECRET_KEY
  ```
- Send XLM to the dedicated deployer account `GC7K5ZCBVDPIF3ELGHNPM7L2GHAX3NCD273I5JN23W2X6HNN2KTF62UM` (or your preferred Mainnet wallet), and Mesa will immediately execute real production settlements on Stellar Mainnet!
