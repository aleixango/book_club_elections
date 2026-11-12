/** Keeps --vvh in sync with the visual viewport so layouts shrink above the soft keyboard. */
export function installViewportHeight() {
  const set = () => {
    const vv = window.visualViewport;
    // Pinch-zoom shrinks the visual viewport: only trust it at normal scale.
    const h = vv && vv.scale <= 1.01 ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--vvh', `${Math.round(h)}px`);
  };
  // iOS Safari reports the old size for a moment after rotating: measure again once it settles.
  const settle = () => {
    set();
    window.setTimeout(set, 250);
    window.setTimeout(set, 700);
  };
  set();
  window.visualViewport?.addEventListener('resize', set);
  window.addEventListener('resize', set);
  window.addEventListener('orientationchange', settle);
  screen.orientation?.addEventListener?.('change', settle);
  window.addEventListener('pageshow', settle);
}

export function haptic(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

let wakeLock: WakeLockSentinel | null = null;

/** Keeps the screen on while the app is used (re-acquired when the tab becomes visible). */
export async function keepAwake() {
  try {
    if (!('wakeLock' in navigator) || wakeLock) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => (wakeLock = null));
  } catch {
    /* denied or unsupported */
  }
}

export function installWakeLock() {
  const acquire = () => void keepAwake();
  document.addEventListener('pointerdown', acquire, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') acquire();
  });
}

export async function enterFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o.lock?.('landscape');
  } catch {
    /* iOS / desktop: not supported */
  }
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
