import type { Book } from '../domain/types';
import { paletteFor } from '../components/BookCover';

const W = 1200;
const H = 630;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => (img.naturalWidth > 10 ? resolve(img) : reject(new Error('empty')));
    img.onerror = () => reject(new Error('load'));
    img.src = src;
  });
}

/** First cover that can be drawn without tainting the canvas (needs CORS). */
async function corsCover(book: Book): Promise<HTMLImageElement | null> {
  const sources = [
    book.isbn && `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false`,
    book.cover,
    book.coverAlt,
  ].filter((s): s is string => !!s);
  for (const src of sources) {
    try {
      const img = await loadImage(src);
      const probe = document.createElement('canvas').getContext('2d')!;
      probe.drawImage(img, 0, 0, 1, 1);
      probe.getImageData(0, 0, 1, 1); // throws if tainted
      return img;
    } catch {
      /* try next */
    }
  }
  return null;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…');
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export async function renderShareImage(book: Book, proposer?: string): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createRadialGradient(240, 0, 50, 600, 315, 900);
  bg.addColorStop(0, '#5a1a2e');
  bg.addColorStop(0.55, '#1f1218');
  bg.addColorStop(1, '#100a0d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Rays behind the cover
  ctx.save();
  ctx.translate(290, 315);
  for (let i = 0; i < 18; i++) {
    ctx.rotate((Math.PI * 2) / 18);
    const g = ctx.createLinearGradient(0, 0, 0, -420);
    g.addColorStop(0, 'rgba(216,179,106,0.18)');
    g.addColorStop(1, 'rgba(216,179,106,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-40, -420);
    ctx.lineTo(40, -420);
    ctx.fill();
  }
  ctx.restore();

  // Cover
  const cw = 300;
  const ch = 450;
  const cx = 290 - cw / 2;
  const cy = 315 - ch / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.65)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;
  roundRect(ctx, cx, cy, cw, ch, 10);
  ctx.fillStyle = '#26181f';
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, cx, cy, cw, ch, 10);
  ctx.clip();
  const img = await corsCover(book);
  if (img) {
    ctx.drawImage(img, cx, cy, cw, ch);
  } else {
    const [pbg, pfg] = paletteFor(book.title);
    ctx.fillStyle = pbg;
    ctx.fillRect(cx, cy, cw, ch);
    ctx.fillStyle = pfg;
    ctx.font = '700 38px Fraunces, Georgia, serif';
    wrap(ctx, book.title, cw - 70, 6).forEach((l, i) => ctx.fillText(l, cx + 44, cy + 80 + i * 44));
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText((book.authors[0] ?? '').toUpperCase(), cx + 44, cy + ch - 40);
  }
  const spine = ctx.createLinearGradient(cx, 0, cx + 34, 0);
  spine.addColorStop(0, 'rgba(0,0,0,.45)');
  spine.addColorStop(0.35, 'rgba(255,255,255,.18)');
  spine.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spine;
  ctx.fillRect(cx, cy, 34, ch);
  ctx.restore();

  // Text
  const tx = 520;
  ctx.fillStyle = '#d8b36a';
  ctx.font = '600 20px Inter, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('EL NOSTRE PROPER LLIBRE', tx, 150);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#f4ead8';
  ctx.font = '600 64px Fraunces, Georgia, serif';
  const lines = wrap(ctx, book.title, W - tx - 60, 3);
  lines.forEach((l, i) => ctx.fillText(l, tx, 230 + i * 72));
  let y = 230 + lines.length * 72 + 4;

  ctx.fillStyle = '#d9ccb6';
  ctx.font = 'italic 400 30px Fraunces, Georgia, serif';
  if (book.authors.length) {
    ctx.fillText(wrap(ctx, book.authors.join(', '), W - tx - 60, 1)[0], tx, y);
    y += 50;
  }

  ctx.fillStyle = 'rgba(216,179,106,.5)';
  ctx.fillRect(tx, y, 80, 2);
  y += 44;

  ctx.fillStyle = '#a3907f';
  ctx.font = '500 22px Inter, sans-serif';
  const date = new Date().toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(proposer ? `Proposat per ${proposer} · ${date}` : date, tx, y);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/png'));
}

/** Shares via the Web Share API, falling back to a download. */
export async function shareWinner(book: Book, proposer?: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderShareImage(book, proposer);
  const file = new File([blob], 'proper-llibre.png', { type: 'image/png' });
  const text = `📚 El nostre proper llibre: «${book.title}»${book.authors[0] ? ` de ${book.authors[0]}` : ''}`;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
