import type { Outcome, Round } from './types';
import { uid } from './random';

export const FIRST_ROUND_VOTES = 3;
export const FIRST_ROUND_ADVANCE = 3;

/** First round of a session given the proposed books (needs >= 2). */
export function firstRound(bookIds: string[]): Round {
  if (bookIds.length < 2) throw new Error('Need at least 2 books to vote');
  if (bookIds.length > FIRST_ROUND_ADVANCE) {
    return {
      id: uid(),
      rule: 'top',
      number: 1,
      candidates: [...bookIds],
      safe: [],
      votesPerVoter: FIRST_ROUND_VOTES,
      advance: FIRST_ROUND_ADVANCE,
      tally: zeroTally(bookIds),
    };
  }
  return minus1Round(bookIds, 1);
}

/** n candidates -> n-1 votes each, n-1 go through. */
export function minus1Round(bookIds: string[], number: number): Round {
  const n = bookIds.length;
  if (n < 2) throw new Error('A round needs at least 2 candidates');
  return {
    id: uid(),
    rule: 'minus1',
    number,
    candidates: [...bookIds],
    safe: [],
    votesPerVoter: n - 1,
    advance: n - 1,
    tally: zeroTally(bookIds),
  };
}

/** Mini re-vote among the books tied at the cut: 1 vote each, the least voted falls. */
export function tiebreakRound(parent: Round, safe: string[], tied: string[]): Round {
  return {
    id: uid(),
    rule: 'tiebreak',
    number: parent.number,
    candidates: [...tied],
    safe: [...safe],
    votesPerVoter: 1,
    advance: tied.length - 1,
    tally: zeroTally(tied),
  };
}

export function zeroTally(ids: string[]): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, 0]));
}

/** Candidates sorted by votes (desc), keeping candidate order for equal scores. */
export function ranking(round: Round): { id: string; votes: number }[] {
  return round.candidates
    .map((id, i) => ({ id, votes: round.tally[id] ?? 0, i }))
    .sort((a, b) => b.votes - a.votes || a.i - b.i)
    .map(({ id, votes }) => ({ id, votes }));
}

export function resolveRound(round: Round): Outcome {
  const ranked = ranking(round);

  if (round.rule === 'top') {
    const threshold = ranked[round.advance - 1].votes;
    const passed = ranked.filter((r) => r.votes >= threshold).map((r) => r.id);
    const eliminated = ranked.filter((r) => r.votes < threshold).map((r) => r.id);
    if (eliminated.length > 0) return { type: 'advance', passed, eliminated };
    // Safeguard: nobody would be eliminated -> tie-break among the books at the cut score.
    const safe = ranked.filter((r) => r.votes > threshold).map((r) => r.id);
    const tied = ranked.filter((r) => r.votes === threshold).map((r) => r.id);
    return { type: 'tiebreak', safe, tied };
  }

  const min = ranked[ranked.length - 1].votes;
  const above = ranked.filter((r) => r.votes > min).map((r) => r.id);
  const lowest = ranked.filter((r) => r.votes === min).map((r) => r.id);

  if (round.rule === 'minus1') {
    if (lowest.length === 1) return { type: 'advance', passed: above, eliminated: lowest };
    return { type: 'tiebreak', safe: above, tied: lowest };
  }

  // tiebreak
  const safe = [...round.safe, ...above];
  if (lowest.length === 1) return { type: 'advance', passed: safe, eliminated: lowest };
  return { type: 'roulette', safe, tied: lowest };
}

export function survivorsAfterRoulette(
  outcome: Extract<Outcome, { type: 'roulette' }>,
  eliminated: string,
): string[] {
  if (!outcome.tied.includes(eliminated)) throw new Error('Eliminated book is not among the tied');
  return [...outcome.safe, ...outcome.tied.filter((id) => id !== eliminated)];
}

/** Total books in play in this round (candidates + already safe). */
export function booksInPlay(round: Round): number {
  return round.candidates.length + round.safe.length;
}

export function roundLabel(round: Round): string {
  if (round.rule === 'tiebreak') return booksInPlay(round) === 2 ? 'Desempate final' : 'Desempate';
  if (round.candidates.length === 2) return 'Final';
  return `Ronda ${round.number}`;
}
