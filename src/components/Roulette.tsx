import { animate, motion, useMotionValue, useMotionValueEvent } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cryptoRng } from '../domain/random';
import { haptic } from '../lib/device';
import { sfx } from '../lib/sfx';

export interface WheelItem {
  id: string;
  label: string;
}

interface Props {
  items: WheelItem[];
  /** Forces the landing item (e.g. the survivor of a final roulette). Random otherwise. */
  targetId?: string;
  onResult: (id: string) => void;
  size: number;
  /** Text inside the hub before spinning. */
  cta?: string;
  autoSpin?: boolean;
}

const FILLS = ['#5d1b30', '#3d1220', '#7a2540', '#2c1018'];
const R = 96;

function segmentPath(i: number, n: number): string {
  const a0 = ((i * 360) / n - 90) * (Math.PI / 180);
  const a1 = (((i + 1) * 360) / n - 90) * (Math.PI / 180);
  const large = 360 / n > 180 ? 1 : 0;
  const x0 = R * Math.cos(a0);
  const y0 = R * Math.sin(a0);
  const x1 = R * Math.cos(a1);
  const y1 = R * Math.sin(a1);
  return `M0 0 L${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
}

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

export function Roulette({ items, targetId, onResult, size, cta = 'Girar', autoSpin }: Props) {
  const n = items.length;
  const seg = 360 / n;
  const rotate = useMotionValue(0);
  const [state, setState] = useState<'idle' | 'spinning' | 'landed'>('idle');
  const [landed, setLanded] = useState<string | null>(null);
  const lastIdx = useRef(-1);

  // Index under the pointer (top) for a given rotation.
  const indexAt = (r: number) => {
    const a = (((-r % 360) + 360) % 360) / seg;
    return Math.floor(a) % n;
  };

  useMotionValueEvent(rotate, 'change', (r) => {
    const i = indexAt(r);
    if (i !== lastIdx.current) {
      lastIdx.current = i;
      if (state === 'spinning') {
        sfx.tick();
        haptic(3);
      }
    }
  });

  const spin = () => {
    if (state !== 'idle' || n === 0) return;
    const target = targetId ? items.findIndex((it) => it.id === targetId) : cryptoRng(n);
    const idx = target < 0 ? cryptoRng(n) : target;
    // Land somewhere inside the target segment, never on its edge.
    const jitter = (0.15 + (cryptoRng(1000) / 1000) * 0.7) * seg;
    const turns = 5 + cryptoRng(3);
    const current = rotate.get();
    const base = Math.ceil(current / 360) * 360;
    const final = base + turns * 360 - (idx * seg + jitter);
    setState('spinning');
    void animate(rotate, final, {
      duration: 4.6 + cryptoRng(10) / 10,
      ease: [0.1, 0.65, 0.08, 1],
      onComplete: () => {
        setState('landed');
        setLanded(items[idx].id);
        haptic([20, 50, 30]);
        sfx.reveal();
        window.setTimeout(() => onResult(items[idx].id), 1300);
      },
    });
  };

  useEffect(() => {
    if (autoSpin) {
      const t = window.setTimeout(spin, 500);
      return () => window.clearTimeout(t);
    }
  }, [autoSpin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Radial room between the hub (0.28R) and the rim: shrink long labels, then clip.
  const baseFont = n <= 4 ? 11 : n <= 8 ? 9.5 : n <= 12 ? 8 : 6.6;
  const room = R * 0.62;
  const labelFit = (label: string) => {
    const fs = Math.max(6.5, Math.min(baseFont, room / (label.length * 0.55)));
    return { fs, text: clip(label, Math.floor(room / (fs * 0.55))) };
  };
  const studs = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  return (
    <div className="wheel" style={{ width: size, height: size }}>
      <svg viewBox="-110 -110 220 220" width={size} height={size} className="wheel-svg">
        <defs>
          <radialGradient id="brass" cx="35%" cy="30%" r="80%">
            <stop offset="0" stopColor="#fbe7b0" />
            <stop offset="0.45" stopColor="#d8b36a" />
            <stop offset="1" stopColor="#7d5a22" />
          </radialGradient>
          <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f1d99c" />
            <stop offset="0.5" stopColor="#8a6428" />
            <stop offset="1" stopColor="#e9c983" />
          </linearGradient>
          <radialGradient id="shade" cx="50%" cy="50%" r="50%">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.45" />
          </radialGradient>
        </defs>

        {/* Outer rim with studs */}
        <circle r="106" fill="url(#rim)" />
        <circle r="101" fill="#1a0e13" />
        <g className={`studs ${state}`}>
          {studs.map((i) => {
            const a = ((i * 15 - 90) * Math.PI) / 180;
            return <circle key={i} className="stud" cx={103.5 * Math.cos(a)} cy={103.5 * Math.sin(a)} r="1.7" />;
          })}
        </g>

        <motion.g style={{ rotate }}>
          {items.map((it, i) => {
            const isWin = landed === it.id;
            const { fs, text } = labelFit(it.label);
            return (
              <g key={it.id}>
                <path
                  d={n === 1 ? `M0 -${R} A${R} ${R} 0 1 1 -0.01 -${R} Z` : segmentPath(i, n)}
                  fill={isWin ? '#d8b36a' : FILLS[i % FILLS.length]}
                  stroke="#d8b36a"
                  strokeOpacity={0.55}
                  strokeWidth={0.8}
                  style={{ transition: 'fill .4s' }}
                />
                <g transform={`rotate(${i * seg + seg / 2})`}>
                  <text
                    x={0}
                    y={-R * 0.6}
                    // Left half reads inwards so labels are never upside down.
                    transform={`rotate(${i * seg + seg / 2 > 180 ? 90 : -90} 0 ${-R * 0.6})`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="Fraunces, Georgia, serif"
                    fontWeight={600}
                    fontSize={fs}
                    fill={isWin ? '#2a1a10' : '#f4ead8'}
                  >
                    {text}
                  </text>
                </g>
              </g>
            );
          })}
          <circle r={R} fill="url(#shade)" pointerEvents="none" />
        </motion.g>

        {/* Pointer */}
        <g transform="translate(0 -104)">
          <path d="M-9 -6 L9 -6 L0 14 Z" fill="url(#brass)" stroke="#5b3f15" strokeWidth="0.8" />
          <circle r="3" cy="-3" fill="#fff6dc" />
        </g>
      </svg>

      <motion.button
        type="button"
        className="wheel-hub"
        onClick={spin}
        disabled={state !== 'idle'}
        whileTap={{ scale: 0.92 }}
        animate={state === 'idle' ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={state === 'idle' ? { repeat: Infinity, duration: 1.8, ease: 'easeInOut' } : { duration: 0.2 }}
        style={{ width: size * 0.25, height: size * 0.25, fontSize: Math.max(12, size * 0.045) }}
      >
        {state === 'idle' ? cta : state === 'spinning' ? '' : '★'}
      </motion.button>
    </div>
  );
}
