// Canasta Coach strategy simulator.
//
// Plays the human seat (0) following the Coach's own plan — draw/take, then
// meld, lay off and discard — against the three built-in bots, deterministically
// per seed. Run two or more Coach policies on the SAME seeds and compare.
//
// Hand mode (default): each seed is one hand; compare per-hand round score.
// Match mode (MATCH=1): each seed is a full match to 5,000; compare win rate.
//
// Usage (hand):
//   N=2000 POLICIES='[{"name":"current","goout":100},{"name":"patient","goout":0}]' node tools/coach-sim/sim.mjs
// Usage (match):
//   N=500 MATCH=1 POLICIES='[{"name":"current","goout":100},{"name":"patient","goout":0}]' node tools/coach-sim/sim.mjs
//
// Each policy is an object of knobs (see build-harness.mjs): ps, wp, goout.
// The first policy is the baseline; others are compared to it on the same seeds.
import { chromium } from 'playwright-core';
import { buildHarness } from './build-harness.mjs';

const N = Number(process.env.N ?? '500');
const MATCH = process.env.MATCH === '1';
const POLICIES = JSON.parse(process.env.POLICIES ?? '[{"name":"current","goout":100}]');
const CHROME = process.env.CHROME ?? '/usr/bin/chromium';

const harness = buildHarness();
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });

async function runPolicy(p) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const params = new URLSearchParams();
  params.set('wildpenalty', String(p.wp ?? 0));
  params.set('progressscale', String(p.ps ?? 1));
  params.set('goout', String(p.goout ?? 100));
  await page.goto(`file://${harness}#${params.toString()}`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const rows = await page.evaluate(({ N, MATCH }) => {
    const W = window.__canasta;
    const ready = () => { const g = W.globals(); return g.state === 'playing' && g.turn === 0 && (g.phase === 'draw' || g.phase === 'play') && !g.needsDeal; };
    const out = [];
    const MAX = 4000000;
    for (let seed = 1; seed <= N; seed++) {
      W.setSeed(seed);
      W.startRound();
      let guard = 0, tookPile = 0;
      const r = MATCH
        ? { seed, final0: null, final1: null, hands: 0, err: null }
        : { seed, round0: null, round1: null, wilds0: 0, canastas0: 0, wentOut0: false, tookPile: 0, err: null };
      while (guard++ < MAX) {
        W.clearKeys();
        if (W.globals().pendingPrompt) { W.resolvePrompt(true); continue; }
        while (W.globals().state === 'playing' && !ready()) {
          W.clearKeys();
          W.update(W.STEP);
          if (++guard > MAX) { r.err = 'loop'; break; }
          if (W.globals().state !== 'playing') break;
        }
        if (r.err) break;
        const st = W.globals().state;
        if (st === 'scorecard') {
          const t = W.globals().scorecardData;
          if (MATCH) {
            r.hands++;
            if (t && t.match) { r.final0 = W.globals().totals[0]; r.final1 = W.globals().totals[1]; break; }
            W.closeScorecard();
            continue;
          }
          const m = W.globals().melds;
          r.round0 = t.teams[0].total;
          r.round1 = t.teams[1].total;
          r.wilds0 = m.filter(x => x.team === 0).flatMap(x => x.cards).filter(c => c.wild).length;
          r.canastas0 = m.filter(x => x.team === 0 && x.cards.length >= 7).length;
          r.wentOut0 = t.teams[0].goingOut === 100;
          r.tookPile = tookPile;
          break;
        }
        if (st === 'over' || st === 'won') {
          if (MATCH) { r.final0 = W.globals().totals[0]; r.final1 = W.globals().totals[1]; break; }
          r.err = 'match-end';
          break;
        }
        const ph = W.globals().phase;
        if (ph === 'draw') {
          const advice = W.compute();
          if (advice && advice.kind === 'draw' && /^Take the pile/.test(advice.text)) { W.humanTake(); tookPile++; }
          else W.humanDraw();
        } else if (ph === 'play') {
          const plan = W.search(W.state());
          if (plan && plan.actions.length) {
            for (const action of plan.actions) {
              W.stage(action.cards.map(c => c.id));
              if (action.kind === 'new') W.humanMeld(null);
              else {
                const idx = W.globals().melds.findIndex(m => m.team === 0 && m.cards.some(c => !c.wild && c.rank === action.targetRank));
                W.humanMeld(idx >= 0 ? idx : null);
              }
              if (W.globals().pendingPrompt) W.resolvePrompt(true);
            }
          }
          const card = (plan && plan.discard) || W.globals().hands[0].find(c => !c.redThree);
          if (card) { W.stage([card.id]); W.humanDiscard(); if (W.globals().pendingPrompt) W.resolvePrompt(true); }
        }
      }
      out.push(r);
    }
    return out;
  }, { N, MATCH });
  await page.close();
  return { rows, errors };
}

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

