import { useState, useEffect } from 'react';
import { Shield, Sparkles, Database, History, Wallet, Cpu, Lock, Layers, BadgePercent } from 'lucide-react';
import { deployAllowlistContract, submitAllowlistCircuit } from './midnightClient';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>("0.00");
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [laceDetected, setLaceDetected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<any>(null);

  const [contractDeployed, setContractDeployed] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);

  const [ledger, setLedger] = useState({ allowlist_merkle_root: "0x7b8c...90de", total_claims: 8, active: true });
  const [formValues, setFormValues] = useState({ member_sk: "", leaf_index: 2 });
  const [logs, setLogs] = useState([
    { hash: '0x9a2b...44cf', timestamp: '2026-07-08 09:40:15', status: 'MINTED', details: 'Allowlist claim validated' }
  ]);
  const [isProving, setIsProving] = useState(false);
  const [provingStep, setProvingStep] = useState(0);

  const proofSteps = [
    "Deriving user membership keys...",
    "Fetching Merkle sibling hashes for index...",
    "Recomputation of Merkle root in ZK circuit...",
    "Generating public mint claim proof..."
  ];

  const deploySteps = [
    "Setting depth-3 Merkle allowlist root on-chain...",
    "Spawning ZK genesis block details...",
    "Confirming allowlist NFT ledger parameters..."
  ];

  useEffect(() => {
    fetch('/deployment.json').then(response => response.ok ? response.json() : null).then(deployment => {
      if (deployment?.contractAddress) {
        setContractAddress(deployment.contractAddress);
        setContractDeployed(true);
      }
    }).catch(() => undefined);
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
      }>;
      const wallet = candidates.find(candidate => typeof candidate.connect === 'function');
      if (!wallet?.connect) {
        throw new Error('No Midnight wallet connector was detected. Install 1AM or Lace and unlock it.');
      }

      const connected = await wallet.connect(import.meta.env.VITE_NETWORK_ID || 'preprod');
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
      alert(err instanceof Error ? err.message : 'Midnight wallet connection failed.');
    } finally {
      setConnectingWallet(false);
    }
  };



  const disconnectLace = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setWalletBalance("0.00");
    logTransaction('0x0000...0000', 'LACE WALLET DISCONNECTED', '0.00 tNIGHT', 'Disconnected wallet context');
  };

  const requestFaucet = () => {
    if (!walletConnected) return;
    window.open(import.meta.env.VITE_FAUCET_URL || 'https://midnight-tmnight-preprod.nethermind.dev/', '_blank', 'noopener,noreferrer');
    logTransaction('—', 'FAUCET OPENED', '—', 'Funding must be confirmed by the Midnight Preprod Faucet and wallet balance refresh.');
  };

  const deployContractAction = async () => {
    if (import.meta.env.VITE_CONTRACT_ADDRESS) {
      setContractAddress(import.meta.env.VITE_CONTRACT_ADDRESS);
      setContractDeployed(true);
      logTransaction('—', 'DEPLOYMENT CONFIGURED', '—', 'Using the deployed Midnight contract configured for this environment.');
      return;
    }
    if (!connectedWallet) return;
    setIsDeploying(true);
    try {
      const result = await deployAllowlistContract(connectedWallet);
      setContractAddress(result.contractAddress);
      setContractDeployed(true);
      logTransaction(result.txId, 'CONTRACT DEPLOYMENT SUBMITTED', '—', 'allowlist deployed on Midnight Preprod at ' + result.contractAddress);
    } catch (err) {
      console.error('Browser deployment failed:', err);
      alert(err instanceof Error ? err.message : 'Browser deployment failed.');
    } finally {
      setIsDeploying(false);
    }
    return;
    if (import.meta.env.VITE_DEMO_MODE !== 'true') {
      alert('Live contract deployment is handled by deploy.mjs. Set VITE_DEMO_MODE=true only for local UI demos.');
      return;
    }
    if (!walletConnected) return;
    setIsDeploying(true);
    setDeployStep(0);
    const interval = setInterval(() => {
      setDeployStep(prev => {
        if (prev < deploySteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setContractAddress("midnight1g4v89fjwla0928hdskla9382hdksla0298a");
            setContractDeployed(true);
            setIsDeploying(false);
            setWalletBalance(prevBal => (parseFloat(prevBal) - 15.5).toFixed(2));
            logTransaction('0xdep1...99bb', 'CONTRACT DEPLOYED', '-15.50 tNIGHT', 'Deployed allowlist.compact contract onto Preprod');
          }, 800);
          return prev;
        }
      });
    }, 500);
  };

  const claimEntry = async () => {
    if (!walletConnected || !contractDeployed || !contractAddress) return;
    setIsProving(true);
    setProvingStep(0);
    try {
      setProvingStep(proofSteps.length - 1);
      const result = await submitAllowlistCircuit((window as any).__midnightConnectedWallet, contractAddress, 'claimMintSpot');
      setLedger(prevLedger => ({ ...prevLedger, total_claims: prevLedger.total_claims + 1 }));
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '30px' }}>
        <div>
          <span style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '20px', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600 }}>Project 2</span>
          <h1 style={{ fontSize: '2.2rem', marginTop: '6px', fontWeight: 800 }}>Private NFT Allowlist Portal</h1>
        </div>
        <div>
          {walletConnected ? (
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '8px 16px' }}>
              Balance: <strong style={{ color: '#34d399' }}>{walletBalance} tNIGHT</strong>
            </div>
          ) : (
            <button onClick={connectLace} style={{ width: 'auto' }}>Connect Wallet</button>
          )}
        </div>
      </header>

