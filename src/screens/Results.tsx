import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
        Todos han votado
      </h1>
      <p className="muted" style={{ margin: '0 0 20px' }}>
        Reunid al grupo alrededor del móvil.
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
        Ver resultados
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

function title(s: Session, id: string) {
  return `«${bookById(s, id)?.title ?? '?'}»`;
}

function outcomeCopy(s: Session, round: Round, o: Outcome): { headline: string; detail: string; cta: string } {
  if (o.type === 'advance') {
    if (o.passed.length === 1) {
      return { headline: '¡Tenemos libro!', detail: `${title(s, o.passed[0])} gana la votación.`, cta: 'Ver al ganador' };
    }
    const next = o.passed.length === 2 ? 'Ir a la final' : 'Siguiente ronda';
    if (round.rule === 'top') {
      const tie = o.passed.length > round.advance;
      return {
        headline: tie ? `Empate en el ${round.advance}.º puesto` : `Pasan ${o.passed.length} libros`,
        detail: tie
          ? `Pasan ${o.passed.length} libros. En la siguiente ronda pasarán ${o.passed.length - 1}.`
          : `${o.eliminated.length} ${o.eliminated.length === 1 ? 'libro se queda' : 'libros se quedan'} fuera.`,
        cta: next,
      };
    }
    return {
      headline: round.rule === 'tiebreak' ? 'Desempate resuelto' : 'Un libro menos',
      detail: `${title(s, o.eliminated[0])} queda eliminado.`,
      cta: next,
    };
  }
  if (o.type === 'tiebreak') {
    const final = o.safe.length === 0 && o.tied.length === 2 && booksInPlay(round) === 2;
    return {
      headline: final ? '¡Empate en la final!' : 'Empate en el corte',
      detail: final
        ? 'Se repite la votación entre los dos. Si vuelve a haber empate, decidirá la ruleta.'
        : `${o.tied.length} libros empatados. Desempate a 1 voto: cae el menos votado.`,
      cta: 'Ir al desempate',
    };
  }
  return {
    headline: 'Empate otra vez',
    detail: 'Ya no se vuelve a votar: decide la ruleta.',
    cta: 'Girar la ruleta',
  };
}

export function ResultsScreen({ session, round, outcome }: { session: Session; round: Round; outcome: Outcome }) {
  const next = useStore((s) => s.continueAfterResults);
  const ranked = useMemo(() => ranking(round), [round]);
  const max = Math.max(1, ...ranked.map((r) => r.votes));
  // Reveal from last to first; eliminated books go fast, the podium slowly.
  const order = useMemo(() => [...ranked].reverse(), [ranked]);
  const [revealed, setRevealed] = useState(0);
  const done = revealed >= order.length;
  const stripRef = useRef<HTMLDivElement>(null);
  const copy = outcomeCopy(session, round, outcome);

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
    const delay = revealed === 0 ? 700 : st === 'out' ? 220 : isTop ? 1500 : 900;
    const t = window.setTimeout(() => {
      setRevealed((r) => r + 1);
      sfx.tick();
      // Keep the freshly revealed column visible.
      const el = stripRef.current?.querySelector<HTMLElement>(`[data-id="${item.id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, delay);
    return () => window.clearTimeout(t);
  }, [revealed, done, order, outcome]);

  const isRevealed = (id: string) => order.findIndex((o) => o.id === id) < revealed;
  const safeOnly = round.rule === 'tiebreak' ? round.safe : [];

  return (
    <Screen>
      <TopBar title={`Resultados · ${roundLabel(round)}`} sub={`${session.participants.length} votantes`} />
      <div className="results-wrap" onClick={() => !done && setRevealed(order.length)}>
        <div className="podium" ref={stripRef}>
          {ranked.map((r, i) => {
            const b = bookById(session, r.id)!;
            const on = isRevealed(r.id);
            const st = statusOf(outcome, r.id);
            const final = done ? st : 'pending';
            return (
              <motion.div
                key={r.id}
                data-id={r.id}
                className={`podium-col ${final}`}
                layout
                animate={done && st === 'out' ? { y: 18, opacity: 0.38, filter: 'grayscale(1)' } : { y: 0, opacity: 1, filter: 'grayscale(0)' }}
                transition={{ duration: 0.6 }}
              >
                <div className="podium-votes">{on ? <Counter to={r.votes} run={on} /> : '·'}</div>
                <motion.div
                  className="podium-cover"
                  animate={on ? { rotateY: 0, opacity: 1 } : { rotateY: 80, opacity: 0.25 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                >
                  <BookCover book={b} width="var(--podium-w)" eager />
                  {done && st === 'pass' && i === 0 && outcome.type === 'advance' && outcome.passed.length === 1 && (
                    <span className="crown">♛</span>
                  )}
                </motion.div>
                <div className="podium-bar-track">
                  <motion.div
                    className="podium-bar"
                    initial={{ height: 0 }}
                    animate={{ height: on ? `${Math.max(4, (r.votes / max) * 100)}%` : 0 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 120 }}
                  />
                </div>
                <div className="podium-tag">
                  {done && (
                    <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`tag tag-${st}`}>
                      {st === 'pass'
                        ? outcome.type === 'advance' && outcome.passed.length === 1
                          ? 'Gana'
                          : 'Pasa'
                        : st === 'tie'
                          ? 'Empate'
                          : 'Fuera'}
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
              {safeOnly.length > 0 && ` ${safeOnly.length === 1 ? 'Ya estaba clasificado' : 'Ya estaban clasificados'}: ${safeOnly.map((id) => title(session, id)).join(', ')}.`}
            </span>
          </motion.div>
        ) : (
          <span className="muted">Revelando… toca para saltar</span>
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
      <TopBar title="La ruleta decide" sub={final ? 'el ganador' : 'quién queda eliminado'} />
      <div className="spin-layout">
        <div className="spin-wheel">
          <Roulette items={items} onResult={onResult} size={size} />
        </div>
        <div className="spin-side">
          <div className="eyebrow">Empate persistente</div>
          <h1 className="display" style={{ fontSize: 'clamp(24px, 4.2vw, 40px)' }}>
            {picked
              ? final
                ? `¡${bookById(session, picked)?.title}!`
                : `Cae ${title(session, picked)}`
              : final
                ? 'La suerte elige el ganador'
                : 'La suerte elimina un libro'}
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
