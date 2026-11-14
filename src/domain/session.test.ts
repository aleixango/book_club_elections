import { describe, expect, it } from 'vitest';
import type { Book, Session } from './types';
import {
  applyRoulette,
  castVote,
  confirmIdentity,
  continueAfterResults,
  createPreloadedSession,
  createSession,
  endTurn,
  finishReview,
  pickTurn,
  proposerOf,
  restartProposals,
  resumeTurn,
  revealResults,
  SessionError,
  setProposals,
  startVoting as startVotingRaw,
  submitProposals,
  validateNames,
} from './session';
import { resolveRound, roundLabel } from './rounds';

/** Identity rng: keeps proposal order so expectations are deterministic. */
const startVoting = (s: Session) => startVotingRaw(s, (n) => n - 1);

const book = (id: string, title = `Libro ${id}`, author = `Autor ${id}`): Book => ({
  id,
  title,
  authors: [author],
  source: 'google',
});

/** Runs the proposal phase: participant i proposes proposals[i]. */
function withProposals(names: string[], proposals: Book[][]): Session {
  let s = createSession(names);
  s.participants.forEach((p, i) => {
    s = pickTurn(s, p.id);
    s = confirmIdentity(s);
    s = submitProposals(s, proposals[i] ?? []);
    s = endTurn(s);
  });
  expect(s.phase.kind).toBe('proposalsDone');
  return s;
}

/** Every participant votes; ballots[i] is the list of book ids voted by participant i. */
function voteRound(s: Session, ballots: string[][]): Session {
  s.participants.forEach((p, i) => {
    s = pickTurn(s, p.id);
    s = confirmIdentity(s);
    s = castVote(s, ballots[i]);
    s = endTurn(s);
  });
  expect(s.phase.kind).toBe('roundEnd');
  return revealResults(s);
}

function currentRound(s: Session) {
  if (s.phase.kind !== 'voting') throw new Error(`Expected voting, got ${s.phase.kind}`);
  return s.phase.round;
}

function outcome(s: Session) {
  if (s.phase.kind !== 'results') throw new Error(`Expected results, got ${s.phase.kind}`);
  return s.phase.outcome;
}

const names4 = ['Ana', 'Bea', 'Carles', 'Dani'];

describe('participants', () => {
  it('validates names', () => {
    expect(validateNames(['Ana'])).toMatch(/almenys/);
    expect(validateNames(['Ana', ' ana '])).toMatch(/repetit/);
    expect(validateNames(['Ana', 'Bea'])).toBeNull();
    expect(validateNames(Array.from({ length: 16 }, (_, i) => `P${i}`))).toMatch(/Màxim/);
  });
});

describe('proposals', () => {
  it('rejects duplicates across participants, including other editions', () => {
    let s = createSession(['Ana', 'Bea']);
    const [a, b] = s.participants;
    s = submitProposals(confirmIdentity(pickTurn(s, a.id)), [book('1', 'Cien años de soledad', 'Gabriel García Márquez')]);
    s = endTurn(s);
    s = confirmIdentity(pickTurn(s, b.id));
    expect(() =>
      submitProposals(s, [book('2', 'Cien Años de Soledad: edición conmemorativa', 'G. García Marquez')]),
    ).toThrow(SessionError);
  });

  it('allows skipping and limits to 3', () => {
    let s = createSession(['Ana', 'Bea']);
    s = confirmIdentity(pickTurn(s, s.participants[0].id));
    expect(() => submitProposals(s, [book('1'), book('2'), book('3'), book('4')])).toThrow(/Màxim/);
    s = submitProposals(s, []);
    expect(s.books).toHaveLength(0);
  });

  it('a reload mid-turn goes back to the hand-off', () => {
    let s = createSession(['Ana', 'Bea']);
    s = confirmIdentity(pickTurn(s, s.participants[0].id));
    s = resumeTurn(s);
    expect(s.phase.kind === 'proposals' && s.phase.turn.step).toBe('handoff');
  });

  it('a participant cannot take two turns', () => {
    let s = createSession(['Ana', 'Bea']);
    const a = s.participants[0].id;
    s = endTurn(submitProposals(confirmIdentity(pickTurn(s, a)), []));
    expect(() => pickTurn(s, a)).toThrow(SessionError);
  });
});

