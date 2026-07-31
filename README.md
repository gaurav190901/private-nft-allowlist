# Private NFT Allowlist Portal

![Frontend CI](https://github.com/gaurav190901/private-nft-allowlist/actions/workflows/frontend-ci.yml/badge.svg?branch=main) ![Contract CI](https://github.com/gaurav190901/private-nft-allowlist/actions/workflows/contract-ci.yml/badge.svg?branch=main)

A shielded claim desk for NFT drops where eligibility can be proven from a Merkle path without publishing the allowlist.

## Drop operator view

The portal is designed around a drop manager’s real sequence:

- publish or rotate the allowlist root;
- check campaign and wallet readiness;
- let an eligible collector claim once;
- monitor aggregate minted count and confirmed transactions.

The dashboard deliberately shows operational status without exposing a collector’s leaf, address, or witness.

## Contract surface

The `allowlist` contract contains:

- `updateRoot(new_root)` for the administrator’s Merkle root.
- `claimMintSpot()` for the private one-time claim.
- `computeRootDepth3(leaf, proof, directions)` for the depth-three Merkle calculation.
- `computeNullifier(sk)` to prevent duplicate claims.

Public state includes the current root, aggregate claim counter, and nullifier activity. Membership evidence stays private.

## Deployment coordinates

```text
Network: Midnight Preprod
Contract: allowlist
Address: d52f2ea7ef3bd9110fb03ca7396a8b10f80b90a55bc84a13f6c9a276cc69a4d7
Deployment transaction: ec8cd898b3031de505a279db4359d189c837863a6953c4ca47be68e3af719da1
Status: Confirmed by the Midnight Preprod indexer
```

## Start the drop room locally

```bash
npm install
npm run compile
npm test
npm run build
npm run dev
```

The deployment helper is intentionally separate from the browser UI:

```bash
npm run deploy
```

Only use synthetic leaves, testnet assets, and a Preprod wallet while evaluating the flow.

## Release discipline

Frontend CI validates the Vite bundle. Contract CI installs Compact, rebuilds generated artifacts, and runs tests. Tagged releases package the UI, contract output, and manifest; dependency audit runs on its own schedule.

## Privacy promise

The root and total claims are observable. The claimant’s allowlist leaf, Merkle path, wallet identity, and private nullifier input are not presented as public application data.

Demo: [watch the NFT allowlist walkthrough](https://drive.google.com/file/d/1UhVA8m-EMgurd3PuEdVF9qSIZNPbI8QB/view?usp=sharing).

## Verification

Privacy is the product feature: the allowlist root and aggregate claim state are public, while collector membership paths and claim nullifiers stay private. Run `npm test`, `npm run compile`, and `npm run build`; the five contract scenarios are documented in [TESTING.md](./TESTING.md), the product scope is in [PROPOSAL.md](./PROPOSAL.md), and both CI workflows run on every push and pull request.
