import type { Book, Participant, Phase, Round, Session, Turn } from './types';
import { firstRound, minus1Round, resolveRound, survivorsAfterRoulette, tiebreakRound } from './rounds';
import { findDuplicate } from './dedupe';
import { cryptoRng, shuffle, uid, type Rng } from './random';

export const MIN_PARTICIPANTS = 2;
export const MAX_PARTICIPANTS = 15;
export const MAX_PROPOSALS = 3;

export class SessionError extends Error {}

function fail(msg: string): never {
  throw new SessionError(msg);
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function validateNames(names: string[]): string | null {
  const clean = names.map(normalizeName).filter(Boolean);
  if (clean.length < MIN_PARTICIPANTS) return `Calen almenys ${MIN_PARTICIPANTS} participants`;
  if (clean.length > MAX_PARTICIPANTS) return `Màxim ${MAX_PARTICIPANTS} participants`;
  const seen = new Set<string>();
  for (const n of clean) {
    const k = n.toLocaleLowerCase('ca');
    if (seen.has(k)) return `«${n}» està repetit`;
    seen.add(k);
  }
  return null;
}

function newTurn(participants: Participant[]): Turn {
  return { remaining: participants.map((p) => p.id), current: null, step: 'spin' };
}

export function createSession(names: string[]): Session {
  const err = validateNames(names);
  if (err) fail(err);
  const participants = names.map(normalizeName).filter(Boolean).map((name) => ({ id: uid(), name }));
  return {
    id: uid(),
    createdAt: Date.now(),
    participants,
    books: [],
    phase: { kind: 'proposals', turn: newTurn(participants) },
    log: [],
  };
}

export type PreloadedBook = Omit<Book, 'id' | 'source' | 'proposedBy' | 'proposerName'> & { proposer: string };

/**
 * Session whose proposals were gathered outside the app: it skips the proposal turns.
 * Proposers are matched to voters by name; a proposer who does not vote keeps their name on the book.
 */
export function createPreloadedSession(names: string[], books: PreloadedBook[]): Session {
  const base = createSession(names);
  if (books.length === 0) fail('No hi ha cap llibre proposat');
  const key = (n: string) => normalizeName(n).toLocaleLowerCase('ca');
  const added: Book[] = [];
  for (const { proposer, ...b } of books) {
    const book: Book = { ...b, id: uid(), source: 'club' };
    if (findDuplicate(book, added)) fail(`«${b.title}» està repetit`);
    const voter = base.participants.find((p) => key(p.name) === key(proposer));
    added.push(voter ? { ...book, proposedBy: voter.id } : { ...book, proposerName: normalizeName(proposer) });
  }
  return { ...base, books: added, phase: { kind: 'review' }, preloaded: true };
}

/** Replaces one participant's proposals during the review of preloaded proposals. */
export function setProposals(s: Session, participantId: string, books: Book[]): Session {
  if (s.phase.kind !== 'review') fail('No som a la revisió de propostes');
  if (!participantById(s, participantId)) fail('Participant desconegut');
  if (books.length > MAX_PROPOSALS) fail(`Màxim ${MAX_PROPOSALS} propostes`);
  const others = s.books.filter((b) => b.proposedBy !== participantId);
  const added: Book[] = [];
  for (const b of books) {
    if (findDuplicate(b, [...others, ...added])) fail(`«${b.title}» ja està proposat`);
    added.push({ ...b, proposedBy: participantId, proposerName: undefined });
  }
  // Keep the participant's books where they were, so the rest keep their order.
  const at = s.books.findIndex((b) => b.proposedBy === participantId);
  const idx = at === -1 ? others.length : s.books.slice(0, at).filter((b) => b.proposedBy !== participantId).length;
  return { ...s, books: [...others.slice(0, idx), ...added, ...others.slice(idx)] };
}

/** Review closed: show the shelf. */
export function finishReview(s: Session): Session {
  if (s.phase.kind !== 'review') fail('No som a la revisió de propostes');
  return { ...s, phase: { kind: 'proposalsDone' } };
}

/** Name of whoever proposed a book, whether or not they vote. */
export function proposerOf(s: Session, book: Book): string | undefined {
  return participantById(s, book.proposedBy)?.name ?? book.proposerName;
}

// ---------- turns (shared by proposals and voting) ----------

type TurnPhase = Extract<Phase, { kind: 'proposals' | 'voting' }>;

function turnPhase(s: Session): TurnPhase {
  if (s.phase.kind !== 'proposals' && s.phase.kind !== 'voting') fail('En aquesta fase no hi ha torns');
  return s.phase;
}

function withTurn(s: Session, turn: Turn): Session {
  const p = turnPhase(s);
  return { ...s, phase: { ...p, turn } };
}

/** The roulette landed on `participantId`. */
export function pickTurn(s: Session, participantId: string): Session {
  const { turn } = turnPhase(s);
  if (turn.step !== 'spin') fail('La ruleta no està activa');
  if (!turn.remaining.includes(participantId)) fail('Aquest participant ja ha tingut el seu torn');
  return withTurn(s, { ...turn, current: participantId, step: 'handoff' });
}

/** The chosen participant confirmed they hold the phone. */
export function confirmIdentity(s: Session): Session {
  const { turn } = turnPhase(s);
  if (turn.step !== 'handoff') fail('No hi ha cap traspàs pendent');
  return withTurn(s, { ...turn, step: 'active' });
}

/** After a reload in the middle of an active turn, go back to the hand-off screen. */
export function resumeTurn(s: Session): Session {
  if (s.phase.kind !== 'proposals' && s.phase.kind !== 'voting') return s;
  const { turn } = s.phase;
  if (turn.step === 'active') return withTurn(s, { ...turn, step: 'handoff' });
  return s;
}

/** Curtain dismissed: move on to the next turn or close the phase. */
export function endTurn(s: Session): Session {
  const p = turnPhase(s);
  const { turn } = p;
  if (turn.step !== 'curtain' || !turn.current) fail('El torn no ha acabat');
  const remaining = turn.remaining.filter((id) => id !== turn.current);
  if (remaining.length > 0) return withTurn(s, { remaining, current: null, step: 'spin' });
  if (p.kind === 'proposals') return { ...s, phase: { kind: 'proposalsDone' } };
  return { ...s, phase: { kind: 'roundEnd', round: p.round } };
}

// ---------- proposals ----------

export function duplicateOf(s: Session, book: Book, extra: Book[] = []): Book | undefined {
  return findDuplicate(book, [...s.books, ...extra]);
}

export function submitProposals(s: Session, books: Book[]): Session {
  const p = turnPhase(s);
  if (p.kind !== 'proposals') fail('No som a la fase de propostes');
  const { turn } = p;
  if (turn.step !== 'active' || !turn.current) fail('No és el torn de ningú');
  if (books.length > MAX_PROPOSALS) fail(`Màxim ${MAX_PROPOSALS} propostes`);
  const added: Book[] = [];
  for (const b of books) {
    if (findDuplicate(b, [...s.books, ...added])) fail(`«${b.title}» ja està proposat`);
    added.push({ ...b, proposedBy: turn.current });
  }
  return {
    ...s,
    books: [...s.books, ...added],
    phase: { ...p, turn: { ...turn, step: 'curtain' } },
  };
}

// ---------- voting ----------

function startRound(s: Session, round: Round): Session {
  return { ...s, phase: { kind: 'voting', round, turn: newTurn(s.participants) } };
}

function winner(s: Session, bookId: string, byRoulette: boolean): Session {
  return { ...s, phase: { kind: 'winner', bookId, byRoulette } };
}

/** Back to proposals when nobody proposed anything. */
export function restartProposals(s: Session): Session {
  if (s.phase.kind !== 'proposalsDone') fail('Les propostes no han acabat');
  if (s.preloaded) fail('Les propostes ja venen carregades');
  return { ...s, phase: { kind: 'proposals', turn: newTurn(s.participants) } };
}

/** Candidates are shuffled so the order never hints at who proposed what. */
export function startVoting(s: Session, rng: Rng = cryptoRng): Session {
  if (s.phase.kind !== 'proposalsDone') fail('Les propostes no han acabat');
  const ids = shuffle(s.books.map((b) => b.id), rng);
  if (ids.length === 0) fail('No hi ha cap llibre proposat');
  if (ids.length === 1) return winner(s, ids[0], false);
  return startRound(s, firstRound(ids));
}

export function castVote(s: Session, bookIds: string[]): Session {
  if (s.phase.kind !== 'voting') fail('No hi ha cap votació en curs');
  const { round, turn } = s.phase;
  if (turn.step !== 'active' || !turn.current) fail('No és el torn de ningú');
  if (new Set(bookIds).size !== bookIds.length) fail('No es pot votar dues vegades el mateix llibre');
  if (bookIds.length !== round.votesPerVoter) fail(`Cal votar exactament ${round.votesPerVoter}`);
  for (const id of bookIds) if (!round.candidates.includes(id)) fail('Llibre no vàlid en aquesta ronda');
  const tally = { ...round.tally };
  for (const id of bookIds) tally[id] = (tally[id] ?? 0) + 1;
  return {
    ...s,
    phase: { kind: 'voting', round: { ...round, tally }, turn: { ...turn, step: 'curtain' } },
  };
}

export function revealResults(s: Session): Session {
  if (s.phase.kind !== 'roundEnd') fail('La ronda no ha acabat');
  const { round } = s.phase;
  return { ...s, phase: { kind: 'results', round, outcome: resolveRound(round) } };
}

function nextFromSurvivors(s: Session, survivors: string[], number: number, byRoulette: boolean): Session {
  if (survivors.length === 1) return winner(s, survivors[0], byRoulette);
  return startRound(s, minus1Round(survivors, number + 1));
}

export function continueAfterResults(s: Session): Session {
  if (s.phase.kind !== 'results') fail('No hi ha resultats per continuar');
  const { round, outcome } = s.phase;
  switch (outcome.type) {
    case 'advance': {
      const logged: Session = { ...s, log: [...s.log, { round, outcome }] };
      return nextFromSurvivors(logged, outcome.passed, round.number, false);
    }
    case 'tiebreak': {
      const logged: Session = { ...s, log: [...s.log, { round, outcome }] };
      return startRound(logged, tiebreakRound(round, outcome.safe, outcome.tied));
    }
    case 'roulette':
      return { ...s, phase: { kind: 'roulette', round, outcome } };
  }
}

export function applyRoulette(s: Session, eliminated: string): Session {
  if (s.phase.kind !== 'roulette') fail('La ruleta de llibres no està activa');
  const { round, outcome } = s.phase;
  const survivors = survivorsAfterRoulette(outcome, eliminated);
  const logged: Session = { ...s, log: [...s.log, { round, outcome, rouletteEliminated: eliminated }] };
  return nextFromSurvivors(logged, survivors, round.number, true);
}

// ---------- helpers ----------

export function bookById(s: Session, id: string | null | undefined): Book | undefined {
  return s.books.find((b) => b.id === id);
}

export function participantById(s: Session, id: string | null | undefined): Participant | undefined {
  return s.participants.find((p) => p.id === id);
}
