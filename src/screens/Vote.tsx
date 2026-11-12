import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef, useState } from 'react';
import type { Book, Round, Session } from '../domain/types';
import { bookById } from '../domain/session';
import { shuffle } from '../domain/random';
import { roundLabel } from '../domain/rounds';
import { useStore } from '../store/session';
import { BookCover } from '../components/BookCover';
import { BookSheet } from '../components/BookSheet';
import { HoldButton } from '../components/HoldButton';
import { Screen } from '../components/Screen';
import { TopBar } from '../components/Chrome';
import { useLongPress } from '../lib/useLongPress';
import { sfx } from '../lib/sfx';

interface Props {
  session: Session;
  round: Round;
  voterName: string;
  voterId: string;
}

export function VoteScreen({ session, round, voterName, voterId }: Props) {
  const castVote = useStore((s) => s.castVote);
  const setError = useStore((s) => s.setError);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Book | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const n = round.votesPerVoter;

  // A fresh random order for every voter avoids position bias.
  const books = useMemo(
    () => shuffle(round.candidates).map((id) => bookById(session, id)!).filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round.id, voterId],
  );

  // Source of truth for rapid taps (state updates are async).
  const current = useRef<string[]>([]);
  const commit = (next: string[]) => {
    current.current = next;
    setSelected(next);
  };

  const toggle = (b: Book) => {
    const sel = current.current;
    if (sel.includes(b.id)) {
      sfx.deselect();
      commit(sel.filter((x) => x !== b.id));
      return;
    }
    if (n === 1) {
      sfx.select();
      commit([b.id]);
      return;
    }
    if (sel.length >= n) {
      sfx.error();
      setError(`Ya has elegido ${n}. Toca uno para quitarlo.`);
      setShake(b.id);
      window.setTimeout(() => setShake(null), 450);
      return;
    }
    sfx.select();
    commit([...sel, b.id]);
  };

  const press = useLongPress<Book>(toggle, setDetail);
  const duel = books.length === 2;
  const label = roundLabel(round);
  const instruction =
    round.rule === 'tiebreak' ? 'Elige 1 de los empatados' : n === 1 ? 'Elige tu favorito' : `Elige ${n} libros`;

  return (
    <Screen>
      <TopBar title={label} sub={`${voterName} · ${instruction}`} />
      <div className={`vote ${duel ? 'duel' : ''}`}>
        <div className={duel ? 'duel-row' : 'strip vote-strip'}>
          {books.map((b, i) => {
            const on = selected.includes(b.id);
            const order = selected.indexOf(b.id);
            return (
              <motion.button
                type="button"
                key={b.id}
                className={`card vote-card ${on ? 'selected' : ''} ${selected.length >= n && !on ? 'dimmed' : ''}`}
                initial={{ opacity: 0, y: 30, rotate: duel ? (i ? 4 : -4) : 0 }}
                animate={
                  shake === b.id
                    ? { x: [0, -8, 8, -5, 5, 0], opacity: 1, y: 0 }
                    : { opacity: 1, y: on ? -10 : 0, x: 0, rotate: duel ? (i ? 3 : -3) : 0 }
                }
                transition={{ type: 'spring', damping: 18, stiffness: 240, delay: shake ? 0 : Math.min(i * 0.04, 0.5) }}
                {...press(b)}
              >
                <AnimatePresence>
                  {on && (
                    <motion.span
                      className="check"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', damping: 12 }}
                    >
                      {n > 1 ? order + 1 : '✓'}
                    </motion.span>
                  )}
                </AnimatePresence>
                <BookCover book={b} width={duel ? 'var(--duel-w)' : 'var(--vote-w)'} />
                <div style={{ width: duel ? 'var(--duel-w)' : 'var(--vote-w)' }}>
                  <div className="card-title">{b.title}</div>
                  <div className="card-author">{b.authors[0] ?? '—'}</div>
                </div>
              </motion.button>
            );
          })}
          {duel && (
            <motion.div className="vs" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}>
              vs
            </motion.div>
          )}
        </div>
      </div>
      <div className="footer">
        <div className="pips" aria-label={`${selected.length} de ${n}`}>
          {Array.from({ length: n }, (_, i) => (
            <motion.span key={i} className={`pip ${i < selected.length ? 'on' : ''}`} animate={{ scale: i < selected.length ? [1, 1.4, 1] : 1 }} />
          ))}
        </div>
        <span className="muted" style={{ fontSize: 13 }}>
          {selected.length < n ? `${n - selected.length} por elegir · mantén pulsada una portada para ver la sinopsis` : 'Listo para votar'}
        </span>
        <div style={{ flex: 1 }} />
        <HoldButton
          disabled={selected.length !== n}
          onDisabledPress={() => setError(n === 1 ? 'Elige un libro' : `Elige exactamente ${n} libros`)}
          onComplete={() => castVote(selected)}
          hint="mantén pulsado"
        >
          Votar
        </HoldButton>
      </div>
      <BookSheet book={detail} onClose={() => setDetail(null)} />
    </Screen>
  );
}
