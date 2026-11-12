import { useEffect, useRef } from 'react';

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  page: boolean;
  wobble: number;
}

const COLORS = ['#f1d99c', '#d8b36a', '#a8853f', '#f4ead8', '#8e2c47', '#e8c4a0'];

/** Falling gold confetti and little book pages. */
export function Confetti({ bursts = 3 }: { bursts?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const pieces: Piece[] = [];
    const burst = (cx: number) => {
      for (let i = 0; i < 90; i++) {
        const page = Math.random() < 0.18;
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        const sp = 6 + Math.random() * 9;
        pieces.push({
          x: cx,
          y: H + 10,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp * 1.25,
          w: page ? 14 : 5 + Math.random() * 5,
          h: page ? 18 : 3 + Math.random() * 6,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          color: page ? '#f4ead8' : COLORS[(Math.random() * COLORS.length) | 0],
          page,
          wobble: Math.random() * 10,
        });
      }
    };
    const timers: number[] = [];
    for (let b = 0; b < bursts; b++) {
      timers.push(window.setTimeout(() => burst(W * (0.2 + 0.6 * ((b % 3) / 2))), b * 380));
    }

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.vy += 0.22;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.wobble += 0.12;
        p.x += p.vx + Math.sin(p.wobble) * (p.page ? 1.2 : 0.5);
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > H + 40 && p.vy > 0) {
          pieces.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.wobble));
        ctx.fillStyle = p.color;
        if (p.page) {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.fillStyle = 'rgba(120,90,60,.45)';
          for (let l = 0; l < 4; l++) ctx.fillRect(-p.w / 2 + 3, -p.h / 2 + 4 + l * 3.4, p.w - 6, 0.8);
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', resize);
    };
  }, [bursts]);

  return <canvas ref={ref} className="confetti" />;
}
