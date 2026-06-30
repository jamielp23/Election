import { useStore } from '../store/useStore';

/**
 * Bottom newsroom ticker — a continuously scrolling marquee of recent
 * headlines, the way a TV chyron crawls along the bottom of the screen.
 */
export function Ticker() {
  const feed = useStore((s) => s.feed);
  const parties = useStore((s) => s.data.parties);
  const items = feed.slice(0, 24);

  if (items.length === 0) return null;
  const line = [...items, ...items]; // duplicate for seamless loop

  return (
    <div className="ticker-mask flex items-center overflow-hidden border-t border-white/10 bg-black/50 py-2">
      <span className="z-10 ml-2 mr-3 shrink-0 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
        Results
      </span>
      <div className="flex animate-[ticker_60s_linear_infinite] whitespace-nowrap">
        {line.map((e, k) => {
          const color = e.party >= 0 ? parties[e.party].color : '#94a3b8';
          return (
            <span key={`${e.id}-${k}`} className="mx-5 inline-flex items-center gap-2 text-[12.5px] text-white/75">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              {e.text}
            </span>
          );
        })}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
