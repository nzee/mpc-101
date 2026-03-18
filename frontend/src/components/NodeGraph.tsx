import { useRef } from 'react';
import type { ProtocolEvent } from '../types';
import { useELI5 } from '../ELI5Context';
import { eli5Step } from '../eli5';

interface Props {
  currentStep: ProtocolEvent | null;
  completedParties: Set<number>;
  phase: string;
}

// Node positions in the SVG (equilateral triangle)
const NODES = [
  { id: 0, cx: 300, cy: 90,  label: 'Party 0' },
  { id: 1, cx: 100, cy: 380, label: 'Party 1' },
  { id: 2, cx: 500, cy: 380, label: 'Party 2' },
];

const EDGES = [
  { from: 0, to: 1 },
  { from: 0, to: 2 },
  { from: 1, to: 2 },
];

const NODE_R = 38;

function midpoint(a: typeof NODES[0], b: typeof NODES[0]) {
  return { x: (a.cx + b.cx) / 2, y: (a.cy + b.cy) / 2 };
}

export default function NodeGraph({ currentStep, completedParties, phase }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const eli5 = useELI5();

  // Find which edges are "active" in the current step
  const activeEdges: Array<{ from: number; to: number; color: string }> = [];
  if (currentStep) {
    const color = currentStep.to_type === 'broadcast' ? '#10b981' : '#8b5cf6';
    for (const to of currentStep.to_parties) {
      activeEdges.push({ from: currentStep.from_party, to, color });
    }
  }

  const isEdgeActive = (f: number, t: number) =>
    activeEdges.some(
      (e) => (e.from === f && e.to === t) || (e.from === t && e.to === f)
    );

  const edgeColor = (f: number, t: number) => {
    const edge = activeEdges.find(
      (e) => (e.from === f && e.to === t) || (e.from === t && e.to === f)
    );
    return edge?.color ?? '#1e3a5f';
  };

  // Track animation key so we re-trigger on step change
  const animKey = currentStep
    ? `${currentStep.round}-${currentStep.from_party}-${currentStep.to_parties.join(',')}`
    : 'idle';

  const isDkgDone = phase === 'dkg_complete' || phase === 'sign_loading' ||
                    phase === 'sign_animating' || phase === 'sign_complete' || phase === 'verified';

  return (
    <div className="relative w-full flex justify-center">
      <svg
        ref={svgRef}
        viewBox="0 0 600 480"
        className="w-full"
        style={{ filter: 'drop-shadow(0 0 40px rgba(59,130,246,0.08))' }}
      >
        {/* Background grid dots */}
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#1e293b" opacity="0.6" />
          </pattern>
          <marker id="arrowBroadcast" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#10b981" />
          </marker>
          <marker id="arrowPrivate" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#8b5cf6" />
          </marker>
          <marker id="arrowDim" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#1e3a5f" />
          </marker>
        </defs>

        <rect width="600" height="480" fill="url(#grid)" opacity="0.4" rx="12" />

        {/* Edges */}
        {EDGES.map(({ from, to }) => {
          const a = NODES[from];
          const b = NODES[to];
          const active = isEdgeActive(from, to);
          const color = edgeColor(from, to);
          const isPrivate = currentStep?.to_type === 'private' && active;
          const mid = midpoint(a, b);

          // Shorten line to not overlap node circles
          const dx = b.cx - a.cx;
          const dy = b.cy - a.cy;
          const len = Math.sqrt(dx * dx + dy * dy);
          const pad = NODE_R + 4;
          const x1 = a.cx + (dx / len) * pad;
          const y1 = a.cy + (dy / len) * pad;
          const x2 = b.cx - (dx / len) * pad;
          const y2 = b.cy - (dy / len) * pad;

          const markerId = active
            ? isPrivate ? 'arrowPrivate' : 'arrowBroadcast'
            : 'arrowDim';

          return (
            <g key={`${from}-${to}`}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color}
                strokeWidth={active ? 2.5 : 1}
                strokeDasharray={isPrivate ? '6 4' : undefined}
                opacity={active ? 1 : 0.2}
                markerEnd={`url(#${markerId})`}
                style={{ transition: 'stroke 0.25s, opacity 0.25s' }}
              />
              {active && (
                <AnimatedDot key={animKey + `${from}-${to}`} x1={x1} y1={y1} x2={x2} y2={y2} color={color} />
              )}
              {active && currentStep && (
                <text
                  x={mid.x}
                  y={mid.y - 10}
                  textAnchor="middle"
                  fill={color}
                  fontSize="10"
                  fontFamily="monospace"
                  opacity={0.9}
                >
                  {currentStep.to_type === 'broadcast'
                    ? (eli5 ? 'TO ALL' : 'BCAST')
                    : (eli5 ? 'PRIVATE' : 'PRIV')
                  } {currentStep.bytes}B
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {NODES.map((node) => {
          const isActive = currentStep?.from_party === node.id ||
                           currentStep?.to_parties.includes(node.id);
          const isDone = completedParties.has(node.id);

          return (
            <g key={node.id} className={isActive ? 'node-active' : ''}>
              {/* Outer glow ring */}
              <circle
                cx={node.cx} cy={node.cy} r={NODE_R + 8}
                fill="none"
                stroke={isActive ? '#3b82f6' : isDkgDone ? '#10b981' : '#1e3a5f'}
                strokeWidth={isActive ? 1.5 : 1}
                opacity={isActive ? 0.5 : 0.2}
                style={{ transition: 'stroke 0.3s, opacity 0.3s' }}
              />
              {/* Main circle */}
              <circle
                cx={node.cx} cy={node.cy} r={NODE_R}
                fill={isActive ? '#1e3a8a' : isDkgDone ? '#14532d' : '#0f172a'}
                stroke={isActive ? '#3b82f6' : isDkgDone ? '#10b981' : '#1e3a5f'}
                strokeWidth={isActive ? 2 : 1.5}
                style={{ transition: 'fill 0.3s, stroke 0.3s' }}
              />
              {/* Party label */}
              <text
                x={node.cx} y={node.cy - 6}
                textAnchor="middle"
                fill={isActive ? '#93c5fd' : isDkgDone ? '#6ee7b7' : '#64748b'}
                fontSize="15"
                fontWeight="600"
                fontFamily="monospace"
              >
                Party {node.id}
              </text>
              {/* Status indicator */}
              <text
                x={node.cx} y={node.cy + 13}
                textAnchor="middle"
                fill={isDone ? '#6ee7b7' : isActive ? '#fbbf24' : '#334155'}
                fontSize="12"
              >
                {isDone ? '✓ done' : isActive ? '● active' : '○ idle'}
              </text>
              {/* Coordinator badge */}
              {currentStep?.to_type === 'private' && currentStep?.to_parties.includes(node.id) && (
                <text
                  x={node.cx} y={node.cy + 30}
                  textAnchor="middle"
                  fill="#a78bfa"
                  fontSize="11"
                >
                  coordinator
                </text>
              )}
            </g>
          );
        })}

        {/* Step description overlay at top */}
        {currentStep && (() => {
          const { description, detail } = eli5Step(currentStep.description, currentStep.detail, eli5);
          return (
            <g>
              <rect x="10" y="10" width="580" height="58" rx="8"
                fill="rgba(15,23,42,0.85)" stroke="#1e3a5f" strokeWidth="1" />
              <text x="20" y="33" fill="#e2e8f0" fontSize="14" fontWeight="600">
                {description}
              </text>
              <text x="20" y="53" fill="#94a3b8" fontSize="12">
                {detail.slice(0, 90)}{detail.length > 90 ? '…' : ''}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

/** A dot that animates from (x1,y1) to (x2,y2) */
function AnimatedDot({
  x1, y1, x2, y2, color
}: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  return (
    <circle r="5" fill={color} opacity="0.9">
      <animateMotion dur="0.6s" fill="freeze" repeatCount="1">
        <mpath />
        <animateMotion
          path={`M${x1},${y1} L${x2},${y2}`}
          dur="0.5s"
          fill="freeze"
        />
      </animateMotion>
    </circle>
  );
}
