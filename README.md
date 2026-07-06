# Mesa Protocol

Mesa Protocol is a Web3 ROSCA/Chama application on Stellar. The app is now organized as a Soroban smart-contract workspace plus a Next.js frontend instead of static HTML pages served on port 8000.

## Project structure

- `mesa-protocol/contracts/mesa-core` — Rust/Soroban smart contract for circle initialization, joining, contributions, payout rotation, vouching, penalties, emergency mode, and read APIs.
- `mesa-protocol/frontend` — Next.js application that preserves the Mesa visual direction from the original static mockups while wiring screens to Stellar wallet and contract hooks.
- `*_*/code.html` and `*_*/screen.png` — original static UI references retained for design comparison.

## Run the Next.js app

```bash
cd mesa-protocol/frontend
yarn install --frozen-lockfile
yarn dev
```

Open `http://localhost:3000`.

## Validate the app and contracts

```bash
cd mesa-protocol/frontend && yarn type-check
cd mesa-protocol/frontend && yarn build
cd mesa-protocol && cargo test
```
