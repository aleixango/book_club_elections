import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import type { Outcome, Round, Session } from '../domain/types';
import { bookById } from '../domain/session';
import { booksInPlay, ranking, roundLabel } from '../domain/rounds';
import { useStore } from '../store/session';
import { BookCover } from '../components/BookCover';
import { Roulette } from '../components/Roulette';
import { Screen } from '../components/Screen';
import { TopBar } from '../components/Chrome';
import { IconArrow } from '../components/icons';
import { useWheelSize } from './Turn';
import { sfx } from '../lib/sfx';
import { haptic } from '../lib/device';

// ---------------------------------------------------------------- Round end

export function RoundEndScreen({ round }: { round: Round }) {
  const reveal = useStore((s) => s.revealResults);
  return (
    <Screen className="screen-center">
      <motion.div
        className="urn"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="urn-ballot"
            initial={{ y: -70, opacity: 0 }}
            animate={{ y: [-70, 6], opacity: [0, 1, 1, 0] }}
            transition={{ delay: 0.3 + i * 0.35, duration: 0.8, repeat: Infinity, repeatDelay: 1.4 }}
          />
        ))}
        <span className="urn-slot" />
      </motion.div>
      <div className="eyebrow" style={{ marginTop: 18 }}>
        {roundLabel(round)}
      </div>
      <h1 className="display" style={{ fontSize: 'clamp(30px, 6vw, 54px)', margin: '6px 0 4px' }}>
        Tothom ha votat
      </h1>
      <p className="muted" style={{ margin: '0 0 20px' }}>
        Reuniu el grup al voltant del mòbil.
      </p>
      <motion.button
        className="btn btn-gold btn-lg"
        onClick={() => {
          sfx.reveal();
          reveal();
        }}
        animate={{ boxShadow: ['0 0 0 0 rgba(216,179,106,.5)', '0 0 0 18px rgba(216,179,106,0)'] }}
        transition={{ repeat: Infinity, duration: 1.6 }}
      >
        Veure els resultats
      </motion.button>
    </Screen>
  );
}

// ---------------------------------------------------------------- Results

type Status = 'pass' | 'out' | 'tie';

function statusOf(outcome: Outcome, id: string): Status {
  if (outcome.type === 'advance') return outcome.passed.includes(id) ? 'pass' : 'out';
  return outcome.tied.includes(id) ? 'tie' : 'pass';
}

function Counter({ to, run }: { to: number; run: boolean }) {
  const v = useMotionValue(0);
  const text = useTransform(v, (x) => Math.round(x).toString());
  useEffect(() => {
    if (!run) return;
    const c = animate(v, to, { duration: Math.min(1.1, 0.25 + to * 0.08), ease: 'easeOut' });
    return () => c.stop();
  }, [run, to, v]);
  return <motion.span>{text}</motion.span>;
}

/** Catalan ordinal: 1r, 2n, 3r, 4t, 5è… */
const ordinal = (n: number) => `${n}${n === 1 || n === 3 ? 'r' : n === 2 ? 'n' : n === 4 ? 't' : 'è'}`;

function title(s: Session, id: string) {
  return `«${bookById(s, id)?.title ?? '?'}»`;
}

