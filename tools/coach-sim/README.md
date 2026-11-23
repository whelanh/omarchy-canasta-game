# Coach strategy simulator

Head-to-head testing of the Canasta Coach's strategies.

It builds a throwaway, instrumented copy of the game (with strategy knobs and a
simulation API), then plays many hands with the human seat following the
Coach's own plan — drawing or taking the discard pile, then melding, laying off
and discarding — against the three built-in bots. Two or more Coach policies
run on the **same deals** so they can be compared pair-wise.

## Run it

```bash
cd <repo>
N=2000 \
POLICIES='[{"name":"current","ps":1,"wp":0},{"name":"conservative","ps":0.15,"wp":60}]' \
node tools/coach-sim/sim.mjs
```

Requires Node, `playwright-core` (installed automatically if missing), and a
Chromium binary (default `/usr/bin/chromium`, override with `CHROME`).

## Knobs

`build-harness.mjs` patches the game to read these from the URL fragment:

- `wildpenalty` — penalty per wild card sitting in an unfinished (non-canasta) meld.
- `progressscale` — multiplier on the Coach's canasta-progress heuristic.
- `seed` — RNG seed; `sim.mjs` sets it per hand so runs are reproducible.

To add a knob for a new experiment, add its `launchParam(...)` read in
`build-harness.mjs`, use it somewhere in the Coach, and pass it through the
`POLICIES` JSON in `sim.mjs`.

## Output

Per policy: mean team-0 and team-1 round score, mean wilds melded, mean
canastas, go-out rate, take-pile rate. Each non-baseline policy is also
compared to the baseline on the same seeds (mean difference, standard error,
win/loss/tie counts, wild-count difference).

## Notes

- The instrumented copy is written to `os.tmpdir()` and rebuilt every run; the
  shipped `index.html` is never modified.
- The baseline is the first entry in `POLICIES`.
- Round scores are heavy-tailed; use a few thousand hands before trusting a
  mean difference.
- The bots are the shipped simple bots. Stronger opponents could reward or
  punish a given strategy differently.
