type RuntimeEnvironment = {
  networkId?: string;
  contractAddress?: string;
  faucetUrl?: string;
  demoMode?: string;
  production?: boolean;
};

export type VerifiedDeployment = {
  contractName: 'allowlist';
  contractAddress: string;
  network: 'preview' | 'preprod';
  transactionHash: string;
  deployedAt: string;
};

const ADDRESS = /^[0-9a-f]{64}$/i;
const TRANSACTION = /^(?:[0-9a-f]{64}|[0-9a-f]{66})$/i;
const FAUCETS = { preview: 'https://faucet.preview.midnight.network/', preprod: 'https://faucet.preprod.midnight.network/' } as const;

export function verifyDropDeployment(value: unknown): VerifiedDeployment {
  if (!value || typeof value !== 'object') {
    throw new Error('Private NFT Allowlist: deployment evidence is missing.');
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.contractName !== 'allowlist') {
    throw new Error('Private NFT Allowlist: deployment belongs to a different contract.');
  }
  if (candidate.network !== 'preview' && candidate.network !== 'preprod') {
    throw new Error('Private NFT Allowlist: deployment network must be Preview or Preprod.');
  }
  if (typeof candidate.contractAddress !== 'string' || !ADDRESS.test(candidate.contractAddress)) {
    throw new Error('Private NFT Allowlist: contract address is not a 32-byte hexadecimal address.');
  }
  if (typeof candidate.transactionHash !== 'string' || !TRANSACTION.test(candidate.transactionHash)) {
    throw new Error('Private NFT Allowlist: finalized deployment transaction evidence is invalid.');
  }
  if (typeof candidate.deployedAt !== 'string' || Number.isNaN(Date.parse(candidate.deployedAt))) {
    throw new Error('Private NFT Allowlist: deployment timestamp is invalid.');
  }

  return candidate as VerifiedDeployment;
}

export function validateDropDeploymentRuntime(env: RuntimeEnvironment) {
  const networkId = env.networkId || 'preprod';
  if (networkId !== 'preview' && networkId !== 'preprod') throw new Error('Private NFT Allowlist: wallet network must be Preview or Preprod.');
  const faucetUrl = env.faucetUrl || FAUCETS[networkId];

  if (faucetUrl !== FAUCETS[networkId]) {
    throw new Error('Private NFT Allowlist: faucet host does not match the selected Midnight network.');
  }
  if (env.contractAddress && !ADDRESS.test(env.contractAddress)) {
    throw new Error('Private NFT Allowlist: VITE_CONTRACT_ADDRESS is malformed.');
  }
  if (env.production && env.demoMode === 'true') {
    throw new Error('Private NFT Allowlist: simulated chain activity is forbidden in production.');
  }

  return { networkId, faucetUrl, contractAddress: env.contractAddress || null };
}
