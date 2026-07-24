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
    // Level 0
    const level0 = [...leaves];
    const sib0 = level0[targetIndex ^ 1];
    const dir0 = (targetIndex % 2 === 0); // true if sibling is on the right

    // Level 1
    const level1: Uint8Array[] = [];
    for (let i = 0; i < 8; i += 2) {
      level1.push(simulator.hashNodes(level0[i], level0[i + 1]));
    }
    const parentIndex0 = Math.floor(targetIndex / 2);
    const sib1 = level1[parentIndex0 ^ 1];
    const dir1 = (parentIndex0 % 2 === 0);

    // Level 2
    const level2: Uint8Array[] = [];
    for (let i = 0; i < 4; i += 2) {
      level2.push(simulator.hashNodes(level1[i], level1[i + 1]));
    }
    const parentIndex1 = Math.floor(parentIndex0 / 2);
    const sib2 = level2[parentIndex1 ^ 1];
    const dir2 = (parentIndex1 % 2 === 0);

    // Root
    const root = simulator.hashNodes(level2[0], level2[1]);

    return {
      root,
      proof: [sib0, sib1, sib2],
      directions: [dir0, dir1, dir2]
    };
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

    // We generate 8 leaf public keys. Let's make user public key the third leaf (index 2).
    const userPk = tempSim.publicKey(userSecret);
    const mockLeaves = Array.from({ length: 8 }, () => randomBytes(32));
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
    const mockLeaves = Array.from({ length: 8 }, () => randomBytes(32));
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
    const mockLeaves = Array.from({ length: 8 }, () => randomBytes(32));
    mockLeaves[2] = userPk;

    const { root, proof, directions } = buildMerkleTree(mockLeaves, 2, tempSim);

    const simulator = setupSimulator(userSecret, proof, directions, root);
    simulator.claimMintSpot();

    // Try to claim again
    expect(() => simulator.claimMintSpot()).toThrow("failed assert: Voter has already claimed their spot");
  });
});
