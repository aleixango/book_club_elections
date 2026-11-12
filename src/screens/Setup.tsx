import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { useStore } from '../store/session';
import { MAX_PARTICIPANTS, MIN_PARTICIPANTS, normalizeName, validateNames } from '../domain/session';
import { Screen } from '../components/Screen';
import { TopBar } from '../components/Chrome';
import { IconArrow, IconBack, IconPlus, IconX } from '../components/icons';
import { sfx } from '../lib/sfx';

export function SetupScreen({ onBack }: { onBack: () => void }) {
  const lastNames = useStore((s) => s.lastNames);
  const start = useStore((s) => s.start);
  const setError = useStore((s) => s.setError);
  const [names, setNames] = useState<string[]>([]);
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const add = () => {
    const n = normalizeName(value);
    if (!n) return;
    if (names.some((x) => x.toLocaleLowerCase('es') === n.toLocaleLowerCase('es'))) {
      setError(`«${n}» ya está en la lista`);
      sfx.error();
      return;
    }
    if (names.length >= MAX_PARTICIPANTS) {
      setError(`Máximo ${MAX_PARTICIPANTS} participantes`);
      return;
    }
    sfx.select();
    setNames([...names, n.slice(0, 24)]);
    setValue('');
    input.current?.focus();
  };

  const err = validateNames(names);
  const canReuse = names.length === 0 && lastNames.length >= MIN_PARTICIPANTS;

  return (
    <Screen>
      <TopBar
        title="Participantes"
        sub={`${names.length} / ${MAX_PARTICIPANTS}`}
        menu={false}
        right={
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            <IconBack /> Inicio
          </button>
        }
      />
      <div className="setup">
        <div className="setup-left">
          <h1 className="display" style={{ fontSize: 'clamp(24px, 4vw, 38px)' }}>
            ¿Quién vota hoy?
          </h1>
          <form
            className="field"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <input
              ref={input}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Nombre del participante"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
              maxLength={24}
            />
            <button type="submit" className="icon-btn" style={{ marginRight: 6 }} disabled={!value.trim()} aria-label="Añadir">
              <IconPlus />
            </button>
          </form>
          {canReuse && (
            <button className="btn btn-ghost btn-sm" onClick={() => setNames(lastNames.slice(0, MAX_PARTICIPANTS))}>
              Usar los de la última vez ({lastNames.length})
            </button>
          )}
        </div>
        <div className="setup-right">
          {names.length === 0 ? (
            <div className="empty-hint muted">Añade al menos {MIN_PARTICIPANTS} nombres.</div>
          ) : (
            <motion.div className="chips" layout>
              <AnimatePresence>
                {names.map((n) => (
                  <motion.span
                    layout
                    key={n}
                    className="chip"
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', damping: 16, stiffness: 260 }}
                  >
                    <span className="chip-avatar">{n[0]?.toLocaleUpperCase('es')}</span>
                    {n}
                    <button
                      className="chip-x"
                      onClick={() => {
                        sfx.deselect();
                        setNames(names.filter((x) => x !== n));
                      }}
                      aria-label={`Quitar a ${n}`}
                    >
                      <IconX width={14} height={14} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
      <div className="footer" style={{ justifyContent: 'flex-end' }}>
        <span className="muted" style={{ fontSize: 13, marginRight: 'auto' }}>
          La lista no se puede cambiar una vez empiece.
        </span>
        <button className="btn btn-gold btn-lg" disabled={!!err} onClick={() => start(names)}>
          Empezar propuestas <IconArrow />
        </button>
      </div>
    </Screen>
  );
}
