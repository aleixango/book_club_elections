import { motion } from 'motion/react';
import { useMemo } from 'react';
import type { Session } from '../domain/types';
import { useStore } from '../store/session';
import { BookCover, hashString } from '../components/BookCover';
import { Screen } from '../components/Screen';
import { TopBar } from '../components/Chrome';
import { IconArrow } from '../components/icons';

export function ProposalsDoneScreen({ session }: { session: Session }) {
  const startVoting = useStore((s) => s.startVoting);
  const restart = useStore((s) => s.restartProposals);
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
      ? 'Nadie ha propuesto ningún libro.'
      : n === 1
        ? 'Solo hay un libro: será el elegido.'
        : n === 2
          ? 'Con dos libros vamos directos a la final.'
          : n === 3
            ? 'Con tres libros empezamos en la ronda de 2 votos.'
            : 'Primera ronda: cada uno vota 3 libros. Pasan los 3 más votados.';

  return (
    <Screen>
      <TopBar title="Propuestas cerradas" sub={`${n} ${n === 1 ? 'libro' : 'libros'}`} />
      <div className="shelf-wrap">
        {n > 0 ? (
          <div className="shelves" style={{ '--rows': rows.length, '--per-row': perRow } as React.CSSProperties}>
            {rows.map((row, r) => (
              <div key={r} className="shelf">
                {row.map((b, j) => {
                  const i = r * perRow + j;
                  return (
                    <motion.div
                      key={b.id}
                      className="shelf-book"
                      initial={{ y: -220, rotate: (hashString(b.id) % 30) - 15, opacity: 0 }}
                      animate={{ y: 0, rotate: 0, opacity: 1 }}
                      transition={{ type: 'spring', damping: 13, stiffness: 140, delay: 0.15 + i * 0.07 }}
                    >
                      <BookCover book={b} width="var(--shelf-w)" eager />
                    </motion.div>
                  );
                })}
                <div className="shelf-plank" />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-hint muted">La estantería está vacía.</div>
        )}
      </div>
      <div className="footer">
        <span className="muted">{plan}</span>
        <div style={{ flex: 1 }} />
        {n === 0 ? (
          <button className="btn btn-gold btn-lg" onClick={restart}>
            Volver a proponer
          </button>
        ) : (
          <motion.button
            className="btn btn-gold btn-lg"
            onClick={startVoting}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + n * 0.07 }}
          >
            {n === 1 ? 'Ver el elegido' : '¡Empezar votación!'} <IconArrow />
          </motion.button>
        )}
      </div>
    </Screen>
  );
}
