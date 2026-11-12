import { animate, motion, useMotionValue, type AnimationPlaybackControls } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { haptic } from '../lib/device';
import { sfx } from '../lib/sfx';

interface Props {
  children: ReactNode;
  onComplete: () => void;
  disabled?: boolean;
  duration?: number;
  className?: string;
  hint?: string;
  onDisabledPress?: () => void;
}

/** Press and hold to confirm: prevents accidental taps while the phone changes hands. */
export function HoldButton({ children, onComplete, disabled, duration = 0.85, className = 'btn btn-gold btn-lg', hint, onDisabledPress }: Props) {
  const progress = useMotionValue(0);
  const ctrl = useRef<AnimationPlaybackControls | null>(null);
  const done = useRef(false);

  useEffect(() => () => ctrl.current?.stop(), []);

  const start = () => {
    if (disabled) {
      onDisabledPress?.();
      return;
    }
    done.current = false;
    haptic(8);
    ctrl.current?.stop();
    ctrl.current = animate(progress, 1, {
      duration: duration * (1 - progress.get()),
      ease: 'linear',
      onComplete: () => {
        if (done.current) return;
        done.current = true;
        haptic([10, 40, 20]);
        sfx.success();
        onComplete();
      },
    });
  };

  const cancel = () => {
    if (done.current) return;
    ctrl.current?.stop();
    ctrl.current = animate(progress, 0, { duration: 0.25, ease: 'easeOut' });
  };

  return (
    <motion.button
      type="button"
      className={`${className} hold`}
      aria-disabled={disabled}
      style={{ opacity: disabled ? 0.4 : 1 }}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        start();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={cancel}
      whileTap={disabled ? undefined : { scale: 0.97 }}
    >
      <motion.span className="hold-fill" style={{ scaleX: progress }} />
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{children}</span>
        {hint && !disabled && <span className="hold-hint">{hint}</span>}
      </span>
    </motion.button>
  );
}