function outcomeCopy(s: Session, round: Round, o: Outcome): { headline: string; detail: string; cta: string } {
  if (o.type === 'advance') {
    if (o.passed.length === 1) {
      return { headline: 'Ja tenim llibre!', detail: `${title(s, o.passed[0])} guanya la votació.`, cta: 'Veure el guanyador' };
    }
    const next = o.passed.length === 2 ? 'Anar a la final' : 'Següent ronda';
    if (round.rule === 'top') {
      const tie = o.passed.length > round.advance;
      return {
        headline: tie ? `Empat al ${ordinal(round.advance)} lloc` : `Passen ${o.passed.length} llibres`,
        detail: tie
          ? `Passen ${o.passed.length} llibres. A la ronda següent en passaran ${o.passed.length - 1}.`
          : `${o.eliminated.length} ${o.eliminated.length === 1 ? 'llibre es queda' : 'llibres es queden'} fora.`,
        cta: next,
      };
    }
    return {
      headline: round.rule === 'tiebreak' ? 'Desempat resolt' : 'Un llibre menys',
      detail: `${title(s, o.eliminated[0])} queda eliminat.`,
      cta: next,
    };
  }
  if (o.type === 'tiebreak') {
    const final = o.safe.length === 0 && o.tied.length === 2 && booksInPlay(round) === 2;
    return {
      headline: final ? 'Empat a la final!' : 'Empat al tall',
      detail: final
        ? 'Es repeteix la votació entre els dos. Si torna a haver-hi empat, decidirà la ruleta.'
        : `${o.tied.length} llibres empatats. Desempat a 1 vot: cau el menys votat.`,
      cta: 'Anar al desempat',
    };
  }
  return {
    headline: 'Empat un altre cop',
    detail: 'Ja no es torna a votar: decideix la ruleta.',
    cta: 'Fer girar la ruleta',
  };
}

