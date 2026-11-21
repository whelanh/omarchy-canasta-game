# Canasta for Omarchy Game Vibes

An original, single-file Classic Canasta game for Omarchy Game Vibes. Play four-handed partnership Canasta against three bots, with rule explanations when a move is not allowed.

## Install

```bash
omarchy games vibes install git@github.com:whelanh/omarchy-canasta-game.git
```

The repo name normalizes to the installed game name `canasta`.

## Controls

- `←` / `→`: move through your hand
- `Space` / `Enter`: stage or unstage a card
- `D`: draw from the stock
- `T`: take the discard pile
- `F`: meld staged cards, or add them to your team's matching meld
- `X`: discard the selected card (the button names it)
- `O`: go out (meld the rest, or all but one and discard)
- `V`: sort your hand · `C`: clear staged cards
- `Esc` / `P`: pause · `Q`: back to Game Vibes
- `?`: help

Click any of your team's melds to add the staged cards to it.

## Rules

This is the Classic Canasta variant: two decks plus four jokers, partnerships, 11-card hands, first-meld thresholds, frozen and blocked piles, red-three bonuses, Canastas, going out, and play to 5,000 points. The game explains illegal moves such as blocked pile pickups, insufficient first melds, invalid meld composition, and discarding a card that could be laid off.

Melds show coloured ranks, with jokers as stars and wildcards on the right; a canasta of seven or more cards shows a count. Taking the discard pile automatically uses two matching natural cards from your hand; stage a wild or extra cards to include them. The stock and discard piles sit in the middle of the table and show only their cards — no counts — so you have to keep track, as at a real table.

No build step, modules, local assets, or `fetch()` calls are used; the game runs directly from `file://` as Game Vibes requires.
