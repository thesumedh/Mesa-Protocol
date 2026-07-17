# Mesa Protocol — Full UI/UX & Integration Review (Claude)

**Reviewed:** 2026-07-06  
**Reviewer:** Antigravity (AI)

---

## 1. OVERALL ASSESSMENT

The app has a **strong foundation** — clean Material-3-inspired design, working SPA router, Freighter wallet integration, Soroban contract code + passing tests, and the Circle Members & Trust Ledger is live.

However, several gaps exist between the current prototype and a **production-ready** app for the SCF/hackathon judges:

---

## 2. CRITICAL BUGS FOUND

### BUG-1: group_savings_room has its own duplicate nav/header (not SPA-aware)

**File:** `group_savings_room/code.html`  
**Problem:** The circle page has its own `<nav>` and `<aside>` elements (lines 138–192). When the SPA router injects only the `<main>` content, these are stripped — but the sub-page nav is a duplicate of index.html nav. This causes the sub-page to render differently when opened standalone vs via SPA router.  
**Fix:** Remove the nav/aside from group_savings_room/code.html since the SPA router already provides navigation.

### BUG-2: Contribution Amount Mismatch — "50 USDC" vs "100 USDC"

**File:** `group_savings_room/code.html` lines 330–331  
**Problem:** The static "Contribution Amount" row shows `50 USDC` hardcoded, but `chama-family-tanda` is seeded with `contributionAmount: 100`. The Pay button says "100 USDC" (dynamically correct) but the info row still says 50.  
**Fix:** Add `id="mesa-contribution-display"` to that span and update it in `renderChamaPage()`.

### BUG-3: Deadline shows "15 Nov, 2024" — Static hardcoded past date

**File:** `group_savings_room/code.html` line 340  
**Problem:** Deadline is always "15 Nov, 2024" — this is in the past and looks broken for judges.  
**Fix:** Add `id="mesa-deadline-display"` and compute it from `chama.deadline` epoch.

### BUG-4: "Join Circle" card stays visible even when wallet IS connected but after joining

**File:** `group_savings_room/code.html` (Join card logic in script)  
**Problem:** After joining with `handleJoinCircle()`, the page re-renders and the join card should hide. This works in theory but if `MesaSDK.api.joinChama` returns `null` (e.g., wallet not connected in demo mode), the card stays visible.  
**Fix:** Add explicit "wallet not connected" check before showing the join card, and show a "Connect Wallet first" message.

### BUG-5: "Trigger Round Distribution" button — disabled state class conflict

**File:** `group_savings_room/code.html`  
**Problem:** The button starts enabled in HTML but `renderChamaPage()` disables it. On first load before `renderChamaPage()` runs, the button is briefly clickable and shows no disable reason.  
**Fix:** Default the distribute button to disabled in HTML markup, enable only via JS.

### BUG-6: Dashboard shows hardcoded "Alex" username, no wallet integration

**File:** `welcome_dashboard/code.html`  
**Problem:** Dashboard shows "Good morning, Alex." regardless of wallet connection status. Protocol TVL, Reliability Score, etc. are all static.  
**Fix:** Pull wallet address from MesaSDK and update the greeting; populate "Active Circles" from ChamaStore.

### BUG-7: Create Circle form — "Launch Circle" doesn't reflect in My Circles

**File:** `create_a_circle_wizard/code.html`  
**Problem:** Clicking "Launch Circle" calls `MesaSDK.createChama()` but navigates to `#circle` which always shows `chama-family-tanda`. There is no way to browse all circles or see the newly created circle.  
**Fix:** Add circle list rendering to `#circle` that shows ALL circles from ChamaStore, with click-through to individual circle rooms.

---

## 3. MISSING FEATURES (Production Gap)

### MISSING-1: No real Soroban contract invocation

**Current state:** `MesaAPI.contribute()` sends a 1 XLM Horizon payment to a treasury address as a demo. The actual MesaCore Soroban contract (which has passing tests) is **not called**.  
**Required:** Integrate `@stellar/stellar-sdk` SorobanRpc to invoke `contribute()`, `join()`, `distribute_round()` on the deployed contract ID.

### MISSING-2: No Transaction History / Activity Feed per Circle

**Current state:** The Transparency Panel was replaced with the Trust Ledger (good), but there is no per-circle transaction history.  
**Required:** Show last 5 Horizon transactions to the treasury address, filtered by circle.

### MISSING-3: No Circle Discovery / Explore Page integration

