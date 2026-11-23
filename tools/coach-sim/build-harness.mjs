// Build a self-contained, instrumented copy of the Canasta game that the
// Coach strategy simulator drives. The copy is a throwaway file in os.tmpdir();
// every run rebuilds it, so it never goes stale and nothing in the shipped
// game is touched.
//
// The instrumented copy reads strategy knobs from the URL hash:
//   wildpenalty   penalty per wild card sitting in an unfinished (non-canasta) meld
//   progressscale multiplier on the Coach's canasta-progress heuristic
//   seed          RNG seed (see sim.mjs)
//
// To add a new knob for a future experiment, patch the matching line here and
// read it in sim.mjs via launchParam().
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const gameHtml = path.resolve(here, '..', '..', 'index.html');
const out = path.join(os.tmpdir(), 'canasta-coach-sim.html');

export function buildHarness(outPath = out) {
  let html = fs.readFileSync(gameHtml, 'utf8');

  // Strategy knobs, right after COACH_MARGIN.
  html = html.replace(
    'const COACH_MARGIN = 14;',
    'const COACH_MARGIN = 14;\n'
    + 'const COACH_WILD_PENALTY = Number(launchParam(\'wildpenalty\') ?? 0);\n'
    + 'const COACH_PROGRESS_SCALE = Number(launchParam(\'progressscale\') ?? 1);\n'
    + 'const COACH_GOOUT_BONUS = Number(launchParam(\'goout\') ?? 100);'
  );

  // Scale the canasta-progress heuristic.
  html = html.replace(
    '    value += bonus * confidence * (count / 7);\n    if (count === 6) value += 40;',
    '    value += bonus * confidence * (count / 7) * COACH_PROGRESS_SCALE;\n    if (count === 6) value += 40 * COACH_PROGRESS_SCALE;'
  );

  // Wild penalty, applied to wilds in unfinished melds.
  html = html.replace(
    '  if (goingOut) value += 100;\n  return value;',
    '  if (COACH_WILD_PENALTY) {\n'
    + '    for (const meld of ours) {\n'
    + '      if (meld.cards.length >= 7) continue;\n'
    + '      const wilds = meld.cards.filter(card => card.wild).length;\n'
    + '      if (wilds) value -= wilds * COACH_WILD_PENALTY;\n'
    + '    }\n'
    + '  }\n'
    + '  if (goingOut) value += COACH_GOOUT_BONUS;\n'
    + '  return value;'
  );

  // The simulation API.
  const hook = `
window.__canasta = {
  globals: () => ({ state, phase, turn, hands, melds, staged, discard, stock, totals, roundNo, turnMeldValue, firstMeldTurn, meldedThisRound, meldedBy, turnLayoff, redThrees, scorecardData, pendingPrompt, needsDeal, pendingMeld }),
  state: coachCloneState,
  search: coachSearch,
  compute: coachCompute,
  advice: () => coachAdvice,
  potential: coachHandPotential,
  risk: coachDiscardRisk,
  terminal: coachTerminal,
  evaluate: coachEvaluate,
  drawAdvice: coachDrawAdvice,
  takeState: coachTakeState,
  drawEstimate: coachDrawEstimate,
  makeCard,
  stage: ids => { staged.clear(); for (const id of ids) staged.add(id); render(); },
  set: props => {
    if ('state' in props) state = props.state;
    if ('phase' in props) phase = props.phase;
    if ('turn' in props) turn = props.turn;
    if ('turnMeldValue' in props) turnMeldValue = props.turnMeldValue;
    if ('firstMeldTurn' in props) firstMeldTurn = props.firstMeldTurn;
    if ('meldedThisRound' in props) meldedThisRound = props.meldedThisRound;
    render();
  },
  setSeed: v => { _seed = v >>> 0; },
  humanDraw, humanTake, humanMeld, humanDiscard, humanGoOut, discardCard, resolvePrompt, closeScorecard, startRound,
  update, STEP,
  clearKeys: () => { _pressed.clear(); _stepPressed.clear(); },
};
`;
  html = html.replace('renderer.setAnimationLoop(frame);', hook + '\nrenderer.setAnimationLoop(frame);');
  fs.writeFileSync(outPath, html);
  return outPath;
}

export { gameHtml, out };

// Self-execute when run directly, so `node build-harness.mjs` regenerates the
// throwaway copy by hand.
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildHarness();
  console.log('built', out);
}