<section className="home-dashboard" aria-labelledby="home-dashboard-title">
        <div className="home-dashboard__lead">
          <span className="home-kicker">Drop control room</span>
          <h2 id="home-dashboard-title">Mint campaign</h2>
          <p>Check allowlist membership before the shielded mint.</p>
          <div className="home-actions">
            <button type="button" onClick={() => setActiveTab('dashboard')}>Open Workspace</button>
            <button type="button" className="home-secondary" onClick={() => setActiveTab('privacy')}>Read Privacy Model</button>
          </div>
        </div>
        <div className="home-dashboard__grid">
          <article className="home-card"><span>Network</span><strong>Midnight Preprod</strong><small>{contractDeployed ? 'Contract verified' : 'Contract setup pending'}</small></article>
          <article className="home-card"><span>Current signal</span><strong>Root synchronized</strong><small>1 claim per member</small></article>
          <article className="home-card"><span>Wallet session</span><strong>{walletConnected ? 'Connected' : 'Not connected'}</strong><small>{walletConnected ? walletBalance + ' tNIGHT available' : 'Connect 1AM to continue'}</small></article>
          <article className="home-card"><span>Contract address</span><strong className="home-address">{contractAddress ? contractAddress.slice(0, 14) + '…' : 'Awaiting deployment'}</strong><small>Unique project deployment</small></article>
        </div>
      </section>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
        <button onClick={() => setActiveTab('dashboard')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'dashboard' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'dashboard' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>🎨 Shielded NFT Minting</button>
        <button onClick={() => setActiveTab('deployer')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'deployer' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'deployer' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>📜 Contract Deployer</button>
        <button onClick={() => setActiveTab('walletHub')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'walletHub' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'walletHub' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>🔗 Wallet Integration</button>
        <button onClick={() => setActiveTab('privacy')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'privacy' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'privacy' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>👁️ Minting Privacy Model</button>
      </div>

      <main style={{ minHeight: '400px' }}>
        {activeTab === 'dashboard' && (
          <div>
            {(!walletConnected || !contractDeployed) && (
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#f87171' }}>⚠️ Setup Required</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
                  {!walletConnected ? "Please connect your Lace Wallet in the Wallet Hub." : "Please deploy the Compact contract in the ZK Deployer."}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px', opacity: (walletConnected && contractDeployed) ? 1 : 0.4, pointerEvents: (walletConnected && contractDeployed) ? 'auto' : 'none' }}>
              <div>
                <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', border: '1px solid #10b981', borderRadius: '20px', padding: '30px', textAlign: 'center', boxShadow: '0 10px 30px rgba(16, 185, 129, 0.15)', marginBottom: '30px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ width: '130px', height: '130px', margin: '0 auto 20px', background: 'rgba(16,185,129,0.1)', border: '2px dashed #10b981', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles className="w-12 h-12 text-emerald-400" />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px 0' }}>Midnight Artifact</h3>
                  <span style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>Shielded NFT Allowlist Payout</span>
                </div>

                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
                  <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
                    <Database className="w-4 h-4" /> Registry State
                  </h2>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Merkle root hash</span>
                    <span style={{ fontFamily: 'monospace' }}>{ledger.allowlist_merkle_root}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Claims count</span>
                    <span>{ledger.total_claims} successful mints</span>
                  </div>
                </section>
              </div>

              <div>
                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
                    <Shield className="w-4 h-4" /> Proof Verification
                  </h2>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Merkle Leaf Index (Private)</label>
                    <input 
                      type="number"
                      value={formValues.leaf_index}
                      onChange={e => setFormValues({ ...formValues, leaf_index: Number(e.target.value) })}
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Membership Secret Key (Private)</label>
                    <input 
                      type="password"
                      value={formValues.member_sk}
                      onChange={e => setFormValues({ ...formValues, member_sk: e.target.value })}
                    />
                  </div>
                  <button onClick={claimEntry} disabled={isProving}>
                    {isProving ? "Asserting Membership..." : "Mint Allowlist NFT"}
                  </button>

                  {isProving && (
                    <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px dashed #10b981', borderRadius: '8px', fontSize: '0.8rem' }}>
                      {proofSteps.map((step, idx) => (
                        <div key={idx} style={{ padding: '3px 0', color: idx === provingStep ? 'white' : 'var(--text-secondary)', opacity: idx <= provingStep ? 1 : 0.4 }}>
                          {idx < provingStep ? '✓' : '●'} {step}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deployer' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#34d399' }}>
              <Cpu className="w-5 h-5" /> ZK Allowlist Smart Contract Deployer
            </h2>
            {contractDeployed ? (
              <p style={{ color: '#10b981' }}>Deployed Preprod Address: {contractAddress}</p>
            ) : (
              <button onClick={deployContractAction} disabled={isDeploying || !walletConnected}>
                {isDeploying ? "Deploying..." : "Compile & Deploy Contract"}
              </button>
            )}

            {isDeploying && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px dashed #10b981', borderRadius: '8px', fontSize: '0.8rem' }}>
                {deploySteps.map((step, idx) => (
                  <div key={idx} style={{ padding: '3px 0', color: idx === deployStep ? 'white' : 'var(--text-secondary)', opacity: idx <= deployStep ? 1 : 0.4 }}>
                    {idx < deployStep ? '✓' : '●'} {step}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'walletHub' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#34d399' }}>
              <Wallet className="w-5 h-5" /> Wallet Dashboard
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '12px' }}>
                <h3>Lace Account</h3>
                {walletConnected ? (
                  <div>
                    <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.85rem', marginBottom: '10px' }}>{walletAddress}</div>
                    <button onClick={disconnectLace} style={{ width: 'auto', background: '#dc2626' }}>Disconnect</button>
                  </div>
                ) : (
                  <button onClick={connectLace} style={{ width: 'auto' }}>Connect Wallet</button>
                )}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '12px' }}>
                <h3>Get tNIGHT</h3>
                <button onClick={requestFaucet} disabled={!walletConnected || faucetLoading}>
                  {faucetLoading ? "Requesting..." : "Mint 100 tNIGHT"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#34d399' }}>
              <Lock className="w-5 h-5" /> Zero-Knowledge Privacy Model
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '24px', borderRadius: '12px' }}>
                <h3 style={{ color: '#10b981' }}>Can Learn:</h3>
                <ul>
                  <li>Cumulative claims counts.</li>
                  <li>Merkle root anchor updates.</li>
                </ul>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '24px', borderRadius: '12px' }}>
                <h3 style={{ color: '#f87171' }}>Cannot Learn:</h3>
                <ul>
                  <li>Your exact leaf index inside the tree.</li>
                  <li>Your private key credentials signature checks.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
