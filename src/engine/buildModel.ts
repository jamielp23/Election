/**
 * Deterministic model builder.
 *
 * Given the spreadsheet data + the user's settings + a seed, this produces the
 * *entire* final election (seat allocation, vote totals, per-seat results,
 * reporting timetable and call thresholds) up front. Because everything is a
 * pure function of the seed, the same seed reproduces the same night exactly,
 * and the UI can freely seek/replay by evaluating a virtual clock — the result
 * never changes "in impossible ways".
 *
 * The seat draw faithfully reproduces the workbook's Engine sheet + the
 * RunMonteCarlo VBA macro: per seat, draw r ~ U[0,1) and award it to the first
 * party whose cumulative (share x seat-efficiency) threshold exceeds r.
 */

import { Rng } from './rng';
import type { CallTier, ModelData, SeatResult, SimSettings, StateModel } from './types';

/**
 * Relative reporting tempo of parties: rural/populist support (Con, Nat, BPF)
 * tends to report earlier; urban/mail-heavy support (SD, Lib, Ind) reports
 * later. This is what makes early leads erode realistically.
 */
const PARTY_REPORT_BIAS = [-0.18, 0.16, 0.12, -0.14, 0.05, -0.2];

function clampShares(shares: number[]): number[] {
  // Preserve exact zeros (e.g. BP First, which only contests Bras-Panon) so a
  // party that doesn't stand never picks up phantom votes; floor the rest.
  const floored = shares.map((s) => (s <= 0 ? 0 : Math.max(0.0002, s)));
  const sum = floored.reduce((a, b) => a + b, 0);
  return floored.map((s) => s / sum);
}

/** Apply the settings levers (swing / polling error / third party) to shares. */
function adjustShares(
  base: number[],
  s: SimSettings,
  rng: Rng,
): number[] {
  const out = base.slice();
  // National swing toward one party (points -> share).
  if (s.swingParty >= 0 && s.swingParty < out.length) {
    out[s.swingParty] += s.nationalSwing / 100;
  }
  // Third-party boost: Independent everywhere, BP First only where it stands.
  if (s.thirdPartyBoost !== 0) {
    out[4] += s.thirdPartyBoost / 100;
    if (base[5] > 0.01) out[5] += s.thirdPartyBoost / 100;
  }
  // Correlated polling error per party in this state.
  if (s.pollingError > 0) {
    for (let p = 0; p < out.length; p++) {
      if (base[p] > 0.001) out[p] += rng.normal(0, s.pollingError / 100);
    }
  }
  return clampShares(out);
}

/** Map a top-two vote margin (points) to a confidence tier + call threshold. */
function classify(voteMargin: number, rng: Rng): { tier: CallTier; callPct: number } {
  const j = rng.range(-0.02, 0.02);
  if (voteMargin >= 0.25) return { tier: 'safe', callPct: 0.02 + Math.max(0, j) };
  if (voteMargin >= 0.15) return { tier: 'likely', callPct: 0.15 + j };
  if (voteMargin >= 0.07) return { tier: 'lean', callPct: 0.45 + j };
  if (voteMargin >= 0.025) return { tier: 'competitive', callPct: 0.75 + j };
  return { tier: 'tossup', callPct: 0.97 + Math.min(0, j) };
}

