# Phase 3: Factory + Registry Verification Notes

## 1. Build and Test Status
- **Workspace Build:** Successful. Both contracts compiled to WASM.
- **Factory WASM size:** 7,449 bytes (~7.2KB), extremely optimized.
- **Unit and Integration Tests:** 10/10 tests passed successfully.
  - 9 tests in `mesa-core`.
  - 1 test in `mesa-factory` validating:
    - Factory initialization.
    - Dynamic creation of 3 chamas.
    - Contract lookup via ID (`get_chama`).
    - Pagination (`list_chamas` with limit/offset).
    - Summary fetch (`get_chamas_summary`).
    - Cache updates (`sync_chama`) querying the child contract.

---

## 2. Testnet Deployments

### Factory Contract Details
- **WASM Hash:** `6d02116e81099fe5409d28a5c433871757c492bdacf1327550c1ebf5ee631cde`
- **Contract ID:** `CBFXB5LZB2FJDVK66H7NPZEK2OE6VXNGYORSGE2W4V55UTG5NG63JGDG`
- **Initialization:** Initialized with the `MesaCore` WASM hash: `be8f37c1b8060b5ebfb940e2974af37b66018e7b28046f6cd9cce2027bc5e55e`.

### Deployed Chama Instances (ROSCA Circles)
Two savings circles were dynamically created via the factory on Testnet:

#### 1. Chama #1: Tanda 1
- **ID:** `1`
- **Contract Address:** `CCKYJCI3JJIIJAL3PV4G3E3TOTPCZMBIN5QHLKSZB3LAQJ6LA4KQXNEU`
- **Parameters:**
  - Name: `"Tanda 1"`
  - Contribution: `100000000` (100 units)
  - Max Members: `3`
  - Duration: `3600` seconds (1 hour)
  - Token: Native Wrap XLM (`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`)

#### 2. Chama #2: Tanda 2
- **ID:** `2`
- **Contract Address:** `CCHCSWU2NRRPJNAK22MAQCD535QJQW4BSNRNNVIW3Q6E2PGJ2F2GAZ5V`
- **Parameters:**
  - Name: `"Tanda 2"`
  - Contribution: `200000000` (200 units)
  - Max Members: `4`
  - Duration: `7200` seconds (2 hours)
  - Token: Native Wrap XLM (`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`)

---

## 3. Query Verification (list_chamas)
Invoking the factory's `list_chamas` with `limit = 10, offset = 0` yields:
```json
[
  {
    "contract_id": "CCKYJCI3JJIIJAL3PV4G3E3TOTPCZMBIN5QHLKSZB3LAQJ6LA4KQXNEU",
    "contribution_amount": "100000000",
    "id": 1,
    "max_members": 3,
    "member_count": 0,
    "name": "Tanda 1",
    "status": 0,
    "token": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
  },
  {
    "contract_id": "CCHCSWU2NRRPJNAK22MAQCD535QJQW4BSNRNNVIW3Q6E2PGJ2F2GAZ5V",
    "contribution_amount": "200000000",
    "id": 2,
    "max_members": 4,
    "member_count": 0,
    "name": "Tanda 2",
    "status": 0,
    "token": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
  }
]
```
All parameters are verified correct and dynamic registry is fully operational.
