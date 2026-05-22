const STORAGE_KEY = "local-poker-table-state-v1";
const STREETS = ["Preflop", "Flop", "Turn", "River", "Showdown"];
const initialState = {
  settings: {
    smallBlind: 5,
    bigBlind: 10,
    startingStack: 500,
    totalRounds: 10,
  },
  players: [],
  dealerIndex: 0,
  currentPlayerIndex: null,
  currentBet: 0,
  streetIndex: 0,
  handPhase: "idle",
  gameStarted: false,
  board: [null, null, null, null, null],
  handActive: false,
  history: [],
  handNumber: 0,
  expandedPlayerStats: {},
  pendingRebuys: {},
};

let state = loadState();
const elements = {
  appShell: document.querySelector("#app-shell"),
  hero: document.querySelector("#hero"),
  smallBlind: document.querySelector("#small-blind"),
  bigBlind: document.querySelector("#big-blind"),
  startingStack: document.querySelector("#starting-stack"),
  totalRounds: document.querySelector("#total-rounds"),
  setupTitle: document.querySelector("#setup-title"),
  playerName: document.querySelector("#player-name"),
  addPlayer: document.querySelector("#add-player"),
  addGooners: document.querySelector("#add-gooners"),
  setupPlayersList: document.querySelector("#setup-players-list"),
  playersList: document.querySelector("#players-list"),
  potValue: document.querySelector("#pot-value"),
  toCallValue: document.querySelector("#to-call-value"),
  streetLabel: document.querySelector("#street-label"),
  currentPlayerLabel: document.querySelector("#current-player-label"),
  turnCard: document.querySelector("#turn-card"),
  roundIndicator: document.querySelector("#round-indicator"),
  streetAction: document.querySelector("#street-action"),
  showdownActions: document.querySelector("#showdown-actions"),
  inHandList: document.querySelector("#in-hand-list"),
  startGame: document.querySelector("#start-game"),
  setupResetGame: document.querySelector("#setup-reset-game"),
  nextStreet: document.querySelector("#next-street"),
  rotateDealer: document.querySelector("#rotate-dealer"),
  awardPot: document.querySelector("#award-pot"),
  resetGame: document.querySelector("#reset-game"),
  boardCards: document.querySelector("#board-cards"),
  betAmount: document.querySelector("#bet-amount"),
  betAmountDisplay: document.querySelector("#bet-amount-display"),
  actionFold: document.querySelector("#action-fold"),
  actionCall: document.querySelector("#action-call"),
  actionBet: document.querySelector("#action-bet"),
  potsList: document.querySelector("#pots-list"),
  historyList: document.querySelector("#history-list"),
  playerCardTemplate: document.querySelector("#player-card-template"),
  gamePanels: document.querySelectorAll(".game-panel"),
};

bindEvents();
render();

function bindEvents() {
  elements.smallBlind.addEventListener("change", updateSettings);
  elements.bigBlind.addEventListener("change", updateSettings);
  elements.startingStack.addEventListener("change", updateSettings);
  elements.totalRounds.addEventListener("change", updateSettings);
  elements.addPlayer.addEventListener("click", onAddPlayer);
  elements.addGooners.addEventListener("click", addGooners);
  elements.playerName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onAddPlayer();
    }
  });

  elements.startGame.addEventListener("click", startHand);
  elements.streetAction.addEventListener("click", progressStreet);
  elements.setupResetGame.addEventListener("click", resetGame);
  elements.nextStreet.addEventListener("click", progressStreet);
  elements.rotateDealer.addEventListener("click", rotateDealer);
  elements.awardPot.addEventListener("click", awardPot);
  elements.resetGame.addEventListener("click", resetGame);
  elements.betAmount.addEventListener("input", renderBetControls);

  elements.actionFold.addEventListener("click", () => applyAction("fold"));
  elements.actionCall.addEventListener("click", () => applyAction("call"));
  elements.actionBet.addEventListener("click", () => applyAction("raise"));
}

function updateSettings() {
  state.settings.smallBlind = parsePositiveInt(elements.smallBlind.value, 5);
  state.settings.bigBlind = parsePositiveInt(elements.bigBlind.value, 10);
  state.settings.startingStack = parsePositiveInt(elements.startingStack.value, 500);
  state.settings.totalRounds = parsePositiveInt(elements.totalRounds.value, 10);
  saveAndRender();
}

