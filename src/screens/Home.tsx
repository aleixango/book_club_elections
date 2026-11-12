import { motion } from 'motion/react';
import { useStore } from '../store/session';
import { Screen } from '../components/Screen';
import { BookCover } from '../components/BookCover';
import { IconBooks, IconExpand } from '../components/icons';
import { enterFullscreen, isStandalone } from '../lib/device';

const DECOR = [
  { title: 'Cien años de soledad', authors: ['G. García Márquez'] },
  { title: 'La sombra del viento', authors: ['C. Ruiz Zafón'] },
  { title: 'Rayuela', authors: ['Julio Cortázar'] },
  { title: 'Nada', authors: ['Carmen Laforet'] },
  { title: 'Pedro Páramo', authors: ['Juan Rulfo'] },
];

interface Props {
  onNew: () => void;
  onContinue: () => void;
  onHistory: () => void;
}

export function HomeScreen({ onNew, onContinue, onHistory }: Props) {
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
          El próximo <em className="gold-text" style={{ fontWeight: 600 }}>libro</em>
        </motion.h1>
        <motion.p
          className="muted"
          style={{ margin: 0, maxWidth: 380 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Propuestas, rondas de voto secreto y una ruleta. Un solo móvil que pasa de mano en mano.
        </motion.p>

        <motion.div className="home-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          {session ? (
            <>
              <button className="btn btn-gold btn-lg" onClick={onContinue}>
                Continuar votación
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  discard();
                  onNew();
                }}
              >
                Empezar de nuevo
              </button>
            </>
          ) : (
            <button className="btn btn-gold btn-lg" onClick={onNew}>
              Nueva votación
            </button>
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
        {session && (
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Hay una votación en curso con {session.participants.length} participantes.
          </p>
        )}
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
              <BookCover book={b} width="clamp(70px, 12vw, 130px)" />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </Screen>
  );
}
