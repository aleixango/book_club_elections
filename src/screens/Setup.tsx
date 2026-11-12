import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { useStore } from '../store/session';
import { MAX_PARTICIPANTS, MIN_PARTICIPANTS, normalizeName, validateNames } from '../domain/session';
import { CLUB_MEMBERS, CLUB_PROPOSALS } from '../data/club';
import { Screen } from '../components/Screen';
import { TopBar } from '../components/Chrome';
import { IconArrow, IconBack, IconPlus, IconX } from '../components/icons';
import { sfx } from '../lib/sfx';

export type SetupMode = 'club' | 'new';

export function SetupScreen({ mode: initialMode, onBack }: { mode: SetupMode; onBack: () => void }) {
  const lastNames = useStore((s) => s.lastNames);
  const start = useStore((s) => s.start);
  const startWithProposals = useStore((s) => s.startWithProposals);
  const setError = useStore((s) => s.setError);
  const [mode, setMode] = useState<SetupMode>(initialMode);
  const [names, setNames] = useState<string[]>(initialMode === 'club' ? CLUB_MEMBERS : []);
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const club = mode === 'club';

  const add = () => {
    const n = normalizeName(value);
    if (!n) return;
    if (names.some((x) => x.toLocaleLowerCase('ca') === n.toLocaleLowerCase('ca'))) {
      setError(`«${n}» ja és a la llista`);
      sfx.error();
      return;
    }
    if (names.length >= MAX_PARTICIPANTS) {
      setError(`Màxim ${MAX_PARTICIPANTS} participants`);
      return;
    }
    sfx.select();
    setNames([...names, n.slice(0, 24)]);
    setValue('');
    input.current?.focus();
  };

  const switchMode = (m: SetupMode) => {
    if (m === mode) return;
    sfx.tap();
    setMode(m);
    if (m === 'club' && names.length === 0) setNames(CLUB_MEMBERS);
  };

  const err = validateNames(names);
  const canReuse = names.length === 0 && lastNames.length >= MIN_PARTICIPANTS;

  return (
    <Screen>
      <TopBar
        title="Participants"
        sub={`${names.length} / ${MAX_PARTICIPANTS}`}
        menu={false}
        right={
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            <IconBack /> Inici
          </button>
        }
      />
      <div className="setup">
        <div className="setup-left">
          <div className="segmented" role="tablist" aria-label="Propostes">
            {(['club', 'new'] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => switchMode(m)}>
                {mode === m && <motion.span layoutId="seg-pill" className="segmented-pill" transition={{ type: 'spring', damping: 24, stiffness: 320 }} />}
                <span>{m === 'club' ? `Propostes del club (${CLUB_PROPOSALS.length})` : 'Propostes noves'}</span>
              </button>
            ))}
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(24px, 4vw, 38px)' }}>
            Qui vota avui?
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
              placeholder="Nom del participant"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
              maxLength={24}
            />
            <button type="submit" className="icon-btn" style={{ marginRight: 6 }} disabled={!value.trim()} aria-label="Afegir">
              <IconPlus />
            </button>
          </form>
          {canReuse && (
            <button className="btn btn-ghost btn-sm" onClick={() => setNames(lastNames.slice(0, MAX_PARTICIPANTS))}>
              Fer servir els de l’última vegada ({lastNames.length})
            </button>
          )}
        </div>
        <div className="setup-right">
          {names.length === 0 ? (
            <div className="empty-hint muted">Afegeix almenys {MIN_PARTICIPANTS} noms.</div>
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
                    <span className="chip-avatar">{n[0]?.toLocaleUpperCase('ca')}</span>
                    {n}
                    <button
                      className="chip-x"
                      onClick={() => {
                        sfx.deselect();
                        setNames(names.filter((x) => x !== n));
                      }}
                      aria-label={`Treure ${n}`}
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
          {club ? 'Les propostes ja estan carregades. ' : ''}La llista no es pot canviar un cop comenci.
        </span>
        <button
          className="btn btn-gold btn-lg"
          disabled={!!err}
          onClick={() => (club ? startWithProposals(names, CLUB_PROPOSALS) : start(names))}
        >
          {club ? 'Veure les propostes' : 'Començar les propostes'} <IconArrow />
        </button>
      </div>
    </Screen>
  );
}
