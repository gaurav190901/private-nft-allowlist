import { describe, expect, it } from 'vitest';
import { verifyDropDeployment, validateDropDeploymentRuntime } from '../runtimeConfig';

const deployment = {
  contractName: 'allowlist',
  contractAddress: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  network: 'preview',
  transactionHash: '000000000000000000000000000000000000000000000000000000000000000000',
  deployedAt: '2026-08-03T18:00:00.000Z',
};

describe('Private NFT Allowlist production configuration', () => {
  it('accepts matching Preview deployment evidence', () => {
    expect(verifyDropDeployment(deployment).contractName).toBe('allowlist');
  });

  it('rejects evidence copied from another project', () => {
    expect(() => verifyDropDeployment({ ...deployment, contractName: 'foreign_contract' })).toThrow(/different contract/);
  });

  it('rejects malformed contract and transaction identifiers', () => {
    expect(() => verifyDropDeployment({ ...deployment, contractAddress: 'preview1bad' })).toThrow(/32-byte/);
    expect(() => verifyDropDeployment({ ...deployment, transactionHash: 'pending' })).toThrow(/transaction evidence/);
  });

  it('prevents demo mode and network drift in production', () => {
    expect(() => validateDropDeploymentRuntime({ networkId: 'preprod' })).toThrow(/Preview/);
    expect(() => validateDropDeploymentRuntime({ production: true, demoMode: 'true' })).toThrow(/forbidden/);
  });
});