function onAddPlayer() {
  const name = elements.playerName.value.trim();
  if (!name) {
    return;
  }

  state.players.push({
    id: generateId(),
    name,
    stack: state.settings.startingStack,
    committed: 0,
    streetBet: 0,
    status: "active",
    cards: [null, null],
    acted: false,
    stats: createPlayerStats(),
  });

  elements.playerName.value = "";
  logEvent(`${name} joined the table.`);
  saveAndRender();
}

function addGooners() {
  const names = ["riz", "jannis", "danial", "ryan", "paddy"];
  const existingNames = new Set(state.players.map((player) => player.name.toLowerCase()));

  names.forEach((name) => {
    if (existingNames.has(name)) {
      return;
    }

    state.players.push({
      id: generateId(),
      name,
      stack: state.settings.startingStack,
      committed: 0,
      streetBet: 0,
      status: "active",
      cards: [null, null],
      acted: false,
      stats: createPlayerStats(),
    });
    existingNames.add(name);
  });

  logEvent("Added gooners preset.");
  saveAndRender();
}

function startHand(skipValidation = false) {
  if (!skipValidation && state.players.length < 2) {
    window.alert("You need to add at least 2 players before starting the game.");
    return;
  }

  if (!state.gameStarted && state.players.length > 0) {
    state.dealerIndex = Math.floor(Math.random() * state.players.length);
  }

  state.gameStarted = true;
  state.handActive = false;
  state.handNumber += 1;
  state.streetIndex = 0;
  state.handPhase = "dealer";
  state.currentBet = 0;
  state.board = [null, null, null, null, null];

  state.players.forEach((player) => {
    const pendingRebuy = state.pendingRebuys[player.id] || 0;
    if (pendingRebuy > 0) {
      player.stack += pendingRebuy;
      logEvent(`${player.name} added ${pendingRebuy} chips for the new hand.`);
      delete state.pendingRebuys[player.id];
    }
    player.stats.handsPlayed += player.stack > 0 ? 1 : 0;
    player.committed = 0;
    player.streetBet = 0;
    player.status = player.stack > 0 ? "active" : "out";
    player.cards = [null, null];
    player.acted = false;
  });

  postBlind(getSmallBlindIndex(), state.settings.smallBlind, "small blind");
  postBlind(getBigBlindIndex(), state.settings.bigBlind, "big blind");
  state.currentBet = Math.max(state.settings.bigBlind, maxStreetBet());
  state.currentPlayerIndex = null;

  logEvent(`Hand ${state.handNumber} started. Dealer is ${state.players[state.dealerIndex].name}.`);
  saveAndRender();
}

function progressStreet() {
  if (!state.gameStarted) {
    return;
  }

  if (state.handPhase === "dealer") {
    beginStreet(0);
    return;
  }

  if (state.currentPlayerIndex !== null) {
    return;
  }

  if (state.streetIndex >= 3) {
    state.handPhase = "showdown";
    state.handActive = false;
    logEvent("River betting complete. Award the pot after showdown.");
    saveAndRender();
    return;
  }

  beginStreet(state.streetIndex + 1);
}

function rotateDealer() {
  if (!state.players.length) {
    return;
  }

  state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
  logEvent(`Dealer moved to ${state.players[state.dealerIndex].name}.`);
  saveAndRender();
}

function awardPot() {
  const contenders = state.players.filter((player) => player.status !== "out");
  if (!contenders.length || totalPot() === 0) {
    return;
  }

  const choice = window.prompt(
    `Award total pot ${totalPot()} to which player?\n${contenders.map((player) => player.name).join(", ")}`,
    contenders[0]?.name ?? "",
  );

  if (!choice) {
    return;
  }

  const winner = state.players.find((player) => player.name.toLowerCase() === choice.trim().toLowerCase());
  if (!winner) {
    return;
  }

  completeHandWithWinner(winner.id);
}

function resetGame() {
  state = structuredClone(initialState);
  saveAndRender();
}

function beginStreet(streetIndex) {
  state.streetIndex = streetIndex;
  state.handPhase = "betting";
  state.handActive = true;

  state.players.forEach((player) => {
    player.streetBet = 0;
    player.acted = player.status !== "active";
  });

  if (streetIndex === 0) {
    state.currentBet = Math.max(state.settings.bigBlind, maxStreetBet());
    state.players.forEach((player) => {
      if (player.status === "active") {
        player.acted = false;
      }
    });
    state.currentPlayerIndex = findNextPlayer(getFirstToActPreflop());
  } else {
    state.currentBet = 0;
    state.currentPlayerIndex = findNextPlayer(getFirstToActPostflop());
  }

  logEvent(`${STREETS[streetIndex]} started.`);
  maybeFinishHand();
  saveAndRender();
}

