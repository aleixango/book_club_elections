import { useRef } from 'react';
import { haptic } from './device';

/** Tap vs long-press on the same element. Long-press does not fire the tap. */
export function useLongPress<T>(onTap: (v: T) => void, onLong: (v: T) => void, ms = 450) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return (value: T) => ({
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        haptic(15);
        onLong(value);
      }, ms);
    },
    onPointerMove: (e: React.PointerEvent) => {
      // Scrolling the strip cancels the long-press.
      if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => {
      if (fired.current) return;
      onTap(value);
    },
  });
}