export function ResultsScreen({ session, round, outcome }: { session: Session; round: Round; outcome: Outcome }) {
  const next = useStore((s) => s.continueAfterResults);
  const ranked = useMemo(() => ranking(round), [round]);
  // Eliminated books never show their votes, so the bars scale to the books that go on.
  const max = Math.max(1, ...ranked.filter((r) => statusOf(outcome, r.id) !== 'out').map((r) => r.votes));
  // The row keeps the (shuffled) candidate order so positions give nothing away.
  const row = useMemo(() => round.candidates.map((id) => ({ id, votes: round.tally[id] ?? 0 })), [round]);
  // Reveal order: eliminated books first (fewest votes first, each one falls), then the rest, fewest to most.
  const order = useMemo(() => {
    const group = (id: string) => ({ out: 0, tie: 1, pass: 2 })[statusOf(outcome, id)];
    return [...ranked].reverse().sort((a, b) => group(a.id) - group(b.id));
  }, [ranked, outcome]);
  const outCount = useMemo(() => order.filter((o) => statusOf(outcome, o.id) === 'out').length, [order, outcome]);
  const [revealed, setRevealed] = useState(0);
  const done = revealed >= order.length;
  const eliminating = revealed < outCount;
  const copy = outcomeCopy(session, round, outcome);
  const isWinner = outcome.type === 'advance' && outcome.passed.length === 1;

  useEffect(() => {
    if (done) {
      if (outcome.type === 'advance' && outcome.passed.length === 1) sfx.fanfare();
      else sfx.success();
      haptic([20, 60, 20]);
      return;
    }
    const item = order[revealed];
    const st = statusOf(outcome, item.id);
    const isTop = revealed === order.length - 1;
    // Each elimination is its own beat; quicker when many books fall.
    const outDelay = Math.max(550, 1250 - outCount * 70);
    const delay =
      revealed === 0 ? 900 : st === 'out' ? outDelay : revealed === outCount ? 1400 : isTop ? 1500 : 900;
    const t = window.setTimeout(() => {
      setRevealed((r) => r + 1);
      if (st === 'out') {
        sfx.deselect();
        haptic(12);
      } else sfx.tick();
    }, delay);
    return () => window.clearTimeout(t);
  }, [revealed, done, order, outcome, outCount]);

  const isRevealed = (id: string) => order.findIndex((o) => o.id === id) < revealed;
  const safeOnly = round.rule === 'tiebreak' ? round.safe : [];

  return (
    <Screen>
      <TopBar title={`Resultats · ${roundLabel(round)}`} sub={`${session.participants.length} votants`} />
      <div className="results-wrap" onClick={() => !done && setRevealed(order.length)}>
        <div className="podium" style={{ '--n': row.length } as React.CSSProperties}>
          {row.map((r) => {
            const b = bookById(session, r.id)!;
            const on = isRevealed(r.id);
            const st = statusOf(outcome, r.id);
            const fallen = on && st === 'out';
            return (
              // Eliminated columns fade out but keep their box, so the others never move.
              <motion.div
                key={r.id}
                className={`podium-col ${on ? st : 'pending'}`}
                animate={{ opacity: fallen ? 0 : 1 }}
                // Show the "Fora" tag first, then vanish.
                transition={{ duration: 0.5, delay: fallen && !done ? 0.6 : 0 }}
                style={{ pointerEvents: fallen ? 'none' : undefined }}
              >
                <div className="podium-votes">{!on ? '·' : st === 'out' ? '' : <Counter to={r.votes} run={on} />}</div>
                <motion.div
                  className="podium-cover"
                  animate={{ opacity: on ? 1 : 0.3 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <BookCover book={b} width="var(--podium-w)" eager />
                  {done && st === 'pass' && isWinner && <span className="crown">♛</span>}
                </motion.div>
                <div className="podium-bar-track">
                  <motion.div
                    className="podium-bar"
                    initial={{ height: 0 }}
                    animate={{ height: on && st !== 'out' ? `${Math.max(4, (r.votes / max) * 100)}%` : 0 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 120 }}
                  />
                </div>
                <div className="podium-tag">
                  {(fallen || done) && (
                    <motion.span
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`tag tag-${st}`}
                    >
                      {st === 'pass' ? (isWinner ? 'Guanya' : 'Passa') : st === 'tie' ? 'Empat' : 'Fora'}
                    </motion.span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="footer">
        {done ? (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="outcome-copy">
            <strong className="display" style={{ fontSize: 20 }}>
              {copy.headline}
            </strong>
            <span className="muted">
              {copy.detail}
              {safeOnly.length > 0 && ` ${safeOnly.length === 1 ? 'Ja estava classificat' : 'Ja estaven classificats'}: ${safeOnly.map((id) => title(session, id)).join(', ')}.`}
            </span>
          </motion.div>
        ) : (
          <span className="muted">
            {eliminating ? 'Es queden fora…' : outCount > 0 ? 'I els que continuen…' : 'Revelant…'} toca per saltar
          </span>
        )}
        <div style={{ flex: 1 }} />
        <motion.button
          className="btn btn-gold btn-lg"
          disabled={!done}
          onClick={next}
          animate={{ opacity: done ? 1 : 0.3 }}
        >
          {copy.cta} <IconArrow />
        </motion.button>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- Book roulette

export function BookRouletteScreen({ session, outcome }: { session: Session; outcome: Extract<Outcome, { type: 'roulette' }> }) {
  const apply = useStore((s) => s.applyRoulette);
  const size = useWheelSize();
  const [picked, setPicked] = useState<string | null>(null);
  // Final (two books, none safe): the wheel picks the winner. Otherwise it picks who falls.
  const final = outcome.safe.length === 0 && outcome.tied.length === 2;
  const items = outcome.tied.map((id) => ({ id, label: bookById(session, id)?.title ?? '?' }));

  const onResult = (id: string) => {
    setPicked(id);
    window.setTimeout(() => apply(final ? outcome.tied.find((t) => t !== id)! : id), final ? 400 : 2200);
  };

  return (
    <Screen>
      <TopBar title="La ruleta decideix" sub={final ? 'el guanyador' : 'qui queda eliminat'} />
      <div className="spin-layout">
        <div className="spin-wheel">
          <Roulette items={items} onResult={onResult} size={size} />
        </div>
        <div className="spin-side">
          <div className="eyebrow">Empat persistent</div>
          <h1 className="display" style={{ fontSize: 'clamp(24px, 4.2vw, 40px)' }}>
            {picked
              ? final
                ? `${bookById(session, picked)?.title}!`
                : `Cau ${title(session, picked)}`
              : final
                ? 'La sort tria el guanyador'
                : 'La sort elimina un llibre'}
          </h1>
          <div className="roulette-books">
            {outcome.tied.map((id) => (
              <motion.div
                key={id}
                animate={picked ? (final === (id === picked) ? { scale: 1.08, opacity: 1 } : { scale: 0.9, opacity: 0.3, filter: 'grayscale(1)' }) : {}}
              >
                <BookCover book={bookById(session, id)!} width="var(--mini-w)" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}