**Current state:** Social feed (`#social`) shows general posts but no live circles to browse and join.  
**Required:** Show all ChamaStore circles as cards with Join button in the Explore page.

### MISSING-4: Create Circle form doesn't create working circles end-to-end

**Current state:** Form creates a circle in localStorage but there is no way to navigate to it.  
**Required:** After creation, navigate to the newly created circle's room.

### MISSING-5: Governance proposals are fully static

**Current state:** Governance shows hardcoded proposals.  
**Required:** Proposals should be stored in localStorage and link to the affected circle.

### MISSING-6: No cross-border path payment UI walkthrough

**Current state:** Path payment section says "Auto-convert via Stellar path payment" but clicking it just shows a toast.  
**Required:** Show actual path with source/destination amounts from Horizon.

### MISSING-7: Mobile bottom nav doesn't stay connected to wallet state

**Current state:** Mobile nav is just navigation buttons — wallet state changes are not reflected.  
**Required:** Show compact wallet status on mobile.

---

## 4. UX IMPROVEMENTS NEEDED

### UX-1: Empty state for "My Circles" when no circles exist

When a new user visits #circle and has no circles, show an empty state with "Create your first circle" CTA.

### UX-2: Reputation history / badge progression

Show a visual indicator of how reputation changes over time (sparkline or level badges: Bronze, Silver, Gold, Platinum).

### UX-3: Countdown timer for round deadline

Instead of showing a static date, show a live countdown "3 days, 14 hours remaining" that updates every second.

### UX-4: Success animation after contribute/join

After a successful action, show a confetti/celebration animation and a success state card before resetting.

### UX-5: Dashboard should dynamically show real circle count

"Your savings community" section shows static data. Connect to ChamaStore.

### UX-6: Clearer onboarding flow

First-time users should see an onboarding tour: Connect Wallet → Browse Circles → Join Circle → Contribute.

---

## 5. SMART CONTRACT INTEGRATION STATUS

| Feature | Contract | SDK | UI |
|---------|---------|-----|-----|
| Initialize circle | ✅ Implemented | ✅ LocalStorage sim | ✅ Create Circle form |
| Join with sponsor | ✅ Implemented | ✅ LocalStorage sim | ✅ Join card |
| Contribute | ✅ Implemented | ⚠️ XLM demo only | ✅ Pay My Round btn |
| Distribute round | ✅ Implemented | ✅ LocalStorage sim | ✅ Distribute btn |
| Reputation tracking | ✅ Implemented | ✅ LocalStorage sim | ✅ Trust Ledger |
| Vouching/slashing | ✅ Implemented | ✅ LocalStorage sim | ✅ Shown in ledger |
| Emergency mode | ✅ Implemented | ✅ LocalStorage sim | ✅ Emergency panel |
| Withdraw principal | ✅ Implemented | ✅ LocalStorage sim | ✅ Withdraw btn |
| **Soroban RPC call** | ✅ Contract exists | ❌ Not wired | ❌ Not wired |

**Key gap:** The Soroban contract is deployed and tested but the UI calls Horizon XLM payments instead of the actual Soroban contract methods.

---

## 6. IMMEDIATE FIXES TO IMPLEMENT

Priority order:

1. Fix contribution amount mismatch (BUG-2) ← easiest, most visible
2. Fix deadline display to be dynamic (BUG-3) ← easy, looks broken
3. Connect dashboard to live ChamaStore data (BUG-6)
4. Add circle list page to #circle before the individual circle room
5. Wire Create Circle to navigate to new circle after creation
6. Add live countdown timer for round deadline
7. Ensure "Join Circle" card walletconnect edge case (BUG-4)

---

## 7. PRODUCTION READINESS CHECKLIST

- [x] Smart contract written & tested (5/5 tests pass)
- [x] Freighter wallet connect/disconnect
- [x] Trust Ledger with reputation badges
- [x] Sponsor/vouching UI
- [x] Emergency mode UI
- [x] SPA router with all pages
- [ ] Soroban RPC contract invocation (actual on-chain calls)
- [ ] Real-time Horizon transaction history
- [ ] Circle discovery/browse page
- [ ] Multi-circle navigation (My Circles list)
- [ ] Dynamic dashboard (wallet-aware, live data)
- [ ] Live deadline countdown
- [ ] Mobile-optimized UX
- [ ] README with deployment instructions
- [ ] Contract deployment script for testnet

---

*This file is intended for handoff — the next AI assistant should read this first and continue from the improvements list above.*

