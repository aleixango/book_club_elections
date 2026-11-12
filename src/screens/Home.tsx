import { motion } from 'motion/react';
import { useStore } from '../store/session';
import { Screen } from '../components/Screen';
import { BookCover } from '../components/BookCover';
import { IconBooks, IconExpand } from '../components/icons';
import { enterFullscreen, isStandalone } from '../lib/device';
import { CLUB_PROPOSALS } from '../data/club';

const DECOR = [0, 2, 6, 7, 10].map((i) => CLUB_PROPOSALS[i]);

interface Props {
  onNew: () => void;
  onClub: () => void;
  onContinue: () => void;
  onHistory: () => void;
}

export function HomeScreen({ onNew, onClub, onContinue, onHistory }: Props) {
  const session = useStore((s) => s.session);
  const history = useStore((s) => s.history);
  const discard = useStore((s) => s.discard);

  return (
    <Screen className="home">
      <div className="home-hero">
        <motion.div className="eyebrow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          Club de lectura
        </motion.div>
        <motion.h1
          className="display"
          style={{ fontSize: 'clamp(40px, 8vw, 84px)', fontWeight: 500 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          El proper <em className="gold-text" style={{ fontWeight: 600 }}>llibre</em>
        </motion.h1>
        <motion.p
          className="muted"
          style={{ margin: 0, maxWidth: 380 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Propostes, rondes de vot secret i una ruleta. Un sol mòbil que passa de mà en mà.
        </motion.p>

        <motion.div className="home-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          {session ? (
            <>
              <button className="btn btn-gold btn-lg" onClick={onContinue}>
                Continuar la votació
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  discard();
                  onClub();
                }}
              >
                Començar de nou
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-gold btn-lg" onClick={onClub}>
                Votar les propostes del club
              </button>
              <button className="btn btn-ghost" onClick={onNew}>
                Nova votació
              </button>
            </>
          )}
          {history.length > 0 && (
            <button className="btn btn-ghost" onClick={onHistory}>
              <IconBooks /> Historial
            </button>
          )}
          {!isStandalone() && document.fullscreenEnabled && (
            <button className="icon-btn" onClick={() => void enterFullscreen()} aria-label="Pantalla completa" title="Pantalla completa">
              <IconExpand />
            </button>
          )}
        </motion.div>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          {session
            ? `Hi ha una votació en curs amb ${session.participants.length} participants.`
            : `${CLUB_PROPOSALS.length} llibres proposats pel club, a punt per votar.`}
        </p>
      </div>

      <div className="home-shelf" aria-hidden>
        {DECOR.map((b, i) => (
          <motion.div
            key={b.title}
            className="home-book"
            initial={{ y: 120, opacity: 0, rotate: 0 }}
            animate={{ y: 0, opacity: 1, rotate: (i - 2) * 6 }}
            transition={{ delay: 0.3 + i * 0.09, type: 'spring', damping: 15, stiffness: 120 }}
            style={{ zIndex: 5 - Math.abs(i - 2), marginLeft: i ? -34 : 0 }}
          >
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}>
              <BookCover book={b} width="clamp(70px, 12vw, 130px)" eager />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </Screen>
  );
}