describe('starting the vote with few books', () => {
  it('0 books cannot start', () => {
    const s = withProposals(['Ana', 'Bea'], []);
    expect(() => startVoting(s)).toThrow(SessionError);
  });

  it('1 book wins directly', () => {
    const s = startVoting(withProposals(['Ana', 'Bea'], [[book('1')]]));
    expect(s.phase).toMatchObject({ kind: 'winner', bookId: '1' });
  });

  it('3 books start in a 2-vote round', () => {
    const s = startVoting(withProposals(['Ana', 'Bea'], [[book('1'), book('2')], [book('3')]]));
    const r = currentRound(s);
    expect(r.rule).toBe('minus1');
    expect(r.votesPerVoter).toBe(2);
    expect(r.advance).toBe(2);
  });

  it('2 books start directly in the final', () => {
    const s = startVoting(withProposals(['Ana', 'Bea'], [[book('1')], [book('2')]]));
    const r = currentRound(s);
    expect(r.votesPerVoter).toBe(1);
    expect(roundLabel(r)).toBe('Final');
  });
});

describe('ballot validation', () => {
  it('requires exactly N distinct candidates', () => {
    let s = startVoting(withProposals(names4, [[book('a'), book('b')], [book('c'), book('d')], [book('e')]]));
    s = confirmIdentity(pickTurn(s, s.participants[0].id));
    expect(() => castVote(s, ['a', 'b'])).toThrow(/exactament 3/);
    expect(() => castVote(s, ['a', 'a', 'b'])).toThrow(/dues vegades/);
    expect(() => castVote(s, ['a', 'b', 'zzz'])).toThrow(/no vàlid/);
    expect(() => castVote(s, ['a', 'b', 'c'])).not.toThrow();
  });

  it('stores only an anonymous tally', () => {
    let s = startVoting(withProposals(names4, [[book('a'), book('b')], [book('c'), book('d')], [book('e')]]));
    s = castVote(confirmIdentity(pickTurn(s, s.participants[0].id)), ['a', 'b', 'c']);
    const json = JSON.stringify(s.phase);
    expect(json).not.toMatch(/ballot/);
    expect(currentRound(s).tally).toEqual({ a: 1, b: 1, c: 1, d: 0, e: 0 });
  });
});

describe('full flow without ties: 5 books -> 3 -> 2 -> winner', () => {
  it('follows 3 -> 2 -> 1 votes', () => {
    let s = startVoting(withProposals(names4, [[book('a'), book('b')], [book('c'), book('d')], [book('e')]]));
    expect(currentRound(s)).toMatchObject({ rule: 'top', votesPerVoter: 3 });
    // a=4, b=3, c=3?? avoid tie: a=4 b=4 c=3 d=1 e=0
    s = voteRound(s, [
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b', 'd'],
    ]);
    expect(outcome(s)).toEqual({ type: 'advance', passed: ['a', 'b', 'c'], eliminated: ['d', 'e'] });
    s = continueAfterResults(s);
    expect(currentRound(s)).toMatchObject({ rule: 'minus1', number: 2, votesPerVoter: 2, candidates: ['a', 'b', 'c'] });
    s = voteRound(s, [
      ['a', 'b'],
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ]);
    expect(outcome(s)).toEqual({ type: 'advance', passed: ['a', 'b'], eliminated: ['c'] });
    s = continueAfterResults(s);
    expect(roundLabel(currentRound(s))).toBe('Final');
    s = voteRound(s, [['a'], ['a'], ['a'], ['b']]);
    s = continueAfterResults(s);
    expect(s.phase).toEqual({ kind: 'winner', bookId: 'a', byRoulette: false });
    expect(s.log).toHaveLength(3);
  });
});

