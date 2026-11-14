import { motion } from 'motion/react';
import { useState } from 'react';
import type { Book, Session } from '../domain/types';
import { MAX_PROPOSALS } from '../domain/session';
import { useStore } from '../store/session';
import { BookCover } from '../components/BookCover';
import { Screen } from '../components/Screen';
import { TopBar } from '../components/Chrome';
import { IconArrow } from '../components/icons';
import { ProposalScreen } from './Proposal';
import { sfx } from '../lib/sfx';

/** Public review of the preloaded proposals: anyone can change a person's books before the vote. */
export function ReviewScreen({ session }: { session: Session }) {
  const setProposals = useStore((s) => s.setProposals);
  const finish = useStore((s) => s.finishReview);
  const [editing, setEditing] = useState<string | null>(null);
  const booksOf = (id: string) => session.books.filter((b) => b.proposedBy === id);

  const person = session.participants.find((p) => p.id === editing);
  if (person) {
    const close = () => setEditing(null);
    return (
      <ProposalScreen
        key={person.id}
        // Duplicate checks ignore the books being edited.
        session={{ ...session, books: session.books.filter((b) => b.proposedBy !== person.id) }}
        sub={`Propostes de ${person.name}`}
        initial={booksOf(person.id)}
        onCancel={close}
        onSave={(books: Book[]) => {
          const before = useStore.getState().session;
          setProposals(person.id, books);
          // Only close if the store accepted the change (errors show a toast and keep the editor open).
          if (useStore.getState().session !== before) {
            sfx.success();
            close();
          }
        }}
      />
    );
  }

  const n = session.participants.length;
  const cols = n <= 3 ? n : n <= 8 ? 4 : 5;
  const rows = Math.ceil(n / cols);
  const total = session.books.length;

  return (
    <Screen>
      <TopBar title="Revisar propostes" sub="toca una persona per canviar-ne els llibres" />
      <div className="review" style={{ '--cols': cols, '--rows': rows } as React.CSSProperties}>
        {session.participants.map((p, i) => {
          const books = booksOf(p.id);
          return (
            <motion.button
              type="button"
              key={p.id}
              className="review-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                sfx.tap();
                setEditing(p.id);
              }}
            >
              <div className="review-head">
                <span className="chip-avatar">{p.name[0]?.toLocaleUpperCase('ca')}</span>
                <span className="review-name">{p.name}</span>
                {books.length === 0 && <span className="badge">Nou</span>}
              </div>
              <div className="review-books">
                {Array.from({ length: MAX_PROPOSALS }, (_, j) =>
                  books[j] ? (
                    <BookCover key={books[j].id} book={books[j]} width="var(--rv-w)" eager />
                  ) : (
                    <span key={j} className="review-empty">
                      +
                    </span>
                  ),
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
      <div className="footer">
        <span className="muted">
          {total} {total === 1 ? 'llibre' : 'llibres'} en total.
        </span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-gold btn-lg" disabled={total === 0} onClick={finish}>
          Veure les propostes <IconArrow />
        </button>
      </div>
    </Screen>
  );
}
