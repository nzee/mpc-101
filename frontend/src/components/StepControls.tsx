import { useEffect, useRef } from 'react';
import type { ProtocolEvent } from '../types';
import { useELI5 } from '../ELI5Context';
import { eli5Step, ELI5_UI, TECH_UI } from '../eli5';

interface Props {
  steps: ProtocolEvent[];
  currentIndex: number;
  onChange: (index: number) => void;
  playing: boolean;
  onPlayPause: () => void;
  speed: number;
  onSpeedChange: (s: number) => void;
  phase: 'dkg' | 'sign';
}

export default function StepControls({
  steps, currentIndex, onChange, playing, onPlayPause, speed, onSpeedChange, phase,
}: Props) {
  const eli5 = useELI5();
  const ui = eli5 ? ELI5_UI : TECH_UI;
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        onChange(Math.min(currentIndex + 1, steps.length - 1));
      }, speed);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, currentIndex, steps.length, speed, onChange]);

  useEffect(() => {
    if (playing && currentIndex >= steps.length - 1) onPlayPause();
  }, [currentIndex, steps.length, playing, onPlayPause]);

  const current = steps[currentIndex];
  const roundName = current
    ? (ui.roundNames[phase]?.[current.round] ?? `Round ${current.round}`)
    : '';
  const pct = steps.length > 1 ? Math.round((currentIndex / (steps.length - 1)) * 100) : 0;

  const { description, detail } = current
    ? eli5Step(current.description, current.detail, eli5)
    : { description: '', detail: '' };

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e3a5f' }}
    >
      {/* Round label */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold" style={{ color: '#60a5fa' }}>
            {eli5
              ? (phase === 'dkg' ? 'Key Setup' : 'Signing')
              : (phase === 'dkg' ? 'DKG' : 'Signing')
            } — {eli5 ? 'Step' : 'Round'} {current?.round ?? '—'}
          </span>
          {roundName && (
            <span className="ml-2 text-sm" style={{ color: '#94a3b8' }}>{roundName}</span>
          )}
        </div>
        <span className="text-sm font-mono" style={{ color: '#475569' }}>
          {currentIndex + 1} / {steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full" style={{ background: '#1e293b' }}>
        <div
          className="h-2 rounded-full"
          style={{
            width: `${pct}%`,
            background: phase === 'dkg'
              ? 'linear-gradient(90deg, #3b82f6, #10b981)'
              : 'linear-gradient(90deg, #8b5cf6, #ec4899)',
            transition: 'width 0.2s',
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(currentIndex - 1, 0))}
          disabled={currentIndex === 0}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: '#0f172a', border: '1px solid #1e3a5f',
            color: currentIndex === 0 ? '#334155' : '#e2e8f0',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          ◀ {eli5 ? 'Back' : 'Prev'}
        </button>

        <button
          onClick={onPlayPause}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: playing ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
            border: `1px solid ${playing ? '#ef4444' : '#3b82f6'}`,
            color: playing ? '#fca5a5' : '#93c5fd',
            cursor: 'pointer',
          }}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>

        <button
          onClick={() => onChange(Math.min(currentIndex + 1, steps.length - 1))}
          disabled={currentIndex >= steps.length - 1}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: '#0f172a', border: '1px solid #1e3a5f',
            color: currentIndex >= steps.length - 1 ? '#334155' : '#e2e8f0',
            cursor: currentIndex >= steps.length - 1 ? 'not-allowed' : 'pointer',
          }}
        >
          {eli5 ? 'Next' : 'Next'} ▶
        </button>

        <button
          onClick={() => onChange(steps.length - 1)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all ml-auto"
          style={{ background: '#0f172a', border: '1px solid #1e3a5f', color: '#64748b', cursor: 'pointer' }}
        >
          ⏩ {eli5 ? 'Jump to end' : 'Skip'}
        </button>
      </div>

      {/* Speed slider */}
      <div className="flex items-center gap-3">
        <span className="text-sm" style={{ color: '#475569' }}>{eli5 ? 'Playback speed' : 'Speed'}</span>
        <input
          type="range" min={150} max={1500} step={50}
          value={1650 - speed}
          onChange={(e) => onSpeedChange(1650 - Number(e.target.value))}
          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: '#3b82f6' }}
        />
        <span className="text-sm font-mono w-14 text-right" style={{ color: '#94a3b8' }}>
          {(speed / 1000).toFixed(1)}s/step
        </span>
      </div>

      {/* Current step detail */}
      {current && (
        <div
          className="rounded-lg p-4 text-sm fade-in"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #0f172a' }}
        >
          <div className="font-semibold mb-2" style={{ color: '#e2e8f0' }}>{description}</div>
          <div style={{ color: '#94a3b8', lineHeight: '1.7' }}>{detail}</div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs" style={{ color: '#475569' }}>
            <span>
              {current.to_type === 'broadcast' ? (
                <span style={{ color: '#10b981' }}>
                  {eli5 ? '📢 Sent to everyone' : '↗ BROADCAST'}
                </span>
              ) : (
                <span style={{ color: '#8b5cf6' }}>
                  {eli5 ? '🤫 Private message' : '→ PRIVATE'}
                </span>
              )}
            </span>
            <span>
              {eli5
                ? `Party ${current.from_party} → ${current.to_parties.map(p => `Party ${p}`).join(', ')}`
                : `Party ${current.from_party} → ${current.to_parties.map(p => `Party ${p}`).join(', ')}`
              }
            </span>
            <span>{current.bytes} B</span>
          </div>
        </div>
      )}
    </div>
  );
}
