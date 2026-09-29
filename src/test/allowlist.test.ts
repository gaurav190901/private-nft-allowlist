import { AllowlistSimulator } from "./allowlist-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";

setNetworkId("undeployed");

describe("Private Allowlist Access Smart Contract Tests", () => {
  const adminSecret = randomBytes(32);
  const dummyRoot = randomBytes(32);

  // Setup helper to create a simulator
  const setupSimulator = (userSecret: Uint8Array, proof: Uint8Array[], directions: boolean[], root: Uint8Array) => {
    const tempSim = new AllowlistSimulator(adminSecret, [], [], dummyRoot, new Uint8Array(32));
    const adminPk = tempSim.publicKey(adminSecret);
    return new AllowlistSimulator(userSecret, proof, directions, root, adminPk);
  };

  // Helper to build Merkle root and proof dynamically using the simulator's hash circuit
  const buildMerkleTree = (leaves: Uint8Array[], targetIndex: number, simulator: AllowlistSimulator) => {
    if (leaves.length !== 64) throw new Error('Expected 64 leaves');
    let level = [...leaves], index = targetIndex;
    const proof: Uint8Array[] = [], directions: boolean[] = [];
    while (level.length > 1) {
      proof.push(level[index ^ 1]); directions.push(index % 2 === 0);
      const parents: Uint8Array[] = [];
      for (let i = 0; i < level.length; i += 2) parents.push(simulator.hashNodes(level[i], level[i + 1]));
      level = parents; index = Math.floor(index / 2);
    }
    return { root: level[0], proof, directions };
  };

  it("1. Properly initializes contract parameters and allowlist root", () => {
    const userSecret = randomBytes(32);
    const simulator = setupSimulator(userSecret, [], [], dummyRoot);
    const ledgerState = simulator.getLedger();

    expect(ledgerState.allowlist_root).toEqual(dummyRoot);
    expect(ledgerState.minted_count).toEqual(0n);
  });

  it("2. Lets admin update the allowlist root", () => {
    const userSecret = randomBytes(32);
    const simulator = setupSimulator(userSecret, [], [], dummyRoot);
    const newRoot = randomBytes(32);

    simulator.switchUser(adminSecret, [], []);
    const ledgerState = simulator.updateRoot(newRoot);
    expect(ledgerState.allowlist_root).toEqual(newRoot);
  });

  it("3. Allows a whitelisted voter to claim a mint spot with correct Merkle path", () => {
    const userSecret = randomBytes(32);
    const tempSim = setupSimulator(userSecret, [], [], dummyRoot);

    // We generate 64 leaf public keys. Let's make user public key the third leaf (index 2).
    const userPk = tempSim.publicKey(userSecret);
    const mockLeaves = Array.from({ length: 64 }, () => randomBytes(32));
    mockLeaves[2] = userPk;

    // Build Merkle proof
    const { root, proof, directions } = buildMerkleTree(mockLeaves, 2, tempSim);

    // Initialize simulator with active root
    const simulator = setupSimulator(userSecret, proof, directions, root);
    
    const ledgerState = simulator.claimMintSpot();
    expect(ledgerState.minted_count).toEqual(1n);
  });

  it("4. Rejects claiming a mint spot with an incorrect Merkle path", () => {
    const userSecret = randomBytes(32);
    const tempSim = setupSimulator(userSecret, [], [], dummyRoot);

    const userPk = tempSim.publicKey(userSecret);
    const mockLeaves = Array.from({ length: 64 }, () => randomBytes(32));
    mockLeaves[2] = userPk;

    const { root, proof, directions } = buildMerkleTree(mockLeaves, 2, tempSim);

    // Corrupt proof path
    const badProof = [...proof];
    badProof[0] = randomBytes(32);

    const simulator = setupSimulator(userSecret, badProof, directions, root);
    expect(() => simulator.claimMintSpot()).toThrow("failed assert: Voter is not in the whitelisted root");
  });

  it("5. Rejects double-claiming from the same whitelisted user (nullifier check)", () => {
    const userSecret = randomBytes(32);
    const tempSim = setupSimulator(userSecret, [], [], dummyRoot);

    const userPk = tempSim.publicKey(userSecret);
    const mockLeaves = Array.from({ length: 64 }, () => randomBytes(32));
    mockLeaves[2] = userPk;

    const { root, proof, directions } = buildMerkleTree(mockLeaves, 2, tempSim);

    const simulator = setupSimulator(userSecret, proof, directions, root);
    simulator.claimMintSpot();

    // Try to claim again
    expect(() => simulator.claimMintSpot()).toThrow("failed assert: Voter has already claimed their spot");
  });
  it('accepts all 64 unique members without rotating the root', () => {
    const secrets = Array.from({ length: 64 }, () => randomBytes(32));
    const helper = setupSimulator(secrets[0], [], [], dummyRoot);
    const leaves = secrets.map(secret => helper.publicKey(secret));
    const first = buildMerkleTree(leaves, 0, helper);
    const simulator = setupSimulator(secrets[0], first.proof, first.directions, first.root);
    for (let index = 0; index < 64; index++) {
      const membership = buildMerkleTree(leaves, index, helper);
      simulator.switchUser(secrets[index], membership.proof, membership.directions);
      expect(simulator.claimMintSpot().minted_count).toBe(BigInt(index + 1));
    }
    expect(() => simulator.claimMintSpot()).toThrow();
  });
});
