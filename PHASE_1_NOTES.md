# Phase 1 Execution Notes — Core Contract

## Overview
We have completed **Phase 1: Smart Contract Core**! The core smart contract (`MesaCore`) is built, thoroughly tested locally with a 6-test suite, successfully compiled, deployed on the **Stellar Testnet**, and initialized/queried via the CLI.

---

## Technical Proof of Deployment

### Contract Deploy Details
- **Testnet Contract ID:** `CBCUI4YS2DWF7JZ7SX4OZCZLWBA7QSJYSYNSROZ62PH5VVUGEF5LWK55`
- **Native XLM Wrap (SAC ID):** `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- **Explorer URL:** `https://stellar.expert/explorer/testnet/contract/CBCUI4YS2DWF7JZ7SX4OZCZLWBA7QSJYSYNSROZ62PH5VVUGEF5LWK55`

### Query Output via CLI (`get_circle`)
```bash
$ stellar contract invoke --id CBCUI4YS2DWF7JZ7SX4OZCZLWBA7QSJYSYNSROZ62PH5VVUGEF5LWK55 --network testnet -- get_circle
```
**JSON Response:**
```json
{
  "contribution_amount": "10000000",
  "creator": "GCRGX6UQ4KJ2ZOOG2WBQZODVKS6VZEUZMWA2T5FG45XJ7OSEX2R64LVO",
  "current_round": 0,
  "deadline": 0,
  "duration": 3600,
  "max_members": 3,
  "members": [],
  "name": "Test Circle",
  "rotation_order": [],
  "status": 0,
  "token": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
}
```

---

## Design and Specification Alignments

### 1. Parameters & Token Types
- `token: Address` is accepted dynamically at `initialize`.
- `duration: u64` is accepted dynamically at `initialize` to track round epochs.
- `contribution: i128` (Soroban token standard type) is used for all asset values.

### 2. Collateral Vouching & Join Deposits
- On calling `join(member, sponsor)`, the contract locks `contribution * 2` (1 contribution round pot payment + 1 security deposit) from the member into the contract's vault.
- Vouch relationship mapped to sponsors to allow slashing sponsors if members default (Phase 2 Safety).

### 3. Rotation Order Choice
- **Sequential order** is utilized based on the joining sequence (cloning `members` list to `rotation_order` on `activate`). This is simple, predictable, and fair for savings circle configurations.

### 4. SDK Support Helper
- Added `can_distribute(e: Env) -> bool` helper so the UI/SDK knows exactly when the current round's pot is fully contributed and ready for distribution payout.

### 5. On-Chain Event Spec
Emits the exact following event symbols matching the master spec:
- `MemberJoined`
- `CircleActivated`
- `RoundContributed`
- `RoundDistributed`

---

## Local Unit Test Suite
- All 6 unit tests in `src/test.rs` pass successfully.
- Tests include: `test_join_and_initial_state`, `test_activation`, `test_contribute_and_distribute`, `test_distribute_before_all_paid_fails`, `test_penalty_and_forfeiture`, and `test_vouching_and_reputation`.