function applyAction(action) {
  if (!state.handActive || state.currentPlayerIndex === null) {
    return;
  }

  const player = state.players[state.currentPlayerIndex];
  if (!player || player.status !== "active") {
    return;
  }

  const toCall = Math.max(0, state.currentBet - player.streetBet);
  const raiseAmount = getSelectedBetAmount();

  if (action === "fold") {
    player.status = "folded";
    player.acted = true;
    player.stats.folds += 1;
    logEvent(`${player.name} folded.`);
  }

  if (action === "call" && toCall === 0) {
    player.acted = true;
    player.stats.checks += 1;
    logEvent(`${player.name} checked.`);
  }

  if (action === "call" && toCall > 0) {
    commitChips(player, toCall);
    player.acted = true;
    player.stats.calls += 1;
    logEvent(`${player.name} called ${toCall}.`);
  }

  if (action === "raise") {
    const totalTarget = Math.max(state.currentBet + raiseAmount, player.streetBet + raiseAmount);
    const needed = Math.max(0, totalTarget - player.streetBet);
    commitChips(player, needed);
    state.currentBet = player.streetBet;
    resetActedFlags(player.id);
    player.acted = true;
    player.stats.raises += 1;
    logEvent(`${player.name} raised to ${player.streetBet}.`);
  }

  advanceTurn();
  maybeFinishHand();
  saveAndRender();
}

function advanceTurn() {
  const unresolved = activePlayers().filter((player) => {
    if (player.status === "all-in") {
      return false;
    }

    return !(player.acted && player.streetBet === state.currentBet);
  });

  if (!unresolved.length) {
    state.currentPlayerIndex = null;
    return;
  }

  const next = findNextPlayer((state.currentPlayerIndex + 1) % state.players.length);
  state.currentPlayerIndex = next;
}

function maybeFinishHand() {
  const contenders = state.players.filter((player) => player.status === "active" || player.status === "all-in");
  if (contenders.length <= 1) {
    state.handActive = false;
    state.currentPlayerIndex = null;
    state.handPhase = "showdown";
    logEvent("Hand ended. Award the pot manually from the side pot view.");
    return;
  }

  if (state.streetIndex >= 3 && state.currentPlayerIndex === null) {
    state.handActive = false;
    state.handPhase = "showdown";
    logEvent("Showdown reached. Award the pot manually from the side pot view.");
  }
}

function completeHandWithWinner(winnerId) {
  const winner = state.players.find((player) => player.id === winnerId);
  if (!winner) {
    return;
  }

  winner.stats.handsWon += 1;
  winner.stack += totalPot();
  state.players.forEach((player) => {
    player.committed = 0;
    player.streetBet = 0;
    player.acted = false;
  });
  state.board = [null, null, null, null, null];
  state.currentBet = 0;
  state.currentPlayerIndex = null;
  state.handActive = false;
  state.handPhase = "idle";
  logEvent(`${winner.name} collected the pot.`);
  saveAndRender();
}

function postBlind(index, amount, label) {
  const player = state.players[index];
  if (!player || player.status === "out") {
    return;
  }

  commitChips(player, amount);
  player.acted = false;
  logEvent(`${player.name} posted ${label} ${Math.min(amount, player.committed)}.`);
}

function commitChips(player, amount) {
  const actual = Math.max(0, Math.min(player.stack, amount));
  player.stack -= actual;
  player.streetBet += actual;
  player.committed += actual;
  if (player.stack === 0 && player.status === "active") {
    player.status = "all-in";
  }
}

function seatOffset(offset) {
  if (!state.players.length) {
    return 0;
  }

  return (state.dealerIndex + offset) % state.players.length;
}

function getSmallBlindIndex() {
  if (state.players.length <= 2) {
    return state.dealerIndex;
  }

  return seatOffset(1);
}

function getBigBlindIndex() {
  if (state.players.length <= 2) {
    return seatOffset(1);
  }

  return seatOffset(2);
}

function getFirstToActPreflop() {
  if (state.players.length <= 2) {
    return state.dealerIndex;
  }

  return seatOffset(3);
}

