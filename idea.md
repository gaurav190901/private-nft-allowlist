# Project Idea: Private Allowlist Access (Shielded NFT Minting)

A system that allows users on an allowlist to mint an NFT or access a privileged service without revealing which whitelist address is executing the transaction.

## 1. Midnight Network Specialty (ZK & Privacy Features)
*   **Decoupled Membership:** Proves a user's address belongs to a public set of addresses without exposing which specific address is initiating the trade.
*   **Mempool Privacy:** The transaction signature and transaction sender details are masked on-chain. An observer only sees the public smart contract action and a ZK proof.
*   **One-Time Access (Nullifier):** Emits a deterministic nullifier derived from the user's private key to ensure they only claim their whitelist spot once.

## 2. Technical Architecture (Compact Contract)
*   **Public State:**
    *   `allowlist_root`: Merkle root hash of all eligible whitelisted addresses.
    *   `nullifiers`: A registry of used allowlist slots.
    *   `minted_nfts`: List of successfully minted token IDs.
*   **Private State:**
    *   `whitelist_private_key`: Private key matching a whitelisted public key.
    *   `merkle_proof`: Merkle membership path to `allowlist_root`.
*   **Circuits (ZK Proofs):**
    *   `claim_allowlist_spot(merkle_proof, whitelist_private_key, campaign_id)`:
        1. Checks that the public key derived from `whitelist_private_key` lies within the `allowlist_root` via the `merkle_proof`.
        2. Computes `nullifier = hash(whitelist_private_key, campaign_id)`.
        3. Confirms that `nullifier` is not in the public `nullifiers` list.
        *Output:* Adds the `nullifier` to the public state and authorizes the contract to release the NFT.

## 3. Frontend & Integration (Level 3 Focus)
*   **User Interface:** A minting portal. Users connect their wallets, verify their status privately, and click "Mint Shielded NFT". The frontend coordinates with the local ZK runner and submits the proof.
*   **Lace/Midnight Wallet Integration:**
    *   Retrieves the wallet key for Merkle verification.
    *   Signs and executes transactions anonymously.

## 4. Verification & Testing Plan
*   **Unit Tests:**
    *   Verify that a whitelisted user can mint an NFT and their nullifier is added to the ledger.
    *   Verify that a non-whitelisted address fails the Merkle proof verification.
    *   Assert that double-minting attempts fail due to nullifier reuse.

---

## 5. How to Build & Deploy on Midnight
To build this project without errors, refer to the master build guide located at the root of the workspace: [BUILD_GUIDE.md](file:///Users/neelsubhashpote/moonlight/BUILD_GUIDE.md). It details how to:
1. Fix language pragma version mismatches.
2. Resolve SDK `4.x` dependency issues.
3. Start the Docker-based local ZK proof server.
4. Deploy the contract using a custom `deploy.mjs` script.
5. Prevent DUST gas errors.
