import { useELI5 } from '../ELI5Context';

// Same transaction the server will sign — kept in sync with mpc-server/src/routes.rs
export const PREVIEW_TX = {
  feePayer:        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  recipient:       '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV1',
  lamports:        1500000000,
  recentBlockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
  programId:       '11111111111111111111111111111111',
};

interface Props {
  onConfirm: () => void;
  loading: boolean;
}

export default function TxPreviewPanel({ onConfirm, loading }: Props) {
  const eli5 = useELI5();

  const fields: Array<[string, string, string, string]> = [
    ['feePayer',        eli5 ? 'Sender'         : 'feePayer',        PREVIEW_TX.feePayer,        '#94a3b8'],
    ['recipient',       eli5 ? 'Recipient'      : 'recipient',       PREVIEW_TX.recipient,       '#60a5fa'],
    ['lamports',        eli5 ? 'Amount'         : 'lamports',        '1.5 SOL (1 500 000 000 lamports)', '#6ee7b7'],
    ['recentBlockhash', eli5 ? 'Block anchor'   : 'recentBlockhash', PREVIEW_TX.recentBlockhash, '#e2e8f0'],
    ['programId',       eli5 ? 'Program'        : 'programId',       'System Program (SOL transfer)', '#e2e8f0'],
  ];

  return (
    <div
      className="rounded-xl p-6 space-y-5 fade-in"
      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid #d97706' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }} />
        <h3 className="text-lg font-bold" style={{ color: '#fbbf24' }}>
          {eli5 ? 'Transaction to be signed' : 'Transaction Payload'}
        </h3>
        <span className="ml-auto text-sm px-3 py-1 rounded-full"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid #d97706' }}>
          Solana Mainnet
        </span>
      </div>

      {eli5 && (
        <div className="text-sm rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', lineHeight: '1.7' }}>
          This is the Solana transaction that the 3 parties are about to sign together. Think of it like a cheque:
          it says who's paying, who's getting paid, and how much. The <em>recent blockhash</em> is like an expiry date —
          it ties the transaction to a recent moment on the blockchain so it can't be replayed later.
          Before anyone can sign, <strong style={{ color: '#e2e8f0' }}>all parties agree on exactly this content</strong> — nobody can sneak in a different amount later.
        </div>
      )}

      {/* TX fields */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a5f' }}>
        <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
          style={{ background: 'rgba(0,0,0,0.3)', color: '#475569' }}>
          {eli5 ? 'Transaction details' : 'Raw transaction fields'}
        </div>
        <div className="divide-y" style={{ borderColor: '#1e293b' }}>
          {fields.map(([key, label, val, color]) => (
            <div key={key} className="flex items-start gap-4 px-4 py-3 font-mono text-sm"
              style={{ background: 'rgba(0,0,0,0.2)' }}>
              <span style={{ color: '#475569', minWidth: '120px', flexShrink: 0 }}>{label}</span>
              <span className="break-all" style={{ color }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* What gets hashed */}
      <div className="rounded-lg px-4 py-3 space-y-2" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid #1e293b' }}>
        <div className="text-sm font-semibold" style={{ color: '#64748b' }}>
          {eli5 ? 'How the signing works' : 'What gets signed'}
        </div>
        {eli5 ? (
          <div className="text-sm" style={{ color: '#94a3b8', lineHeight: '1.7' }}>
            The transaction above gets serialised into bytes, then hashed with SHA-256 to produce a short
            fixed-length fingerprint. <strong style={{ color: '#fbbf24' }}>That fingerprint is what the parties actually sign</strong> — not
            the full transaction. Solana uses Ed25519 natively, so the signature scheme here is a perfect match.
            Anyone can later re-hash the transaction and check the fingerprint matches,
            proving the signature covers this exact transaction and nothing else.
          </div>
        ) : (
          <div className="text-sm font-mono" style={{ color: '#94a3b8' }}>
            <span style={{ color: '#475569' }}>hash = </span>
            <span style={{ color: '#60a5fa' }}>SHA-256</span>
            <span style={{ color: '#e2e8f0' }}>(JSON.serialize(tx))</span>
            <br />
            <span style={{ color: '#475569' }}>parties sign </span>
            <span style={{ color: '#fbbf24' }}>hash</span>
            <span style={{ color: '#475569' }}> — not the raw tx bytes</span>
          </div>
        )}
      </div>

      {/* Confirm button */}
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-8 py-3 rounded-xl font-semibold text-base"
          style={{
            background: loading ? 'rgba(245,158,11,0.08)' : 'linear-gradient(135deg, #d97706, #b45309)',
            color: loading ? '#78350f' : '#fef3c7',
            border: '1px solid #d97706',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 0 20px rgba(245,158,11,0.25)',
          }}
        >
          {loading ? '⟳ Signing…' : eli5 ? '✍️ Sign this transaction →' : '✍️ Confirm & Sign →'}
        </button>
        <div className="text-sm" style={{ color: '#475569' }}>
          {eli5
            ? 'Parties 0 and 1 will cooperate to sign (Party 2 sits this one out)'
            : 'Signers: Party 0 (coordinator), Party 1 — threshold 2-of-3'}
        </div>
      </div>
    </div>
  );
}
