import { useStore } from '../store/useStore';

export function SoundControls() {
  const muted = useStore((s) => s.muted);
  const volume = useStore((s) => s.volume);
  const setMuted = useStore((s) => s.setMuted);
  const setVolume = useStore((s) => s.setVolume);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setMuted(!muted)}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm hover:bg-white/10"
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={muted ? 0 : volume}
        onChange={(e) => {
          setVolume(parseFloat(e.target.value));
          if (muted) setMuted(false);
        }}
        className="w-20 accent-white/70"
        title="Volume"
      />
    </div>
  );
}
