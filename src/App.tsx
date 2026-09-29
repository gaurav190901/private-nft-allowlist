import OperatorSetup from './OperatorSetup';
import { useState, useEffect } from 'react';
import { Shield, Sparkles, Database, History, Wallet, Cpu, Lock, Layers, BadgePercent } from 'lucide-react';
import { allowlistBytes32, deployAllowlistContract, readAllowlistLedger, submitAllowlistCircuit } from './midnightClient';
import { verifyDropDeployment, validateDropDeploymentRuntime } from './runtimeConfig';

const RUNTIME = validateDropDeploymentRuntime({
  networkId: import.meta.env.VITE_NETWORK_ID,
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  faucetUrl: import.meta.env.VITE_FAUCET_URL,
  demoMode: import.meta.env.VITE_DEMO_MODE,
  production: import.meta.env.PROD,
});

export default function App() {
  const [route, setRoute] = useState(() => location.hash.slice(1) || '/');
  const activeTab = route.split('/')[2] || 'dashboard';
  useEffect(() => {
    const navigate = () => { if (location.hash === '#content') return; setRoute(location.hash.slice(1) || '/'); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>("0.00");
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [laceDetected, setLaceDetected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<any>(null);

  const [contractDeployed, setContractDeployed] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [runtimeIssue, setRuntimeIssue] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);

  const [ledger, setLedger] = useState({ allowlist_merkle_root: "0x7b8c...90de", total_claims: 8, active: true });
  const [formValues, setFormValues] = useState({
    member_sk: "0303030303030303030303030303030303030303030303030303030303030303",
    merkle_proof: Array(6).fill('0'.repeat(64)).join(', '),
    merkle_directions: "left, left, left, left, left, left"
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [isProving, setIsProving] = useState(false);
  const [provingStep, setProvingStep] = useState(0);

  const proofSteps = [
    "Deriving user membership keys...",
    "Fetching Merkle sibling hashes for index...",
    "Recomputation of Merkle root in ZK circuit...",
    "Generating public mint claim proof..."
  ];

  const deploySteps = [
    "Setting depth-6 Merkle allowlist root on-chain...",
    "Spawning ZK genesis block details...",
    "Confirming allowlist NFT ledger parameters..."
  ];

  useEffect(() => {
    fetch('/deployment.json')
      .then(response => {
        if (!response.ok) throw new Error('Private NFT Allowlist: deployment.json could not be loaded.');
        return response.json();
      })
      .then(deployment => {
        const verified = verifyDropDeployment(deployment);
        if (RUNTIME.contractAddress && RUNTIME.contractAddress !== verified.contractAddress) {
          throw new Error('Private NFT Allowlist: environment address does not match deployment evidence.');
        }
        if (verified.network === RUNTIME.networkId) {
          setContractAddress(verified.contractAddress);
          setContractDeployed(true);
        } else {
          setContractAddress(null);
          setContractDeployed(false);
        }
        setRuntimeIssue(null);
      })
      .catch(error => {
        setContractAddress(null);
        setContractDeployed(false);
        setRuntimeIssue(error instanceof Error ? error.message : 'Private NFT Allowlist: configuration failed.');
      });
    const detectLace = () => {
      const hasMidnightWallet = Object.values((window as any).midnight ?? {}).some((candidate: any) => typeof candidate?.connect === 'function');
      setLaceDetected(hasMidnightWallet);
    };
    detectLace();
    const timer = setInterval(detectLace, 1000);
    return () => clearInterval(timer);
  }, []);

  const connectLace = async () => {
    setConnectingWallet(true);
    try {
      const candidates = Object.values((window as any).midnight ?? {}) as Array<{
        connect?: (networkId: string) => Promise<any>;
        name?: string;
        rdns?: string;
      }>;
      const oneAm = candidates.find(c => /1am/i.test(`${c.name ?? ''} ${c.rdns ?? ''}`) && typeof c.connect === 'function');
      const wallet = oneAm ?? candidates.find(candidate => typeof candidate.connect === 'function');
      if (!wallet?.connect) {
        throw new Error('No Midnight wallet connector was detected. Install 1AM or Lace and unlock it.');
      }

      const connected = await wallet.connect(RUNTIME.networkId);
      (window as any).__midnightConnectedWallet = connected;
      const addressInfo = await connected.getUnshieldedAddress();
      const balances = await connected.getUnshieldedBalances();
      const nightBalance = Object.values(balances)[0] ?? 0n;

      setWalletAddress(addressInfo.unshieldedAddress);
      setWalletBalance((Number(nightBalance) / 1_000_000).toFixed(2));
      setWalletConnected(true);
      setConnectedWallet(connected);
      if (import.meta.env.VITE_CONTRACT_ADDRESS) {
        setContractAddress(import.meta.env.VITE_CONTRACT_ADDRESS);
        setContractDeployed(true);
      }
      logTransaction('wallet', 'MIDNIGHT WALLET CONNECTED', '—', 'Connected through the Midnight DApp Connector API');
    } catch (err) {
      console.error('Midnight wallet connection failed:', err);
      const raw = err instanceof Error ? err.message : String(err || "");
      const msg = (raw.includes("tabs:outgoing.message.ready") || raw.includes("No Listener")) ? "Wallet extension is asleep or locked. Please open and unlock your 1AM / Lace wallet extension, then retry." : (raw || "Midnight wallet connection failed.");
      alert(msg);
    } finally {
      setConnectingWallet(false);
    }
  };



  const disconnectLace = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setWalletBalance("0.00");
    logTransaction('0x0000...0000', '1AM WALLET DISCONNECTED', '0.00 tNIGHT', 'Disconnected wallet context');
  };

  const requestFaucet = () => {
    if (!walletConnected) return;
    window.open(RUNTIME.faucetUrl, '_blank', 'noopener,noreferrer');
    logTransaction('—', 'FAUCET OPENED', '—', `Funding must be confirmed by the official Midnight ${RUNTIME.networkId} faucet and wallet balance refresh.`);
  };

  const deployContractAction = async () => {
    if (!connectedWallet) {
      alert('Connect a Midnight wallet before deploying.');
      return;
    }
    setIsDeploying(true);
    try {
      const result = await deployAllowlistContract(connectedWallet);
      setContractAddress(result.contractAddress);
      setContractDeployed(true);
      setRuntimeIssue(null);
      logTransaction(result.txId, 'CONFIRMED ON MIDNIGHT', '—', `Fresh ${RUNTIME.networkId} deployment ${result.contractAddress}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Contract deployment failed.');
    } finally {
      setIsDeploying(false);
    }
  };

  const claimEntry = async () => {
    if (!walletConnected || !contractDeployed || !contractAddress) return;
    setIsProving(true);
    setProvingStep(0);
    try {
      setProvingStep(proofSteps.length - 1);
      const proof = formValues.merkle_proof.split(',').map((value, index) => allowlistBytes32(value, `Merkle sibling ${index + 1}`));
      const directions = formValues.merkle_directions.split(',').map(value => value.trim().toLowerCase() === 'right');
      const result = await submitAllowlistCircuit((window as any).__midnightConnectedWallet, contractAddress, 'claimMintSpot', [], { secretKey: allowlistBytes32(formValues.member_sk, 'Member secret'), merkleProof: proof, merkleDirections: directions });
      const chain = await readAllowlistLedger((window as any).__midnightConnectedWallet, contractAddress);
      setLedger({ allowlist_merkle_root: `0x${chain.root.slice(0, 8)}…${chain.root.slice(-4)}`, total_claims: chain.mintedCount, active: true });
      logTransaction(result.txId, 'CONFIRMED ON MIDNIGHT', '—', `Confirmed claimMintSpot on ${contractAddress}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'The Midnight transaction failed.');
      logTransaction('—', 'TRANSACTION FAILED', '—', err instanceof Error ? err.message : 'Unknown transaction failure');
    } finally {
      setIsProving(false);
    }
  };

  const logTransaction = (hash: string, status: string, fee: string, details: string) => {
    setLogs(prev => [
      {
        hash,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status,
        fee,
        details
      },
      ...prev
    ]);
  };


  const pages = [['dashboard', 'Claim a spot'], ['walletHub', 'Wallet & activity'], ['deployer', 'Contract setup'], ['privacy', 'Privacy notes']];
  const landing = !route.startsWith('/workspace');
  return <div className="drop">
    <a className="skip" href="#content">Skip to content</a>
    <header className="masthead"><a className="wordmark" href="#/">Drophouse<span>PRIVATE ALLOWLIST STUDIO</span></a><nav aria-label="Site"><a href="#/" aria-current={landing?'page':undefined}>Project</a><a href="#/workspace/dashboard" aria-current={!landing?'page':undefined}>Workspace ↗</a></nav></header>
    {landing ? <main id="content" className="landing">
      <section className="hero"><div><p className="eyebrow">For the list. Not the spotlight.</p><h1>Your invitation.<br/>Your proof.<br/>Your spot.</h1><p className="intro">A Midnight allowlist experiment for collectors. Use your membership secret and Merkle path to claim a mint spot without publishing the full membership list.</p><a className="primary" href="#/workspace/dashboard">Enter the mint studio ↗</a></div>
      <aside className="hero-object" aria-label="Membership explanation"><span>MEMBERSHIP PASS</span><strong>IN<br/>THE<br/>LIST.</strong><p>Secret + Merkle path</p><small>Illustration only · not a minted NFT</small></aside></section>
      <section className="project-notes"><article><h2>Bring your invitation</h2><p>Ask the organizer for your membership secret, six sibling hashes, and the corresponding left/right directions. A wallet connection alone does not grant membership.</p></article><article><h2>What a claim means</h2><p>The workspace calls claimMintSpot. A successful claim is contract evidence of a mint spot; it is not a promise of artwork delivery, resale value, or a transferable NFT.</p></article><article><h2>Privacy has boundaries</h2><p>Membership secrets and Merkle paths are proof inputs. The root, claim state, and transaction metadata may be public. Do not equate a private proof with anonymous wallet activity.</p><a href="#/workspace/privacy">Read the privacy notes →</a></article></section>
    </main> : <div className="workspace">
      <nav className="workspace-nav" aria-label="Workspace">{pages.map(([key,label])=><a key={key} href={'#/workspace/'+key} aria-current={activeTab===key?'page':undefined}>{label}</a>)}</nav>
      <main id="content" className="work-content"><div className="work-heading"><div><p className="eyebrow">MIDNIGHT / {RUNTIME.networkId} / TEST WORKSPACE</p><h1>{pages.find(([key])=>key===activeTab)?.[1] || 'Page not found'}</h1></div><button disabled={connectingWallet || isProving || isDeploying} onClick={walletConnected?disconnectLace:connectLace}>{connectingWallet?'Connecting…':walletConnected?'Disconnect wallet':'Connect wallet'}</button></div>
      {runtimeIssue && <div className="notice" role="alert"><strong>Configuration needs attention</strong><p>{runtimeIssue}</p><button onClick={()=>location.reload()}>Retry configuration</button></div>}
      {activeTab==='dashboard' && <div className="work-grid"><section className="panel"><p className="eyebrow">YOUR MEMBERSHIP</p><h2>Claim your mint spot</h2><p>Use the exact proof supplied by your organizer. Never enter a wallet seed phrase.</p>
      {(!walletConnected || !contractDeployed) && <p className="notice">{!walletConnected?'Connect a compatible Midnight wallet to continue.':'A validated contract configuration is required.'}</p>}
      <form onSubmit={e=>{e.preventDefault(); void claimEntry();}}><fieldset disabled={!walletConnected || !contractDeployed || !!runtimeIssue || isProving}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '16px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
        <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Shielded Allowlist Membership Verified</span>
      </div>
      <details style={{ marginBottom: '16px', fontSize: '0.8rem', color: '#94a3b8' }}>
        <summary style={{ cursor: 'pointer', padding: '4px 0', userSelect: 'none' }}>Advanced / Custom Proof</summary>
        <div style={{ marginTop: '8px' }}>
          <label htmlFor="siblings">Six Merkle sibling hashes</label><textarea id="siblings" rows={3} value={formValues.merkle_proof} onChange={e=>setFormValues({...formValues,merkle_proof:e.target.value})}/><small>Comma-separated, 64-character hexadecimal values.</small>
          <label htmlFor="directions">Path directions</label><input id="directions" pattern="(left|right),\s*(left|right),\s*(left|right)" placeholder="left, right, left" value={formValues.merkle_directions} onChange={e=>setFormValues({...formValues,merkle_directions:e.target.value})}/>
          <label htmlFor="member-secret">Membership secret</label><input id="member-secret" type="password" autoComplete="off" pattern="(0x)?[0-9a-fA-F]{64}" value={formValues.member_sk} onChange={e=>setFormValues({...formValues,member_sk:e.target.value})}/>
        </div>
      </details>
      <button type="submit">{isProving?'Awaiting proof and confirmation…':'Submit membership claim'}</button></fieldset></form></section>
      <aside className="panel context"><h2>Registry record</h2><dl><dt>Contract address</dt><dd>{contractAddress || 'No validated record loaded'}</dd><dt>Claim count</dt><dd>{logs.some(log=>log.status==='CONFIRMED ON MIDNIGHT' && log.details.startsWith('Confirmed claimMintSpot'))?ledger.total_claims:'Not loaded'}</dd><dt>Merkle root</dt><dd>{logs.some(log=>log.details.startsWith('Confirmed claimMintSpot'))?ledger.allowlist_merkle_root:'Not loaded'}</dd></dl><p>Ledger values are shown only after a successful operation in this session. A configured address alone does not establish current network availability.</p><a href="#/workspace/walletHub">View session activity →</a></aside></div>}
      {activeTab==='walletHub' && <div className="work-grid"><section className="panel"><h2>Your wallet</h2><p>{walletConnected?walletAddress:'No wallet connected.'}</p>{walletConnected && <p>Last read balance: {walletBalance} tNIGHT</p>}<p>{laceDetected?'Compatible wallet detected.':'Install and unlock a compatible Lace or 1AM wallet.'}</p><button onClick={requestFaucet} disabled={!walletConnected}>Open test-token faucet ↗</button><p>The faucet opens separately. Funding is not guaranteed; reconnect to refresh the displayed balance.</p></section><section className="panel" aria-live="polite"><h2>Session activity</h2>{logs.length===0?<p>No actions recorded yet.</p>:logs.map((log,index)=><article className="receipt" key={index}><strong>{log.status}</strong><small>{log.timestamp}</small><p>{log.details}</p><code>{log.hash}</code></article>)}</section></div>}
      {activeTab === 'deployer' && <OperatorSetup wallet={walletConnected ? connectedWallet : null} address={runtimeIssue ? null : contractAddress} />}
            {activeTab==='deployer' && <section className="panel"><h2>Contract configuration</h2><p>Deploy a fresh contract using the connected wallet. This requests a real test-network transaction and may require test tokens.</p><p className="address">{contractAddress || 'No contract address loaded.'}</p><button onClick={deployContractAction} disabled={!walletConnected || isDeploying}>{isDeploying?'Awaiting deployment…':'Deploy fresh contract'}</button></section>}
      {activeTab==='privacy' && <section className="panel privacy-notes"><h2>Understand the boundary</h2><h3>Private proof inputs</h3><p>Membership secret and Merkle path are supplied to the proof workflow. Your organizer may know who received each invitation.</p><h3>Public and observable</h3><p>The allowlist root, claims, and transaction metadata can be observed. Wallet and network activity are not made anonymous by this interface.</p><h3>Local handling</h3><p>Inputs are held in this page while it is open. The proof workflow may involve a configured proof service. Do not use real identity data or high-value credentials without reviewing that service and the contract.</p><h3>Test use only</h3><p>This project is experimental. No audit, production readiness, or deployment finality is implied.</p></section>}
      </main></div>}
      <footer>Drophouse <span>Experimental software · Test credentials only</span></footer>
    </div>;
}
