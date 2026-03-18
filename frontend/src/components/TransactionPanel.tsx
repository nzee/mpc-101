import type { SignResponse } from '../types';
import { useELI5 } from '../ELI5Context';

interface Props {
  signData: SignResponse;
}

export default function TransactionPanel({ signData }: Props) {
  const eli5 = useELI5();
  const tx = signData.tx as Record<string, string | number>;

  const fields: Array<[string, string, string, string]> = [
    ['feePayer',        eli5 ? 'Sender'       : 'feePayer',        String(tx.feePayer),        '#94a3b8'],
    ['recipient',       eli5 ? 'Recipient'    : 'recipient',       String(tx.recipient),       '#60a5fa'],
    ['lamports',        eli5 ? 'Amount'       : 'lamports',        '1.5 SOL (1 500 000 000 lamports)', '#6ee7b7'],
    ['recentBlockhash', eli5 ? 'Block anchor' : 'recentBlockhash', String(tx.recentBlockhash), '#e2e8f0'],
    ['programId',       eli5 ? 'Program'      : 'programId',       'System Program (SOL transfer)', '#e2e8f0'],
  ];

  return (
    <div
      className="rounded-xl p-5 space-y-4 fade-in"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e3a5f' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b' }} />
        <h3 className="text-base font-bold" style={{ color: '#fbbf24' }}>
          {eli5 ? 'The Signed Transaction' : 'Solana Transaction'}
        </h3>
        <span className="ml-auto text-sm px-3 py-1 rounded-full"
          style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid #d97706' }}>
          {eli5 ? 'Solana network' : 'Solana Mainnet'}
        </span>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
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

      <div>
        <div className="text-sm mb-1.5" style={{ color: '#64748b' }}>
          {eli5 ? 'Transaction fingerprint (what was actually signed):' : 'SHA-256(serialize(tx)) — what was signed:'}
        </div>
        <div className="font-mono text-sm break-all rounded px-3 py-2"
          style={{ background: 'rgba(0,0,0,0.3)', color: '#fbbf24' }}>
          0x{signData.tx_hash}
        </div>
        {eli5 && (
          <div className="text-xs mt-1.5" style={{ color: '#475569' }}>
            This fingerprint is unique to the transaction above. The parties signed this — not the raw transaction — so any tiny change would produce a completely different fingerprint and invalidate the signature.
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <span style={{ color: '#475569' }}>{eli5 ? 'Signed by: ' : 'Signed by: '}</span>
          <span style={{ color: '#10b981' }}>
            {eli5
              ? signData.signing_parties.map(p => `Friend ${p}`).join(', ')
              : signData.signing_parties.map(p => `Party ${p}`).join(', ')}
          </span>
        </div>
        <div>
          <span style={{ color: '#475569' }}>{eli5 ? 'Organiser: ' : 'Coordinator: '}</span>
          <span style={{ color: '#a78bfa' }}>
            {eli5 ? `Friend ${signData.coordinator}` : `Party ${signData.coordinator}`}
          </span>
        </div>
        <div>
          <span style={{ color: '#475569' }}>{eli5 ? 'Sat out: ' : 'Offline: '}</span>
          <span style={{ color: '#475569' }}>
            {signData.offline_parties.length
              ? (eli5
                  ? signData.offline_parties.map(p => `Friend ${p}`).join(', ')
                  : `Party ${signData.offline_parties.join(', ')}`)
              : 'none'}
          </span>
        </div>
      </div>
    </div>
  );
}
