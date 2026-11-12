import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { Participant } from '../domain/types';
import { HoldButton } from '../components/HoldButton';
import { Roulette } from '../components/Roulette';
import { Screen } from '../components/Screen';
import { TopBar } from '../components/Chrome';
import { IconCheck, IconHand } from '../components/icons';
import { sfx } from '../lib/sfx';

/** Wheel size that fits a landscape phone (height-bound) and tablets. */
export function useWheelSize() {
  const calc = () => Math.round(Math.min(window.innerHeight - 70, window.innerWidth * 0.48, 560));
  const [size, setSize] = useState(calc);
  useEffect(() => {
    const on = () => setSize(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return size;
}

interface SpinProps {
  title: string;
  sub?: string;
  heading: string;
  participants: Participant[];
  remaining: string[];
  onPicked: (id: string) => void;
}

export function SpinScreen({ title, sub, heading, participants, remaining, onPicked }: SpinProps) {
  const size = useWheelSize();
  const items = participants.filter((p) => remaining.includes(p.id)).map((p) => ({ id: p.id, label: p.name }));
  const done = participants.filter((p) => !remaining.includes(p.id));
  const last = items.length === 1;

  return (
    <Screen>
      <TopBar title={title} sub={sub} />
      <div className="spin-layout">
        <div className="spin-wheel">
          {last ? (
            <motion.div
              className="last-card"
              style={{ width: size * 0.8, height: size * 0.8 }}
              initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 14 }}
            >
              <div className="eyebrow">Último turno</div>
              <div className="display gold-text" style={{ fontSize: size * 0.13 }}>
                {items[0].label}
              </div>
              <button className="btn btn-gold" onClick={() => onPicked(items[0].id)}>
                Adelante
              </button>
            </motion.div>
          ) : (
            <Roulette items={items} onResult={onPicked} size={size} />
          )}
        </div>
        <div className="spin-side">
          <div className="eyebrow">{heading}</div>
          <h1 className="display" style={{ fontSize: 'clamp(26px, 4.6vw, 44px)' }}>
            {last ? 'Solo queda uno' : '¿A quién le toca?'}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {last ? 'Pásale el móvil.' : 'Pulsa el centro de la ruleta para elegir al azar.'}
          </p>
          <div className="spin-progress">
            <span>
              {done.length} / {participants.length}
            </span>
            <div className="bar">
              <motion.div className="bar-fill" animate={{ width: `${(done.length / participants.length) * 100}%` }} />
            </div>
          </div>
          {done.length > 0 && (
            <div className="done-chips">
              {done.map((p) => (
                <span key={p.id} className="chip chip-done">
                  <IconCheck width={12} height={12} /> {p.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Screen>
  );
}

interface HandoffProps {
  name: string;
  action: string;
  onConfirm: () => void;
}

export function HandoffScreen({ name, action, onConfirm }: HandoffProps) {
  return (
    <Screen className="screen-center curtain-bg" variant="curtain">
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
      >
        <motion.div animate={{ x: [0, 14, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }} style={{ color: 'var(--gold)' }}>
          <IconHand width={36} height={36} />
        </motion.div>
        <div className="eyebrow">Pasa el móvil a</div>
        <h1 className="display gold-text" style={{ fontSize: 'clamp(44px, 10vw, 92px)', padding: '0 8px' }}>
          {name}
        </h1>
        <p className="muted" style={{ margin: '0 0 6px' }}>
          {action}
        </p>
        <HoldButton onComplete={onConfirm} hint="mantén pulsado">
          Soy {name}
        </HoldButton>
      </motion.div>
    </Screen>
  );
}

interface CurtainProps {
  title: string;
  text: string;
  button: string;
  onNext: () => void;
}

/** Shown after a private action: nothing about what was chosen remains on screen. */
export function CurtainScreen({ title, text, button, onNext }: CurtainProps) {
  useEffect(() => {
    sfx.success();
  }, []);
  return (
    <Screen className="screen-center curtain-bg" variant="curtain">
      <motion.div
        className="seal"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 11, stiffness: 180, delay: 0.15 }}
      >
        <IconCheck width={44} height={44} />
      </motion.div>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 46px)', marginTop: 18 }}>
        {title}
      </h1>
      <p className="muted" style={{ margin: '8px 0 22px' }}>
        {text}
      </p>
      <motion.button
        className="btn btn-ghost btn-lg"
        onClick={onNext}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {button}
      </motion.button>
    </Screen>
  );
}
