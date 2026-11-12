import { useState, type CSSProperties } from 'react';
import type { Book } from '../domain/types';

const PALETTES: [string, string][] = [
  ['#1f3b2f', '#e9d8a6'],
  ['#1d2a44', '#f1e4c8'],
  ['#5a1a2b', '#f1d99c'],
  ['#c89b3c', '#1d1410'],
  ['#20494a', '#f3e7d0'],
  ['#3b2142', '#f3c9c0'],
  ['#2d2a26', '#e7b65f'],
  ['#7a2e1d', '#f6e6c9'],
];

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function paletteFor(title: string): [string, string] {
  return PALETTES[hashString(title) % PALETTES.length];
}

type CoverBook = Pick<Book, 'title' | 'authors' | 'cover' | 'coverAlt'>;

interface Props {
  book: CoverBook;
  width: number | string;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
}

export function BookCover({ book, width, className = '', style, eager }: Props) {
  // State is keyed by URL (not reset in an effect): cached images can fire onLoad before effects run.
  const [failedSrcs, setFailedSrcs] = useState<string[]>([]);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const src = [book.cover, book.coverAlt].find((s): s is string => !!s && !failedSrcs.includes(s));
  const failed = !src;
  const loaded = loadedSrc === src;
  const fail = (s: string) => setFailedSrcs((f) => [...f, s]);
  const checkImage = (img: HTMLImageElement | null) => {
    if (!img || !img.complete || !src) return;
    // Open Library returns a 1x1 image when a cover is missing.
    if (img.naturalWidth >= 10) setLoadedSrc(src);
    else if (img.naturalWidth > 0) fail(src);
  };
  const [bg, fg] = paletteFor(book.title);
  const w = typeof width === 'number' ? `${width}px` : width;

  return (
    <div className={`cover ${className}`} style={{ width: w, ...style }}>
      {failed && (
        <div
          className="cover-generated"
          style={{
            background: `linear-gradient(160deg, ${bg}, color-mix(in srgb, ${bg} 70%, black))`,
            color: fg,
            fontSize: `calc(${w} * 0.125)`,
          }}
        >
          <div>
            <div className="cg-title">{book.title}</div>
            <div className="cg-rule" />
          </div>
          <div className="cg-author">{book.authors[0] ?? ''}</div>
        </div>
      )}
      {src && (
        <>
          {!loaded && <div className="cover-skeleton" />}
          <img
            key={src}
            ref={checkImage}
            src={src}
            alt={book.title}
            draggable={false}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity .35s' }}
            onLoad={(e) => checkImage(e.currentTarget)}
            onError={() => fail(src)}
          />
        </>
      )}
    </div>
  );
}
