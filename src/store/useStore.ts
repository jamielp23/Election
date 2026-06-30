/**
 * Central application store (Zustand). Owns the virtual clock, drives the
 * deterministic engine, fires the event feed and exposes playback controls.
 *
 * The clock is advanced by a single rAF driver (see useClock). Snapshots are
 * throttled to ~10/sec so React stays cheap while Framer Motion tweens between
 * target values for smooth, high-frame-rate visuals.
 */

import { create } from 'zustand';
import modelData from '../data/model.json';
import { buildModel, type BuiltModel } from '../engine/buildModel';
import { evalNational, generateEvents } from '../engine/evaluate';
import * as sound from '../engine/sound';
import type {
  FeedEvent,
  ModelData,
  NationalSnapshot,
  SimSettings,
  StateLive,
} from '../engine/types';

const DATA = modelData as ModelData;

export const DEFAULT_SETTINGS: SimSettings = {
  seed: 'election-2026',
  nightLengthMin: 60,
  nationalSwing: 0,
  swingParty: -1,
  pollingError: 0,
  turnoutError: 0,
  thirdPartyBoost: 0,
  reportingRandomness: 0.5,
  reportingSpeed: 1,
};

export type SortKey =
  | 'name'
  | 'seats'
  | 'votePct'
  | 'votes'
  | 'reporting'
  | 'winner'
  | 'swing';

interface SnapshotState {
  national: NationalSnapshot;
  live: StateLive[];
}

interface Store {
  phase: 'setup' | 'running' | 'finished';
  settings: SimSettings;
  model: BuiltModel | null;
  data: ModelData;
  events: FeedEvent[];
  virtualNight: number;
  /** Clock time (minutes from midnight) that election night begins (T0). */
  nightStart: number;

  virtualTime: number;
  playing: boolean;
  speed: number;

  snapshot: SnapshotState | null;
  feed: FeedEvent[];
  alert: FeedEvent | null;
  firedIds: Set<string>;

  hovered: number | null;
  selected: number | null;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';

  muted: boolean;
  volume: number;

  // internal throttle accumulator
  _acc: number;

  // actions
  updateSettings: (p: Partial<SimSettings>) => void;
  start: () => void;
  restart: () => void;
  togglePlay: () => void;
  setSpeed: (s: number) => void;
  skip: (mins: number) => void;
  seek: (t: number) => void;
  replay: () => void;
  advance: (realDeltaMs: number) => void;
  setHovered: (i: number | null) => void;
  setSelected: (i: number | null) => void;
  setSort: (k: SortKey) => void;
  setMuted: (m: boolean) => void;
  setVolume: (v: number) => void;
}

/** virtual minutes elapsed per real second, given the chosen night length. */
function rate(model: BuiltModel, settings: SimSettings): number {
  return model.nightEnd / (settings.nightLengthMin * 60);
}

function endTime(model: BuiltModel): number {
  return model.nightEnd;
}

function recompute(get: () => Store, set: (p: Partial<Store>) => void, playSounds: boolean) {
  const { model, virtualTime, events, firedIds } = get();
  if (!model) return;
  const snap = evalNational(model, virtualTime);

  // Fire any events whose time has passed and not yet fired.
  const newlyFired: FeedEvent[] = [];
  for (const ev of events) {
    if (ev.t <= virtualTime && !firedIds.has(ev.id)) {
      firedIds.add(ev.id);
      newlyFired.push(ev);
    }
  }

  let alert = get().alert;
  if (newlyFired.length) {
    const feed = [...newlyFired.reverse(), ...get().feed].slice(0, 80);
    const major = newlyFired.find((e) => e.major);
    if (major) alert = major;
    if (playSounds) {
      for (const e of newlyFired) {
        if (e.kind === 'final' && get().model?.majorityReached) sound.play('victory');
        else if (e.kind === 'majority') sound.play('victory');
        else if (e.kind === 'flip') sound.play('flip');
        else if (e.kind === 'called') sound.play('call');
        else if (e.kind === 'poll-close') sound.play('close');
        else if (e.kind === 'first-results') sound.play('first');
        else if (e.major) sound.play('breaking');
      }
    }
    set({ feed, alert, snapshot: snap });
  } else {
    set({ snapshot: snap });
  }
}