describe('ties', () => {
  it('round 1: tie at 3rd place lets 4 through, then the next round has 3 votes and 3 pass', () => {
    let s = startVoting(
      withProposals(names4, [[book('a'), book('b')], [book('c'), book('d')], [book('e'), book('f')]]),
    );
    // a=4 b=3 c=2 d=2 e=1 f=0
    s = voteRound(s, [
      ['a', 'b', 'c'],
      ['a', 'b', 'd'],
      ['a', 'b', 'c'],
      ['a', 'd', 'e'],
    ]);
    expect(outcome(s)).toEqual({ type: 'advance', passed: ['a', 'b', 'c', 'd'], eliminated: ['e', 'f'] });
    s = continueAfterResults(s);
    expect(currentRound(s)).toMatchObject({ votesPerVoter: 3, advance: 3, number: 2 });
  });

  it('round >=2: a tie at the cut triggers a 1-vote tiebreak among the tied only', () => {
    let s = startVoting(withProposals(names4, [[book('a'), book('b')], [book('c')]]));
    // 3 books, 2 votes: a=4 b=2 c=2 -> tie at the cut between b and c
    s = voteRound(s, [
      ['a', 'b'],
      ['a', 'c'],
      ['a', 'b'],
      ['a', 'c'],
    ]);
    expect(outcome(s)).toEqual({ type: 'tiebreak', safe: ['a'], tied: ['b', 'c'] });
    s = continueAfterResults(s);
    const tb = currentRound(s);
    expect(tb).toMatchObject({ rule: 'tiebreak', votesPerVoter: 1, candidates: ['b', 'c'], safe: ['a'] });
    s = voteRound(s, [['b'], ['b'], ['c'], ['b']]);
    expect(outcome(s)).toEqual({ type: 'advance', passed: ['a', 'b'], eliminated: ['c'] });
    s = continueAfterResults(s);
    expect(currentRound(s)).toMatchObject({ candidates: ['a', 'b'], votesPerVoter: 1 });
  });

  it('tiebreak tied again -> book roulette eliminates one', () => {
    let s = startVoting(withProposals(names4, [[book('a'), book('b')], [book('c')]]));
    s = voteRound(s, [
      ['a', 'b'],
      ['a', 'c'],
      ['a', 'b'],
      ['a', 'c'],
    ]);
    s = continueAfterResults(s);
    s = voteRound(s, [['b'], ['c'], ['b'], ['c']]);
    expect(outcome(s)).toEqual({ type: 'roulette', safe: ['a'], tied: ['b', 'c'] });
    s = continueAfterResults(s);
    expect(s.phase.kind).toBe('roulette');
    expect(() => applyRoulette(s, 'a')).toThrow();
    s = applyRoulette(s, 'c');
    expect(currentRound(s)).toMatchObject({ candidates: ['a', 'b'], rule: 'minus1' });
  });

  it('final 2-2 -> re-vote -> 2-2 -> roulette picks the winner', () => {
    let s = startVoting(withProposals(names4, [[book('a')], [book('b')]]));
    s = voteRound(s, [['a'], ['b'], ['a'], ['b']]);
    expect(outcome(s)).toEqual({ type: 'tiebreak', safe: [], tied: ['a', 'b'] });
    s = continueAfterResults(s);
    expect(roundLabel(currentRound(s))).toBe('Desempat final');
    s = voteRound(s, [['a'], ['b'], ['a'], ['b']]);
    expect(outcome(s).type).toBe('roulette');
    s = applyRoulette(continueAfterResults(s), 'a');
    expect(s.phase).toEqual({ kind: 'winner', bookId: 'b', byRoulette: true });
  });

  it('round 1 safeguard: if nobody would be eliminated, the tied at the cut re-vote', () => {
    // 4 books, everyone votes 3 -> a=4 b=4 c=4 d=4? 4 voters x 3 = 12 votes over 4 books = 3 each
    let s = startVoting(withProposals(names4, [[book('a'), book('b')], [book('c'), book('d')]]));
    s = voteRound(s, [
      ['a', 'b', 'c'],
      ['b', 'c', 'd'],
      ['c', 'd', 'a'],
      ['d', 'a', 'b'],
    ]);
    expect(outcome(s)).toEqual({ type: 'tiebreak', safe: [], tied: ['a', 'b', 'c', 'd'] });
    s = continueAfterResults(s);
    s = voteRound(s, [['a'], ['b'], ['c'], ['c']]);
    // d has 0 -> eliminated alone
    expect(outcome(s)).toEqual({ type: 'advance', passed: ['c', 'a', 'b'], eliminated: ['d'] });
    s = continueAfterResults(s);
    expect(currentRound(s)).toMatchObject({ number: 2, votesPerVoter: 2 });
  });

  it('every round from 2 on eliminates exactly one book until there is a winner', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    // Round 1 all tied at 0? use a ballot set that keeps all 6 tied -> safeguard path
    let s = startVoting(
      withProposals(['P1', 'P2'], [ids.slice(0, 3).map((i) => book(i)), ids.slice(3).map((i) => book(i))]),
    );
    s = voteRound(s, [
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ]);
    let guard = 0;
    while (s.phase.kind !== 'winner' && guard++ < 100) {
      if (s.phase.kind === 'results') {
        s = continueAfterResults(s);
      } else if (s.phase.kind === 'roulette') {
        s = applyRoulette(s, s.phase.outcome.tied[0]);
      } else if (s.phase.kind === 'voting') {
        const r = s.phase.round;
        const before = r.candidates.length + r.safe.length;
        // Two voters always vote the same first N candidates -> deterministic.
        const ballot = r.candidates.slice(0, r.votesPerVoter);
        s = voteRound(s, [ballot, ballot]);
        const o = resolveRound(s.phase.kind === 'results' ? s.phase.round : r);
        if (o.type === 'advance' && r.rule !== 'top') expect(o.passed.length).toBe(before - 1);
      }
    }
    expect(s.phase.kind).toBe('winner');
  });
});