const summarize = rows => {
  const ok = rows.filter(r => !r.err && (MATCH ? r.final0 !== null : r.round0 !== null));
  if (MATCH) {
    return {
      n: ok.length,
      winRate: +(ok.filter(r => r.final0 > r.final1).length / ok.length).toFixed(3),
      meanFinal0: +mean(ok.map(r => r.final0)).toFixed(1),
      meanFinal1: +mean(ok.map(r => r.final1)).toFixed(1),
      meanHands: +mean(ok.map(r => r.hands)).toFixed(2),
    };
  }
  return {
    n: ok.length,
    meanRound0: +mean(ok.map(r => r.round0)).toFixed(1),
    meanRound1: +mean(ok.map(r => r.round1)).toFixed(1),
    meanWilds0: +mean(ok.map(r => r.wilds0)).toFixed(2),
    meanCanastas0: +mean(ok.map(r => r.canastas0)).toFixed(2),
    wentOutRate: +(ok.filter(r => r.wentOut0).length / ok.length).toFixed(3),
    takePileRate: +(ok.filter(r => r.tookPile > 0).length / ok.length).toFixed(3),
  };
};

const policies = [];
for (const p of POLICIES) {
  const t0 = Date.now();
  const { rows, errors } = await runPolicy(p);
  policies.push({ ...p, rows, summary: summarize(rows), errors, secs: ((Date.now() - t0) / 1000).toFixed(1) });
}

for (const pol of policies) {
  pol.vsBase = null;
  if (pol === policies[0]) continue;
  const bySeed = new Map(policies[0].rows.map(r => [r.seed, r]));
  let n = 0;
  if (MATCH) {
    let diffSum = 0, aWins = 0, bWins = 0, ties = 0;
    const diffs = [];
    for (const r of pol.rows) {
      const a = bySeed.get(r.seed);
      if (!a || a.err || r.err || a.final0 === null || r.final0 === null) continue;
      n++;
      const d = r.final0 - a.final0;
      diffs.push(d); diffSum += d;
      const aw = a.final0 > a.final1, bw = r.final0 > r.final1;
      if (bw && !aw) bWins++; else if (aw && !bw) aWins++; else ties++;
    }
    const md = diffSum / n;
    const sd = Math.sqrt(diffs.reduce((a, d) => a + (d - md) ** 2, 0) / n);
    pol.vsBase = { n, meanFinalDiff: +md.toFixed(1), se: +(sd / Math.sqrt(n)).toFixed(1), flippedToBWin: bWins, flippedToAWin: aWins, ties };
  } else {
    let diffSum = 0, better = 0, worse = 0, tie = 0, wildDiff = 0;
    const diffs = [];
    for (const r of pol.rows) {
      const a = bySeed.get(r.seed);
      if (!a || a.err || r.err || a.round0 === null || r.round0 === null) continue;
      n++;
      const d = r.round0 - a.round0;
      diffs.push(d); diffSum += d; wildDiff += (r.wilds0 - a.wilds0);
      if (d > 0) better++; else if (d < 0) worse++; else tie++;
    }
    const md = diffSum / n;
    const sd = Math.sqrt(diffs.reduce((a, d) => a + (d - md) ** 2, 0) / n);
    pol.vsBase = { n, meanDiff: +md.toFixed(1), se: +(sd / Math.sqrt(n)).toFixed(1), better, worse, tie, meanWildDiff: +(wildDiff / n).toFixed(2) };
  }
}

console.log(JSON.stringify({ mode: MATCH ? 'match' : 'hand', policies: policies.map(p => ({
  name: p.name, ps: p.ps, wp: p.wp, goout: p.goout, secs: p.secs, summary: p.summary, vsBase: p.vsBase, errors: p.errors.slice(0, 3),
})) }, null, 2));

await browser.close();
