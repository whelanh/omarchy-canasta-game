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
- `F`: meld or lay off staged cards
- `X`: discard the selected card
- `O`: ask your partner for permission to go out
- `V`: sort your hand · `C`: clear staged cards
- `Esc` / `P`: pause · `Q`: back to Game Vibes
- `?`: help

## Rules

This is the Classic Canasta variant: two decks plus four jokers, partnerships, 11-card hands, first-meld thresholds, frozen and blocked piles, red-three bonuses, Canastas, going out, and play to 5,000 points. The game explains illegal moves such as blocked pile pickups, insufficient first melds, invalid meld composition, and discarding a card that could be laid off.

No build step, modules, local assets, or `fetch()` calls are used; the game runs directly from `file://` as Game Vibes requires.
