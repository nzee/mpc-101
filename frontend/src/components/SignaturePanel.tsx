import type { VerifyResponse } from '../types';
import { useELI5 } from '../ELI5Context';

interface Props {
  verifyData?: VerifyResponse;
  signatureHex?: string;
  txHash?: string;
  publicKey?: string;
}

/** Ed25519 signature = 32-byte R (nonce point) || 32-byte S (scalar sum) */
function splitSignature(hex: string) {
  const clean = hex.replace(/^0x/, '');
  if (clean.length !== 128) return null;
  return { R: clean.slice(0, 64), S: clean.slice(64, 128) };
}

export default function SignaturePanel({ verifyData, signatureHex, txHash, publicKey }: Props) {
  const eli5 = useELI5();
  const sig = verifyData?.signature ?? signatureHex ?? '';
  const hash = verifyData?.tx_hash ?? txHash ?? '';
  const pk = verifyData?.public_key ?? publicKey ?? '';
  const valid = verifyData?.valid;
  const parts = sig ? splitSignature(sig) : null;

  return (
    <div
      className="rounded-xl p-5 space-y-4 fade-in"
      style={{
        background: valid === true
          ? 'rgba(16,185,129,0.06)'
          : valid === false
          ? 'rgba(239,68,68,0.06)'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${valid === true ? '#10b981' : valid === false ? '#ef4444' : '#1e3a5f'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full"
          style={{ background: valid === true ? '#10b981' : valid === false ? '#ef4444' : '#475569' }} />
        <h3 className="text-base font-bold" style={{ color: '#e2e8f0' }}>
          {eli5 ? 'The Group Signature' : 'Threshold Signature (Ed25519 / FROST)'}
        </h3>
        {valid !== undefined && (
          <span
            className="ml-auto text-sm px-3 py-1 rounded-full font-bold fade-in"
            style={{
              background: valid ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: valid ? '#6ee7b7' : '#fca5a5',
              border: `1px solid ${valid ? '#059669' : '#dc2626'}`,
            }}
          >
            {valid ? '✓ VALID' : '✗ INVALID'}
          </span>
        )}
      </div>

      {/* R/S breakdown */}
      {parts && (
        <div className="space-y-3">
          <div className="text-sm font-semibold" style={{ color: '#64748b' }}>
            {eli5
              ? 'Signature broken into its two parts (R and S):'
              : 'Signature components — Ed25519 (R‖S, 64 bytes total):'}
          </div>

          {/* R */}
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e3a5f' }}>
            <div className="flex items-center gap-3 px-3 py-2"
              style={{ background: 'rgba(16,185,129,0.08)' }}>
              <span className="text-sm font-bold font-mono" style={{ color: '#10b981' }}>R</span>
              <span className="text-sm font-semibold" style={{ color: '#6ee7b7' }}>
                {eli5 ? 'Nonce commitment (32 bytes)' : 'Group nonce point R = Σ Rᵢ (32 bytes)'}
              </span>
              <span className="ml-auto text-xs font-mono" style={{ color: '#475569' }}>bytes 0–31</span>
            </div>
            <div className="px-3 py-2 font-mono text-sm break-all" style={{ background: 'rgba(0,0,0,0.3)', color: '#6ee7b7' }}>
              {parts.R}
            </div>
            {eli5 && (
              <div className="px-3 py-2 text-xs" style={{ color: '#475569', background: 'rgba(0,0,0,0.15)' }}>
                This is the sum of all the random numbers each signer picked in Step 1. It's what makes the signature unique and unpredictable.
              </div>
            )}
          </div>

          {/* S */}
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e3a5f' }}>
            <div className="flex items-center gap-3 px-3 py-2"
              style={{ background: 'rgba(139,92,246,0.08)' }}>
              <span className="text-sm font-bold font-mono" style={{ color: '#8b5cf6' }}>S</span>
              <span className="text-sm font-semibold" style={{ color: '#c4b5fd' }}>
                {eli5 ? 'Aggregated signature scalar (32 bytes)' : 'Aggregated scalar S = Σ sᵢ (32 bytes)'}
              </span>
              <span className="ml-auto text-xs font-mono" style={{ color: '#475569' }}>bytes 32–63</span>
            </div>
            <div className="px-3 py-2 font-mono text-sm break-all" style={{ background: 'rgba(0,0,0,0.3)', color: '#c4b5fd' }}>
              {parts.S}
            </div>
            {eli5 && (
              <div className="px-3 py-2 text-xs" style={{ color: '#475569', background: 'rgba(0,0,0,0.15)' }}>
                This is the sum of all the signature pieces each signer computed in Step 2. Together with R, it proves the signers knew their key pieces.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message hash */}
      {hash && (
        <div>
          <div className="text-sm mb-1.5" style={{ color: '#64748b' }}>
            {eli5 ? 'Transaction fingerprint (what was signed):' : 'Message hash (what was signed):'}
          </div>
          <div className="font-mono text-sm break-all rounded px-3 py-2"
            style={{ background: 'rgba(0,0,0,0.3)', color: '#fbbf24' }}>
            0x{hash}
          </div>
          {eli5 && (
            <div className="text-xs mt-1.5" style={{ color: '#475569' }}>
              A short fingerprint of the transaction. Change a single byte in the transaction and this fingerprint changes completely — so the signature only approves this exact transaction.
            </div>
          )}
        </div>
      )}

      {/* Public key */}
      {pk && (
        <div>
          <div className="text-sm mb-1.5" style={{ color: '#64748b' }}>
            {eli5 ? 'Group wallet address (public key):' : 'Joint public key (Ed25519):'}
          </div>
          <div className="font-mono text-sm break-all rounded px-3 py-2"
            style={{ background: 'rgba(0,0,0,0.3)', color: '#93c5fd' }}>
            {pk}
          </div>
        </div>
      )}

      {/* Verification walkthrough */}
      {verifyData && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a5f' }}>
          <div className="px-4 py-3"
            style={{ background: valid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
            <div className="text-sm font-bold" style={{ color: valid ? '#6ee7b7' : '#fca5a5' }}>
              {eli5 ? '🔍 How we checked the signature' : '🔍 Verification walkthrough'}
            </div>
          </div>

          <div className="p-4 space-y-3 text-sm" style={{ background: 'rgba(0,0,0,0.2)' }}>
            {eli5 ? (
              <>
                <Step n={1} color="#60a5fa" title="Re-hash the transaction">
                  We take the exact same transaction and run it through SHA-256 again. We get the same fingerprint as before: <code className="font-mono text-xs" style={{ color: '#fbbf24' }}>0x{hash.slice(0, 16)}…</code>
                </Step>
                <Step n={2} color="#8b5cf6" title="Combine fingerprint + public key + R into a challenge">
                  We feed the fingerprint, the group's public address, and the nonce R into a hash function. This produces a "challenge number" that ties the signature to this exact transaction and this exact key.
                </Step>
                <Step n={3} color="#10b981" title="Check: does S·G equal R + challenge·PublicKey?">
                  We do two separate calculations and check they give the same answer:
                  <ul className="mt-2 space-y-1 list-none">
                    <li><span style={{ color: '#8b5cf6' }}>Left side:</span> <code className="font-mono text-xs">S × G</code> (multiply S by the curve's base point)</li>
                    <li><span style={{ color: '#10b981' }}>Right side:</span> <code className="font-mono text-xs">R + challenge × PublicKey</code></li>
                  </ul>
                  <div className="mt-2" style={{ color: valid ? '#6ee7b7' : '#fca5a5' }}>
                    {valid
                      ? '✓ Both sides matched — the signature is genuine! The signers must have known their private key pieces.'
                      : '✗ The sides did not match — the signature is fake or tampered.'}
                  </div>
                </Step>
                <Step n={4} color="#fbbf24" title="Why this proves the key was never revealed">
                  Each signer only used their private key piece inside an equation. The final S is a sum of those pieces — but you can't reverse-engineer any individual piece from S. The math is one-way.
                </Step>
              </>
            ) : (
              <>
                <Step n={1} color="#60a5fa" title="Deserialise signature → (R, S)">
                  Parse the 64-byte signature: R = bytes[0..32], S = bytes[32..64].
                </Step>
                <Step n={2} color="#8b5cf6" title="Compute challenge scalar">
                  <code className="font-mono text-xs" style={{ color: '#c4b5fd' }}>
                    c = H(R ‖ PK ‖ msg)
                  </code>
                  <span style={{ color: '#64748b' }}> — SHA-512 per RFC 8032, reduced mod ℓ</span>
                </Step>
                <Step n={3} color="#10b981" title="Verify the group equation">
                  Check <code className="font-mono text-xs" style={{ color: '#6ee7b7' }}>S·G = R + c·PK</code> on the Ed25519 curve.
                  <div className="mt-1.5 space-y-1 font-mono text-xs">
                    <div><span style={{ color: '#475569' }}>LHS = </span><span style={{ color: '#8b5cf6' }}>S·G</span> (scalar mul with base point G)</div>
                    <div><span style={{ color: '#475569' }}>RHS = </span><span style={{ color: '#10b981' }}>R</span><span style={{ color: '#475569' }}> + </span><span style={{ color: '#fbbf24' }}>c</span><span style={{ color: '#475569' }}>·</span><span style={{ color: '#93c5fd' }}>PK</span></div>
                  </div>
                  <div className="mt-2" style={{ color: valid ? '#6ee7b7' : '#fca5a5' }}>
                    {valid ? '✓ LHS = RHS — signature valid' : '✗ LHS ≠ RHS — signature invalid'}
                  </div>
                </Step>
                <Step n={4} color="#fbbf24" title="Why this works">
                  Each signer computed <code className="font-mono text-xs">sᵢ = kᵢ + c·xᵢ</code>. Summing: <code className="font-mono text-xs">S = Σsᵢ = k + c·x</code>.
                  So <code className="font-mono text-xs">S·G = k·G + c·x·G = R + c·PK</code>. QED — no private key x ever left any device.
                </Step>
              </>
            )}
          </div>

          <div className="px-4 py-3 text-sm font-semibold"
            style={{
              background: valid ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
              color: valid ? '#6ee7b7' : '#fca5a5',
            }}>
            Result: {verifyData.message}
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ n, color, title, children }: {
  n: number; color: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
        {n}
      </div>
      <div>
        <div className="font-semibold mb-1" style={{ color: '#e2e8f0' }}>{title}</div>
        <div style={{ color: '#94a3b8', lineHeight: '1.7' }}>{children}</div>
      </div>
    </div>
  );
}