Mesa Protocol / Chama Review for Stellar Community Fund (ChatGpt)
Date: 2026-07-06
Short verdict
-------------

Mesa Protocol is a good idea for the Stellar Community Fund, but I would not submit it as-is if the goal is to look strong and production-minded. It has a real Stellar-native thesis and a tested Soroban contract, which is much better than a pure UI mockup. The weak point is that the current project still feels split between a polished demo and an unfinished on-chain app.
My honest rating right now: 6.5 / 10 for SCF readiness.
Potential after cleanup: 8 / 10.
Why the idea fits Stellar
-------------------------

The core product is a blockchain version of a ROSCA / chama / tanda: a rotating savings circle where members contribute periodically and the pot is paid to a different member each round.
This is a good fit for Stellar because:

1. Stellar is naturally strong for low-cost payments, stable assets, remittances, and cross-border financial access.
2. Chamas are a real-world financial behavior, not a made-up crypto use case.
3. Soroban smart contracts are useful here because the system needs shared custody, payment enforcement, rotation rules, emergency exits, and penalties.
4. The cross-border angle is credible: families, diaspora groups, migrant workers, and community savings groups can participate across countries.
5. Multi-asset contribution is a strong Stellar story if implemented properly with USDC, EURC, local anchors, path payments, or Blend-style yield later.
The project is more compelling than another generic DeFi dashboard because it starts from a real community finance pattern.
What is strong in the current project

-------------------------------------

1. There is a real Soroban contract:
   F:\Stellar\stitch_mesa_protocol\mesa-protocol\contracts\mesa-core\src\lib.rs
2. The contract includes meaningful mechanics:
   - member joining
   - security deposits
   - round contribution tracking
   - payout rotation
   - late payment detection
   - missed payment count
   - reputation penalty
   - member ejection after repeated misses
   - sponsor / vouching penalty
   - emergency mode
   - principal withdrawal during emergency mode
3. The contract has tests:
   F:\Stellar\stitch_mesa_protocol\mesa-protocol\contracts\mesa-core\src\test.rs
4. I ran:
   cargo test
   Result:
   5 tests passed.
5. The user-facing concept is clear. The existing info.txt explains chamas in plain language, which is valuable for SCF because judges and community voters need to understand why this matters.
6. The UI prototype is visually strong. The standalone screens communicate a serious fintech product, not just a hackathon form.
What is weak right now

----------------------

1. Wallet connection is currently unreliable.
   This is the biggest immediate demo risk. For SCF, a failed wallet connect during review can make the project look unfinished even if the smart contract is good.
2. The frontend still has boilerplate leftovers.
   F:\Stellar\stitch_mesa_protocol\mesa-protocol\frontend\README.md still says "soroban react dapp boilerplate" and talks about a greeting contract.
   There is also a GreeterContractInteractions component still present:
   F:\Stellar\stitch_mesa_protocol\mesa-protocol\frontend\src\components\web3\GreeterContractInteractions.tsx
   This weakens credibility. It makes the app look adapted from a template rather than intentionally built.
3. The frontend uses LocalStorage fallbacks heavily.
   F:\Stellar\stitch_mesa_protocol\mesa-protocol\frontend\src\hooks\useMesaCore.ts tries on-chain calls but falls back to local storage for many flows.
   That is fine for a demo, but the SCF submission should clearly explain what is on-chain now vs simulated.
4. Contract creation is not truly solved.
   createChama currently creates a fake-looking contract ID locally and tries to initialize the existing contract. For a real product, each circle needs either:
   - a proper factory/deployer pattern,
   - one contract managing many circles,
   - or a clear architecture explaining how new chamas are created.
5. The current contract model has some design issues.
   The initialize function stores a members list upfront, and join requires the member to already be in that list. This means "joining" is more like activating a pre-approved member than open discovery/joining.
6. Multi-asset path payments are mostly narrative/demo right now.
   The concept is strong, but SCF reviewers will want to see actual Stellar path payment usage or a clear milestone for it.
7. There is no strong public-facing submission package yet.
   Missing or incomplete:
   - polished README
   - architecture diagram
   - demo script
   - exact SCF milestone plan
   - security limitations
   - what is deployed on testnet
   - how to reproduce the demo
   - screenshots/video links
SCF suitability

---------------
Based on the current SCF site, SCF supports developers, startups, and companies building on Stellar and Soroban. The Build path is for validated projects moving from concept to launch, with awards up to $150,000 in XLM across tracks.
Mesa can fit that, especially as a Build-track project, because it is:

