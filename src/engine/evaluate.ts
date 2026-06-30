/**
 * Time evaluation: turn a virtual clock value into live state + national
 * snapshots. Pure functions of (model, t) so seeking, replaying and skipping
 * are trivial and always consistent.
 */

import type { BuiltModel } from './buildModel';
import type {
  FeedEvent,
  NationalSnapshot,
  StateLive,
  StateModel,
  StateStatus,
} from './types';

/** Smooth ease-in-out reporting curve (Perlin's smootherstep). */
function curve(u: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return u * u * u * (u * (u * 6 - 15) + 10);
}

/** Raw (continuous) reporting fraction for a state at virtual minute t. */
export function reportingRaw(st: StateModel, t: number): number {
  return curve((t - st.closeMin) / st.durationMin);
}

/** Number of seats revealed at time t (drives discrete vote jumps). */
function revealedSeats(st: StateModel, t: number): number {
  const pct = reportingRaw(st, t);
  return Math.min(st.seats.length, Math.round(st.seats.length * pct));
}

export function evalState(st: StateModel, nP: number, t: number): StateLive {
  const closed = t >= st.closeMin;
  const revealed = closed ? revealedSeats(st, t) : 0;
  const reportingPct = st.seats.length ? revealed / st.seats.length : 0;

  const countedVotes = new Array(nP).fill(0);
  const provisionalSeats = new Array(nP).fill(0);
  let countedTotal = 0;
  for (let k = 0; k < revealed; k++) {
    const seat = st.seats[k];
    provisionalSeats[seat.winner]++;
    for (let p = 0; p < nP; p++) countedVotes[p] += seat.votes[p];
    countedTotal += seat.total;
  }

  // Leader + margin by counted votes.
  let leader = -1;
  let top = -1;
  let second = 0;
  for (let p = 0; p < nP; p++) {
    if (countedVotes[p] > top) {
      second = top;
      top = countedVotes[p];
      leader = p;
    } else if (countedVotes[p] > second) {
      second = countedVotes[p];
    }
  }
  const margin = countedTotal > 0 ? (top - Math.max(0, second)) / countedTotal : 0;

  const called = closed && reportingPct >= st.callPct && reportingPct > 0;
  const calledFor = called ? st.winner : -1;

  let status: StateStatus = 'not-closed';
  if (called) status = 'called';
  else if (!closed) status = 'not-closed';
  else if (revealed === 0) status = 'closed';
  else if (margin < 0.02) status = 'too-close';
  else if (margin < 0.07) status = 'lean';
  else if (margin < 0.15) status = 'likely';
  else status = 'counting';

  return {
    index: st.index,
    reportingPct,
    countedVotes,
    countedTotal,
    provisionalSeats,
    leader,
    margin,
    closed,
    called,
    calledFor,
    status,
  };
}

export function evalNational(model: BuiltModel, t: number): {
  national: NationalSnapshot;
  live: StateLive[];
} {
  const nP = model.data.parties.length;
  const seats = new Array(nP).fill(0);
  const votes = new Array(nP).fill(0);
  const calledSeats = new Array(nP).fill(0);
  const blocSeats: Record<string, number> = {};
  let totalVotes = 0;
  let reportedSeats = 0;

  const live = model.states.map((st) => {
    const s = evalState(st, nP, t);
    for (let p = 0; p < nP; p++) {
      seats[p] += s.provisionalSeats[p];
      votes[p] += s.countedVotes[p];
      if (s.called) calledSeats[p] += st.finalSeats[p];
    }
    totalVotes += s.countedTotal;
    reportedSeats += s.provisionalSeats.reduce((a, b) => a + b, 0);
    return s;
  });

  for (let p = 0; p < nP; p++) {
    const bloc = model.data.parties[p].bloc;
    blocSeats[bloc] = (blocSeats[bloc] ?? 0) + seats[p];
  }

  let leadParty = 0;
  for (let p = 1; p < nP; p++) if (seats[p] > seats[leadParty]) leadParty = p;

  const national: NationalSnapshot = {
    seats,
    votes,
    totalVotes,
    totalSeats: reportedSeats,
    reportingPct: reportedSeats / model.data.totalSeats,
    leadParty,
    calledSeats,
    blocSeats,
  };
  return { national, live };
}

/** Previous-election winner of a state (by vote share) for flip detection. */
function lastWinner(st: StateModel): number {
  const ls = st.raw.lastShares;
  let w = 0;
  for (let p = 1; p < ls.length; p++) if (ls[p] > ls[w]) w = p;
  return w;
}

/**
 * Walk the virtual night minute-by-minute and emit a data-driven event feed:
 * poll closings, first results, milestones, calls, flips, tightening races,
 * majority moments and the final declaration.
 */
