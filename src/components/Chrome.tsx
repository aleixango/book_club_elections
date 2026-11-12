import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore } from '../store/session';
import { HoldButton } from './HoldButton';
import { IconMore, IconMute, IconSound, IconX } from './icons';

/** Animated background with floating gold dust. */
export function Backdrop() {
  const dust = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2.4,
        dur: 14 + Math.random() * 16,
        delay: -Math.random() * 20,
      })),
    [],
  );
  return (
    <div className="backdrop" aria-hidden>
      {dust.map((d) => (
        <motion.span
          key={d.i}
          className="dust"
          style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size }}
          animate={{ y: [0, -40, 0], x: [0, 12, 0], opacity: [0, 0.7, 0] }}
          transition={{ duration: d.dur, repeat: Infinity, delay: d.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export function RotateOverlay() {
  return (
    <div className="rotate" role="alert">
      <div className="rotate-phone" />
      <div>
        <h2 className="display" style={{ fontSize: 26 }}>
          Gira el mòbil
        </h2>
        <p className="muted" style={{ marginTop: 8 }}>
          Aquesta app es fa servir en horitzontal.
        </p>
      </div>
    </div>
  );
}

export function Toast() {
  const error = useStore((s) => s.error);
  const clear = useStore((s) => s.clearError);
  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(clear, 3200);
    return () => window.clearTimeout(t);
  }, [error, clear]);
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          className="toast"
          role="status"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          onClick={clear}
        >
          <span style={{ color: 'var(--danger)' }}>●</span>
          {error}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface TopBarProps {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  menu?: boolean;
}

export function TopBar({ title, sub, right, menu = true }: TopBarProps) {
  const muted = useStore((s) => s.muted);
  const setMuted = useStore((s) => s.setMuted);
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="topbar">
        <div className="topbar-title">
          <span className="star">✦</span>
          {title}
        </div>
        {sub && <div className="topbar-sub">· {sub}</div>}
        <div className="topbar-spacer" />
        {right}
        <button className="icon-btn" onClick={() => setMuted(!muted)} aria-label={muted ? 'Activar el so' : 'Silenciar'}>
          {muted ? <IconMute /> : <IconSound />}
        </button>
        {menu && (
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Menú">
            <IconMore />
          </button>
        )}
      </div>
      <SessionMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SessionMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const discard = useStore((s) => s.discard);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="sheet"
            style={{ width: 'min(440px, 100%)', flexDirection: 'column', gap: 14, alignItems: 'stretch' }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h3 className="display" style={{ fontSize: 20, flex: 1 }}>
                Abandonar la votació
              </h3>
              <button className="icon-btn" onClick={onClose} aria-label="Tancar">
                <IconX />
              </button>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Es perdran les propostes i els vots d’aquesta sessió. No es pot desfer.
            </p>
            <HoldButton
              className="btn btn-wine"
              hint="mantén premut"
              duration={1.2}
              onComplete={() => {
                onClose();
                discard();
              }}
            >
              Abandonar
            </HoldButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
