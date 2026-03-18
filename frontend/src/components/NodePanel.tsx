import type { PartyState, ProtocolEvent, SignResponse } from '../types';
import { useELI5 } from '../ELI5Context';
import { ELI5_UI, TECH_UI } from '../eli5';

interface Props {
  party: PartyState;
  currentStep: ProtocolEvent | null;
  signData?: SignResponse;
  revealed?: boolean;
}

function ComputingField({ secret }: { secret?: boolean }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm font-semibold" style={{ color: secret ? '#f87171' : '#6ee7b7' }}>
          {secret ? '🔒' : '📢'} {secret ? 'Secret share' : 'Public key'}
        </span>
        <span className="text-xs px-2 py-0.5 rounded animate-pulse"
          style={{ background: 'rgba(100,116,139,0.15)', color: '#64748b' }}>
          computing…
        </span>
      </div>
      <div className="font-mono text-sm rounded px-3 py-2 animate-pulse"
        style={{ background: 'rgba(0,0,0,0.3)', color: '#334155', userSelect: 'none' }}>
        {'█'.repeat(32)}
      </div>
    </div>
  );
}

function HexField({ label, sublabel, value, secret }: {
  label: string; sublabel: string; value: string; secret?: boolean;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm font-semibold" style={{ color: secret ? '#f87171' : '#6ee7b7' }}>
          {secret ? '🔒' : '📢'} {label}
        </span>
        <span className="text-xs px-2 py-0.5 rounded" style={{
          background: secret ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
          color: secret ? '#fca5a5' : '#6ee7b7',
        }}>
          {secret ? 'PRIVATE — never transmitted' : 'PUBLIC — known to all'}
        </span>
      </div>
      <div
        className="font-mono text-sm rounded px-3 py-2 break-all"
        style={{ background: 'rgba(0,0,0,0.3)', color: secret ? '#fda4af' : '#93c5fd' }}
      >
        {value}
      </div>
      <div className="text-xs mt-1.5" style={{ color: '#475569' }}>{sublabel}</div>
    </div>
  );
}

export default function NodePanel({ party, currentStep, signData, revealed = true }: Props) {
  const eli5 = useELI5();
  const ui = eli5 ? ELI5_UI : TECH_UI;

  const isActive = currentStep?.from_party === party.id ||
                   currentStep?.to_parties.includes(party.id);
  const isCoordinator = signData?.coordinator === party.id;
  const isOffline = signData?.offline_parties.includes(party.id);
  const isSigner = signData?.signing_parties.includes(party.id);

  return (
    <div
      className="rounded-xl p-4 flex-1 min-w-0 fade-in"
      style={{
        background: isActive ? 'rgba(30,58,138,0.25)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isActive ? '#3b82f6' : '#1e3a5f'}`,
        backdropFilter: 'blur(8px)',
        transition: 'border-color 0.3s, background 0.3s',
        boxShadow: isActive ? '0 0 20px rgba(59,130,246,0.15)' : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg" style={{ color: isActive ? '#93c5fd' : '#e2e8f0' }}>
          {eli5 ? `Friend ${party.id}` : `Party ${party.id}`}
        </h3>
        <div className="flex gap-2">
          {isCoordinator && (
            <span className="text-sm px-3 py-1 rounded-full"
              style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid #7c3aed' }}>
              {eli5 ? 'organiser' : 'coordinator'}
            </span>
          )}
          {isSigner && !isCoordinator && (
            <span className="text-sm px-3 py-1 rounded-full"
              style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid #059669' }}>
              {eli5 ? 'signing' : 'signer'}
            </span>
          )}
          {isOffline && (
            <span className="text-sm px-3 py-1 rounded-full"
              style={{ background: 'rgba(100,116,139,0.2)', color: '#94a3b8', border: '1px solid #475569' }}>
              {eli5 ? 'sitting out' : 'offline'}
            </span>
          )}
        </div>
      </div>

      {revealed ? (
        <>
          <HexField
            label={ui.secretShareLabel}
            sublabel={ui.secretShareSublabel}
            value={party.secret_share_hex}
            secret
          />
          <HexField
            label={ui.publicKeyLabel}
            sublabel={ui.publicKeySublabel}
            value={party.public_key_hex}
          />
        </>
      ) : (
        <div className="space-y-4 mb-4">
          <ComputingField secret />
          <ComputingField />
        </div>
      )}

      {signData && isSigner && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid #1e3a5f' }}>
          <div className="text-sm font-semibold mb-2" style={{ color: '#8b5cf6' }}>
            {ui.signingContributionTitle}
          </div>
          <div className="text-sm" style={{ color: '#64748b' }}>
            {isCoordinator ? ui.signingContributionCoordinator : ui.signingContributionSigner}
          </div>
        </div>
      )}

      {signData && isOffline && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid #1e3a5f' }}>
          <div className="text-sm" style={{ color: '#475569' }}>
            {ui.offlineNote}
          </div>
        </div>
      )}
    </div>
  );
}
