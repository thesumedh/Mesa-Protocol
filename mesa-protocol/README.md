# Mesa Protocol (Chama / ROSCA on Stellar)

Mesa Protocol is a decentralized rotating savings circle (ROSCA / Chama) application built on Stellar using Soroban smart contracts. It implements secure, trustless group savings with on-chain payout rotations, automated penalty enforcement, security deposits, emergency consensus pauses, and borderless multi-asset path payments.

## Deployment Details

*   **Network:** Stellar Testnet (`Test SDF Network ; September 2015`)
*   **Soroban RPC:** `https://soroban-testnet.stellar.org/`
*   **Horizon Server:** `https://horizon-testnet.stellar.org`
*   **MesaCore Contract ID:** `CDWGVPSUXXSGABQ663FVV4TZJH4Q2R3HVAKTKWFFFMWPF23O7KMNS4KU`
*   **MesaCore WASM Hash:** `6e72c8ea41abdf8b248a3cb3df1a1b1b369c0d48962dfbb187b8f9e16a8a92bb`

### Wrapped Stellar Asset Contracts (SACs)
*   **USDC:** `CCW67CX2SC62R25746RRJV5HK5B2S27EV6G7JUW7K3HQT67WVPF5EUSDC`
*   **EURC:** `CCW67CX2SC62R25746RRJV5HK5B2S27EV6G7JUW7K3HQT67WVPF5EEURC`
*   **KES:** `CCW67CX2SC62R25746RRJV5HK5B2S27EV6G7JUW7K3HQT67WVPF5EEKES`
*   **XLM (Native):** `CDLZFC3SYJYDZT7K67VZ75HPJGWAM3BT2CH4XRVT62JZJU3CLSHQTY2W`

---

## Build & Test Smart Contract

### Build the WASM contract
To compile the Soroban Rust smart contract:
```bash
soroban contract build
```

### Run Unit Tests
To execute the contract unit tests (verifying joining, rotations, late payment ejection rules, and emergency pause flags):
```bash
cargo test
```

---

## Deploy to Stellar Testnet

To deploy the compiled WASM binary to Testnet:
```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/mesa_core.wasm \
  --source YOUR_STELLAR_SECRET_KEY \
  --network testnet
```

---

## Run the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Start the development server:
   ```bash
   yarn dev
   ```
3. Open `http://localhost:3000` in your web browser.
