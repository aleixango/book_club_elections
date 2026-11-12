import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { Session } from '../domain/types';
import { bookById, proposerOf } from '../domain/session';
import { roundLabel } from '../domain/rounds';
import { useStore, type HistoryEntry } from '../store/session';
import { BookCover } from '../components/BookCover';
import { Confetti } from '../components/Confetti';
import { HoldButton } from '../components/HoldButton';
import { Screen } from '../components/Screen';
import { TopBar } from '../components/Chrome';
import { IconBack, IconBooks, IconShare, IconX } from '../components/icons';
import { shareWinner } from '../share/shareImage';
import { sfx } from '../lib/sfx';
import { haptic } from '../lib/device';

interface Props {
  session: Session;
  bookId: string;
  byRoulette: boolean;
  onNew: () => void;
  onHome: () => void;
}

export function WinnerScreen({ session, bookId, byRoulette, onNew, onHome }: Props) {
  const book = bookById(session, bookId)!;
  const proposer = proposerOf(session, book);
  const setError = useStore((s) => s.setError);
  const discard = useStore((s) => s.discard);
  const [sharing, setSharing] = useState(false);
  const [all, setAll] = useState(false);

  useEffect(() => {
    sfx.fanfare();
    haptic([30, 60, 30, 60, 80]);
  }, []);

  // The winner's path through the rounds.
  const path = session.log
    .filter((l) => l.round.candidates.includes(bookId))
    .map((l) => ({ label: roundLabel(l.round), votes: l.round.tally[bookId] ?? 0 }));

  const share = async () => {
    setSharing(true);
    try {
      const r = await shareWinner(book, proposer);
      if (r === 'downloaded') setError('Imatge descarregada');
    } catch {
      setError('No s’ha pogut generar la imatge');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen className="winner">
      <Confetti />
      <div className="winner-stage">
        <div className="winner-cover">
          <motion.div className="rays" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 40, ease: 'linear' }} />
          <motion.div
            initial={{ scale: 0.2, rotateY: 180, opacity: 0 }}
            animate={{ scale: 1, rotateY: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 90, delay: 0.2 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <motion.div animate={{ y: [0, -8, 0], rotate: [-1.5, 1.5, -1.5] }} transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}>
              <BookCover book={book} width="var(--winner-w)" className="winner-book" eager />
            </motion.div>
          </motion.div>
        </div>
        <div className="winner-text">
          <motion.div className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            El nostre proper llibre
          </motion.div>
          <motion.h1
            className="display"
            style={{ fontSize: 'clamp(28px, 5.4vw, 56px)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7 }}
          >
            {book.title}
          </motion.h1>
          <motion.div className="muted" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 19 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
            {book.authors.join(', ')}
          </motion.div>
          <motion.div className="winner-meta" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}>
            {proposer && (
              <span className="badge" style={{ height: 28, fontSize: 13 }}>
                Proposat per <strong style={{ color: 'var(--paper)' }}>{proposer}</strong>
              </span>
            )}
            {byRoulette && <span className="badge">Decidit per la ruleta</span>}
          </motion.div>
          {path.length > 0 && (
            <motion.div className="path" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.1 }}>
              {path.map((p, i) => (
                <span key={i} className="path-step">
                  <span className="muted">{p.label}</span> <strong>{p.votes}</strong>
                  {i < path.length - 1 && <span className="path-sep">›</span>}
                </span>
              ))}
            </motion.div>
          )}
          <motion.div className="winner-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.3 }}>
            <button className="btn btn-gold" onClick={share} disabled={sharing}>
              {sharing ? <span className="spinner" /> : <IconShare />} Compartir
            </button>
            <button className="btn btn-ghost" onClick={() => setAll(true)}>
              <IconBooks /> Totes les propostes
            </button>
            <HoldButton
              className="btn btn-ghost"
              duration={0.6}
              onComplete={() => {
                discard();
                onNew();
              }}
            >
              Nova votació
            </HoldButton>
            <button
              className="icon-btn"
              aria-label="Inici"
              onClick={() => {
                discard();
                onHome();
              }}
            >
              <IconBack />
            </button>
          </motion.div>
        </div>
      </div>
      <AllProposals session={session} open={all} onClose={() => setAll(false)} winnerId={bookId} />
    </Screen>
  );
}

/** Voters (with or without proposals) plus proposers who did not vote. */
function proposerGroups(session: Session): { name: string; books: Session['books'] }[] {
  const groups = session.participants.map((p) => ({ name: p.name, books: session.books.filter((b) => b.proposedBy === p.id) }));
  for (const b of session.books) {
    if (b.proposedBy || !b.proposerName) continue;
    const g = groups.find((x) => x.name === b.proposerName);
    if (g) g.books.push(b);
    else groups.push({ name: b.proposerName, books: [b] });
  }
  return groups;
}

function AllProposals({ session, open, onClose, winnerId }: { session: Session; open: boolean; onClose: () => void; winnerId: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="sheet"
            style={{ flexDirection: 'column', gap: 12, width: 'min(900px, 100%)' }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h3 className="display" style={{ fontSize: 20, flex: 1 }}>
                Qui va proposar què
              </h3>
              <button className="icon-btn" onClick={onClose} aria-label="Tancar">
                <IconX />
              </button>
            </div>
            <div className="strip" style={{ padding: '4px 2px 8px' }}>
              {proposerGroups(session).map(({ name, books }) => {
                return (
                  <div key={name} className="proposer-col">
                    <div className="proposer-name">{name}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {books.length === 0 && <span className="muted" style={{ fontSize: 12 }}>Sense propostes</span>}
                      {books.map((b) => (
                        <div key={b.id} className={b.id === winnerId ? 'proposer-win' : ''} title={b.title}>
                          <BookCover book={b} width={54} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function HistoryScreen({ onBack }: { onBack: () => void }) {
  const history = useStore((s) => s.history);
  const clear = useStore((s) => s.clearHistory);
  return (
    <Screen>
      <TopBar
        title="Historial"
        sub={`${history.length} ${history.length === 1 ? 'llibre' : 'llibres'}`}
        menu={false}
        right={
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            <IconBack /> Inici
          </button>
        }
      />
      <div className="history">
        {history.length === 0 ? (
          <div className="empty-hint muted">Encara no s’ha escollit cap llibre.</div>
        ) : (
          <div className="strip" style={{ alignItems: 'flex-end', height: '100%' }}>
            {history.map((h: HistoryEntry, i) => (
              <motion.div
                key={h.id}
                className="card history-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <BookCover book={h.book} width="var(--history-w)" />
                <div style={{ width: 'var(--history-w)' }}>
                  <div className="card-title">{h.book.title}</div>
                  <div className="card-author">{new Date(h.date).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  {h.proposer && <div className="card-author">de {h.proposer}</div>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      {history.length > 0 && (
        <div className="footer" style={{ justifyContent: 'flex-end' }}>
          <HoldButton className="btn btn-ghost btn-sm" duration={1.2} onComplete={clear}>
            Esborrar l’historial
          </HoldButton>
        </div>
      )}
    </Screen>
  );
}
