import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { TopBar } from './TopBar';
import { SeatTracker } from './SeatTracker';
import { NationalVote } from './NationalVote';
import { CoalitionPanel } from './CoalitionPanel';
import { LeadersPanel } from './LeadersPanel';
import { TileMap } from './TileMap';
import { GeoMap } from './GeoMap';
import { EventFeed } from './EventFeed';
import { StateDetail } from './StateDetail';
import { ResultsTable } from './ResultsTable';
import { BreakingBanner } from './BreakingBanner';
import { Ticker } from './Ticker';
import { Controls, Timeline } from './Controls';

export function Dashboard() {
  const [showResults, setShowResults] = useState(false);
  const [mapView, setMapView] = useState<'geo' | 'grid'>('geo');

  return (
    <div className="relative flex h-full flex-col">
      <TopBar onToggleResults={() => setShowResults((v) => !v)} showResults={showResults} />

      <BreakingBanner />

      <main className="grid min-h-0 flex-1 gap-3 px-3 py-3 lg:grid-cols-[330px_1fr_372px]">
        {/* Left column */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <SeatTracker />
          <NationalVote />
          <CoalitionPanel />
          <LeadersPanel />
        </div>

        {/* Center column */}
        <div className="flex min-h-0 flex-col gap-3">
          {mapView === 'geo' ? (
            <GeoMap onSwitchView={() => setMapView('grid')} />
          ) : (
            <TileMap onSwitchView={() => setMapView('geo')} />
          )}
          {/* mobile/narrow fallback controls live under the map */}
          <div className="glass flex flex-col gap-2 p-3 lg:hidden">
            <Timeline />
            <Controls />
          </div>
        </div>

        {/* Right column */}
        <div className="flex min-h-0 flex-col overflow-hidden">
          <StateDetail />
          <EventFeed />
        </div>
      </main>

      <Ticker />

      <AnimatePresence>
        {showResults && <ResultsTable onClose={() => setShowResults(false)} />}
      </AnimatePresence>
    </div>
  );
}
