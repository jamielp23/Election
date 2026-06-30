import { useStore } from './store/useStore';
import { useClock } from './lib/useClock';
import { SetupScreen } from './components/SetupScreen';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const phase = useStore((s) => s.phase);
  useClock();

  return (
    <div className="h-full w-full">
      {phase === 'setup' ? <SetupScreen /> : <Dashboard />}
    </div>
  );
}
