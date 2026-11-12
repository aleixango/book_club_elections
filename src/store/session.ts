import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Book, Session } from '../domain/types';
import * as S from '../domain/session';
import { bookById, proposerOf } from '../domain/session';

export interface HistoryEntry {
  id: string;
  date: number;
  book: Book;
  proposer?: string;
  participants: number;
  books: number;
  byRoulette: boolean;
}

interface State {
  session: Session | null;
  history: HistoryEntry[];
  /** Participants of the last session, to prefill the next one. */
  lastNames: string[];
  muted: boolean;
  /** Last domain error, shown as a toast. */
  error: string | null;
  setMuted: (m: boolean) => void;
  setError: (e: string | null) => void;
  start: (names: string[]) => void;
  /** Starts a session whose proposals were gathered outside the app. */
  startWithProposals: (names: string[], books: S.PreloadedBook[]) => void;
  discard: () => void;
  pickTurn: (id: string) => void;
  confirmIdentity: () => void;
  endTurn: () => void;
  submitProposals: (books: Book[]) => void;
  restartProposals: () => void;
  startVoting: () => void;
  castVote: (ids: string[]) => void;
  revealResults: () => void;
  continueAfterResults: () => void;
  applyRoulette: (eliminated: string) => void;
  clearError: () => void;
  clearHistory: () => void;
}

const storage = createJSONStorage(() => {
  try {
    const k = '__probe__';
    localStorage.setItem(k, k);
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    // Private mode / blocked storage: keep working in memory.
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  }
});

function recordWinner(session: Session, history: HistoryEntry[]): HistoryEntry[] {
  if (session.phase.kind !== 'winner') return history;
  if (history.some((h) => h.id === session.id)) return history;
  const book = bookById(session, session.phase.bookId);
  if (!book) return history;
  return [
    {
      id: session.id,
      date: Date.now(),
      book,
      proposer: proposerOf(session, book),
      participants: session.participants.length,
      books: session.books.length,
      byRoulette: session.phase.byRoulette,
    },
    ...history,
  ].slice(0, 50);
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Applies a pure domain transition, surfacing rule violations as a toast. */
      const apply = (fn: (s: Session) => Session) => {
        const { session, history } = get();
        if (!session) return;
        try {
          const next = fn(session);
          set({ session: next, history: recordWinner(next, history), error: null });
        } catch (e) {
          if (e instanceof S.SessionError) set({ error: e.message });
          else throw e;
        }
      };
      return {
        session: null,
        history: [],
        lastNames: [],
        muted: false,
        error: null,
        setMuted: (muted) => set({ muted }),
        setError: (error) => set({ error }),
        start: (names) => get().startWithProposals(names, []),
        startWithProposals: (names, books) => {
          try {
            const session = books.length ? S.createPreloadedSession(names, books) : S.createSession(names);
            set({ session, lastNames: session.participants.map((p) => p.name), error: null });
          } catch (e) {
            if (e instanceof S.SessionError) set({ error: e.message });
            else throw e;
          }
        },
        discard: () => set({ session: null, error: null }),
        pickTurn: (id) => apply((s) => S.pickTurn(s, id)),
        confirmIdentity: () => apply(S.confirmIdentity),
        endTurn: () => apply(S.endTurn),
        submitProposals: (books) => apply((s) => S.submitProposals(s, books)),
        restartProposals: () => apply(S.restartProposals),
        startVoting: () => apply(S.startVoting),
        castVote: (ids) => apply((s) => S.castVote(s, ids)),
        revealResults: () => apply(S.revealResults),
        continueAfterResults: () => apply(S.continueAfterResults),
        applyRoulette: (id) => apply((s) => S.applyRoulette(s, id)),
        clearError: () => set({ error: null }),
        clearHistory: () => set({ history: [] }),
      };
    },
    {
      name: 'bookclub-vote',
      version: 1,
      storage,
      partialize: (s) => ({ session: s.session, history: s.history, lastNames: s.lastNames, muted: s.muted }),
    },
  ),
);

if (import.meta.env.DEV) (window as unknown as { __store: typeof useStore }).__store = useStore;

// localStorage hydration is synchronous: a turn interrupted mid-way goes back to its hand-off screen.
{
  const { session } = useStore.getState();
  if (session) useStore.setState({ session: S.resumeTurn(session) });
}
