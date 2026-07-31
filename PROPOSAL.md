# Product Proposal: Private NFT Allowlist Portal

## Problem

NFT drops need membership checks, but publishing the complete collector allowlist leaks customer information.

## Proposed product

Private NFT Allowlist Portal commits a Merkle root and lets an eligible collector prove inclusion for one claim without publishing the leaf or path.

## Privacy model

The root and aggregate mint count are public. Collector leaf data, Merkle witnesses, wallet linkage, and claim nullifier inputs stay private.

## User journey

1. Operator publishes an allowlist root.
2. Collector connects a testnet wallet.
3. Collector submits a private Merkle inclusion proof.
4. Contract accepts one claim and increments the aggregate count.

## Success criteria

- Root rotation is administrator-only.
- Valid paths claim successfully.
- Invalid paths fail.
- Duplicate claims are rejected.