function getFirstToActPostflop() {
  return seatOffset(1);
}

function findNextPlayer(startIndex) {
  if (!state.players.length) {
    return null;
  }

  for (let step = 0; step < state.players.length; step += 1) {
    const index = (startIndex + step) % state.players.length;
    const player = state.players[index];
    if (player.status === "active") {
      return index;
    }
  }

  return null;
}

function resetActedFlags(exceptId) {
  state.players.forEach((player) => {
    player.acted = player.id === exceptId || player.status !== "active";
  });
}

function activePlayers() {
  return state.players.filter((player) => player.status === "active" || player.status === "all-in");
}

function maxStreetBet() {
  return state.players.reduce((max, player) => Math.max(max, player.streetBet), 0);
}

function totalPot() {
  return state.players.reduce((sum, player) => sum + player.committed, 0);
}

function calculateSidePots() {
  const layers = state.players
    .filter((player) => player.committed > 0)
    .map((player) => player.committed)
    .sort((a, b) => a - b);

  if (!layers.length) {
    return [];
  }

  const uniqueLayers = [...new Set(layers)];
  let previous = 0;

  return uniqueLayers
    .map((layer) => {
      const contributors = state.players.filter((player) => player.committed >= layer);
      const eligible = contributors.filter((player) => player.status !== "folded").map((player) => player.name);
      const amount = (layer - previous) * contributors.length;
      previous = layer;
      return {
        amount,
        eligible,
      };
    })
    .filter((pot) => pot.amount > 0);
}

function render() {
  renderSettings();
  renderVisibility();
  renderRoundIndicator();
  renderSummary();
  renderBoard();
  renderTurnCard();
  renderStreetAction();
  renderShowdownActions();
  renderBetControls();
  renderInHandOverview();
  renderSetupPlayers();
  renderPlayers();
  renderPots();
  renderHistory();
}

function renderSettings() {
  elements.smallBlind.value = state.settings.smallBlind;
  elements.bigBlind.value = state.settings.bigBlind;
  elements.startingStack.value = state.settings.startingStack;
  elements.totalRounds.value = state.settings.totalRounds;
  elements.setupTitle.textContent = state.gameStarted ? "Edit Game" : "Table";
  elements.startGame.classList.toggle("hidden", state.gameStarted);
  elements.startGame.disabled = state.players.length < 2;
}

function renderVisibility() {
  elements.appShell.classList.toggle("game-live", state.gameStarted);
  elements.gamePanels.forEach((panel) => {
    panel.classList.toggle("hidden", !state.gameStarted);
  });
  elements.hero.classList.toggle("hidden", state.gameStarted);
  elements.resetGame.classList.add("hidden");
  document.querySelector(".action-panel")?.classList.toggle("showdown-mode", state.handPhase === "showdown");
  elements.roundIndicator.classList.toggle("hidden", !state.gameStarted);
}

function renderRoundIndicator() {
  if (!state.gameStarted) {
    elements.roundIndicator.innerHTML = "";
    return;
  }

  const currentRound = Math.max(1, Math.min(state.handNumber, state.settings.totalRounds));
  elements.roundIndicator.innerHTML = `
    <strong>Round ${currentRound} / ${state.settings.totalRounds}</strong>
  `;
}

function renderSummary() {
  const currentPlayer = state.currentPlayerIndex !== null ? state.players[state.currentPlayerIndex] : null;
  elements.streetLabel.textContent = state.handPhase === "dealer" ? "Waiting" : STREETS[state.streetIndex];
  elements.potValue.textContent = formatChips(totalPot());
  elements.toCallValue.textContent = formatChips(state.currentBet);
  elements.currentPlayerLabel.textContent = currentPlayer ? currentPlayer.name : "Round complete";
}

function renderBoard() {
  elements.boardCards.innerHTML = "";
  state.board.forEach((cardCode, index) => {
    const card = renderCard(cardCode, `B${index + 1}`);
    card.addEventListener("click", () => {
      state.board[index] = promptForCard(state.board[index]);
      saveAndRender();
    });
    elements.boardCards.appendChild(card);
  });
}

