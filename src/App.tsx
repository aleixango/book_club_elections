import { AnimatePresence, MotionConfig } from 'motion/react';
import { useEffect, useState } from 'react';
import { useStore } from './store/session';
import { participantById } from './domain/session';
import { roundLabel } from './domain/rounds';
import type { Session } from './domain/types';
import { Backdrop, RotateOverlay, Toast } from './components/Chrome';
import { HomeScreen } from './screens/Home';
import { SetupScreen } from './screens/Setup';
import { CurtainScreen, HandoffScreen, SpinScreen } from './screens/Turn';
import { ProposalScreen } from './screens/Proposal';
import { ProposalsDoneScreen } from './screens/ProposalsDone';
import { VoteScreen } from './screens/Vote';
import { BookRouletteScreen, ResultsScreen, RoundEndScreen } from './screens/Results';
import { HistoryScreen, WinnerScreen } from './screens/Winner';
import { installWakeLock } from './lib/device';
import { ErrorBoundary } from './components/ErrorBoundary';

type View = 'home' | 'setup' | 'session' | 'history';

function sessionKey(s: Session): string {
  const p = s.phase;
  switch (p.kind) {
    case 'proposals':
    case 'voting':
      return `${p.kind}-${'round' in p ? p.round.id : ''}-${p.turn.step}-${p.turn.current ?? ''}`;
    case 'roundEnd':
    case 'results':
    case 'roulette':
      return `${p.kind}-${p.round.id}`;
    default:
      return p.kind;
  }
}

export default function App() {
  const session = useStore((s) => s.session);
  const [view, setView] = useState<View>('home');

  useEffect(installWakeLock, []);

  // Session created -> go into it; session discarded while inside -> back home.
  useEffect(() => {
    if (session && view === 'setup') setView('session');
    if (!session && view === 'session') setView('home');
  }, [session, view]);

  let screen: React.ReactNode;
  let key: string = view;

  if (view === 'home') {
    screen = <HomeScreen onNew={() => setView('setup')} onContinue={() => setView('session')} onHistory={() => setView('history')} />;
  } else if (view === 'setup') {
    screen = <SetupScreen onBack={() => setView('home')} />;
  } else if (view === 'history') {
    screen = <HistoryScreen onBack={() => setView('home')} />;
  } else if (session) {
    key = sessionKey(session);
    screen = <SessionView session={session} onNew={() => setView('setup')} onHome={() => setView('home')} />;
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <Backdrop />
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <div key={key} style={{ display: 'contents' }}>
              {screen}
            </div>
          </AnimatePresence>
        </ErrorBoundary>
        <Toast />
        <RotateOverlay />
      </div>
    </MotionConfig>
  );
}

function SessionView({ session, onNew, onHome }: { session: Session; onNew: () => void; onHome: () => void }) {
  const s = useStore();
  const p = session.phase;

  switch (p.kind) {
    case 'proposals':
    case 'voting': {
      const { turn } = p;
      const who = participantById(session, turn.current);
      const isVote = p.kind === 'voting';
      const title = isVote ? roundLabel(p.round) : 'Propuestas';
      if (turn.step === 'spin' || !who) {
        return (
          <SpinScreen
            title={title}
            sub={isVote ? `${p.round.votesPerVoter} ${p.round.votesPerVoter === 1 ? 'voto' : 'votos'} por persona` : 'hasta 3 libros cada uno'}
            heading={isVote ? 'Siguiente votante' : 'Siguiente en proponer'}
            participants={session.participants}
            remaining={turn.remaining}
            onPicked={s.pickTurn}
          />
        );
      }
      if (turn.step === 'handoff') {
        return (
          <HandoffScreen
            name={who.name}
            action={isVote ? 'Tu voto es secreto: que nadie mire la pantalla.' : 'Vas a proponer hasta 3 libros.'}
            onConfirm={s.confirmIdentity}
          />
        );
      }
      if (turn.step === 'active') {
        return isVote ? (
          <VoteScreen session={session} round={p.round} voterName={who.name} voterId={who.id} />
        ) : (
          <ProposalScreen session={session} name={who.name} />
        );
      }
      const last = turn.remaining.length === 1;
      return (
        <CurtainScreen
          title={isVote ? 'Voto guardado' : 'Propuestas guardadas'}
          text={last ? 'Eras el último. Devuelve el móvil al grupo.' : 'Devuelve el móvil al grupo.'}
          button={last ? 'Continuar' : 'Siguiente turno'}
          onNext={s.endTurn}
        />
      );
    }
    case 'proposalsDone':
      return <ProposalsDoneScreen session={session} />;
    case 'roundEnd':
      return <RoundEndScreen round={p.round} />;
    case 'results':
      return <ResultsScreen session={session} round={p.round} outcome={p.outcome} />;
    case 'roulette':
      return <BookRouletteScreen session={session} outcome={p.outcome} />;
    case 'winner':
      return <WinnerScreen session={session} bookId={p.bookId} byRoulette={p.byRoulette} onNew={onNew} onHome={onHome} />;
  }
}
