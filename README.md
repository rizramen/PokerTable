# Local Poker Table

Mobile-first local poker companion built as a static website, so you and your friends can play Poker locally wihtout Poker Chips. Playing cards needed!

## Run

Open `index.html` directly in a browser, or serve the folder with any static server.

Example local server:

```bash
python3 -m http.server 8000
```

## Features

- mobile-first local poker table controller
- manual in-person card play only
- player setup, seat ordering, and random first dealer
- blinds, dealer rotation, current action, and pot tracking
- guided street flow: dealer -> preflop -> flop -> turn -> river -> showdown
- side pot breakdown
- round limit tracking
- per-player expandable stats with stack, win rate, and queued rebuys
- queued chip add-ons that apply at the start of the next hand
- local state saved in `localStorage`
- static app with no backend or multiplayer sync