function renderTurnCard() {
  const dealer = state.players[state.dealerIndex];
  if (state.handPhase === "dealer" && dealer) {
    elements.turnCard.className = "turn-card";
    elements.turnCard.innerHTML = `
      <p class="eyebrow">Dealer</p>
      <h3>${dealer.name}</h3>
      <p>Deal the cards.</p>
    `;
    return;
  }

  if (state.handPhase === "showdown") {
    elements.turnCard.className = "turn-card";
    elements.turnCard.innerHTML = `
      <p class="eyebrow">Showdown</p>
      <h3>Betting complete</h3>
      <p>Reveal hands and award the pot.</p>
    `;
    return;
  }

  if (state.handPhase === "complete") {
    elements.turnCard.className = "turn-card";
    elements.turnCard.innerHTML = `
      <p class="eyebrow">Match Complete</p>
      <h3>All rounds played</h3>
      <p>The configured round limit has been reached.</p>
    `;
    return;
  }

  const currentPlayer = state.currentPlayerIndex !== null ? state.players[state.currentPlayerIndex] : null;
  if (!currentPlayer) {
    elements.turnCard.className = "turn-card empty";
    elements.turnCard.innerHTML = `<p>${getNextStreetPrompt()}</p>`;
    return;
  }

  const toCall = Math.max(0, state.currentBet - currentPlayer.streetBet);
  elements.turnCard.className = "turn-card";
  elements.turnCard.innerHTML = `
    <p class="eyebrow">Seat in action</p>
    <h3>${currentPlayer.name}</h3>
    <p>Stack ${formatChips(currentPlayer.stack)} · Needs ${formatChips(toCall)} to call</p>
  `;
}

function getNextStreetPrompt() {
  if (state.handPhase === "dealer") {
    return "Deal the hole cards, then start preflop.";
  }

  if (state.handPhase === "showdown") {
    return "Showdown time. Pick the winner below.";
  }

  if (state.streetIndex === 0) {
    return "Preflop complete. Deal the flop cards.";
  }

  if (state.streetIndex === 1) {
    return "Flop complete. Deal the turn card.";
  }

  if (state.streetIndex === 2) {
    return "Turn complete. Deal the river card.";
  }

  return "Round complete. Continue when ready.";
}

function renderBetControls() {
  const currentPlayer = state.currentPlayerIndex !== null ? state.players[state.currentPlayerIndex] : null;
  const toCall = currentPlayer ? Math.max(0, state.currentBet - currentPlayer.streetBet) : 0;
  const minRaise = Math.max(state.settings.bigBlind, 1);
  const maxRaise = currentPlayer ? Math.max(minRaise, currentPlayer.stack) : minRaise;
  const allowedAmounts = getAllowedBetAmounts(minRaise, maxRaise);
  const rawIndex = parsePositiveInt(elements.betAmount.value, 0);
  const currentAmount = allowedAmounts[Math.min(rawIndex, allowedAmounts.length - 1)] ?? minRaise;
  const sliderIndex = findClosestBetIndex(allowedAmounts, currentAmount);
  const nextValue = allowedAmounts[sliderIndex] ?? minRaise;

  elements.betAmount.min = "0";
  elements.betAmount.max = String(Math.max(allowedAmounts.length - 1, 0));
  elements.betAmount.step = "1";
  elements.betAmount.value = String(sliderIndex);
  elements.betAmount.disabled = !currentPlayer || currentPlayer.stack === 0;
  elements.betAmount.dataset.allowedAmounts = JSON.stringify(allowedAmounts);
  elements.betAmountDisplay.dataset.amount = String(nextValue);
  elements.betAmountDisplay.textContent = currentPlayer
    ? `${nextValue}${nextValue === currentPlayer.stack ? " · All-in" : ""}`
    : "0";
  elements.actionCall.textContent = toCall === 0 ? "Check" : `Call ${toCall}`;
  elements.actionCall.classList.toggle("ghost-button", toCall === 0);
  elements.actionBet.textContent =
    currentPlayer && nextValue === currentPlayer.stack ? "All-in" : toCall === 0 ? "Bet" : "Raise";
  elements.actionFold.disabled = !currentPlayer;
  elements.actionCall.disabled = !currentPlayer;
  elements.actionBet.disabled = !currentPlayer;
}

