const STORAGE_KEY = "local-poker-table-state-v1";
const STREETS = ["Preflop", "Flop", "Turn", "River", "Showdown"];
const HAND_PHASES = {
  IDLE: "idle",
  DEALER: "dealer",
  BETTING: "betting",
  SHOWDOWN: "showdown",
  WINNER: "winner",
  COMPLETE: "complete",
};
const PLAYER_STATUSES = {
  ACTIVE: "active",
  FOLDED: "folded",
  ALL_IN: "all-in",
  OUT: "out",
};
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
  handPhase: HAND_PHASES.IDLE,
  gameStarted: false,
  board: [null, null, null, null, null],
  handActive: false,
  history: [],
  handNumber: 0,
  handMessage: "",
  expandedPlayerStats: {},
  pendingRebuys: {},
  editSettingsDraft: null,
  handStartStacks: {},
  lastFullRaise: 0,
  showdownPots: [],
  showdownResults: [],
  selectedShowdownWinnerIds: [],
  showdownSplitMode: false,
  selectedAction: "call",
  betControlAmount: 0,
  betControlPlayerId: null,
  betControlToCall: 0,
  typedBetInput: "",
  typedBetInputAt: 0,
  typedBetInputPlayerId: null,
};

let state = loadState();
const elements = {
  appShell: document.querySelector("#app-shell"),
  hero: document.querySelector("#hero"),
  smallBlind: document.querySelector("#small-blind"),
  bigBlind: document.querySelector("#big-blind"),
  startingStack: document.querySelector("#starting-stack"),
  startingStackSetting: document.querySelector("#starting-stack-setting"),
  totalRounds: document.querySelector("#total-rounds"),
  totalRoundsLabel: document.querySelector("#total-rounds-label"),
  setupTitle: document.querySelector("#setup-title"),
  playerName: document.querySelector("#player-name"),
  addPlayer: document.querySelector("#add-player"),
  addGooners: document.querySelector("#add-gooners"),
  addWg: document.querySelector("#add-wg"),
  setupPlayersList: document.querySelector("#setup-players-list"),
  playersList: document.querySelector("#players-list"),
  potValue: document.querySelector("#pot-value"),
  toCallValue: document.querySelector("#to-call-value"),
  streetLabel: document.querySelector("#street-label"),
  currentPlayerLabel: document.querySelector("#current-player-label"),
  summaryPanel: document.querySelector(".summary-panel"),
  boardPanel: document.querySelector(".board-panel"),
  actionTitle: document.querySelector("#action-title"),
  turnCard: document.querySelector("#turn-card"),
  roundIndicator: document.querySelector("#round-indicator"),
  showdownActions: document.querySelector("#showdown-actions"),
  inHandList: document.querySelector("#in-hand-list"),
  startGame: document.querySelector("#start-game"),
  confirmSettings: document.querySelector("#confirm-settings"),
  setupResetGame: document.querySelector("#setup-reset-game"),
  nextStreet: document.querySelector("#next-street"),
  rotateDealer: document.querySelector("#rotate-dealer"),
  awardPot: document.querySelector("#award-pot"),
  resetGame: document.querySelector("#reset-game"),
  boardCards: document.querySelector("#board-cards"),
  betAmount: document.querySelector("#bet-amount"),
  betMinus10: document.querySelector("#bet-minus-10"),
  betPlus10: document.querySelector("#bet-plus-10"),
  betPlus50: document.querySelector("#bet-plus-50"),
  betControls: document.querySelector(".bet-controls"),
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
  elements.addWg.addEventListener("click", addWG);
  elements.playerName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onAddPlayer();
    }
  });

  elements.startGame.addEventListener("click", startHand);
  elements.confirmSettings.addEventListener("click", confirmSettings);
  elements.setupResetGame.addEventListener("click", resetGame);
  elements.nextStreet?.addEventListener("click", progressStreet);
  elements.rotateDealer?.addEventListener("click", rotateDealer);
  elements.awardPot?.addEventListener("click", awardPot);
  elements.resetGame.addEventListener("click", resetGame);
  elements.betAmount.addEventListener("input", onBetSliderInput);
  elements.betMinus10.addEventListener("click", () => adjustBetAmount(-10));
  elements.betPlus10.addEventListener("click", () => adjustBetAmount(10));
  elements.betPlus50.addEventListener("click", () => adjustBetAmount(50));

  elements.actionFold.addEventListener("click", () => applyAction("fold"));
  elements.actionCall.addEventListener("click", onCallButtonClick);
  elements.actionBet.addEventListener("click", () => onActionButtonClick("raise"));
  window.addEventListener("keydown", onGlobalKeydown);
}

function updateSettings() {
  if (state.gameStarted) {
    state.editSettingsDraft = readSettingsFromInputs();
  } else {
    state.settings = readSettingsFromInputs();
  }
  saveAndRender();
}

function confirmSettings() {
  if (!state.gameStarted) {
    return;
  }

  state.settings.smallBlind = parsePositiveInt(elements.smallBlind.value, 5);
  state.settings.bigBlind = parsePositiveInt(elements.bigBlind.value, 10);
  state.settings.totalRounds += parsePositiveInt(elements.totalRounds.value, 0);
  state.editSettingsDraft = null;
  saveAndRender();
}

function readSettingsFromInputs() {
  const totalRoundsValue = state.gameStarted
    ? parsePositiveInt(elements.totalRounds.value, 0)
    : parsePositiveInt(elements.totalRounds.value, 10);

  return {
    smallBlind: parsePositiveInt(elements.smallBlind.value, 5),
    bigBlind: parsePositiveInt(elements.bigBlind.value, 10),
    startingStack: parsePositiveInt(elements.startingStack.value, 500),
    totalRounds: totalRoundsValue,
  };
}

function onAddPlayer() {
  const name = elements.playerName.value.trim();
  if (!name) {
    return;
  }

  state.players.push(createPlayer(name, state.settings.startingStack));

  elements.playerName.value = "";
  logEvent(`${name} joined the table.`);
  saveAndRender();
}

function addGooners(event) {
  event?.preventDefault();
  event?.stopPropagation();

  const names = ["riz", "jannis", "danial", "ryan", "paddy"];
  const existingNames = new Set(state.players.map((player) => player.name.toLowerCase()));

  names.forEach((name) => {
    if (existingNames.has(name)) {
      return;
    }

    state.players.push(createPlayer(name, state.settings.startingStack));
    existingNames.add(name);
  });

  logEvent("Added gooners preset.");
  saveAndRender();
}