/** Build one state's complete result. */
function buildState(
  data: ModelData,
  index: number,
  settings: SimSettings,
  root: Rng,
  nightStart: number,
): StateModel {
  const raw = data.states[index];
  const nP = data.parties.length;
  const rng = root.fork(`state:${raw.name}`);

  const shares = adjustShares(raw.shares, settings, rng);

  // Turnout error -> recompute votes cast for this state.
  const turnout = Math.min(
    0.95,
    Math.max(0.2, raw.turnout + (settings.turnoutError > 0 ? rng.normal(0, settings.turnoutError) : 0)),
  );
  const totalVotes = Math.round(raw.population * turnout);

  // --- Seat draw (Engine sheet / RunMonteCarlo macro) -------------------
  const eff = data.parties.map((p, i) => shares[i] * p.seatEff);
  const effTot = eff.reduce((a, b) => a + b, 0);
  const cum: number[] = [];
  let run = 0;
  for (let p = 0; p < nP; p++) {
    run += effTot <= 0 ? effTot / nP : eff[p];
    cum.push(effTot <= 0 ? (p + 1) / nP : run / effTot);
  }
  cum[nP - 1] = 1; // guard against fp drift

  const finalSeats = new Array(nP).fill(0);
  const seatWinners: number[] = [];
  for (let k = 0; k < raw.seats; k++) {
    const r = rng.next();
    let p = 0;
    while (p < nP - 1 && r >= cum[p]) p++;
    finalSeats[p]++;
    seatWinners.push(p);
  }

  // --- Per-seat vote synthesis + reveal ordering ------------------------
  const seats: SeatResult[] = [];
  const finalVotes = new Array(nP).fill(0);
  const avgSeatVotes = totalVotes / Math.max(1, raw.seats);
  for (let k = 0; k < raw.seats; k++) {
    const w = seatWinners[k];
    // Start from state shares + local noise, then guarantee the drawn winner
    // leads. Parties that don't stand (share 0) stay at exactly 0 votes.
    const local = shares.map((sh) => (sh <= 0 ? 0 : Math.max(0.001, sh + rng.normal(0, 0.05))));
    local[w] *= 1.25;
    const lsum = local.reduce((a, b) => a + b, 0);
    const seatTotal = Math.round(avgSeatVotes * rng.range(0.7, 1.3));
    const votes = local.map((v) => Math.round((v / lsum) * seatTotal));
    for (let p = 0; p < nP; p++) finalVotes[p] += votes[p];
    // Reveal order: rural-leaning winners report earlier.
    const order = rng.next() + PARTY_REPORT_BIAS[w] * 0.5;
    seats.push({ winner: w, votes, total: seatTotal, order });
  }
  seats.sort((a, b) => a.order - b.order);

  const actualTotalVotes = finalVotes.reduce((a, b) => a + b, 0);

  // Winner by seats (ties broken by votes) — matches Simulator "State winner".
  let winner = 0;
  for (let p = 1; p < nP; p++) {
    if (
      finalSeats[p] > finalSeats[winner] ||
      (finalSeats[p] === finalSeats[winner] && finalVotes[p] > finalVotes[winner])
    ) {
      winner = p;
    }
  }

  // Margins.
  const seatsSorted = [...finalSeats].sort((a, b) => b - a);
  const votesSorted = [...finalVotes].sort((a, b) => b - a);
  const seatMargin = (seatsSorted[0] - seatsSorted[1]) / Math.max(1, raw.seats);
  const voteMargin = (votesSorted[0] - votesSorted[1]) / Math.max(1, actualTotalVotes);

  const { tier, callPct } = classify(voteMargin, rng);

  // --- Timing -----------------------------------------------------------
  // Polls close at the real scheduled time from the spreadsheet (minutes after
  // the earliest-closing state). Counting only begins once polls close.
  const closeMin = raw.pollsCloseMin - nightStart;
  // Bigger states take longer; speed setting + randomness widen the spread.
  const sizeFactor = 0.6 + Math.min(1.4, raw.seats / 50);
  const durationMin =
    ((90 + sizeFactor * 120) / Math.max(0.25, settings.reportingSpeed)) *
    (1 + rng.normal(0, 0.15 * settings.reportingRandomness));

  return {
    raw: { ...raw, votesCast: totalVotes, turnout },
    index,
    shares,
    finalSeats,
    finalVotes,
    totalVotes: actualTotalVotes,
    winner,
    seatMargin,
    voteMargin,
    tier,
    callPct,
    closeMin,
    durationMin: Math.max(40, durationMin),
    seats,
  };
}

export interface BuiltModel {
  data: ModelData;
  settings: SimSettings;
  states: StateModel[];
  /** Final national seat totals per party. */
  finalSeats: number[];
  /** Final national vote totals per party. */
  finalVotes: number[];
  /** Party index that ultimately wins the most seats nationally. */
  finalWinner: number;
  /** Whether the lead party reaches an overall majority. */
  majorityReached: boolean;
  finalVoteWinner: number;
  /** Clock time (minutes from midnight) the first polls close — the T0 of the
   *  virtual night. */
  nightStart: number;
  /** Virtual minute the last state finishes counting (timeline length). */
  nightEnd: number;
}

export function buildModel(data: ModelData, settings: SimSettings): BuiltModel {
  const root = new Rng(settings.seed);
  const nightStart = Math.min(...data.states.map((s) => s.pollsCloseMin));
  const states = data.states.map((_, i) => buildState(data, i, settings, root, nightStart));
  const nightEnd = Math.max(...states.map((s) => s.closeMin + s.durationMin)) + 2;

  const nP = data.parties.length;
  const finalSeats = new Array(nP).fill(0);
  const finalVotes = new Array(nP).fill(0);
  for (const st of states) {
    for (let p = 0; p < nP; p++) {
      finalSeats[p] += st.finalSeats[p];
      finalVotes[p] += st.finalVotes[p];
    }
  }
  let finalWinner = 0;
  let finalVoteWinner = 0;
  for (let p = 1; p < nP; p++) {
    if (finalSeats[p] > finalSeats[finalWinner]) finalWinner = p;
    if (finalVotes[p] > finalVotes[finalVoteWinner]) finalVoteWinner = p;
  }

  return {
    data,
    settings,
    states,
    finalSeats,
    finalVotes,
    finalWinner,
    finalVoteWinner,
    majorityReached: finalSeats[finalWinner] >= data.majority,
    nightStart,
    nightEnd,
  };
}
