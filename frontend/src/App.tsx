import { useCallback, useState } from 'react';
import { api } from './api';
import type {
  DkgResponse,
  Phase,
  ProtocolEvent,
  SignResponse,
  VerifyResponse,
} from './types';
import { ELI5Context } from './ELI5Context';
import NodeGraph from './components/NodeGraph';
import NodePanel from './components/NodePanel';
import StepControls from './components/StepControls';
import TransactionPanel from './components/TransactionPanel';
import SignaturePanel from './components/SignaturePanel';
import TxPreviewPanel from './components/TxPreviewPanel';

export default function App() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string>('');
  const [eli5, setEli5] = useState(false);

  // DKG state
  const [dkgData, setDkgData] = useState<DkgResponse | null>(null);
  const [dkgIndex, setDkgIndex] = useState(0);
  const [dkgPlaying, setDkgPlaying] = useState(false);
  const [dkgSpeed, setDkgSpeed] = useState(600);

  // Sign state
  const [signData, setSignData] = useState<SignResponse | null>(null);
  const [signIndex, setSignIndex] = useState(0);
  const [signPlaying, setSignPlaying] = useState(false);
  const [signSpeed, setSignSpeed] = useState(700);

  // Verify state
  const [verifyData, setVerifyData] = useState<VerifyResponse | null>(null);

  // Derived current step
  const activeDkgStep: ProtocolEvent | null =
    phase === 'dkg_animating' && dkgData ? (dkgData.steps[dkgIndex] ?? null) : null;
  const activeSignStep: ProtocolEvent | null =
    phase === 'sign_animating' && signData ? (signData.steps[signIndex] ?? null) : null;
  const activeStep = activeDkgStep ?? activeSignStep;

  const completedParties = new Set<number>();
  if (phase !== 'idle' && phase !== 'dkg_loading') {
    completedParties.add(0); completedParties.add(1); completedParties.add(2);
  }

  const handleDkg = useCallback(async () => {
    setError('');
    setPhase('dkg_loading');
    try {
      const data = await api.dkg();
      setDkgData(data);
      setDkgIndex(0);
      setPhase('dkg_animating');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'DKG failed');
      setPhase('idle');
    }
  }, []);

  // Step 1 of signing: show the TX preview
  const handleSignClick = useCallback(() => {
    setError('');
    setPhase('sign_preview');
  }, []);

  // Step 2: user confirmed — actually call the API
  const handleSignConfirm = useCallback(async () => {
    setPhase('sign_loading');
    try {
      const data = await api.sign();
      setSignData(data);
      setSignIndex(0);
      setPhase('sign_animating');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign failed');
      setPhase('sign_preview');
    }
  }, []);

  const handleVerify = useCallback(async () => {
    setError('');
    try {
      const data = await api.verify();
      setVerifyData(data);
      setPhase('verified');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verify failed');
    }
  }, []);

  const finishDkg = useCallback(() => { setPhase('dkg_complete'); setDkgPlaying(false); }, []);
  const finishSign = useCallback(() => { setPhase('sign_complete'); setSignPlaying(false); }, []);
  const toggleDkgPlay = useCallback(() => setDkgPlaying((p) => !p), []);
  const toggleSignPlay = useCallback(() => setSignPlaying((p) => !p), []);

  const isDkgAnimating = phase === 'dkg_animating';
  const isSignAnimating = phase === 'sign_animating';

  const showGraph =
    isDkgAnimating ||
    phase === 'dkg_complete' ||
    phase === 'sign_preview' ||
    (signData !== null && (isSignAnimating || phase === 'sign_complete' || phase === 'verified'));

  // Button disabled rules
  const signBtnDisabled =
    phase !== 'dkg_complete' && phase !== 'sign_preview' &&
    phase !== 'sign_complete' && phase !== 'sign_loading' &&
    phase !== 'sign_animating' && phase !== 'verified';

  return (
    <ELI5Context.Provider value={eli5}>
      <div className="min-h-screen" style={{ background: '#0a0e1a' }}>

        {/* ELI5 banner */}
        <div
          className="flex items-center justify-between px-8 py-3"
          style={{ background: eli5 ? 'rgba(245,158,11,0.08)' : 'rgba(15,23,42,0.6)', borderBottom: `1px solid ${eli5 ? '#d97706' : '#0f172a'}` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-base">💡</span>
            <span className="text-sm font-semibold" style={{ color: eli5 ? '#fbbf24' : '#475569' }}>
              {eli5
                ? 'ELI5 Mode — all crypto jargon replaced with plain language'
                : 'ELI5 Mode — explain this like I\'m five'}
            </span>
          </div>
          <button
            onClick={() => setEli5((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: eli5 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${eli5 ? '#d97706' : '#334155'}`,
              color: eli5 ? '#fbbf24' : '#64748b',
              cursor: 'pointer',
            }}
          >
            <span style={{
              display: 'inline-block', width: 36, height: 20, borderRadius: 10,
              background: eli5 ? '#d97706' : '#334155', position: 'relative', transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', top: 3, left: eli5 ? 18 : 3, width: 14, height: 14,
                borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
              }} />
            </span>
            {eli5 ? 'On' : 'Off'}
          </button>
        </div>

        {/* Header */}
        <div
          className="border-b px-8 py-5 flex items-center justify-between"
          style={{ borderColor: '#1e293b', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {(['#3b82f6', '#8b5cf6', '#10b981'] as const).map((c) => (
                <div key={c} className="w-4 h-4 rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
              ))}
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#e2e8f0' }}>
              {eli5 ? 'Group Wallet Demo' : 'MPC Threshold Signing'}
            </h1>
            <span className="text-sm px-3 py-1 rounded-full" style={{
              background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid #1d4ed8',
            }}>
              {eli5 ? '2-of-3 parties must agree to sign' : '2-of-3 FROST / Ed25519'}
            </span>
          </div>
          <div className="text-sm" style={{ color: '#475569' }}>powered by NEAR threshold-signatures</div>
        </div>

        <div className="w-full px-8 py-8 space-y-8">
          {/* Phase buttons */}
          <div className="flex flex-wrap gap-4 items-center">
            <StepButton
              label={eli5 ? '1. Create Group Wallet' : '1. Create Wallet (DKG)'}
              onClick={handleDkg}
              active={phase === 'dkg_loading' || phase === 'dkg_animating'}
              done={phase !== 'idle' && phase !== 'dkg_loading' && phase !== 'dkg_animating'}
              disabled={phase === 'dkg_loading' || phase === 'dkg_animating' || phase === 'sign_loading' || phase === 'sign_animating'}
              loading={phase === 'dkg_loading'}
            />
            <span style={{ color: '#334155' }}>→</span>
            <StepButton
              label={eli5 ? '2. Sign a Transaction' : '2. Sign Transaction'}
              onClick={handleSignClick}
              active={phase === 'sign_preview' || phase === 'sign_loading' || phase === 'sign_animating'}
              done={phase === 'sign_complete' || phase === 'verified'}
              disabled={signBtnDisabled}
              loading={phase === 'sign_loading'}
            />
            <span style={{ color: '#334155' }}>→</span>
            <StepButton
              label={eli5 ? '3. Check the Signature' : '3. Verify Signature'}
              onClick={handleVerify}
              active={phase === 'verified'}
              done={phase === 'verified'}
              disabled={phase !== 'sign_complete' && phase !== 'verified'}
              loading={false}
            />
            {phase !== 'idle' && phase !== 'dkg_loading' && (
              <button
                onClick={() => {
                  setPhase('idle'); setDkgData(null); setSignData(null);
                  setVerifyData(null); setError('');
                }}
                className="ml-auto text-sm px-4 py-2 rounded-lg"
                style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b', border: '1px solid #334155', cursor: 'pointer' }}
              >
                ↺ Reset
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-lg px-4 py-3 text-sm fade-in"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid #ef4444' }}>
              ⚠ {error}
            </div>
          )}

          {/* Idle hero */}
          {phase === 'idle' && <IdleHero onStart={handleDkg} eli5={eli5} />}

          {/* Loading states */}
          {phase === 'dkg_loading' && (
            <LoadingState
              label={eli5 ? 'Creating the group wallet…' : 'Running Distributed Key Generation…'}
              subtitle={eli5 ? '3 parties are exchanging secret messages to build a shared key' : '3 parties exchanging FROST protocol messages'}
            />
          )}
          {phase === 'sign_loading' && (
            <LoadingState
              label={eli5 ? 'Signing the transaction…' : 'Running threshold signing…'}
              subtitle={eli5 ? 'Parties 0 and 1 are combining their pieces to create the signature' : 'Parties 0 and 1 cooperating via FROST'}
            />
          )}

          {/* TX preview — shown before signing */}
          {phase === 'sign_preview' && (
            <div className="space-y-6">
              <SectionLabel>{eli5 ? 'Review the transaction before signing' : 'Transaction Preview'}</SectionLabel>
              <TxPreviewPanel onConfirm={handleSignConfirm} loading={false} />
            </div>
          )}

          {/* Main content: graph + panels */}
          {showGraph && dkgData && phase !== 'sign_preview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT */}
              <div className="space-y-4">
                <SectionLabel>
                  {isDkgAnimating
                    ? (eli5 ? 'Parties exchanging messages' : 'DKG Protocol — Message Flow')
                    : isSignAnimating
                    ? (eli5 ? 'Parties signing together' : 'Signing Protocol — Message Flow')
                    : (eli5 ? 'Protocol diagram' : 'Protocol Visualisation')}
                </SectionLabel>

                <NodeGraph currentStep={activeStep} completedParties={completedParties} phase={phase} />

                {isDkgAnimating && (
                  <StepControls
                    steps={dkgData.steps}
                    currentIndex={dkgIndex}
                    onChange={(i) => { setDkgIndex(i); if (i >= dkgData.steps.length - 1) finishDkg(); }}
                    playing={dkgPlaying}
                    onPlayPause={toggleDkgPlay}
                    speed={dkgSpeed}
                    onSpeedChange={setDkgSpeed}
                    phase="dkg"
                  />
                )}

                {isSignAnimating && signData && (
                  <StepControls
                    steps={signData.steps}
                    currentIndex={signIndex}
                    onChange={(i) => { setSignIndex(i); if (i >= signData.steps.length - 1) finishSign(); }}
                    playing={signPlaying}
                    onPlayPause={toggleSignPlay}
                    speed={signSpeed}
                    onSpeedChange={setSignSpeed}
                    phase="sign"
                  />
                )}

                {phase === 'dkg_complete' && (
                  <div className="rounded-xl p-5 text-center fade-in"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid #10b981' }}>
                    <div className="text-base font-semibold" style={{ color: '#6ee7b7' }}>
                      {eli5 ? '✓ Group wallet created — all 3 parties now share the same address' : '✓ DKG complete — shared public key established'}
                    </div>
                    <div className="text-sm mt-1.5 font-mono break-all" style={{ color: '#475569' }}>
                      {dkgData.public_key}
                    </div>
                    <div className="text-sm mt-2" style={{ color: '#64748b' }}>
                      {dkgData.steps.length} messages exchanged · {dkgData.steps[dkgData.steps.length - 1]?.round ?? '?'} rounds
                    </div>
                  </div>
                )}

                {(phase === 'sign_complete' || phase === 'verified') && signData && (
                  <div className="space-y-3">
                    <TransactionPanel signData={signData} />
                    <SignaturePanel
                      signatureHex={signData.signature}
                      txHash={signData.tx_hash}
                      publicKey={dkgData.public_key}
                      verifyData={verifyData ?? undefined}
                    />
                  </div>
                )}
              </div>

              {/* RIGHT */}
              <div className="space-y-4">
                <SectionLabel>{eli5 ? 'Each party\'s key piece' : 'Party Key Material'}</SectionLabel>
                <div className="space-y-3">
                  {dkgData.parties.map((party) => (
                    <NodePanel
                      key={party.id}
                      party={party}
                      currentStep={activeStep}
                      signData={signData ?? undefined}
                      revealed={phase !== 'dkg_animating'}
                    />
                  ))}
                </div>

                {(phase === 'sign_complete' || phase === 'verified') && (
                  <div className="rounded-xl p-5 text-sm space-y-2 fade-in"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e3a5f' }}>
                    <div className="font-semibold" style={{ color: '#60a5fa' }}>
                      {eli5 ? 'How threshold signing works' : 'How FROST signing works'}
                    </div>
                    <div style={{ color: '#64748b', lineHeight: '1.8' }}>
                      {eli5 ? (
                        <>
                          <span style={{ color: '#10b981' }}>Step 1</span>: Each signer rolls dice (picks a random number) and announces the result.<br />
                          <span style={{ color: '#8b5cf6' }}>Step 2</span>: Each signer uses their dice number + their key piece to compute their piece of the signature, and whispers it to the coordinator.<br />
                          <span style={{ color: '#fbbf24' }}>Step 3</span>: The coordinator adds all pieces together to get the final signature. Nobody ever revealed their private key piece.
                        </>
                      ) : (
                        <>
                          <span style={{ color: '#10b981' }}>Round 1</span>: Each signer generates fresh nonces and broadcasts R_i = d_i·G + e_i·G.<br />
                          <span style={{ color: '#8b5cf6' }}>Round 2</span>: Each signer sends partial sig s_i = k_i + H(msg, R, pk)·x_i <em>privately</em> to coordinator.<br />
                          <span style={{ color: '#fbbf24' }}>Aggregate</span>: Coordinator computes S = Σ s_i, R = Σ R_i → final (R, S) signature. No party ever revealed x_i.
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ELI5Context.Provider>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StepButton({ label, onClick, active, done, disabled, loading }: {
  label: string; onClick: () => void; active: boolean; done: boolean;
  disabled: boolean; loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-6 py-3 rounded-xl text-base font-semibold transition-all"
      style={{
        background: done ? 'rgba(16,185,129,0.12)' : active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${done ? '#10b981' : active ? '#3b82f6' : '#1e3a5f'}`,
        color: done ? '#6ee7b7' : active ? '#93c5fd' : disabled ? '#334155' : '#94a3b8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: active ? '0 0 16px rgba(59,130,246,0.25)' : 'none',
      }}
    >
      {loading ? '⟳ ' : done ? '✓ ' : ''}{label}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #1e3a5f, transparent)' }} />
      <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, #1e3a5f, transparent)' }} />
    </div>
  );
}

function LoadingState({ label, subtitle }: { label: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-6 fade-in">
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-5 h-5 rounded-full" style={{
            background: '#3b82f6', boxShadow: '0 0 12px #3b82f6',
            animation: `nodePulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <div className="text-xl font-semibold" style={{ color: '#e2e8f0' }}>{label}</div>
      <div className="text-base" style={{ color: '#475569' }}>{subtitle}</div>
    </div>
  );
}

function HowItWorksModal({ eli5, onClose }: { eli5: boolean; onClose: () => void }) {
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="text-lg font-bold" style={{ color: '#60a5fa' }}>{title}</h3>
      <div className="space-y-2" style={{ color: '#94a3b8', lineHeight: '1.75' }}>{children}</div>
    </div>
  );

  const Sub = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-lg p-4 space-y-1.5" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid #1e3a5f' }}>
      <div className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>{title}</div>
      <div className="text-sm" style={{ color: '#94a3b8', lineHeight: '1.75' }}>{children}</div>
    </div>
  );

  const Code = ({ children }: { children: React.ReactNode }) => (
    <code className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.4)', color: '#fbbf24' }}>{children}</code>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl p-8 space-y-8"
        style={{ background: '#0f172a', border: '1px solid #1e3a5f', boxShadow: '0 0 60px rgba(59,130,246,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#e2e8f0' }}>
              {eli5 ? 'How the group wallet works' : 'How FROST MPC works'}
            </h2>
            <p className="text-sm mt-1" style={{ color: '#475569' }}>
              {eli5 ? 'A plain-language walkthrough' : 'FROST DKG + Threshold Ed25519 — technical deep dive'}
            </p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: '#475569', cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
        </div>

        {eli5 ? (
          <>
            <Section title="The core idea">
              <p>
                Imagine you and two friends want to share a bank vault, but you don't trust any single person to hold the only key.
                Instead, you use a special lock that needs <strong style={{ color: '#e2e8f0' }}>any 2 of your 3 key pieces</strong> to open.
                No single piece works alone. If one person loses theirs — or turns bad — the vault is still safe, and the other two can still open it.
              </p>
              <p>
                That is exactly what this demo does, but with cryptography instead of a physical vault. The "vault" is a Solana wallet address.
              </p>
            </Section>

            <Section title="Step 1 — Creating the shared key (DKG)">
              <Sub title="Round 1: Everyone agrees on a session ID">
                Before anything else, all 3 parties hash-commit to a random number. This proves later that nobody changed their mind after seeing what others picked. Think of it like everyone sealing their lottery ticket in an envelope before the draw.
              </Sub>
              <Sub title="Round 2: Each person creates a secret polynomial">
                Each party secretly picks a random mathematical "curve" (a polynomial). They broadcast the <em>shape</em> of their curve (commitments) but not the curve itself. This is like showing the shadow of an object without showing the object.
              </Sub>
              <Sub title="Round 3: Opening the envelopes">
                Parties reveal their sealed envelopes from Round 1, proving they didn't swap their polynomial after seeing others'.
              </Sub>
              <Sub title="Round 4: Proof you know your own secret">
                Each party sends a zero-knowledge proof — a mathematical certificate proving "I know my secret" without actually revealing it. This stops a cheater from copying someone else's public value and claiming it as their own.
              </Sub>
              <Sub title="Round 5: Sharing key pieces">
                Each party privately sends every other party one point on their secret polynomial. Each recipient checks their point against the public commitment from Round 2. If it checks out, they keep it as their secret share. The group public key is the sum of everyone's public commitments — but nobody ever assembled the full private key.
              </Sub>
            </Section>

            <Section title="Step 2 — Signing a transaction (FROST)">
              <Sub title="Round 1: Picking nonces">
                Each signer picks two fresh random numbers (nonces) and broadcasts only their commitment — like writing "I promise to pick number X" in public without revealing X yet.
              </Sub>
              <Sub title="Round 2: Computing signature pieces">
                Each signer uses their secret key piece plus the nonces to compute a partial signature. They send only the result to the coordinator — never their key piece itself.
              </Sub>
              <Sub title="Combining">
                The coordinator adds all the partial signatures together. The result is a single valid Ed25519 signature — identical to one produced by a single private key. Anyone can verify it with just the public key.
              </Sub>
            </Section>

            <Section title="Why is this safe?">
              <p>
                <strong style={{ color: '#e2e8f0' }}>The private key never exists in one place.</strong> It is mathematically split across all 3 parties from the very beginning. To steal it, an attacker would need to compromise at least 2 of the 3 parties simultaneously. One party alone — even if fully hacked — reveals nothing useful.
              </p>
              <p>
                The final signature is a standard Ed25519 signature. The Solana network has no idea it was produced by 3 parties — it just checks the math, and the math checks out.
              </p>
            </Section>
          </>
        ) : (
          <>
            <Section title="Background: Threshold Signatures">
              <p>
                A <em>(t, n) threshold signature scheme</em> lets any <strong style={{ color: '#e2e8f0' }}>t of n</strong> parties jointly produce
                a signature valid under a shared public key, without any party ever holding — or being able to reconstruct — the full private key alone.
                This demo uses <strong style={{ color: '#e2e8f0' }}>FROST</strong> (Flexible Round-Optimised Schnorr Threshold Signatures) with
                t = 2, n = 3 over the Ed25519 curve (Curve25519 in Edwards form, SHA-512 hash).
              </p>
              <p>
                The resulting signature is a standard Ed25519 signature — indistinguishable from a single-key signature and verifiable by any Ed25519 implementation (e.g., Solana's runtime).
              </p>
            </Section>

            <Section title="Phase 1: Distributed Key Generation (FROST DKG)">
              <p>
                The DKG is a variant of Pedersen VSS with Feldman commitments and Schnorr proofs of knowledge. Over 5 rounds, n parties jointly sample a shared secret <Code>s</Code> without any party learning it.
              </p>
              <Sub title="Round 1 — Hash commitments (session binding)">
                Each party <Code>i</Code> samples a random nonce <Code>rᵢ</Code> and broadcasts <Code>Hᵢ = H(rᵢ)</Code>.
                This binds all parties to a common session before any key material is exchanged, preventing replay and identity-mashing attacks.
              </Sub>
              <Sub title="Round 2 — Polynomial commitments (Feldman VSS)">
                Each party samples a degree-(t−1) polynomial <Code>fᵢ(x) = aᵢ₀ + aᵢ₁x + … + aᵢₜ₋₁xᵗ⁻¹</Code> over the scalar field.
                They broadcast the coefficient commitments <Code>Cᵢⱼ = aᵢⱼ · G</Code> for j = 0…t−1.
                The constant term <Code>aᵢ₀</Code> is party i's secret contribution to the group key.
              </Sub>
              <Sub title="Round 3 — Commitment reveal">
                Parties reveal their nonce preimages <Code>rᵢ</Code> from Round 1.
                Others verify <Code>H(rᵢ) = Hᵢ</Code>, confirming that polynomials were chosen before observing others' commitments (non-malleability).
              </Sub>
              <Sub title="Round 4 — Schnorr proofs of knowledge">
                Each party broadcasts a Schnorr ZKP <Code>πᵢ = (Rᵢ, sᵢ)</Code> proving knowledge of <Code>aᵢ₀</Code> without revealing it.
                Specifically: sample <Code>kᵢ ←$ Zq</Code>, set <Code>Rᵢ = kᵢ·G</Code>, compute challenge <Code>cᵢ = H(i, Φ, Cᵢ₀, Rᵢ)</Code>,
                then <Code>sᵢ = kᵢ + cᵢ·aᵢ₀</Code>. Verifiers check <Code>sᵢ·G = Rᵢ + cᵢ·Cᵢ₀</Code>.
                This prevents rogue-key attacks where a malicious party sets their "public key" to cancel out others'.
              </Sub>
              <Sub title="Round 5 — Shamir share distribution">
                Party <Code>i</Code> privately sends party <Code>j</Code> their evaluation <Code>sᵢⱼ = fᵢ(j)</Code>.
                Recipient <Code>j</Code> verifies: <Code>sᵢⱼ·G = Σₗ Cᵢₗ · jˡ</Code> (i.e. the share lies on the committed polynomial).
                Each party's final long-term secret share is <Code>xⱼ = Σᵢ sᵢⱼ</Code> — their evaluation of the sum polynomial <Code>f = Σfᵢ</Code> at point <Code>j</Code>.
              </Sub>
              <p>
                The <strong style={{ color: '#e2e8f0' }}>group public key</strong> is <Code>PK = Σᵢ Cᵢ₀ = Σᵢ aᵢ₀·G = s·G</Code> where <Code>s = Σ aᵢ₀</Code>
                is the group secret — which was never assembled by anyone. Each party <Code>j</Code> holds <Code>xⱼ = f(j)</Code>,
                and any t shares can reconstruct <Code>s</Code> via Lagrange interpolation (though this is never done in practice).
              </p>
            </Section>

            <Section title="Phase 2: Threshold Signing (FROST)">
              <p>
                FROST signing is a 2-round protocol. Unlike naive threshold Schnorr, FROST avoids Wagner's attack on multi-party nonce aggregation by using a <em>binding factor</em> per signer.
              </p>
              <Sub title="Round 1 — Nonce commitments">
                Each signer <Code>i</Code> samples nonce pair <Code>(dᵢ, eᵢ) ←$ Zq²</Code> and broadcasts commitments <Code>(Dᵢ, Eᵢ) = (dᵢ·G, eᵢ·G)</Code>.
              </Sub>
              <Sub title="Round 2 — Signature shares">
                Each signer computes a per-signer binding factor: <Code>{'ρᵢ = H(i, msg, {(Dⱼ,Eⱼ)})'}</Code>.
                The aggregate nonce is <Code>R = Σᵢ (Dᵢ + ρᵢ·Eᵢ)</Code>.
                The Fiat-Shamir challenge is <Code>c = H(R ‖ PK ‖ msg)</Code>.
                Each signer outputs partial signature <Code>zᵢ = dᵢ + eᵢ·ρᵢ + λᵢ·c·xᵢ</Code>,
                where <Code>λᵢ</Code> is the Lagrange coefficient for party <Code>i</Code> over the signing set.
                This is sent privately to the coordinator.
              </Sub>
              <Sub title="Aggregation">
                The coordinator verifies each share, then computes <Code>z = Σᵢ zᵢ</Code>.
                The final signature is <Code>(R, z)</Code> — a standard Schnorr/Ed25519 signature.
                Verification: <Code>z·G = R + c·PK</Code>.
              </Sub>
            </Section>

            <Section title="Security properties">
              <Sub title="Unforgeability (EUF-CMA)">
                FROST is proven secure under the discrete logarithm assumption in the random oracle model. An adversary controlling fewer than t parties cannot produce a valid signature, as they cannot reconstruct <Code>s</Code> or any valid <Code>zᵢ</Code> for an honest party.
              </Sub>
              <Sub title="Key secrecy">
                The group private key <Code>s</Code> is never materialised. The DKG protocol produces shares <Code>xⱼ = f(j)</Code> directly; no party ever evaluates <Code>f(0) = s</Code>. Compromising any t−1 parties reveals nothing about <Code>s</Code> (information-theoretic secrecy of Shamir sharing below threshold).
              </Sub>
              <Sub title="Demo caveat">
                In this demo, all 3 parties run in a single Rust process on one server. The protocol messages are correct, but the network isolation is simulated. A production deployment (like the NEAR MPC nodes this codebase is actually for) runs each party on a separate machine with TLS-authenticated P2P transport.
              </Sub>
            </Section>
          </>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid #1e3a5f', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function IdleHero({ onStart, eli5 }: { onStart: () => void; eli5: boolean }) {
  const [showHow, setShowHow] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-10 fade-in">
      {showHow && <HowItWorksModal eli5={eli5} onClose={() => setShowHow(false)} />}

      <svg viewBox="0 0 200 180" className="w-72 h-64">
        {([
          { cx: 100, cy: 25, next: { cx: 25, cy: 155 }, delay: '0s' },
          { cx: 25, cy: 155, next: { cx: 175, cy: 155 }, delay: '0.3s' },
          { cx: 175, cy: 155, next: { cx: 100, cy: 25 }, delay: '0.6s' },
        ] as Array<{ cx: number; cy: number; next: { cx: number; cy: number }; delay: string }>).map(({ cx, cy, next, delay }, i) => [
          <line key={`l${i}`} x1={cx} y1={cy} x2={next.cx} y2={next.cy} stroke="#1e3a5f" strokeWidth="2" />,
          <circle key={`c${i}`} cx={cx} cy={cy} r="22" fill="#0f172a" stroke="#3b82f6" strokeWidth="2"
            style={{ filter: 'drop-shadow(0 0 8px #3b82f6)', animation: `nodePulse 1.4s ease-in-out ${delay} infinite` }} />,
          <text key={`t${i}`} x={cx} y={cy + 5} textAnchor="middle" fill="#60a5fa" fontSize="13" fontWeight="700">{i}</text>
        ])}
      </svg>

      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold" style={{ color: '#e2e8f0' }}>
          {eli5 ? 'Group Wallet Demo' : 'Multi-Party Computation Demo'}
        </h2>
        <p className="text-lg max-w-2xl text-center" style={{ color: '#64748b' }}>
          {eli5
            ? 'Watch 3 parties create a shared wallet together — no single person ever knows the full private key — then send a transaction that requires 2-of-3 to agree.'
            : 'Watch 3 parties jointly generate an Ed25519 keypair via FROST DKG — no single party learns the private key — then threshold-sign a Solana transaction with any 2 of the 3.'}
        </p>
      </div>

      <div className="flex gap-16 text-sm text-center">
        {(eli5 ? [
          { icon: '🔑', title: 'Group Key Setup', desc: 'No one person holds the key' },
          { icon: '✍️', title: '2-of-3 Signing', desc: 'Any 2 parties can sign' },
          { icon: '✅', title: 'Verifiable', desc: 'Anyone can check the result' },
        ] : [
          { icon: '🔑', title: 'FROST DKG', desc: 'Distributed key generation' },
          { icon: '✍️', title: '2-of-3 Signing', desc: 'Threshold Ed25519' },
          { icon: '✅', title: 'Verifiable', desc: 'Cryptographic proof' },
        ]).map(({ icon, title, desc }) => (
          <div key={title} className="space-y-2">
            <div className="text-4xl">{icon}</div>
            <div className="text-base font-semibold" style={{ color: '#94a3b8' }}>{title}</div>
            <div className="text-sm" style={{ color: '#475569' }}>{desc}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onStart}
          className="px-10 py-4 rounded-xl font-semibold text-lg"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
            color: '#e2e8f0', border: '1px solid #3b82f6', cursor: 'pointer',
            boxShadow: '0 0 32px rgba(59,130,246,0.35)',
          }}
        >
          {eli5 ? 'Create Group Wallet →' : 'Create Wallet (Run DKG) →'}
        </button>
        <button
          onClick={() => setShowHow(true)}
          className="px-6 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid #1e3a5f', cursor: 'pointer' }}
        >
          {eli5 ? '📖 How does this work?' : '📖 How it works'}
        </button>
      </div>
    </div>
  );
}