function addWG(event) {
  event?.preventDefault();
  event?.stopPropagation();

  const names = ["jannis", "riz"];
  const existingNames = new Set(state.players.map((player) => player.name.toLowerCase()));

  names.forEach((name) => {
    if (existingNames.has(name)) {
      return;
    }

    state.players.push(createPlayer(name, state.settings.startingStack));
    existingNames.add(name);
  });

  logEvent("Added WG preset.");
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
  state.handPhase = HAND_PHASES.DEALER;
  state.currentBet = 0;
  state.board = [null, null, null, null, null];
  state.handMessage = "";
  state.handStartStacks = {};
  state.lastFullRaise = state.settings.bigBlind;
  state.showdownPots = [];
  state.showdownResults = [];
  state.selectedShowdownWinnerIds = [];
  state.showdownSplitMode = false;

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
    player.status = player.stack > 0 ? PLAYER_STATUSES.ACTIVE : PLAYER_STATUSES.OUT;
    player.cards = [null, null];
    player.acted = false;
    player.canRaise = player.status === PLAYER_STATUSES.ACTIVE;
    state.handStartStacks[player.id] = player.stack;
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

  if (state.handPhase === HAND_PHASES.DEALER) {
    beginStreet(0);
    return;
  }

  if (state.currentPlayerIndex !== null) {
    return;
  }

  if (state.streetIndex >= 3) {
    enterShowdown("River betting complete. Award the pots below.");
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
  const contenders = playersStillInHand();
  if (!contenders.length || totalPot() === 0) {
    return;
  }

  if (calculateSidePots().length > 1) {
    window.alert("Use the showdown pot selector to award main and side pots separately.");
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
  state.handPhase = HAND_PHASES.BETTING;
  state.handActive = true;
  state.lastFullRaise = Math.max(state.settings.bigBlind, 1);

  state.players.forEach((player) => {
    if (streetIndex > 0) {
      player.streetBet = 0;
    }
    player.acted = player.status !== PLAYER_STATUSES.ACTIVE;
    player.canRaise = player.status === PLAYER_STATUSES.ACTIVE;
  });

  if (streetIndex === 0) {
    state.currentBet = Math.max(state.settings.bigBlind, maxStreetBet());
    state.players.forEach((player) => {
      if (player.status === PLAYER_STATUSES.ACTIVE) {
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
  if (!player || player.status !== PLAYER_STATUSES.ACTIVE) {
    return;
  }

  const toCall = Math.max(0, state.currentBet - player.streetBet);
  const callAmount = Math.min(toCall, player.stack);
  const selectedAmount = getSelectedBetAmount();
  const canPlayerRaise = player.canRaise !== false;

  if (action === "fold") {
    player.status = PLAYER_STATUSES.FOLDED;
    player.acted = true;
    player.canRaise = false;
    player.stats.folds += 1;
    logEvent(`${player.name} folded.`);
  }

  if (action === "call" && toCall === 0) {
    player.acted = true;
    player.canRaise = false;
    player.stats.checks += 1;
    logEvent(`${player.name} checked.`);
  }

  if (action === "call" && toCall > 0) {
    commitChips(player, callAmount);
    player.acted = true;
    player.canRaise = false;
    player.stats.calls += 1;
    logEvent(`${player.name} called ${callAmount}.`);
  }

  if (action === "raise") {
    const minimumRaiseCommitment = getMinimumRaiseCommitment(player, toCall);
    const previousBet = state.currentBet;
    const raiseIncrement = player.streetBet + selectedAmount - previousBet;
    const isAllInAttempt = selectedAmount === player.stack;
    const isFullRaise = raiseIncrement >= state.lastFullRaise;

    if (!canPlayerRaise || selectedAmount <= callAmount) {
      return;
    }

    if (!isAllInAttempt && selectedAmount < minimumRaiseCommitment) {
      return;
    }

    commitChips(player, selectedAmount);
    state.currentBet = player.streetBet;
    player.acted = true;
    player.canRaise = false;
    player.stats.raises += 1;

    if (isFullRaise) {
      state.lastFullRaise = raiseIncrement;
      resetActedFlags(player.id);
      resetRaiseFlags(player.id);
      logEvent(`${player.name} raised to ${player.streetBet}.`);
    } else {
      logEvent(`${player.name} went all-in to ${player.streetBet}.`);
    }
  }

  advanceTurn();
  maybeFinishHand();
  saveAndRender();
}

function advanceTurn() {
  const unresolved = activePlayers().filter((player) => {
    if (player.status === PLAYER_STATUSES.ALL_IN) {
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
  const contenders = activePlayers();
  if (contenders.length <= 1) {
    if (contenders.length === 1) {
      completeHandWithWinner(contenders[0].id, {
        autoRender: false,
        message: getWinnerMessage(contenders[0].name),
      });
    }
    return;
  }

  const playersAbleToBet = contenders.filter((player) => player.status === PLAYER_STATUSES.ACTIVE);
  if (state.currentPlayerIndex === null && playersAbleToBet.length <= 1) {
    enterShowdown("All remaining action is closed. Go to showdown.");
    return;
  }

  if (state.streetIndex >= 3 && state.currentPlayerIndex === null) {
    enterShowdown("Showdown reached. Award the pots below.");
  }
}

function completeHandWithWinner(winnerId, options = {}) {
  const winner = state.players.find((player) => player.id === winnerId);
  if (!winner) {
    return;
  }

  const { autoRender = true, message = getWinnerMessage(winner.name) } = options;
  const winningAmount = totalPot();
  winner.stats.handsWon += 1;
  winner.stack += winningAmount;
  state.players.forEach((player) => {
    player.committed = 0;
    player.streetBet = 0;
    player.acted = false;
    player.canRaise = player.status === PLAYER_STATUSES.ACTIVE;
  });
  state.board = [null, null, null, null, null];
  state.currentBet = 0;
  state.currentPlayerIndex = null;
  state.handActive = false;
  state.handPhase = HAND_PHASES.WINNER;
  state.handMessage = message;
  state.showdownPots = [];
  state.showdownResults = [
    {
      winnerId: winner.id,
      winnerName: winner.name,
      amount: winningAmount,
    },
  ];
  logEvent(message);

  if (autoRender) {
    saveAndRender();
  }
}

function continueToNextRound() {
  if (state.handNumber >= state.settings.totalRounds) {
    state.handPhase = HAND_PHASES.COMPLETE;
    state.handMessage = "";
    saveAndRender();
    return;
  }

  if (state.players.length > 1) {
    state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
    startHand(true);
  }
}

function addRoundsFromComplete() {
  const choice = window.prompt("Add how many rounds?", "1");
  if (choice === null) {
    return;
  }

  const additionalRounds = parsePositiveInt(choice, 0);
  if (additionalRounds <= 0) {
    return;
  }

  state.settings.totalRounds += additionalRounds;
  continueToNextRound();
}

function postBlind(index, amount, label) {
  const player = state.players[index];
  if (!player || player.status === PLAYER_STATUSES.OUT) {
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
  if (player.stack === 0 && player.status === PLAYER_STATUSES.ACTIVE) {
    player.status = PLAYER_STATUSES.ALL_IN;
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
  if (state.players.length <= 2) {
    return state.dealerIndex;
  }

  return seatOffset(1);
}

function findNextPlayer(startIndex) {
  if (!state.players.length) {
    return null;
  }

  for (let step = 0; step < state.players.length; step += 1) {
    const index = (startIndex + step) % state.players.length;
    const player = state.players[index];
    if (player.status === PLAYER_STATUSES.ACTIVE) {
      return index;
    }
  }

  return null;
}

function resetActedFlags(exceptId) {
  state.players.forEach((player) => {
    player.acted = player.id === exceptId || player.status !== PLAYER_STATUSES.ACTIVE;
  });
}

function resetRaiseFlags(exceptId) {
  state.players.forEach((player) => {
    player.canRaise = player.id !== exceptId && player.status === PLAYER_STATUSES.ACTIVE;
  });
}

function activePlayers() {
  return state.players.filter(
    (player) => player.status === PLAYER_STATUSES.ACTIVE || player.status === PLAYER_STATUSES.ALL_IN,
  );
}

function playersStillInHand() {
  return state.players.filter(
    (player) => player.status !== PLAYER_STATUSES.FOLDED && player.status !== PLAYER_STATUSES.OUT,
  );
}

function maxStreetBet() {
  return state.players.reduce((max, player) => Math.max(max, player.streetBet), 0);
}

function totalPot() {
  return state.players.reduce((sum, player) => sum + player.committed, 0);
}

function calculateSidePots() {
  const committedPlayers = state.players.filter((player) => player.committed > 0);
  if (!committedPlayers.length) {
    return [];
  }

  const eligiblePlayers = state.players.filter((player) => player.status !== PLAYER_STATUSES.FOLDED && player.status !== PLAYER_STATUSES.OUT);
  const hasAllInPlayer = committedPlayers.some((player) => player.status === PLAYER_STATUSES.ALL_IN);

  if (!hasAllInPlayer) {
    return [
      {
        label: "Main Pot",
        amount: totalPot(),
        eligible: eligiblePlayers.map((player) => player.name),
        eligibleIds: eligiblePlayers.map((player) => player.id),
      },
    ].filter((pot) => pot.amount > 0);
  }

  const layers = state.players
    .filter((player) => player.committed > 0)
    .map((player) => player.committed)
    .sort((a, b) => a - b);

  const uniqueLayers = [...new Set(layers)];
  let previous = 0;

  return uniqueLayers
    .map((layer, index) => {
      const contributors = state.players.filter((player) => player.committed >= layer);
      const eligiblePlayers = contributors.filter((player) => player.status !== PLAYER_STATUSES.FOLDED);
      const amount = (layer - previous) * contributors.length;
      previous = layer;
      return {
        label: index === 0 ? "Main Pot" : `Side Pot ${index}`,
        amount,
        eligible: eligiblePlayers.map((player) => player.name),
        eligibleIds: eligiblePlayers.map((player) => player.id),
      };
    })
    .filter((pot) => pot.amount > 0);
}

function enterShowdown(message) {
  state.handActive = false;
  state.handPhase = HAND_PHASES.SHOWDOWN;
  state.handMessage = "";
  state.currentPlayerIndex = null;
  state.showdownPots = calculateSidePots();
  state.showdownResults = [];
  state.selectedShowdownWinnerIds = [];
  state.showdownSplitMode = false;
  logEvent(message);
  resolveAutomaticShowdownPots();
  if (!state.showdownPots.length) {
    finalizeShowdownResults();
  }
}

function awardShowdownPot(winnerIds) {
  const [currentPot, ...remainingPots] = state.showdownPots;
  if (!currentPot || !winnerIds.length) {
    return;
  }

  const validWinnerIds = winnerIds.filter((winnerId) => currentPot.eligibleIds.includes(winnerId));
  if (!validWinnerIds.length) {
    return;
  }

  const splitAmount = Math.floor(currentPot.amount / validWinnerIds.length);
  let remainder = currentPot.amount % validWinnerIds.length;

  validWinnerIds.forEach((winnerId) => {
    const winner = state.players.find((player) => player.id === winnerId);
    if (!winner) {
      return;
    }

    const awardAmount = splitAmount + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    state.showdownResults.push({
      potLabel: currentPot.label,
      winnerId,
      winnerName: winner.name,
      amount: awardAmount,
    });
  });

  state.showdownPots = remainingPots;
  state.selectedShowdownWinnerIds = [];
  state.showdownSplitMode = false;
  const winnerNames = validWinnerIds
    .map((winnerId) => state.players.find((player) => player.id === winnerId)?.name)
    .filter(Boolean);
  logEvent(
    `${winnerNames.join(" / ")} won ${currentPot.label.toLowerCase()} ${currentPot.amount}${
      winnerNames.length > 1 ? " split" : ""
    }.`,
  );
  resolveAutomaticShowdownPots();

  if (!state.showdownPots.length) {
    finalizeShowdownResults();
    return;
  }

  saveAndRender();
}

function finalizeShowdownResults() {
  const winnerIds = new Set();

  state.showdownResults.forEach((result) => {
    const winner = state.players.find((player) => player.id === result.winnerId);
    if (!winner) {
      return;
    }

    winner.stack += result.amount;
    winnerIds.add(winner.id);
  });

  winnerIds.forEach((winnerId) => {
    const winner = state.players.find((player) => player.id === winnerId);
    if (winner) {
      winner.stats.handsWon += 1;
    }
  });

  state.players.forEach((player) => {
    player.committed = 0;
    player.streetBet = 0;
    player.acted = false;
    player.canRaise = player.status === PLAYER_STATUSES.ACTIVE;
  });
  state.board = [null, null, null, null, null];
  state.currentBet = 0;
  state.currentPlayerIndex = null;
  state.handActive = false;
  state.handPhase = HAND_PHASES.WINNER;
  state.handMessage =
    state.showdownResults.length === 1 ? getWinnerMessage(state.showdownResults[0].winnerName) : "Pots awarded.";
  state.selectedShowdownWinnerIds = [];
  state.showdownSplitMode = false;
  saveAndRender();
}

function playersWithChips() {
  return state.players.filter((player) => player.stack > 0);
}

function resolveAutomaticShowdownPots() {
  while (state.showdownPots.length) {
    const currentPot = state.showdownPots[0];
    if (currentPot.eligibleIds.length !== 1) {
      break;
    }

    const winnerId = currentPot.eligibleIds[0];
    const winner = state.players.find((player) => player.id === winnerId);
    if (!winner) {
      break;
    }

    state.showdownResults.push({
      potLabel: currentPot.label,
      winnerId,
      winnerName: winner.name,
      amount: currentPot.amount,
    });
    state.showdownPots = state.showdownPots.slice(1);
    logEvent(`${winner.name} won ${currentPot.label.toLowerCase()} ${currentPot.amount} automatically.`);
  }
}

function toggleShowdownWinnerSelection(winnerId) {
  if (state.selectedShowdownWinnerIds.includes(winnerId)) {
    state.selectedShowdownWinnerIds = state.selectedShowdownWinnerIds.filter((id) => id !== winnerId);
  } else {
    state.selectedShowdownWinnerIds = [...state.selectedShowdownWinnerIds, winnerId];
  }
  saveAndRender();
}

function confirmShowdownPotAward() {
  if (!state.selectedShowdownWinnerIds.length) {
    return;
  }

  awardShowdownPot(state.selectedShowdownWinnerIds);
}

function startShowdownSplit() {
  const currentPot = state.showdownPots[0];
  if (!currentPot) {
    return;
  }

  if (currentPot.eligibleIds.length === 2) {
    awardShowdownPot([...currentPot.eligibleIds]);
    return;
  }

  state.showdownSplitMode = true;
  state.selectedShowdownWinnerIds = [];
  saveAndRender();
}

function cancelShowdownSplit() {
  state.showdownSplitMode = false;
  state.selectedShowdownWinnerIds = [];
  saveAndRender();
}

function render() {
  renderSettings();
  renderVisibility();
  renderRoundIndicator();
  renderActionTitle();
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
  const settingsView = state.gameStarted && state.editSettingsDraft ? state.editSettingsDraft : state.settings;
  elements.smallBlind.value = settingsView.smallBlind;
  elements.bigBlind.value = settingsView.bigBlind;
  elements.startingStack.value = settingsView.startingStack;
  elements.totalRounds.value = state.gameStarted ? (state.editSettingsDraft?.totalRounds ?? 0) : state.settings.totalRounds;
  elements.totalRounds.min = state.gameStarted ? "0" : "1";
  elements.totalRoundsLabel.textContent = state.gameStarted ? "Add rounds" : "Total rounds";
  elements.setupTitle.textContent = state.gameStarted ? "Edit Game" : "Table";
  elements.startGame.classList.toggle("hidden", state.gameStarted);
  elements.confirmSettings.classList.toggle("hidden", !state.gameStarted);
  elements.startGame.disabled = state.players.length < 2;
  elements.addGooners.classList.toggle("hidden", state.gameStarted);
  elements.addWg.classList.toggle("hidden", state.gameStarted);
  elements.startingStackSetting.classList.toggle("hidden", state.gameStarted);
}

function renderVisibility() {
  const isMatchComplete = state.handPhase === HAND_PHASES.COMPLETE;
  elements.appShell.classList.toggle("game-live", state.gameStarted);
  elements.appShell.classList.remove("phase-flop", "phase-turn", "phase-river", "phase-showdown");
  if (state.gameStarted) {
    if (state.handPhase === HAND_PHASES.SHOWDOWN) {
      elements.appShell.classList.add("phase-showdown");
    } else if (state.streetIndex === 1) {
      elements.appShell.classList.add("phase-flop");
    } else if (state.streetIndex === 2) {
      elements.appShell.classList.add("phase-turn");
    } else if (state.streetIndex >= 3) {
      elements.appShell.classList.add("phase-river");
    }
  }
  elements.gamePanels.forEach((panel) => {
    panel.classList.toggle("hidden", !state.gameStarted);
  });
  elements.hero.classList.toggle("hidden", state.gameStarted);
  elements.resetGame.classList.add("hidden");
  elements.summaryPanel?.classList.toggle("hidden", isMatchComplete);
  elements.boardPanel?.classList.toggle("hidden", isMatchComplete);
  const actionPanel = document.querySelector(".action-panel");
  actionPanel?.classList.toggle("showdown-mode", state.handPhase === HAND_PHASES.SHOWDOWN);
  actionPanel?.classList.toggle("winner-mode", state.handPhase === HAND_PHASES.WINNER);
  actionPanel?.classList.toggle("complete-mode", isMatchComplete);
  elements.roundIndicator.classList.toggle("hidden", !state.gameStarted);
}

function renderRoundIndicator() {
  if (!state.gameStarted) {
    elements.roundIndicator.innerHTML = "";
    return;
  }

  const currentRound = Math.max(1, Math.min(state.handNumber, state.settings.totalRounds));
  elements.roundIndicator.innerHTML = `
    <strong>${currentRound} / ${state.settings.totalRounds}</strong>
  `;
}

function renderActionTitle() {
  let title = "Current Move";

  if (state.handPhase === HAND_PHASES.DEALER) {
    title = "Dealer";
  } else if (state.handPhase === HAND_PHASES.WINNER) {
    title = "Winner";
  } else if (state.handPhase === HAND_PHASES.SHOWDOWN) {
    title = "Showdown";
  } else if (state.handPhase === HAND_PHASES.COMPLETE) {
    title = "Complete";
  } else if (state.gameStarted) {
    title = STREETS[state.streetIndex];
  }

  elements.actionTitle.textContent = title;
}

function renderSummary() {
  if (!elements.streetLabel || !elements.potValue || !elements.toCallValue || !elements.currentPlayerLabel) {
    return;
  }

  const currentPlayer = state.currentPlayerIndex !== null ? state.players[state.currentPlayerIndex] : null;
  elements.streetLabel.textContent = state.handPhase === HAND_PHASES.DEALER ? "Waiting" : STREETS[state.streetIndex];
  elements.potValue.textContent = formatChips(totalPot());
  elements.toCallValue.textContent = formatChips(state.currentBet);
  elements.currentPlayerLabel.textContent = currentPlayer
    ? currentPlayer.name
    : state.handPhase === HAND_PHASES.WINNER
      ? state.handMessage.replace(/\.$/, "")
      : "Round complete";
  if (elements.awardPot) {
    elements.awardPot.disabled =
      totalPot() === 0 || [HAND_PHASES.SHOWDOWN, HAND_PHASES.WINNER, HAND_PHASES.COMPLETE].includes(state.handPhase);
  }
}

function renderBoard() {
  if (!elements.boardCards) {
    return;
  }

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
  if (state.handPhase === HAND_PHASES.DEALER && dealer) {
    elements.turnCard.className = "turn-status-wrap";
    elements.turnCard.innerHTML = `
      <div class="turn-status-grid">
        <div class="turn-status-tile turn-status-main">
          <p class="eyebrow">Dealer</p>
          <h3>${dealer.name}</h3>
          <p>Deal the cards</p>
        </div>
        <div class="turn-status-tile turn-status-pot">
          <p class="eyebrow">Pot</p>
          <h3>${formatChips(totalPot())}</h3>
        </div>
      </div>
    `;
    return;
  }

  if (state.handPhase === HAND_PHASES.SHOWDOWN) {
    const remainingPot = state.showdownPots.length
      ? state.showdownPots.reduce((sum, pot) => sum + pot.amount, 0)
      : totalPot();
    elements.turnCard.className = "turn-status-wrap";
    elements.turnCard.innerHTML = `
      <div class="turn-status-grid showdown-status-grid">
        <div class="turn-status-tile turn-status-main showdown-status-main">
          <p class="eyebrow">Showdown</p>
          <p class="showdown-status-copy">Reveal hands</p>
        </div>
        <div class="turn-status-tile turn-status-pot">
          <p class="eyebrow">Remaining Pot</p>
          <h3>${formatChips(remainingPot)}</h3>
        </div>
      </div>
    `;
    return;
  }

  if (state.handPhase === HAND_PHASES.WINNER) {
    const uniqueWinnerIds = [...new Set(state.showdownResults.map((result) => result.winnerId))];
    const winnerPayoutMarkup = state.showdownResults.length
      ? `
          <div class="winner-result-list">
            ${state.showdownResults
              .map((result) => {
                const amountLabel = `Amount won: ${formatChips(result.amount)}`;
                return `<p>${uniqueWinnerIds.length > 1 ? `${result.winnerName} ${amountLabel}` : amountLabel}</p>`;
              })
              .join("")}
          </div>
        `
      : "";

    const chipLeaders = playersWithChips();
    if (chipLeaders.length === 1) {
      const champion = chipLeaders[0];
      const championHeadline = state.handMessage ? state.handMessage.replace(/\.$/, "") : `Congrats, ${champion.name}`;
      elements.turnCard.className = "turn-status-wrap";
      elements.turnCard.innerHTML = `
        <div class="turn-status-grid winner-results-grid">
          <div class="turn-status-tile turn-status-main winner-result-card">
            <p class="eyebrow">Champion</p>
            <h3>${championHeadline}</h3>
            ${winnerPayoutMarkup}
            <p>You have all the chips.</p>
          </div>
          <div class="turn-status-tile winner-stacks-card">
            <p class="eyebrow">Final Stack</p>
            <div class="winner-stack-list">
              <div class="winner-stack-row">
                <span>${champion.name}</span>
                <strong class="winner-stack-value">${formatChips(champion.stack)}</strong>
              </div>
            </div>
            <button id="winner-new-game" type="button">Start New Game</button>
          </div>
        </div>
      `;
      elements.turnCard.querySelector("#winner-new-game")?.addEventListener("click", resetGame);
      return;
    }

    const resultTitle = state.showdownResults.length > 1 ? "Results" : "Winner";
    const winnerHeadline = `<h3>${state.handMessage.replace(/\.$/, "")}</h3>`;
    const resultMarkup = `${winnerHeadline}${winnerPayoutMarkup}`;
    const stackRows = state.players
      .map(
        (player) => {
          const delta = player.stack - (state.handStartStacks[player.id] ?? player.stack);
          const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
          const indicator = delta > 0 ? "↑" : delta < 0 ? "↓" : "•";
          return `
          <div class="winner-stack-row">
            <span>${player.name}</span>
            <strong class="winner-stack-value">
              ${formatChips(player.stack)}
              <span class="winner-stack-trend winner-stack-trend-${direction}">${indicator}</span>
            </strong>
          </div>
        `;
        },
      )
      .join("");

    elements.turnCard.className = "turn-status-wrap";
    elements.turnCard.innerHTML = `
      <div class="turn-status-grid winner-results-grid">
        <div class="turn-status-tile turn-status-main winner-result-card">
          <p class="eyebrow">${resultTitle}</p>
          ${resultMarkup}
        </div>
        <div class="turn-status-tile winner-stacks-card">
          <p class="eyebrow">Updated Stacks</p>
          <div class="winner-stack-list">${stackRows}</div>
          <button id="winner-continue" type="button">Continue</button>
        </div>
      </div>
    `;
    elements.turnCard.querySelector("#winner-continue")?.addEventListener("click", continueToNextRound);
    return;
  }

  if (state.handPhase === HAND_PHASES.COMPLETE) {
    elements.turnCard.className = "turn-status-wrap";
    elements.turnCard.innerHTML = `
      <div class="turn-status-grid">
        <div class="turn-status-tile turn-status-main">
          <p class="eyebrow">Match Complete</p>
          <h3 class="complete-status-title">All rounds played</h3>
        </div>
        <div class="turn-status-tile winner-stacks-card complete-actions-card">
          <button id="complete-add-rounds" class="ghost-button" type="button">Add Rounds</button>
          <button id="complete-new-game" type="button">New Game</button>
        </div>
      </div>
    `;
    elements.turnCard.querySelector("#complete-add-rounds")?.addEventListener("click", addRoundsFromComplete);
    elements.turnCard.querySelector("#complete-new-game")?.addEventListener("click", resetGame);
    return;
  }

  const currentPlayer = state.currentPlayerIndex !== null ? state.players[state.currentPlayerIndex] : null;
  if (!currentPlayer) {
    elements.turnCard.className = "turn-status-wrap";
    elements.turnCard.innerHTML = `
      <div class="turn-status-grid">
        <div class="turn-status-tile turn-status-main">
          <p class="eyebrow">${STREETS[state.streetIndex]}</p>
          <p>${getNextStreetPrompt()}</p>
        </div>
        <div class="turn-status-tile turn-status-pot">
          <p class="eyebrow">Pot</p>
          <h3>${formatChips(totalPot())}</h3>
        </div>
      </div>
    `;
    return;
  }

  const toCall = Math.max(0, state.currentBet - currentPlayer.streetBet);
  elements.turnCard.className = "turn-status-wrap";
  elements.turnCard.innerHTML = `
    <div class="turn-status-grid">
      <div class="turn-status-tile turn-status-main">
        <p class="eyebrow">Seat in action</p>
        <h3>${currentPlayer.name}</h3>
        <div class="turn-status-details">
          <p class="turn-status-detail">Stack: ${formatChips(currentPlayer.stack)}</p>
          <p class="turn-status-detail">${formatChips(toCall)} to call</p>
        </div>
      </div>
      <div class="turn-status-tile turn-status-pot">
        <p class="eyebrow">Pot</p>
        <h3>${formatChips(totalPot())}</h3>
      </div>
    </div>
  `;
}

function getNextStreetPrompt() {
  if (state.handPhase === HAND_PHASES.DEALER) {
    return "Deal the hole cards, then start preflop.";
  }

  if (state.handPhase === HAND_PHASES.SHOWDOWN) {
    return "Showdown time. Pick the winner below.";
  }

  if (state.handPhase === HAND_PHASES.WINNER) {
    return "Hand finished. Continue to the next round.";
  }

  if (state.streetIndex === 0) {
    return " Deal the flop cards";
  }

  if (state.streetIndex === 1) {
    return "Deal the turn card";
  }

  if (state.streetIndex === 2) {
    return "Deal the river card";
  }

  return "Round complete. Continue when ready.";
}

function getStreetAdvanceLabel() {
  if (state.handPhase === HAND_PHASES.DEALER) {
    return "Start Preflop";
  }

  if (state.streetIndex === 0) {
    return "Start Flop";
  }

  if (state.streetIndex === 1) {
    return "Start Turn";
  }

  if (state.streetIndex === 2) {
    return "Start River";
  }

  return "Continue";
}

function canUseCallButtonForStreetAdvance() {
  if (!state.gameStarted || state.currentPlayerIndex !== null) {
    return false;
  }

  return state.handPhase === HAND_PHASES.DEALER || state.handPhase === HAND_PHASES.BETTING;
}

function renderBetControls() {
  const currentPlayer = state.currentPlayerIndex !== null ? state.players[state.currentPlayerIndex] : null;
  const toCall = currentPlayer ? Math.max(0, state.currentBet - currentPlayer.streetBet) : 0;
  const callAmount = currentPlayer ? Math.min(toCall, currentPlayer.stack) : 0;
  const minRaiseCommitment = getMinimumRaiseCommitment(currentPlayer, toCall);
  const allowedAmounts = getAllowedBetAmounts(currentPlayer, toCall);

  syncBetControlState(currentPlayer, toCall, callAmount, minRaiseCommitment, allowedAmounts);

  const currentAmount = state.betControlAmount;
  const sliderIndex = findClosestBetIndex(allowedAmounts, currentAmount);
  const nextValue = allowedAmounts[sliderIndex] ?? callAmount;
  const canRaiseAvailable = currentPlayer ? currentPlayer.canRaise !== false && currentPlayer.stack > callAmount : false;
  const hasRaiseAmountSelected = nextValue > callAmount;
  const actionTotal = currentPlayer ? currentPlayer.streetBet + nextValue : 0;
  const isRaiseSelected = state.selectedAction === "raise" && hasRaiseAmountSelected;
  const isCallAllIn = currentPlayer && toCall > 0 && callAmount === currentPlayer.stack;
  const isBetAllIn = currentPlayer && nextValue > callAmount && nextValue === currentPlayer.stack;
  const callLabel = toCall === 0 ? "Check" : isCallAllIn ? `All-in ${callAmount}` : `Call ${callAmount}`;
  let betLabel = toCall === 0 ? "Bet" : "Raise";
  if (currentPlayer && nextValue > callAmount) {
    betLabel = isBetAllIn ? `All-in ${nextValue}` : toCall === 0 ? `Bet ${nextValue}` : `Raise to ${actionTotal}`;
  }

  elements.betAmount.min = "0";
  elements.betAmount.max = String(Math.max(allowedAmounts.length - 1, 0));
  elements.betAmount.step = "1";
  elements.betAmount.value = String(sliderIndex);
  elements.betAmount.disabled = !currentPlayer || allowedAmounts.length <= 1;
  elements.betAmount.dataset.allowedAmounts = JSON.stringify(allowedAmounts);
  elements.betAmount.dataset.callAmount = String(callAmount);
  elements.betAmount.dataset.minRaiseCommitment = String(minRaiseCommitment);
  elements.betControls?.classList.toggle("bet-controls-disabled", !currentPlayer);
  const useCallForStreetAdvance = canUseCallButtonForStreetAdvance();
  elements.actionCall.textContent = useCallForStreetAdvance ? getStreetAdvanceLabel() : callLabel;
  elements.actionCall.classList.toggle(
    "ghost-button",
    useCallForStreetAdvance || !state.selectedAction || state.selectedAction !== "call",
  );
  elements.actionCall.classList.toggle("action-selected-call", !useCallForStreetAdvance && state.selectedAction === "call");
  elements.actionBet.textContent = betLabel;
  elements.actionBet.classList.toggle("action-selected-bet", isRaiseSelected);
  elements.actionFold.disabled = !currentPlayer;
  elements.actionCall.disabled = !currentPlayer && !useCallForStreetAdvance;
  elements.actionBet.disabled = !currentPlayer || !canRaiseAvailable;
}

function renderStreetAction() {
}

function onCallButtonClick() {
  if (canUseCallButtonForStreetAdvance()) {
    progressStreet();
    return;
  }

  onActionButtonClick("call");
}

function renderShowdownActions() {
  elements.showdownActions.innerHTML = "";
  elements.showdownActions.classList.toggle("hidden", state.handPhase !== HAND_PHASES.SHOWDOWN);

  if (state.handPhase !== HAND_PHASES.SHOWDOWN) {
    return;
  }

  const currentPot = state.showdownPots[0] ?? calculateSidePots()[0];
  if (!currentPot) {
    return;
  }

  const label = document.createElement("p");
  label.className = "showdown-label";
  label.textContent = state.showdownSplitMode
    ? `${currentPot.label} · ${formatChips(currentPot.amount)} · Select tied winners`
    : `${currentPot.label} · ${formatChips(currentPot.amount)} · Who won?`;
  elements.showdownActions.appendChild(label);

  state.players
    .filter((player) => currentPot.eligibleIds.includes(player.id))
    .forEach((player) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = player.name;
      button.classList.toggle("showdown-selected", state.selectedShowdownWinnerIds.includes(player.id));
      button.addEventListener("click", () => {
        if (state.showdownSplitMode) {
          toggleShowdownWinnerSelection(player.id);
          return;
        }

        awardShowdownPot([player.id]);
      });
      elements.showdownActions.appendChild(button);
    });

  if (state.showdownSplitMode) {
    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.textContent = "Confirm Split Pot";
    confirmButton.disabled = state.selectedShowdownWinnerIds.length < 2;
    confirmButton.addEventListener("click", confirmShowdownPotAward);
    elements.showdownActions.appendChild(confirmButton);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "ghost-button";
    cancelButton.textContent = "Cancel Split";
    cancelButton.addEventListener("click", cancelShowdownSplit);
    elements.showdownActions.appendChild(cancelButton);
    return;
  }

  const splitButton = document.createElement("button");
  splitButton.type = "button";
  splitButton.className = "ghost-button";
  splitButton.textContent = currentPot.eligibleIds.length === 2 ? "Split Pot" : "Select Split Pot";
  splitButton.addEventListener("click", startShowdownSplit);
  elements.showdownActions.appendChild(splitButton);
}

function renderInHandOverview() {
  elements.inHandList.innerHTML = "";

  const playersInHand = playersStillInHand();
  if (!playersInHand.length) {
    elements.inHandList.innerHTML = `<span class="badge">No active players</span>`;
    return;
  }

  playersInHand.forEach((player) => {
    const badge = document.createElement("span");
    badge.className = "badge";
    if (player.status === PLAYER_STATUSES.ALL_IN) {
      badge.classList.add("in-hand-all-in");
    }
    const roleLabels = [];
    if (state.players[state.dealerIndex]?.id === player.id) roleLabels.push("Dealer");
    if (state.players[getSmallBlindIndex()]?.id === player.id) roleLabels.push("SB");
    if (state.players[getBigBlindIndex()]?.id === player.id) roleLabels.push("BB");
    if (state.currentPlayerIndex !== null && state.players[state.currentPlayerIndex]?.id === player.id) {
      badge.classList.add("in-hand-acting");
    }
    const amountLabel = player.status === PLAYER_STATUSES.ALL_IN ? "All-in" : `${player.streetBet} this round`;
    const roleMarkup = `<span class="in-hand-role">${roleLabels.join(" · ") || "\u00A0"}</span>`;
    badge.innerHTML = `
      <span class="in-hand-primary">${player.name}</span>
      <span class="in-hand-secondary">${amountLabel}</span>
      ${roleMarkup}
    `;
    elements.inHandList.appendChild(badge);
  });
}

function getAllowedBetAmounts(currentPlayer, toCall) {
  if (!currentPlayer) {
    return [0];
  }

  const callAmount = Math.min(toCall, currentPlayer.stack);
  const amounts = [callAmount];
  const minRaiseCommitment = getMinimumRaiseCommitment(currentPlayer, toCall);
  let amount = minRaiseCommitment;

  while (amount <= currentPlayer.stack) {
    amounts.push(amount);
    amount += 5;
  }

  if (!amounts.includes(currentPlayer.stack)) {
    amounts.push(currentPlayer.stack);
  }

  return [...new Set(amounts)].sort((a, b) => a - b);
}

function getMinimumRaiseCommitment(currentPlayer, toCall) {
  if (!currentPlayer) {
    return 0;
  }

  const callAmount = Math.min(toCall, currentPlayer.stack);
  if (currentPlayer.stack <= callAmount) {
    return callAmount;
  }

  return Math.min(currentPlayer.stack, callAmount + Math.max(state.lastFullRaise, state.settings.bigBlind, 1));
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

function findCeilingBetIndex(amounts, target) {
  const index = amounts.findIndex((amount) => amount >= target);
  return index === -1 ? Math.max(amounts.length - 1, 0) : index;
}

function findFloorBetIndex(amounts, target) {
  for (let index = amounts.length - 1; index >= 0; index -= 1) {
    if (amounts[index] <= target) {
      return index;
    }
  }

  return 0;
}

function getSelectedBetAmount() {
  return Math.max(0, state.betControlAmount ?? 0);
}

function syncBetControlState(currentPlayer, toCall, callAmount, minRaiseCommitment, allowedAmounts) {
  const playerId = currentPlayer?.id ?? null;
  const contextChanged =
    state.betControlPlayerId !== playerId ||
    state.betControlToCall !== toCall ||
    !allowedAmounts.includes(state.betControlAmount);

  if (contextChanged) {
    state.betControlPlayerId = playerId;
    state.betControlToCall = toCall;
    state.betControlAmount = callAmount;
    state.selectedAction = "call";
    state.typedBetInput = "";
    state.typedBetInputAt = 0;
    state.typedBetInputPlayerId = playerId;
    return;
  }

  if (state.selectedAction === "raise" && state.betControlAmount <= callAmount && minRaiseCommitment > callAmount) {
    state.betControlAmount = minRaiseCommitment;
  }
}

function setSelectedBetAmount(amount, strategy = "closest") {
  const allowedAmounts = JSON.parse(elements.betAmount.dataset.allowedAmounts ?? "[]");
  if (!allowedAmounts.length) {
    state.betControlAmount = 0;
    return;
  }

  let nextIndex = 0;
  if (strategy === "ceil") {
    nextIndex = findCeilingBetIndex(allowedAmounts, amount);
  } else if (strategy === "floor") {
    nextIndex = findFloorBetIndex(allowedAmounts, amount);
  } else {
    nextIndex = findClosestBetIndex(allowedAmounts, amount);
  }

  state.betControlAmount = allowedAmounts[nextIndex] ?? allowedAmounts[0];
}

function onBetSliderInput() {
  const allowedAmounts = JSON.parse(elements.betAmount.dataset.allowedAmounts ?? "[]");
  const index = parsePositiveInt(elements.betAmount.value, 0);
  const nextAmount = allowedAmounts[index] ?? 0;
  const callAmount = parsePositiveInt(elements.betAmount.dataset.callAmount, 0);

  state.betControlAmount = nextAmount;
  state.selectedAction = nextAmount > callAmount ? "raise" : "call";
  renderBetControls();
}

function adjustBetAmount(increment) {
  const allowedAmounts = JSON.parse(elements.betAmount.dataset.allowedAmounts ?? "[]");
  if (!allowedAmounts.length) {
    return;
  }

  const currentAmount = getSelectedBetAmount();
  const callAmount = parsePositiveInt(elements.betAmount.dataset.callAmount, 0);
  const minRaiseCommitment = parsePositiveInt(elements.betAmount.dataset.minRaiseCommitment, callAmount);
  let targetAmount = currentAmount + increment;

  if (increment > 0 && currentAmount <= callAmount) {
    targetAmount = Math.max(callAmount + increment, minRaiseCommitment);
  }

  const maxAmount = allowedAmounts[allowedAmounts.length - 1];
  const clampedTarget = Math.max(callAmount, Math.min(targetAmount, maxAmount));
  const selectionStrategy = increment < 0 ? "floor" : "ceil";
  setSelectedBetAmount(clampedTarget, selectionStrategy);
  state.selectedAction = state.betControlAmount > callAmount ? "raise" : "call";
  renderBetControls();
}

function onActionButtonClick(action) {
  if (!state.handActive || state.currentPlayerIndex === null) {
    return;
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer) {
    return;
  }

  const toCall = Math.max(0, state.currentBet - currentPlayer.streetBet);
  const callAmount = Math.min(toCall, currentPlayer.stack);
  const minRaiseCommitment = getMinimumRaiseCommitment(currentPlayer, toCall);

  if (action === "raise" && currentPlayer.stack <= callAmount) {
    return;
  }

  if (state.selectedAction !== action) {
    state.selectedAction = action;
    state.betControlAmount = action === "raise" ? minRaiseCommitment : callAmount;
    renderBetControls();
    return;
  }

  applyAction(action);
}

function onGlobalKeydown(event) {
  if (event.repeat || isTypingTarget(event.target)) {
    return;
  }

  if (/^\d$/.test(event.key) && state.currentPlayerIndex !== null && state.handActive && !elements.betAmount.disabled) {
    event.preventDefault();
    onBetDigitInput(event.key);
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();

    if (state.handPhase === HAND_PHASES.WINNER) {
      elements.turnCard.querySelector("#winner-continue")?.click();
      return;
    }

    if (state.currentPlayerIndex !== null && state.handActive) {
      const action = state.selectedAction === "raise" ? "raise" : "call";
      onActionButtonClick(action);
      return;
    }

    if (canUseCallButtonForStreetAdvance()) {
      onCallButtonClick();
    }
    return;
  }

  if (event.key.toLowerCase() === "f" && state.currentPlayerIndex !== null && state.handActive) {
    event.preventDefault();
    applyAction("fold");
    return;
  }

  if (event.key === "ArrowRight" && state.currentPlayerIndex !== null && !elements.betAmount.disabled) {
    event.preventDefault();
    adjustBetAmount(5);
    return;
  }

  if (event.key === "ArrowLeft" && state.currentPlayerIndex !== null && !elements.betAmount.disabled) {
    event.preventDefault();
    adjustBetAmount(-5);
  }
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

function onBetDigitInput(digit) {
  const currentPlayer = state.currentPlayerIndex !== null ? state.players[state.currentPlayerIndex] : null;
  if (!currentPlayer) {
    return;
  }

  const now = Date.now();
  const shouldResetBuffer =
    state.typedBetInputPlayerId !== currentPlayer.id || now - (state.typedBetInputAt ?? 0) > 1500;
  const nextBuffer = `${shouldResetBuffer ? "" : state.typedBetInput}${digit}`;
  const parsedTarget = Number.parseInt(nextBuffer, 10);

  if (!Number.isFinite(parsedTarget)) {
    return;
  }

  const allowedAmounts = JSON.parse(elements.betAmount.dataset.allowedAmounts ?? "[]");
  if (!allowedAmounts.length) {
    return;
  }

  const callAmount = parsePositiveInt(elements.betAmount.dataset.callAmount, 0);
  const nextIndex = findClosestBetIndex(allowedAmounts, parsedTarget);
  state.betControlAmount = allowedAmounts[nextIndex] ?? allowedAmounts[0];
  state.selectedAction = state.betControlAmount > callAmount ? "raise" : "call";
  state.typedBetInput = nextBuffer;
  state.typedBetInputAt = now;
  state.typedBetInputPlayerId = currentPlayer.id;
  renderBetControls();
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
    removePlayer(player.id);
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
    const isOpen = Boolean(state.expandedPlayerStats[player.id]);
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
      ${isOpen ? renderSetupPlayerDetails(player) : ""}
    `;

    const expandButton = pill.querySelector(".setup-player-expand");
    const stackInput = pill.querySelector(".setup-player-stack-input");
    pill.querySelector(".setup-player-up").addEventListener("click", () => movePlayerByOffset(player.id, -1));
    pill.querySelector(".setup-player-down").addEventListener("click", () => movePlayerByOffset(player.id, 1));
    if (stackInput) {
      stackInput.addEventListener("change", () => updatePlayerStartingStack(player.id, stackInput.value));
    }
    expandButton.addEventListener("click", () => toggleExpandedPlayerStats(player.id));
    const addChipsButton = pill.querySelector(".setup-player-add-chips");
    if (addChipsButton) {
      const amountInput = pill.querySelector(".setup-player-rebuy-amount");
      addChipsButton.addEventListener("click", () =>
        addPlayerChips(player.id, parsePositiveInt(amountInput?.value, state.settings.startingStack)),
      );
    }
    pill.querySelector(".setup-player-delete").addEventListener("click", () => {
      removePlayer(player.id);
      saveAndRender();
    });

    pill.querySelector(".setup-player-up").disabled = state.gameStarted || state.players[0]?.id === player.id;
    pill.querySelector(".setup-player-down").disabled =
      state.gameStarted || state.players[state.players.length - 1]?.id === player.id;

    elements.setupPlayersList.appendChild(pill);
  });
}

function updatePlayerStartingStack(playerId, value) {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player || state.gameStarted) {
    return;
  }

  player.stack = parsePositiveInt(value, 0);
  player.status = player.stack > 0 ? PLAYER_STATUSES.ACTIVE : PLAYER_STATUSES.OUT;
  player.canRaise = player.stack > 0;
  saveAndRender();
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
  return `
    <div class="setup-player-stats setup-player-stats-compact">
      <div class="setup-player-stat">
        <p class="setup-player-stat-label">Stack</p>
        <p class="setup-player-stat-value">${formatChips(player.stack)}</p>
      </div>
      <div class="setup-player-stat">
        <p class="setup-player-stat-label">Status</p>
        <p class="setup-player-stat-value">${player.status}</p>
      </div>
    </div>
    <div class="setup-player-rebuy setup-player-rebuy-compact">
      <div class="setup-player-rebuy-controls">
        <input
          class="setup-player-rebuy-amount"
          type="number"
          inputmode="numeric"
          min="1"
          step="1"
          placeholder="${state.settings.startingStack}"
          value="${state.settings.startingStack}"
        />
        <button class="setup-player-control setup-player-add-chips" type="button">Add Chips</button>
      </div>
    </div>
  `;
}

function renderSetupPlayerDetails(player) {
  if (!state.gameStarted) {
    return `
      <div class="setup-player-stack-editor">
        <label class="setup-player-stack-label" for="setup-player-stack-${player.id}">Starting stack</label>
        <input
          id="setup-player-stack-${player.id}"
          class="setup-player-stack-input"
          type="number"
          min="0"
          step="1"
          value="${player.stack}"
        />
      </div>
    `;
  }

  return renderSetupPlayerStats(player);
}

function toggleExpandedPlayerStats(playerId) {
  state.expandedPlayerStats[playerId] = !state.expandedPlayerStats[playerId];
  saveAndRender();
}

function addPlayerChips(playerId, amount) {
  const player = state.players.find((entry) => entry.id === playerId);
  const chipsToAdd = parsePositiveInt(amount, 0);
  if (!player || chipsToAdd <= 0) {
    return;
  }

  player.stack += chipsToAdd;

  if (!state.handActive) {
    player.status = player.stack > 0 ? PLAYER_STATUSES.ACTIVE : PLAYER_STATUSES.OUT;
    player.canRaise = player.status === PLAYER_STATUSES.ACTIVE;
  }

  logEvent(`${player.name} added ${chipsToAdd} chips.`);
  saveAndRender();
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

function createPlayer(name, stack = initialState.settings.startingStack) {
  return {
    id: generateId(),
    name,
    stack,
    committed: 0,
    streetBet: 0,
    status: stack > 0 ? PLAYER_STATUSES.ACTIVE : PLAYER_STATUSES.OUT,
    cards: [null, null],
    acted: false,
    canRaise: stack > 0,
    stats: createPlayerStats(),
  };
}

function removePlayer(playerId) {
  state.players = state.players.filter((player) => player.id !== playerId);
  if (state.dealerIndex >= state.players.length) {
    state.dealerIndex = 0;
  }
  delete state.expandedPlayerStats[playerId];
  delete state.pendingRebuys[playerId];
}

function getWinnerMessage(name) {
  return `${name} won the pot.`;
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
    const baseState = structuredClone(initialState);
    const parsed = JSON.parse(saved);
    const loaded = {
      ...baseState,
      ...parsed,
      settings: {
        ...baseState.settings,
        ...(parsed.settings || {}),
      },
    };
    loaded.players = (loaded.players || []).map((player) => ({
      ...createPlayer(player.name || "Player", parsePositiveInt(player.stack, loaded.settings.startingStack)),
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
