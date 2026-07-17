# Live Demo Walkthrough Guide (Step-by-Step)

Welcome to Mesa Protocol. This guide is written specifically for judges, community reviewers, and partners who want to run the live code and execute real transactions on the Stellar Testnet.

---

## Step 1: Install Freighter Wallet
Freighter is the official non-custodial browser wallet extension for Stellar.
1. Download and install the Freighter extension for Chrome, Brave, or Firefox at [freighter.app](https://www.freighter.app/).
2. Open the extension, set a secure password, and write down your 12-word recovery phrase.
3. You should see a wallet screen with an address starting with the letter `G` (e.g. `GCRGX...`).

---

## Step 2: Switch to Testnet
By default, Freighter is connected to the Mainnet. We need to point it to the Testnet sandbox:
1. Click the **Gear Icon (Settings)** in the bottom right of the Freighter popup.
2. Select **Preferences** -> **Network**.
3. Toggle the selection to **Testnet** (or make sure the RPC is pointing to `https://soroban-testnet.stellar.org`).
4. You should see a yellow or grey "Testnet" indicator at the top of your wallet extension screen.

---

## Step 3: Fund Your Testnet Wallet
Before you can deploy smart contracts or contribute to savings circles, you need testnet tokens:
1. Copy your public key (address) from Freighter.
2. Navigate to the [Stellar Laboratory Friendbot tool](https://laboratory.stellar.org/#account-creator?network=testnet).
3. Paste your public address in the input field and click **Get Testnet XLM**.
4. You should see a success message. Check your Freighter wallet—you should see a balance of **10,000 XLM**.

---

## Step 4: Launch the Mesa Application
1. Start the local server if you haven't already:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:8002/` in your browser.
3. You should see the sleek, dark-themed Mesa Protocol Dashboard displaying:
   - Live Total Value Locked (TVL) dynamically calculated from the registry.
   - Deployed active chamas grid (e.g. "Tanda 1" and "Tanda 2") loaded straight from the Testnet factory contract.

---

## Step 5: Connect Your Wallet
1. Click the **Connect Wallet** button in the top right corner of the dashboard.
2. Freighter will show a popup asking for permission to share your public address with the application.
3. Click **Approve**.
4. You should see your formatted wallet address (e.g. `GCRG...4LVO`) appear in the button area, indicating a successful handshake.

---

## Step 6: Create a New Savings Circle
Let's deploy a brand new smart contract:
1. Click the **Create Circle** button on the dashboard.
2. Fill out the creation form:
   - **Circle Name:** E.g. "Nairobi Builders Group"
   - **Contribution Amount:** E.g. `10`
   - **Max Members:** E.g. `4`
   - **Round Duration:** E.g. `3600` (1 hour)
   - **Asset Token ID:** Keep the default Wrap XLM token address (`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`).
3. Click **Deploy Chama**.
4. Freighter will trigger a transaction signing request. Under the hood, this compiles transaction parameters and sends them to the on-chain registry.
5. Click **Approve** in Freighter.
6. You should see a confirmation notification, and the dashboard will automatically redirect you into the new savings room for your circle.

---

## Step 7: Join the Circle and Contribute
1. Inside the savings room, you will see a dynamic circular rotation wheel showing the registered members.
2. Click **Join Circle**. This triggers a transaction depositing the required entry fee ($2 \times \text{contribution}$).
3. Approve the Freighter transaction. You should see your avatar appear on the circular rotation wheel.
4. When the circle is full (reaches Max Members), click **Activate Circle** to lock the membership list and calculate the rotation order.
5. For each round, click **Contribute** to send your round payment. Once all members have contributed, any member can click **Distribute** to payout the pooled funds to the round's designated winner.

---

## Step 8: Verify On-Chain
Every action you take is fully public and verifiable:
1. Go to [Stellar.expert Testnet Explorer](https://stellar.expert/explorer/testnet/).
2. Search for the MesaFactory ID: `CBFXB5LZB2FJDVK66H7NPZEK2OE6VXNGYORSGE2W4V55UTG5NG63JGDG`.
3. You should see a list of recent transactions under "Operations history" corresponding to `create_chama` calls, complete with emitted contract events!
