# Local Poker Table

Local Poker Table is a mobile-first static web app for running an in-person poker game without physical chips. It tracks stacks, blinds, betting flow, side pots, and round progression while the players still use real cards at the table.

## Running Locally

You can open `index.html` directly in a browser, but serving the folder over a local static server is usually more reliable for manifest and asset loading.

Example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## What The App Does

- lets you add players, reorder seats, and set starting stacks before the game starts
- chooses an initial dealer and tracks dealer, small blind, and big blind positions
- supports street-by-street hand flow from dealer setup through showdown
- tracks per-player stack, committed chips, and current street bet
- supports manual board and hole-card entry for live play
- handles folds, calls/checks, raises, all-ins, and side-pot breakdowns
- resolves hands either by manual showdown winner selection or by auto-awarding when only one player remains
- keeps a local hand history and simple per-player stats
- queues optional chip add-ons for the next hand
- persists state in `localStorage`

## Project Structure

- `index.html`: static app shell and UI structure
- `styles.css`: app styling and responsive layout
- `app.js`: game state, rendering, and interaction logic
- `manifest.json`: PWA metadata
- `Assets/pokerpng.png`: app icon

## Notes

- this is a client-only app with no backend and no multiplayer sync
- game state is stored in the current browser only
- the app is designed for local, in-person play rather than online poker
