export interface Participant {
  id: string;
  name: string;
}

export interface Book {
  id: string;
  title: string;
  authors: string[];
  /** Best available cover URL (https). */
  cover?: string;
  /** Secondary cover URL (Open Library), used when the main one fails or for canvas export. */
  coverAlt?: string;
  description?: string;
  pages?: number;
  year?: string;
  isbn?: string;
  source: 'google' | 'openlibrary';
  /** Participant id of the proposer (only revealed at the end). */
  proposedBy?: string;
}

export type TurnStep = 'spin' | 'handoff' | 'active' | 'curtain';

export interface Turn {
  /** Participant ids that still have to take their turn. */
  remaining: string[];
  current: string | null;
  step: TurnStep;
}

export type RoundRule =
  /** First round: fixed votes/advance, ties at the cut all go through. */
  | 'top'
  /** Later rounds: n candidates, n-1 votes, n-1 advance (exactly one eliminated). */
  | 'minus1'
  /** Mini re-vote among books tied at the cut: 1 vote, the least voted is eliminated. */
  | 'tiebreak';

export interface Round {
  id: string;
  rule: RoundRule;
  /** Number of the main round this belongs to (tiebreaks keep their parent's number). */
  number: number;
  candidates: string[];
  /** Books already through (only for tiebreak rounds). */
  safe: string[];
  votesPerVoter: number;
  /** How many candidates go through (top/minus1). */
  advance: number;
  /** Anonymous tally: book id -> votes. Ballots are never stored per voter. */
  tally: Record<string, number>;
}

export type Outcome =
  | { type: 'advance'; passed: string[]; eliminated: string[] }
  | { type: 'tiebreak'; safe: string[]; tied: string[] }
  | { type: 'roulette'; safe: string[]; tied: string[] };

export interface RoundLog {
  round: Round;
  outcome: Outcome;
  /** Book eliminated by the roulette, when the outcome was 'roulette'. */
  rouletteEliminated?: string;
}

export type Phase =
  | { kind: 'proposals'; turn: Turn }
  | { kind: 'proposalsDone' }
  | { kind: 'voting'; round: Round; turn: Turn }
  | { kind: 'roundEnd'; round: Round }
  | { kind: 'results'; round: Round; outcome: Outcome }
  | { kind: 'roulette'; round: Round; outcome: Extract<Outcome, { type: 'roulette' }> }
  | { kind: 'winner'; bookId: string; byRoulette: boolean };

export interface Session {
  id: string;
  createdAt: number;
  participants: Participant[];
  books: Book[];
  phase: Phase;
  log: RoundLog[];
}