export const useStore = create<Store>((set, get) => ({
  phase: 'setup',
  settings: { ...DEFAULT_SETTINGS },
  model: null,
  data: DATA,
  events: [],
  virtualNight: 420,
  nightStart: 18 * 60 + 30,

  virtualTime: 0,
  playing: false,
  speed: 1,

  snapshot: null,
  feed: [],
  alert: null,
  firedIds: new Set(),

  hovered: null,
  selected: null,
  sortKey: 'seats',
  sortDir: 'desc',

  muted: false,
  volume: 0.6,

  _acc: 0,

  updateSettings: (p) => set({ settings: { ...get().settings, ...p } }),

  start: () => {
    const settings = get().settings;
    const model = buildModel(DATA, settings);
    const events = generateEvents(model, model.nightEnd);
    sound.resumeAudio();
    set({
      model,
      events,
      virtualNight: model.nightEnd,
      nightStart: model.nightStart,
      phase: 'running',
      virtualTime: 0,
      playing: true,
      speed: 1,
      feed: [],
      alert: null,
      firedIds: new Set(),
      snapshot: evalNational(model, 0),
      _acc: 0,
    });
  },

  restart: () => {
    const { model } = get();
    if (!model) return;
    set({
      phase: 'running',
      virtualTime: 0,
      playing: true,
      feed: [],
      alert: null,
      firedIds: new Set(),
      snapshot: evalNational(model, 0),
      _acc: 0,
    });
  },

  togglePlay: () => {
    const playing = !get().playing;
    if (playing) sound.resumeAudio();
    set({ playing });
  },

  setSpeed: (s) => set({ speed: s }),

  skip: (mins) => {
    const { model } = get();
    if (!model) return;
    const t = Math.min(endTime(model), get().virtualTime + mins);
    get().seek(t);
  },

  seek: (t) => {
    const { model, events } = get();
    if (!model) return;
    const clamped = Math.max(0, t);
    // Rebuild fired set + feed for the new position (no sounds on scrub).
    const fired = new Set<string>();
    const feed: FeedEvent[] = [];
    for (const ev of events) {
      if (ev.t <= clamped) {
        fired.add(ev.id);
        feed.unshift(ev);
      }
    }
    set({
      virtualTime: clamped,
      firedIds: fired,
      feed: feed.slice(0, 80),
      alert: null,
      snapshot: evalNational(model, clamped),
    });
  },

  replay: () => {
    set({ virtualTime: 0, playing: true, feed: [], alert: null, firedIds: new Set(), _acc: 0 });
    const { model } = get();
    if (model) set({ snapshot: evalNational(model, 0), phase: 'running' });
  },

  advance: (realDeltaMs) => {
    const state = get();
    if (!state.playing || !state.model) return;
    const dtSec = realDeltaMs / 1000;
    const dv = dtSec * rate(state.model, state.settings) * state.speed;
    const end = endTime(state.model);
    let vt = state.virtualTime + dv;
    let playing = true;
    if (vt >= end) {
      vt = end;
      playing = false;
    }
    const acc = state._acc + realDeltaMs;
    // Throttle heavy snapshot work to ~10 Hz; always update the clock value.
    if (acc >= 95 || !playing) {
      set({ virtualTime: vt, playing, phase: playing ? 'running' : 'finished', _acc: 0 });
      recompute(get, set, true);
    } else {
      set({ virtualTime: vt, _acc: acc });
    }
  },

  setHovered: (i) => set({ hovered: i }),
  setSelected: (i) => set({ selected: i }),
  setSort: (k) => {
    const { sortKey, sortDir } = get();
    if (sortKey === k) set({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' });
    else set({ sortKey: k, sortDir: k === 'name' ? 'asc' : 'desc' });
  },
  setMuted: (m) => {
    sound.setMuted(m);
    set({ muted: m });
  },
  setVolume: (v) => {
    sound.setVolume(v);
    set({ volume: v });
  },
}));