function renderStreetAction() {
  let label = "Start Preflop";
  let disabled = false;

  if (state.handPhase === "idle") {
    disabled = true;
  } else if (state.handPhase === "complete") {
    label = "Match Complete";
    disabled = true;
  } else if (state.handPhase === "dealer") {
    label = "Start Preflop";
  } else if (state.handPhase === "showdown") {
    label = "Showdown";
    disabled = true;
  } else if (state.currentPlayerIndex !== null) {
    label = `${STREETS[state.streetIndex]} In Progress`;
    disabled = true;
  } else if (state.streetIndex === 0) {
    label = "Start Flop";
  } else if (state.streetIndex === 1) {
    label = "Start Turn";
  } else if (state.streetIndex === 2) {
    label = "Start River";
  } else {
    label = "Showdown";
    disabled = true;
  }

  elements.streetAction.textContent = label;
  elements.streetAction.disabled = disabled;
}

function renderShowdownActions() {
  elements.showdownActions.innerHTML = "";
  elements.showdownActions.classList.toggle("hidden", state.handPhase !== "showdown");

  if (state.handPhase !== "showdown") {
    return;
  }

  state.players
    .filter((player) => player.status !== "folded" && player.status !== "out")
    .forEach((player) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${player.name} Wins Pot`;
      button.addEventListener("click", () => {
        completeHandWithWinner(player.id);
        if (state.handNumber >= state.settings.totalRounds) {
          state.handPhase = "complete";
          saveAndRender();
        } else if (state.players.length > 1) {
          state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
          startHand(true);
        }
      });
      elements.showdownActions.appendChild(button);
    });
}

function renderInHandOverview() {
  elements.inHandList.innerHTML = "";

  const playersInHand = state.players.filter((player) => player.status !== "folded" && player.status !== "out");
  if (!playersInHand.length) {
    elements.inHandList.innerHTML = `<span class="badge">No active players</span>`;
    return;
  }

  playersInHand.forEach((player) => {
    const badge = document.createElement("span");
    badge.className = "badge";
    const labels = [player.name];
    if (state.players[state.dealerIndex]?.id === player.id) labels.push("D");
    if (state.players[getSmallBlindIndex()]?.id === player.id) labels.push("SB");
    if (state.players[getBigBlindIndex()]?.id === player.id) labels.push("BB");
    if (state.currentPlayerIndex !== null && state.players[state.currentPlayerIndex]?.id === player.id) {
      badge.classList.add("in-hand-acting");
    }
    badge.textContent = labels.join(" · ");
    elements.inHandList.appendChild(badge);
  });
}

function snapBetAmount(value) {
  if (value <= 50) {
    return Math.round(value / 5) * 5;
  }

  return Math.round(value / 10) * 10;
}

function getAllowedBetAmounts(minRaise, maxRaise) {
  const amounts = [];
  let amount = minRaise;

  while (amount <= maxRaise) {
    amounts.push(amount);
    amount += getBetIncrement(amount);
  }

  if (!amounts.includes(maxRaise)) {
    amounts.push(maxRaise);
  }

  return [...new Set(amounts)].sort((a, b) => a - b);
}

function getBetIncrement(amount) {
  if (amount < 100) {
    return amount < 50 ? 5 : 10;
  }

  return 25;
}

function findClosestBetIndex(amounts, target) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  amounts.forEach((amount, index) => {
    const distance = Math.abs(amount - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function getSelectedBetAmount() {
  const allowedAmounts = JSON.parse(elements.betAmount.dataset.allowedAmounts ?? "[]");
  const index = parsePositiveInt(elements.betAmount.value, 0);
  return allowedAmounts[index] ?? state.settings.bigBlind;
}

function renderPlayers() {
  elements.playersList.innerHTML = "";

  state.players.forEach((player, index) => {
    const badges = [];
    if (state.gameStarted) {
      if (index === state.dealerIndex) badges.push("Dealer");
      if (index === getSmallBlindIndex()) badges.push("SB");
      if (index === getBigBlindIndex()) badges.push("BB");
    }
    if (index === state.currentPlayerIndex) badges.push("Acting");
    badges.push(player.status);
    const inGameCard = buildPlayerCard(player, badges);
    elements.playersList.appendChild(inGameCard);
  });

  if (!state.players.length) {
    const emptyState = `<article class="history-item"><p class="muted">No players added yet.</p></article>`;
    elements.playersList.innerHTML = emptyState;
  }
}

function renderPots() {
  elements.potsList.innerHTML = "";
  const pots = calculateSidePots();

  if (!pots.length) {
    elements.potsList.innerHTML = `<article><p class="muted">No chips committed yet.</p></article>`;
    return;
  }

  pots.forEach((pot, index) => {
    const article = document.createElement("article");
    article.innerHTML = `
      <p class="label">${index === 0 ? "Main Pot" : `Side Pot ${index}`}</p>
      <p class="value">${formatChips(pot.amount)}</p>
      <p>Eligible: ${pot.eligible.join(", ") || "None"}</p>
    `;
    elements.potsList.appendChild(article);
  });
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  if (!state.history.length) {
    elements.historyList.innerHTML = `<article class="history-item"><p class="muted">No hands logged yet.</p></article>`;
    return;
  }

  [...state.history].reverse().forEach((entry) => {
    const article = document.createElement("article");
    article.className = "history-item";
    article.innerHTML = `<p>${entry}</p>`;
    elements.historyList.appendChild(article);
  });
}

function renderCard(cardCode, fallbackLabel) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";

  if (!cardCode) {
    card.classList.add("empty");
    card.textContent = fallbackLabel;
    return card;
  }

  const redSuit = cardCode.endsWith("H") || cardCode.endsWith("D");
  if (redSuit) {
    card.classList.add("red");
  }
  card.textContent = prettifyCard(cardCode);
  return card;
}

function buildPlayerCard(player, badges) {
  const fragment = elements.playerCardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".player-card");
  fragment.querySelector(".player-name").textContent = player.name;
  fragment.querySelector(".player-meta").innerHTML = `<span class="badge-row">${badges
    .map((badge) => `<span class="badge">${badge}</span>`)
    .join("")}</span>`;
  fragment.querySelector(".stack-value").textContent = formatChips(player.stack);
  fragment.querySelector(".committed-value").textContent = formatChips(player.committed);
  fragment.querySelector(".street-bet-value").textContent = formatChips(player.streetBet);

  const cardsNode = fragment.querySelector(".player-cards");
  player.cards.forEach((cardCode, cardIndex) => {
    const cardElement = renderCard(cardCode, `H${cardIndex + 1}`);
    cardElement.addEventListener("click", () => {
      player.cards[cardIndex] = promptForCard(player.cards[cardIndex]);
      saveAndRender();
    });
    cardsNode.appendChild(cardElement);
  });

  fragment.querySelector(".remove-player").addEventListener("click", () => {
    state.players = state.players.filter((entry) => entry.id !== player.id);
    if (state.dealerIndex >= state.players.length) {
      state.dealerIndex = 0;
    }
    saveAndRender();
  });

  card.dataset.playerId = player.id;
  return fragment;
}

function renderSetupPlayers() {
  elements.setupPlayersList.innerHTML = "";

  if (!state.players.length) {
    elements.setupPlayersList.innerHTML = `<article class="history-item"><p class="muted">No players added yet.</p></article>`;
    return;
  }

  state.players.forEach((player) => {
    const pill = document.createElement("div");
    const isOpen = Boolean(state.gameStarted && state.expandedPlayerStats[player.id]);
    pill.className = `setup-player-pill${isOpen ? " open" : ""}${player.stack === 0 ? " out-of-chips" : ""}`;
    pill.dataset.playerId = player.id;
    pill.innerHTML = `
      <div class="setup-player-topline">
        <span class="setup-player-name">${player.name}</span>
        <span class="setup-player-stack">${formatChips(player.stack)}</span>
        <div class="setup-player-controls">
          <button class="setup-player-control setup-player-expand" type="button">${isOpen ? "▾" : "▸"}</button>
          <button class="setup-player-control setup-player-up" type="button">↑</button>
          <button class="setup-player-control setup-player-down" type="button">↓</button>
          <button class="setup-player-control setup-player-delete" type="button">X</button>
        </div>
      </div>
      ${isOpen ? renderSetupPlayerStats(player) : ""}
    `;

    const expandButton = pill.querySelector(".setup-player-expand");
    pill.querySelector(".setup-player-up").addEventListener("click", () => movePlayerByOffset(player.id, -1));
    pill.querySelector(".setup-player-down").addEventListener("click", () => movePlayerByOffset(player.id, 1));
    if (state.gameStarted) {
      expandButton.addEventListener("click", () => toggleExpandedPlayerStats(player.id));
    } else {
      expandButton.classList.add("hidden");
    }
    const addChipsButton = pill.querySelector(".setup-player-add-chips");
    if (addChipsButton) {
      const amountSelect = pill.querySelector(".setup-player-rebuy-amount");
      addChipsButton.addEventListener("click", () =>
        queuePlayerRebuy(player.id, parsePositiveInt(amountSelect?.value, state.settings.startingStack)),
      );
    }
    pill.querySelector(".setup-player-delete").addEventListener("click", () => {
      state.players = state.players.filter((entry) => entry.id !== player.id);
      if (state.dealerIndex >= state.players.length) {
        state.dealerIndex = 0;
      }
      delete state.expandedPlayerStats[player.id];
      delete state.pendingRebuys[player.id];
      saveAndRender();
    });

    pill.querySelector(".setup-player-up").disabled = state.gameStarted || state.players[0]?.id === player.id;
    pill.querySelector(".setup-player-down").disabled =
      state.gameStarted || state.players[state.players.length - 1]?.id === player.id;

    elements.setupPlayersList.appendChild(pill);
  });
}

function movePlayerByOffset(playerId, offset) {
  const fromIndex = state.players.findIndex((player) => player.id === playerId);
  const toIndex = fromIndex + offset;
  if (fromIndex === -1 || toIndex < 0 || toIndex >= state.players.length) {
    return;
  }

  const [moved] = state.players.splice(fromIndex, 1);
  state.players.splice(toIndex, 0, moved);
  saveAndRender();
}

function renderSetupPlayerStats(player) {
  const handsPlayed = player.stats.handsPlayed || 0;
  const handsWon = player.stats.handsWon || 0;
  const winRate = handsPlayed ? `${Math.round((handsWon / handsPlayed) * 100)}%` : "0%";
  const pendingRebuy = state.pendingRebuys[player.id] || 0;
  const stats = [
    ["Stack", formatChips(player.stack)],
    ["Win Rate", winRate],
  ];

  return `
    <div class="setup-player-stats">
      ${stats
        .map(
          ([label, value]) => `
            <div class="setup-player-stat">
              <p class="setup-player-stat-label">${label}</p>
              <p class="setup-player-stat-value">${value}</p>
            </div>`,
        )
        .join("")}
    </div>
    <div class="setup-player-rebuy">
      <p>${pendingRebuy > 0 ? `Queued next hand: +${pendingRebuy}` : "No chips queued for next hand."}</p>
      <div class="setup-player-rebuy-controls">
        <select class="setup-player-rebuy-amount">
          ${getRebuyOptions()
            .map((amount) => `<option value="${amount}">${amount}</option>`)
            .join("")}
        </select>
        <button class="setup-player-control setup-player-add-chips" type="button">Queue</button>
      </div>
    </div>
  `;
}

function toggleExpandedPlayerStats(playerId) {
  state.expandedPlayerStats[playerId] = !state.expandedPlayerStats[playerId];
  saveAndRender();
}

function queuePlayerRebuy(playerId, amount) {
  state.pendingRebuys[playerId] = (state.pendingRebuys[playerId] || 0) + amount;
  saveAndRender();
}

function getRebuyOptions() {
  return [50, 100, 150, 200, 250, 300, 500];
}

function createPlayerStats() {
  return {
    handsPlayed: 0,
    handsWon: 0,
    folds: 0,
    checks: 0,
    calls: 0,
    raises: 0,
  };
}

function promptForCard(current) {
  const card = window.prompt(
    "Enter a card like AS, 10H, QD, 7C. Leave blank to clear.",
    current ?? "",
  );

  if (card === null) {
    return current;
  }

  const normalized = card.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  return isValidCard(normalized) ? normalized : current;
}

function logEvent(message) {
  state.history.push(`${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${message}`);
  state.history = state.history.slice(-80);
}

function generateId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatChips(value) {
  return `${value}`;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function prettifyCard(card) {
  return card.replace("S", "♠").replace("H", "♥").replace("D", "♦").replace("C", "♣");
}

function isValidCard(card) {
  return /^(A|K|Q|J|10|9|8|7|6|5|4|3|2)(S|H|D|C)$/.test(card);
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return structuredClone(initialState);
    }
    const loaded = { ...structuredClone(initialState), ...JSON.parse(saved) };
    loaded.players = (loaded.players || []).map((player) => ({
      ...player,
      stats: { ...createPlayerStats(), ...(player.stats || {}) },
    }));
    loaded.expandedPlayerStats = loaded.expandedPlayerStats || {};
    loaded.pendingRebuys = loaded.pendingRebuys || {};
    return loaded;
  } catch {
    return structuredClone(initialState);
  }
}
