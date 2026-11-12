/** Keeps --vvh in sync with the visual viewport so layouts shrink above the soft keyboard. */
export function installViewportHeight() {
  const set = () => {
    const h = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--vvh', `${h}px`);
  };
  set();
  window.visualViewport?.addEventListener('resize', set);
  window.addEventListener('resize', set);
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