1. Stellar/Soroban-native.
2. Financially meaningful.
3. Community-oriented.
4. Relevant to real-world users.
5. Able to show a working smart contract with tests.
But to be competitive, the submission should not present this as a finished product. It should present Mesa as a promising prototype with a clear path to a usable testnet pilot.
Recommended positioning

-----------------------

Do not pitch it as "we already built the full decentralized chama platform."
Pitch it as:
"Mesa Protocol brings ROSCAs / chamas / tandas on-chain using Stellar and Soroban, starting with secure USDC savings circles that enforce contribution rules, payout rotation, deposits, emergency exits, and member reputation. Our next milestone is a reliable testnet pilot with wallet onboarding, real SAC transfers, and cross-border asset contribution UX."
That is honest and strong.
Best SCF angle
--------------

The strongest narrative is:
"Community finance for the global south and diaspora groups, built on Stellar rails."
Examples:

1. Kenyan chamas using USDC.
2. Family savings circles with members in different countries.
3. Migrant workers contributing from abroad.
4. Local groups using stable assets and transparent contract custody.
5. Reputation history that can later become creditworthiness.
What to fix before submission

-----------------------------
Priority 1:
Fix wallet connection in the real frontend, not only the standalone HTML demo.
Priority 2:
Remove boilerplate references:

- Greeter contract UI
- greeting contract deployment labels
- boilerplate README text
Priority 3:
Write a clean root README:
- What Mesa is
- Why Stellar
- What is live on testnet
- How to run it
- Demo flow
- Known limitations
- Roadmap
Priority 4:
Make on-chain vs simulated state explicit.
Do not hide local storage fallback. Say clearly:
"The current demo falls back to local state when wallet or RPC calls fail; the tested Soroban contract implements the target settlement logic."
Priority 5:
Decide the smart contract architecture:
- one contract per chama, or
- one registry/factory, or
- one multi-chama contract.
Priority 6:
Record a short demo video.
The video should show:

1. Connect wallet.
2. Join circle.
3. Pay security deposit + contribution.
4. Distribute round.
5. Trigger missed payment / penalty in test flow.
6. Emergency exit.
Priority 7:
Add an architecture diagram.
Priority 8:
Add a milestone plan for SCF:
Milestone 1: wallet + on-chain integration stable.
Milestone 2: deployed testnet pilot with USDC SAC.
Milestone 3: multi-asset contribution / path payment.
Milestone 4: public pilot with 2-3 real savings groups or simulated user cohort.
Biggest risks

-------------

1. Trust model:
   Digital chamas still need social trust or collateral. Mesa handles this with deposits, vouching, and reputation, which is good, but the economics need to be explained carefully.
2. UX:
   Chama users may not be crypto-native. Freighter onboarding, testnet funding, and transaction signing may be too hard for the target audience unless abstracted later.
3. Regulatory / custody interpretation:
   The app touches savings pools and payouts. For a prototype this is okay, but any production roadmap should mention compliance and local partners.
4. Incomplete integration:
   A polished UI plus local storage can look misleading if not explained. Be honest.
Final recommendation

--------------------
Yes, this is good enough as the foundation for a Stellar Community Fund submission, but it needs cleanup before submitting.
Submit after:

1. wallet connection works,
2. frontend README is no longer boilerplate,
3. demo flow is reproducible,
4. contract/testnet status is clearly documented,
5. local simulation is honestly labelled,
6. milestone plan is written.
If submitted today, I think it may be seen as promising but rough.
If cleaned up for 2-4 focused days, I think it can be a credible SCF Build candidate.
Sources checked

---------------
Stellar Community Fund official site:
<https://communityfund.stellar.org/>
Local files reviewed:
F:\Stellar\stitch_mesa_protocol\info.txt
F:\Stellar\stitch_mesa_protocol\index.html
F:\Stellar\stitch_mesa_protocol\js\mesa-sdk.js
F:\Stellar\stitch_mesa_protocol\mesa-protocol\README.md
F:\Stellar\stitch_mesa_protocol\mesa-protocol\contracts\mesa-core\src\lib.rs
F:\Stellar\stitch_mesa_protocol\mesa-protocol\contracts\mesa-core\src\test.rs
F:\Stellar\stitch_mesa_protocol\mesa-protocol\frontend\README.md
F:\Stellar\stitch_mesa_protocol\mesa-protocol\frontend\src\hooks\useMesaCore.ts
F:\Stellar\stitch_mesa_protocol\mesa-protocol\frontend\src\components\web3\GreeterContractInteractions.tsx
