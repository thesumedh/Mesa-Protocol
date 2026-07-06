# Mesa Protocol: Smart Contract, Backend, & Frontend Architecture Roadmap

This roadmap outlines the technical progression of the Mesa Protocol from a prototype/simulation to a production-grade, unified Web3 application on the Stellar network.

---

## 1. The "Two Frontend" Dilemma & Resolution Strategy

Currently, the repository contains two separate frontend codebases:
1. **Standalone HTML Prototype (Root Directory)**: Uses `index.html` and multiple subpages (e.g., `group_savings_room/code.html`, `welcome_dashboard/code.html`). It contains the polished Material-3 inspired UI and simulated interactions via `ChamaStore`.
2. **Next.js React App (`/mesa-protocol/frontend`)**: Contains Soroban integration logic, Freighter hooks, and boilerplate code (e.g., `GreeterContractInteractions.tsx`).

### The Chosen Path: Option A (Unified React App)
To establish high credibility for judges and prevent confusion, **we will make the Next.js React app the single source of truth**. We will completely migrate the polished HTML designs into Next.js, wire them to the contract hooks, and delete the redundant root-level standalone HTML files.

```
[Standalone HTML Prototype]  ──(Extract UI/UX)──┐
                                                 v
[Soroban Smart Contracts]   ──(RPC integration)──> [Unified Next.js React App] (Deployed to Vercel)
                                                 ^
[Boilerplate React Code]    ──(Delete/Purge)─────┘
```

---

## 2. Smart Contract Evolution (Soroban)

The `MesaCore` contract is functional and has passing tests, but requires architectural upgrades to support real-world, multi-tenant deployments.

### A. Factory-Registry Pattern
Currently, a single `MesaCore` contract represents a single circle. We will implement a `MesaFactory` contract to allow decentralized, permissionless creation of new savings circles.

- **MesaFactory Contract**: Stores the WASM code hash of `MesaCore`. Exposes a `create_chama(...)` function that deploys a new contract instance dynamically using the Soroban `deployer` API.
- **MesaRegistry**: Keeps an on-chain registry of all deployed circles, categorizing them by asset class (USDC, EURC), duration, and status (Signup, Active, Completed).

### B. Dynamic Membership & Signup Phases
Currently, all members must be passed as an array during contract initialization (`initialize`). In production, a circle needs a lifecycle:

1. **Setup Phase**: Creator initializes parameters (contribution amount, round duration, max members, token type).
2. **Signup Phase**: Users join the contract dynamically by calling `join(member, sponsor)`. The contract checks if the maximum member cap is reached.
3. **Activation Phase**: Once members are locked, the creator or contract triggers `activate()`, which locks the rotation order and starts the first round deadline countdown.

---

## 3. Backend & Indexer Infrastructure

To build a responsive UI (e.g., displaying active circle feeds, historical member payout times, and reliability metrics), the client cannot query the Soroban RPC directly for every piece of history. We need a performant indexer backend.

- **Event Indexing Service (Node.js/Go)**: Monitor the Stellar network using a Horizon/Soroban event stream listener. Listen for specific contract events emitted by `MesaCore` (`RoundDist`, `MemberJoined`, `EmergencyFlagged`, `MissedPayment`).
- **REST/GraphQL API Layer**: Expose a fast read-layer for the frontend to query circle discovery directories, user reputation graphs, and cross-border payment activity feeds.

---

## 4. Phased Implementation Roadmap

### Phase 1: React Boilerplate Cleanup & Workspace Setup
- **Purge Greeter Boilerplate**: Delete `GreeterContractInteractions.tsx` and all references to the greeter contract inside the React files.
- **Clean Configuration**: Clean up `README.md` in the Next.js directory to reflect the actual Mesa Protocol architecture rather than a boilerplate template.
- **Vercel Build Target**: Configure the Vercel deployment directory to target `/mesa-protocol/frontend`.

### Phase 2: UI Migration (HTML to React Components)
- **Deconstruct Static HTML**: Port the responsive Tailwind CSS and Material-3 layouts from the standalone subpages (`welcome_dashboard/code.html`, `group_savings_room/code.html`, `create_a_circle_wizard/code.html`) into Next.js React components.
- **Theme Matching**: Align the `tailwind.config.js` of the Next.js application to inherit the custom Material-3 theme tokens (e.g., `surface-dim`, `secondary-container`, `tertiary-fixed`) used in the standalone prototype.
- **Dynamic Routing Integration**: Map SPA routes to Next.js file-based routes:
  - Welcome Dashboard -> `/src/pages/index.tsx`
  - Savings Circle Details -> `/src/pages/chama/[id].tsx`
  - Create Circle Wizard -> `/src/pages/chama/create.tsx`
  - Explore Circles Page -> `/src/pages/discover.tsx`

### Phase 3: Smart Contract & SDK Binding
- **Soroban Hook Wiring**: Wire the dynamic UI components directly to the Freighter React hooks and `@stellar/stellar-sdk` RPC calls (replacing the standalone local storage simulator).
- **Stellar Path Payment Client**: Implement client-side path payments in React, letting users execute `PathPaymentStrictReceive` transactions directly from Freighter to auto-convert EURC/KES into USDC at contribution time.
- **Graceful Fallbacks**: Show clear visual indicators when actions are simulated (localStorage) vs when they are executed on-chain (Stellar Testnet).

### Phase 4: Standalone Codebase Purge & Launch
- **Delete Standalone Prototypes**: Remove all redundant, root-level standalone folders (`/welcome_dashboard`, `/group_savings_room`, `/create_a_circle_wizard`, etc.) and the root `index.html` file to avoid repository clutter.
- **Deploy Registry & Factory**: Deploy the registry and factory smart contracts to Stellar Testnet.
- **Production Validation**: Launch the unified Next.js Web3 application on Vercel and verify Freighter wallet signoffs end-to-end.
