/** Core domain types shared across the engine, store and UI. */

export interface Party {
  name: string;
  abbr: string;
  /** Seat-efficiency factor (Simulator D5:D10) — FPTP vote-to-seat distortion. */
  seatEff: number;
  color: string;
  /** Coalition bloc the party belongs to. */
  bloc: string;
}

/** A region/state as defined in the spreadsheet (36 of them). */
export interface RawState {
  name: string;
  region: string;
  population: number;
  /** Turnout fraction (Simulator G column / Model AA). */
  turnout: number;
  /** Votes cast = round(population * turnout) (Simulator H column). */
  votesCast: number;
  /** Number of parliamentary seats contested in this state (Simulator I). */
  seats: number;
  /** Final per-party vote share after the full model pipeline (Simulator J:O). */
  shares: number[];
  /** Per-party vote share at the previous election (Voting History O:T). */
  lastShares: number[];
}

export interface ModelData {
  parties: Party[];
  states: RawState[];
  majority: number;
  totalSeats: number;
  incumbent: string;
  blocNames: { bloc1: string; bloc2: string };
}

/** Tunable settings chosen before the simulation starts. */
export interface SimSettings {
  seed: string;
  /** Total real-world length of election night in minutes (45-90). */
  nightLengthMin: number;
  /** Uniform national swing in points toward a chosen party (signed). */
  nationalSwing: number;
  /** Party index the national swing favours (-1 = none). */
  swingParty: number;
  /** Polling error std-dev in points, applied per state per party. */
  pollingError: number;
  /** Turnout error std-dev as a fraction (e.g. 0.03 = +/-3pts). */
  turnoutError: number;
  /** Third-party (Independent + BP First) boost in points. */
  thirdPartyBoost: number;
  /** How spread out reporting speed is between states (0-1). */
  reportingRandomness: number;
  /** Overall reporting speed multiplier (1 = default). */
  reportingSpeed: number;
}

/** A single seat's synthesised result inside a state. */
export interface SeatResult {
  /** Winning party index (from the seeded seat draw). */
  winner: number;
  /** Per-party votes in this seat. */
  votes: number[];
  /** Total votes in this seat. */
  total: number;
  /** Reveal order key (lower = reports earlier on the night). */
  order: number;
}

/** Confidence tier governing how late a state is called. */
export type CallTier = 'safe' | 'likely' | 'lean' | 'competitive' | 'tossup';

/** Everything precomputed for a state once the seed + settings are fixed. */
export interface StateModel {
  raw: RawState;
  index: number;
  /** Adjusted shares after settings perturbations (sums to 1). */
  shares: number[];
  /** Final per-party seat counts (sums to raw.seats). */
  finalSeats: number[];
  /** Final per-party vote totals. */
  finalVotes: number[];
  totalVotes: number;
  /** Party index that wins the most seats in the state. */
  winner: number;
  /** Margin between 1st and 2nd party by seats (share of seats). */
  seatMargin: number;
  /** Margin between top two parties by votes (share points). */
  voteMargin: number;
  tier: CallTier;
  /** Reporting% (0-1) at which the state gets called. */
  callPct: number;
  /** Virtual minutes after T0 when polls close here. */
  closeMin: number;
  /** Virtual minutes the count takes once polls close. */
  durationMin: number;
  /** Seats ordered by reveal time (drives vote + seat progression). */
  seats: SeatResult[];
}

/** Live, time-dependent snapshot of one state. */
export interface StateLive {
  index: number;
  reportingPct: number;
  countedVotes: number[];
  countedTotal: number;
  provisionalSeats: number[];
  /** Current leader by counted votes (-1 if nothing counted). */
  leader: number;
  /** Margin in points between current top two by counted votes. */
  margin: number;
  closed: boolean;
  called: boolean;
  /** Party the state has been called for (-1 if not called). */
  calledFor: number;
  status: StateStatus;
}

export type StateStatus =
  | 'not-closed'
  | 'closed'
  | 'counting'
  | 'too-close'
  | 'lean'
  | 'likely'
  | 'called';

export type EventKind =
  | 'poll-close'
  | 'first-results'
  | 'milestone'
  | 'called'
  | 'flip'
  | 'tightening'
  | 'majority'
  | 'alert'
  | 'final';

export interface FeedEvent {
  id: string;
  /** Virtual minute the event fires. */
  t: number;
  kind: EventKind;
  text: string;
  /** Party index for colour accents (-1 = neutral). */
  party: number;
  /** True for headline "breaking news" banners. */
  major: boolean;
}

/** National roll-up at a given virtual time. */
export interface NationalSnapshot {
  seats: number[];
  votes: number[];
  totalVotes: number;
  totalSeats: number;
  reportingPct: number;
  leadParty: number;
  calledSeats: number[];
  /** Bloc seat totals keyed by bloc name. */
  blocSeats: Record<string, number>;
}
