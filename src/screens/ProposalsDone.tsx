import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { Book, Session } from '../domain/types';
import { useStore } from '../store/session';
import { BookCover, hashString } from '../components/BookCover';
import { BookSheet } from '../components/BookSheet';
import { Screen } from '../components/Screen';
import { TopBar } from '../components/Chrome';
import { IconArrow } from '../components/icons';

export function ProposalsDoneScreen({ session }: { session: Session }) {
  const startVoting = useStore((s) => s.startVoting);
  const restart = useStore((s) => s.restartProposals);
  const [detail, setDetail] = useState<Book | null>(null);
  const n = session.books.length;

  // Stable pseudo-random order: never the proposal (turn) order, which would hint at authorship.
  const books = useMemo(
    () => [...session.books].sort((a, b) => hashString(session.id + a.id) - hashString(session.id + b.id)),
    [session.books, session.id],
  );

  const rowCount = n > 24 ? 3 : n > 11 ? 2 : 1;
  const perRow = Math.ceil(n / rowCount);
  const rows = Array.from({ length: rowCount }, (_, r) => books.slice(r * perRow, (r + 1) * perRow));

  const plan =
    n === 0
      ? 'Ningú ha proposat cap llibre.'
      : n === 1
        ? 'Només hi ha un llibre: serà l’escollit.'
        : n === 2
          ? 'Amb dos llibres anem directes a la final.'
          : n === 3
            ? 'Amb tres llibres comencem a la ronda de 2 vots.'
            : 'Primera ronda: cadascú vota 3 llibres. Passen els 3 més votats.';

  return (
    <Screen>
      <TopBar
        title={session.preloaded ? 'Propostes del club' : 'Propostes tancades'}
        sub={`${n} ${n === 1 ? 'llibre' : 'llibres'}${n > 0 ? ' · toca una portada per llegir-ne la sinopsi' : ''}`}
      />
      <div className="shelf-wrap">
        {n > 0 ? (
          <div className="shelves" style={{ '--rows': rows.length, '--per-row': perRow } as React.CSSProperties}>
            {rows.map((row, r) => (
              <div key={r} className="shelf">
                {row.map((b, j) => {
                  const i = r * perRow + j;
                  return (
                    <motion.button
                      type="button"
                      key={b.id}
                      className="shelf-book"
                      initial={{ y: -220, rotate: (hashString(b.id) % 30) - 15, opacity: 0 }}
                      animate={{ y: 0, rotate: 0, opacity: 1 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', damping: 13, stiffness: 140, delay: 0.15 + i * 0.07 }}
                      onClick={() => setDetail(b)}
                      aria-label={b.title}
                    >
                      <BookCover book={b} width="var(--shelf-w)" eager />
                    </motion.button>
                  );
                })}
                <div className="shelf-plank" />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-hint muted">La prestatgeria és buida.</div>
        )}
      </div>
      <div className="footer">
        <span className="muted">{plan}</span>
        <div style={{ flex: 1 }} />
        {n === 0 ? (
          <button className="btn btn-gold btn-lg" onClick={restart}>
            Tornar a proposar
          </button>
        ) : (
          <motion.button
            className="btn btn-gold btn-lg"
            onClick={startVoting}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + n * 0.07 }}
          >
            {n === 1 ? 'Veure l’escollit' : 'Comencem la votació!'} <IconArrow />
          </motion.button>
        )}
      </div>
      <BookSheet book={detail} onClose={() => setDetail(null)} />
    </Screen>
  );
}