export function generateEvents(model: BuiltModel, virtualNight: number): FeedEvent[] {
  const names = model.data.parties.map((p) => p.name);
  const events: FeedEvent[] = [];
  let uid = 0;
  const mk = (
    t: number,
    kind: FeedEvent['kind'],
    text: string,
    party = -1,
    major = false,
  ) => events.push({ id: `e${uid++}`, t, kind, text, party, major });

  // Track per-state transitions.
  const closed = new Array(model.states.length).fill(false);
  const firstRes = new Array(model.states.length).fill(false);
  const milestones = model.states.map(() => new Set<number>());
  const called = new Array(model.states.length).fill(false);
  const tightFlagged = new Array(model.states.length).fill(false);
  let majorityAnnounced = false;
  let largestAnnounced = false;
  const MILE = [0.25, 0.5, 0.75];

  // Group poll-closings that happen close together into one banner.
  const closeBuckets = new Map<number, number[]>();
  model.states.forEach((st, i) => {
    const bucket = Math.round(st.closeMin / 8) * 8;
    if (!closeBuckets.has(bucket)) closeBuckets.set(bucket, []);
    closeBuckets.get(bucket)!.push(i);
  });
  for (const [bucket, idxs] of closeBuckets) {
    const nm = idxs.map((i) => model.states[i].raw.name);
    const list = nm.length > 3 ? `${nm.slice(0, 3).join(', ')} +${nm.length - 3} more` : nm.join(', ');
    mk(Math.max(0.1, bucket), 'poll-close', `Polls close in ${list}.`, -1, false);
  }

  for (let t = 1; t <= virtualNight; t++) {
    const { national, live } = evalNational(model, t);

    live.forEach((s, i) => {
      const st = model.states[i];
      if (!firstRes[i] && s.reportingPct > 0) {
        firstRes[i] = true;
        mk(t, 'first-results', `First results in from ${st.raw.name}.`, s.leader, false);
      }
      for (const m of MILE) {
        if (!milestones[i].has(m) && s.reportingPct >= m) {
          milestones[i].add(m);
          // Only surface milestones for sizeable or competitive states.
          if (st.raw.seats >= 12 || st.tier === 'tossup' || st.tier === 'competitive') {
            mk(t, 'milestone', `${st.raw.name} reaches ${Math.round(m * 100)}% reporting.`, s.leader);
          }
        }
      }
      if (
        !tightFlagged[i] &&
        s.reportingPct > 0.2 &&
        s.margin < 0.01 &&
        (st.tier === 'tossup' || st.tier === 'competitive')
      ) {
        tightFlagged[i] = true;
        mk(t, 'tightening', `${st.raw.name} is too close to call — margin under 1 point.`, -1, true);
      }
      if (!called[i] && s.called) {
        called[i] = true;
        const w = st.winner;
        mk(t, 'called', `${st.raw.name} is projected for ${names[w]}.`, w, st.tier !== 'safe');
        if (lastWinner(st) !== w && st.raw.seats >= 8) {
          mk(t + 0.01, 'flip', `FLIP: ${names[w]} gains ${st.raw.name} from ${names[lastWinner(st)]}.`, w, true);
        }
      }
      void closed;
    });

    // Largest-party + majority moments (data-driven headlines).
    const lead = national.leadParty;
    if (!largestAnnounced && national.reportingPct > 0.4 && national.seats[lead] > 0) {
      const sorted = [...national.seats].sort((a, b) => b - a);
      if (sorted[0] - sorted[1] > 20) {
        largestAnnounced = true;
        mk(t, 'alert', `${names[lead]} on course to be the largest party.`, lead, true);
      }
    }
    if (!majorityAnnounced && national.seats[model.finalWinner] >= model.data.majority) {
      majorityAnnounced = true;
      if (model.majorityReached) {
        mk(t, 'majority', `${names[model.finalWinner]} reach ${model.data.majority} seats — an overall majority.`, model.finalWinner, true);
      }
    }
  }

  // Final declaration once everything is counted.
  const allDoneT =
    Math.max(...model.states.map((s) => s.closeMin + s.durationMin)) + 1;
  if (model.majorityReached) {
    mk(allDoneT, 'final', `${names[model.finalWinner]} win a majority government with ${model.finalSeats[model.finalWinner]} seats.`, model.finalWinner, true);
  } else {
    mk(allDoneT, 'final', `Hung parliament — ${names[model.finalWinner]} largest with ${model.finalSeats[model.finalWinner]} of ${model.data.totalSeats} seats.`, model.finalWinner, true);
  }

  events.sort((a, b) => a.t - b.t);
  return events;
}