describe('preloaded proposals', () => {
  const club = [
    { proposer: 'Adrià', title: 'Confesiones', authors: ['Kanae Minato'] },
    { proposer: 'adrià ', title: 'El imperio del sol', authors: ['J. G. Ballard'] },
    { proposer: 'Gràcia', title: 'El club del crim dels dijous', authors: ['Richard Osman'] },
    { proposer: 'Aleix', title: 'Un mundo feliz', authors: ['Aldous Huxley'] },
  ];

  it('skips the proposal turns and starts with the review', () => {
    const s = createPreloadedSession(['Adrià', 'Aleix', 'Marta'], club);
    expect(s.phase.kind).toBe('review');
    expect(finishReview(s).phase.kind).toBe('proposalsDone');
    expect(s.preloaded).toBe(true);
    expect(s.books).toHaveLength(4);
    expect(new Set(s.books.map((b) => b.id)).size).toBe(4);
    expect(s.books.every((b) => b.source === 'club')).toBe(true);
  });

  it('links proposers to voters by name, keeping the name of proposers who do not vote', () => {
    const s = createPreloadedSession(['Adrià', 'Aleix', 'Marta'], club);
    const adria = s.participants.find((p) => p.name === 'Adrià')!;
    expect(s.books.filter((b) => b.proposedBy === adria.id)).toHaveLength(2);
    const osman = s.books.find((b) => b.title.startsWith('El club'))!;
    expect(osman.proposedBy).toBeUndefined();
    expect(proposerOf(s, osman)).toBe('Gràcia');
    expect(proposerOf(s, s.books.find((b) => b.title === 'Un mundo feliz')!)).toBe('Aleix');
  });

  it('votes like any other session and cannot go back to proposals', () => {
    let s = finishReview(createPreloadedSession(['Adrià', 'Aleix'], club));
    expect(() => restartProposals(s)).toThrow(SessionError);
    s = startVoting(s);
    expect(s.phase.kind).toBe('voting');
    if (s.phase.kind === 'voting') expect(s.phase.round.votesPerVoter).toBe(3);
  });

  it('rejects duplicated books and empty lists', () => {
    expect(() => createPreloadedSession(['A', 'B'], [...club, { ...club[0], proposer: 'B' }])).toThrow(/repetit/);
    expect(() => createPreloadedSession(['A', 'B'], [])).toThrow(SessionError);
  });

  describe('review', () => {
    const start = () => createPreloadedSession(['Adrià', 'Aleix', 'Marta'], club);
    const who = (s: Session, name: string) => s.participants.find((p) => p.name === name)!.id;

    it('replaces only that participant’s books, keeping the rest in place', () => {
      let s = start();
      const adria = who(s, 'Adrià');
      const keep = s.books.filter((b) => b.proposedBy !== adria).map((b) => b.id);
      s = setProposals(s, adria, [book('n1', 'Nou llibre')]);
      const mine = s.books.filter((b) => b.proposedBy === adria);
      expect(mine.map((b) => b.title)).toEqual(['Nou llibre']);
      expect(s.books.filter((b) => b.proposedBy !== adria).map((b) => b.id)).toEqual(keep);
      expect(s.books[0].title).toBe('Nou llibre');
      expect(s.phase.kind).toBe('review');
    });

    it('lets a new participant add up to 3 books', () => {
      let s = start();
      const marta = who(s, 'Marta');
      s = setProposals(s, marta, [book('a'), book('b'), book('c')]);
      expect(s.books.filter((b) => b.proposedBy === marta)).toHaveLength(3);
      expect(s.books).toHaveLength(7);
      expect(() => setProposals(s, marta, [book('a'), book('b'), book('c'), book('d')])).toThrow(/Màxim/);
    });

    it('rejects books proposed by someone else, but allows re-saving your own', () => {
      const s = start();
      const aleix = who(s, 'Aleix');
      const adria = who(s, 'Adrià');
      const confes = s.books.find((b) => b.title === 'Confesiones')!;
      expect(() => setProposals(s, aleix, [{ ...confes, id: 'x' }])).toThrow(/ja està proposat/);
      const own = s.books.filter((b) => b.proposedBy === adria);
      expect(setProposals(s, adria, own).books).toHaveLength(4);
    });

    it('only works during the review', () => {
      const s = finishReview(start());
      expect(() => setProposals(s, who(s, 'Marta'), [book('a')])).toThrow(SessionError);
      expect(() => finishReview(s)).toThrow(SessionError);
      expect(() => setProposals(start(), 'nobody', [])).toThrow(SessionError);
    });
  });
});
