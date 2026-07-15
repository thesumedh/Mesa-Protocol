# Mesa Protocol — Verification & Test Plan

This document outlines the systematic verification plan for all components of the Mesa Protocol. Every feature release must undergo checks against this test matrix.

---

## 🏛️ 1. Smart Contract Verification (Soroban Rust Contracts)

| Component | Test Case | Description | Status |
| :--- | :--- | :--- | :---: |
| **MesaVault** | Create Vault | Deploy a new vault instance with an initial owner. | ✅ |
| **MesaVault** | Deposit | Deposit token assets into the vault, verifying balance updates. | ✅ |
| **MesaVault** | Withdraw | Withdraw token assets from the vault, verifying authorization. | ✅ |
| **MesaVault** | Goal Reached | Verify withdrawal triggers correctly when target goal balance is hit. | ✅ |
| **MesaVault** | Lock Policy | Time-lock funds. Verify withdrawal is blocked prior to expiration. | ✅ |
| **MesaVault** | Auto-Convert | Auto-swap deposit currencies to target assets (USDC) via path payments. | ✅ |
| **MesaVault** | Emergency | Verify consensus-based early withdrawal with multi-sig/member consensus. | ✅ |
| **MesaVault** | Close Vault | Withdraw final funds and clean up contract storage. | ✅ |
| **Group Savings** | Create Circle | Initialize a new collaborative group savings round. | ✅ |
| **Group Savings** | Join | Register new saver keys with collateral locks. | ✅ |
| **Group Savings** | Leave | Remove saver keys during setup phase, returning collateral. | ✅ |
| **Group Savings** | Contribute | Collect regular contributions from saver members into escrow. | ✅ |
| **Group Savings** | Payout | Distribute pooled funds to the round's beneficiary. | ✅ |
| **Group Savings** | Finish Cycle | Reset round indexes and complete rotation cycle. | ✅ |
| **Auction Mode** | Bid | Submit sealed discount bids during bidding rounds. | ✅ |
| **Auction Mode** | Win Bidding | Select the highest bidder as the round beneficiary. | ✅ |
| **Auction Mode** | Distribution | Distribute the discount yield back to other savers. | ✅ |
| **Default Handling** | Slash Collateral | Slash defaulting member's collateral deposit. | ✅ |
| **Default Handling** | Slash Registry | Update bad-debt indexes and reputation in registry. | ✅ |
| **Emergency Pause** | Vote Pause | Pause the cycle when >51% of members flag emergency. | ✅ |
| **Emergency Pause** | Vote Blocked | Block pause command if consensus is <50%. | ✅ |

---

## ⚙️ 2. Policy Engine Composition Matrix

| Policy A | Policy B | Combined Test Scenario | Status |
| :--- | :--- | :--- | :---: |
| **Lock** | **Goal** | Lock funds until either 90 days pass OR $5,000 target is reached. | ✅ |
| **Lock** | **Emergency** | Lock funds for 1 year, but allow consensus-based emergency release. | ✅ |
| **Goal** | **Auto-Convert** | Convert deposits to USDC; block withdrawals until USDC pool hits $1,000. | ✅ |
| **WeeklyDeposit** | **Lock** | Automate weekly deposits into a 6-month locked retirement fund. | ✅ |

---

## 🛠️ 3. SDK & CLI Verification

| Component | Test Case | Target API / Command | Status |
| :--- | :--- | :--- | :---: |
| **SDK** | Create Vault | `MesaSDK.vault.create(...)` | ✅ |
| **SDK** | Deposit | `MesaSDK.vault.deposit(...)` | ✅ |
| **SDK** | Withdraw | `MesaSDK.vault.withdraw(...)` | ✅ |
| **SDK** | Discovery | `MesaSDK.connect(...)` capability detection | ✅ |
| **CLI** | Initialize | `npx mesa init` | ✅ |
| **CLI** | Scaffolder | `npx mesa create <name>` | ✅ |
| **CLI** | Template | `npx mesa template <name>` | ✅ |
| **CLI** | Simulation | `npx mesa simulate` | ✅ |
| **CLI** | Deploy | `npx mesa deploy --network testnet` | ✅ |
| **CLI** | Diagnostic | `npx mesa doctor` | ✅ |

---

## 🔒 4. Security & Load Testing

| Category | Test Case | Target Behavior | Status |
| :--- | :--- | :--- | :---: |
| **Security** | Zero Deposit | Verify deposit with amount `0` fails immediately. | ✅ |
| **Security** | Overdraft | Verify withdrawal exceeding current balance is blocked. | ✅ |
| **Security** | double-pause | Block duplicate emergency pause operations. | ✅ |
| **Security** | double-withdraw | Prevent duplicate claims on collateral assets. | ✅ |
| **Load Testing** | 100 Vaults | Deploy 100 vaults on local sandbox to check registry TVL lag. | ✅ |
| **Load Testing** | 1000 Transactions | Run 1,000 deposits/withdrawals sequentially to monitor memory. | ✅ |

---

## 🏁 5. End-to-End Platform Journey (60-Second Demo)

- [x] Run `npx mesa create savings-app` (Scaffolds starter nextjs application)
- [x] Run `npm install` and `npm run dev` (Starts development server)
- [x] Create Vault configuration with lock and goal policies via `Mesa.createVault()`
- [x] Click deposit / interact with Freighter wallet connector mock flow
- [x] Verify goal progress state updates in the UI
- [x] Deploy to Stellar Testnet using `npx mesa deploy`
