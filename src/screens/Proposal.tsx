import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Book, Session } from '../domain/types';
import { duplicateOf, MAX_PROPOSALS } from '../domain/session';
import { searchBooks, SearchError } from '../services/books';
import { useStore } from '../store/session';
import { BookCover } from '../components/BookCover';
import { BookSheet } from '../components/BookSheet';
import { HoldButton } from '../components/HoldButton';
import { Screen } from '../components/Screen';
import { TopBar } from '../components/Chrome';
import { IconSearch, IconX } from '../components/icons';
import { useLongPress } from '../lib/useLongPress';
import { sfx } from '../lib/sfx';

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; results: Book[] }
  | { kind: 'error'; message: string };

interface Props {
  /** Session used for duplicate checks: it must not contain the books being edited. */
  session: Session;
  /** TopBar subtitle. */
  sub: string;
  onSave: (books: Book[]) => void;
  /** Present when editing outside a secret turn (review): plain save/cancel buttons. */
  onCancel?: () => void;
  initial?: Book[];
}

export function ProposalScreen({ session, sub, onSave, onCancel, initial = [] }: Props) {
  const setError = useStore((s) => s.setError);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<SearchState>({ kind: 'idle' });
  const [draft, setDraft] = useState<Book[]>(initial);
  const [detail, setDetail] = useState<Book | null>(null);
  const [focused, setFocused] = useState(false);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearch({ kind: 'idle' });
      return;
    }
    const ac = new AbortController();
    setSearch({ kind: 'loading' });
    const t = window.setTimeout(() => {
      searchBooks(q, ac.signal)
        .then((results) => setSearch({ kind: 'done', results }))
        .catch((e) => {
          if (ac.signal.aborted) return;
          setSearch({ kind: 'error', message: e instanceof SearchError ? e.message : 'Error en la cerca.' });
        });
    }, 350);
    return () => {
      ac.abort();
      window.clearTimeout(t);
    };
  }, [query, retry]);

  const reject = (b: Book, msg: string) => {
    setError(msg);
    sfx.error();
    setShakeId(b.id);
    window.setTimeout(() => setShakeId(null), 500);
  };

  const add = (b: Book) => {
    if (draft.some((d) => d.id === b.id)) {
      setDraft(draft.filter((d) => d.id !== b.id));
      sfx.deselect();
      return;
    }
    if (duplicateOf(session, b)) return reject(b, 'Aquest llibre ja està proposat. Tria’n un altre.');
    if (duplicateOf({ ...session, books: [] }, b, draft)) return reject(b, 'Ja és a la teva llista.');
    if (draft.length >= MAX_PROPOSALS) return reject(b, `Ja en tens ${MAX_PROPOSALS}. Treu-ne un per canviar-lo.`);
    sfx.select();
    setDraft([...draft, b]);
    input.current?.blur();
  };

  const press = useLongPress<Book>(add, setDetail);
  // On a landscape phone the soft keyboard leaves very little room: show only the search.
  const kb = focused && window.matchMedia('(max-height: 520px) and (pointer: coarse)').matches;

  return (
    <Screen className={kb ? 'kb' : ''}>
      {!kb && <TopBar title="Propostes" sub={sub} />}
      <div className="propose">
        <div className="propose-main">
          <div className="field">
            <span className="field-icon">
              <IconSearch />
            </span>
            <input
              ref={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Cerca per títol, autor o ISBN…"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              onKeyDown={(e) => e.key === 'Enter' && input.current?.blur()}
            />
            {search.kind === 'loading' && <span className="spinner" style={{ marginRight: 14 }} />}
            {query && search.kind !== 'loading' && (
              <button className="icon-btn" onClick={() => setQuery('')} aria-label="Esborrar" style={{ marginRight: 6 }}>
                <IconX />
              </button>
            )}
          </div>

          <div className="results">
            {search.kind === 'idle' && (
              <div className="results-empty muted">
                <IconSearch width={28} height={28} style={{ color: 'var(--gold-3)' }} />
                Escriu per cercar a Google Books i Open Library.
                <span style={{ fontSize: 12 }}>Mantén premuda una portada per veure’n la sinopsi.</span>
              </div>
            )}
            {search.kind === 'loading' && (
              <div className="strip">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="card">
                    <div className="cover result-cover">
                      <div className="cover-skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {search.kind === 'error' && (
              <div className="results-empty">
                <span>{search.message}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setRetry((r) => r + 1)}>
                  Torna-ho a provar
                </button>
              </div>
            )}
            {search.kind === 'done' && search.results.length === 0 && (
              <div className="results-empty muted">Cap resultat. Prova amb un altre títol o amb l’autor.</div>
            )}
            {search.kind === 'done' && search.results.length > 0 && (
              <div className="strip">
                {search.results.map((b, i) => {
                  const mine = draft.some((d) => d.id === b.id);
                  const taken = !mine && !!duplicateOf(session, b);
                  return (
                    <motion.button
                      type="button"
                      key={b.id}
                      className={`card ${mine ? 'selected' : ''} ${taken ? 'taken' : ''}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={shakeId === b.id ? { x: [0, -8, 8, -6, 6, 0], opacity: 1, y: 0 } : { opacity: 1, y: 0, x: 0 }}
                      transition={{ delay: shakeId === b.id ? 0 : Math.min(i * 0.035, 0.4) }}
                      {...press(b)}
                    >
                      {mine && <span className="check">✓</span>}
                      <BookCover book={b} width="var(--result-w)" className="result-cover" />
                      {taken && <span className="badge badge-dim taken-badge">Ja proposat</span>}
                      {!kb && (
                        <div style={{ width: 'var(--result-w)' }}>
                          <div className="card-title">{b.title}</div>
                          <div className="card-author">
                            {b.authors[0] ?? '—'}
                            {b.year ? ` · ${b.year}` : ''}
                          </div>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {!kb && (
          <div className="propose-side">
            <div className="eyebrow">Les teves propostes</div>
            <div className="slots">
              {Array.from({ length: MAX_PROPOSALS }, (_, i) => {
                const b = draft[i];
                return (
                  <div key={i} className="slot">
                    <AnimatePresence mode="popLayout">
                      {b ? (
                        <motion.button
                          key={b.id}
                          className="slot-book"
                          initial={{ scale: 0.3, y: -40, rotate: -12, opacity: 0 }}
                          animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
                          exit={{ scale: 0.3, opacity: 0, y: 30 }}
                          transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                          onClick={() => {
                            sfx.deselect();
                            setDraft(draft.filter((d) => d.id !== b.id));
                          }}
                          aria-label={`Treure ${b.title}`}
                        >
                          <BookCover book={b} width="100%" />
                          <span className="slot-x">
                            <IconX width={12} height={12} />
                          </span>
                        </motion.button>
                      ) : (
                        <motion.div key="empty" className="slot-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          {i + 1}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              {onCancel ? 'Toca un llibre per treure’l.' : 'Opcional. Ningú veurà qui ha proposat cada llibre fins al final.'}
            </p>
          </div>
        )}
      </div>

      {!kb && (
        <div className="footer" style={{ justifyContent: 'flex-end' }}>
          {onCancel ? (
            <>
              <button className="btn btn-ghost btn-lg" onClick={onCancel}>
                Cancel·lar
              </button>
              <button className="btn btn-gold btn-lg" onClick={() => onSave(draft)}>
                Desar {draft.length} {draft.length === 1 ? 'llibre' : 'llibres'}
              </button>
            </>
          ) : draft.length === 0 ? (
            <HoldButton className="btn btn-ghost btn-lg" onComplete={() => onSave([])} hint="mantén premut">
              No proposo res
            </HoldButton>
          ) : (
            <HoldButton onComplete={() => onSave(draft)} hint="mantén premut per desar">
              Proposar {draft.length} {draft.length === 1 ? 'llibre' : 'llibres'}
            </HoldButton>
          )}
        </div>
      )}
      <BookSheet book={detail} onClose={() => setDetail(null)} />
    </Screen>
  );
}
