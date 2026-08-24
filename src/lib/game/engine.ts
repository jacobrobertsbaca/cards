import { createDeck, sameCard, shuffle, sortHand, rankValue } from "./cards";
import { evaluateFormula } from "./formula";
import { randomBotName } from "../names";
import { validatePattern } from "./pattern";
import { defaultGameTitle } from "./title";
import type { Card, GameSettings, GameState, TrickPlay } from "./types";

export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameError";
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nextSeat(index: number, count: number) {
  return (index + 1) % count;
}

export function createGame(settings: GameSettings): GameState {
  const error = validatePattern(settings.pattern, settings.seatCount);
  if (error) throw new GameError(error);
  if (settings.seatCount < 2 || settings.seatCount > 5) {
    throw new GameError("Games need 2–5 players");
  }

  return {
    title: defaultGameTitle(settings.kind),
    settings,
    seats: Array.from({ length: settings.seatCount }, (_, index) => ({
      index,
      playerId: null,
      displayName: null,
      isBot: false,
    })),
    dealer: 0,
    roundIndex: 0,
    trump: null,
    trumpBroken: false,
    phase: "lobby",
    currentSeat: null,
    hands: Array.from({ length: settings.seatCount }, () => []),
    bids: Array.from({ length: settings.seatCount }, () => null),
    tricks: Array.from({ length: settings.seatCount }, () => 0),
    currentTrick: [],
    lastTrick: [],
    trickLeader: 0,
    scores: Array.from({ length: settings.seatCount }, () => 0),
    history: [],
  };
}

export function joinGame(
  state: GameState,
  playerId: string,
  displayName: string
): GameState {
  const next = clone(state);
  const existing = next.seats.find((seat) => seat.playerId === playerId);
  if (existing) {
    existing.displayName = displayName;
    return next;
  }

  const open = next.seats.find((seat) => seat.playerId === null);
  if (!open) {
    throw new GameError("This table is full");
  }

  open.playerId = playerId;
  open.displayName = displayName;
  open.isBot = false;

  return next;
}

export function makeBot(state: GameState, seatIndex: number): GameState {
  if (state.phase !== "lobby")
    throw new GameError("The game has already started");
  const next = clone(state);
  const seat = next.seats[seatIndex];
  if (!seat) throw new GameError("Invalid seat");
  if (seat.playerId) throw new GameError("That seat is taken");

  seat.playerId = `bot:${seatIndex}`;
  seat.displayName = randomBotName();
  seat.isBot = true;
  return next;
}

export function removeBot(state: GameState, seatIndex: number): GameState {
  if (state.phase !== "lobby")
    throw new GameError("The game has already started");
  const next = clone(state);
  const seat = next.seats[seatIndex];
  if (!seat?.isBot) throw new GameError("That seat is not a bot");

  seat.playerId = null;
  seat.displayName = null;
  seat.isBot = false;
  return next;
}

export function swapSeats(
  state: GameState,
  playerId: string,
  targetSeatIndex: number
): GameState {
  if (state.phase !== "lobby")
    throw new GameError("The game has already started");
  const next = clone(state);
  const from = next.seats.find((seat) => seat.playerId === playerId);
  const to = next.seats[targetSeatIndex];
  if (!from) throw new GameError("You are not seated");
  if (!to) throw new GameError("Invalid seat");
  if (from.index === targetSeatIndex) throw new GameError("That is your seat");

  if (!to.playerId) {
    to.playerId = from.playerId;
    to.displayName = from.displayName;
    to.isBot = from.isBot;
    from.playerId = null;
    from.displayName = null;
    from.isBot = false;
  } else {
    const saved = {
      playerId: from.playerId,
      displayName: from.displayName,
      isBot: from.isBot,
    };
    from.playerId = to.playerId;
    from.displayName = to.displayName;
    from.isBot = to.isBot;
    to.playerId = saved.playerId;
    to.displayName = saved.displayName;
    to.isBot = saved.isBot;
  }

  for (const seat of next.seats) {
    if (seat.isBot) seat.playerId = `bot:${seat.index}`;
  }
  return next;
}

export function startGame(state: GameState): GameState {
  if (state.phase !== "lobby")
    throw new GameError("The game has already started");
  if (!state.seats.every((seat) => seat.playerId)) {
    throw new GameError("Waiting for more players");
  }
  return startRound(state);
}

export function renameSeat(
  state: GameState,
  playerId: string,
  displayName: string
): GameState {
  const next = clone(state);
  const seat = next.seats.find((item) => item.playerId === playerId);
  if (seat) seat.displayName = displayName;
  return next;
}

export function renameGame(state: GameState, title: string): GameState {
  const trimmed = title.trim().slice(0, 48);
  if (!trimmed || trimmed === state.title) return state;
  const next = clone(state);
  next.title = trimmed;
  return next;
}

export function cardsThisRound(state: GameState) {
  return state.settings.pattern[state.roundIndex] ?? 0;
}

export function forbiddenDealerBid(state: GameState) {
  if (!state.settings.hook) return null;
  if (state.phase !== "bidding") return null;
  const placed = state.bids.filter((bid): bid is number => bid !== null);
  if (placed.length !== state.settings.seatCount - 1) return null;
  const remaining =
    cardsThisRound(state) - placed.reduce((sum, bid) => sum + bid, 0);
  if (remaining < 0 || remaining > cardsThisRound(state)) return null;
  return remaining;
}

export function legalBids(state: GameState, seat: number) {
  const max = cardsThisRound(state);
  const bids = Array.from({ length: max + 1 }, (_, bid) => bid);
  if (seat !== state.dealer) return bids;
  const forbidden = forbiddenDealerBid(state);
  return forbidden === null ? bids : bids.filter((bid) => bid !== forbidden);
}

export function placeBid(
  state: GameState,
  seat: number,
  bid: number
): GameState {
  if (state.phase !== "bidding") throw new GameError("Bidding is closed");
  if (state.currentSeat !== seat) throw new GameError("It is not your bid");
  if (!legalBids(state, seat).includes(bid)) {
    throw new GameError("That bid is not allowed");
  }

  const next = clone(state);
  next.bids[seat] = bid;
  const remaining = next.bids.findIndex((value) => value === null);
  if (remaining === -1) {
    next.phase = "playing";
    next.currentSeat = next.trickLeader;
  } else {
    next.currentSeat = nextSeat(seat, next.settings.seatCount);
  }
  return next;
}

export function wouldBeLegalPlay(state: GameState, seat: number, card: Card) {
  if (state.phase !== "playing") return false;
  const hand = state.hands[seat];
  if (!hand.some((item) => sameCard(item, card))) return false;

  const led = state.currentTrick[0]?.card;
  if (!led) {
    if (
      state.settings.leadTrump === "after-broken" &&
      !state.trumpBroken &&
      state.trump &&
      card.suit === state.trump.suit &&
      hand.some((item) => item.suit !== state.trump!.suit)
    ) {
      return false;
    }
    return true;
  }

  const canFollow = hand.some((item) => item.suit === led.suit);
  return !canFollow || card.suit === led.suit;
}

export function isLegalPlay(state: GameState, seat: number, card: Card) {
  if (state.currentSeat !== seat) return false;
  return wouldBeLegalPlay(state, seat, card);
}

export function playCard(
  state: GameState,
  seat: number,
  card: Card
): GameState {
  if (!isLegalPlay(state, seat, card)) {
    throw new GameError("That card cannot be played");
  }

  const next = clone(state);
  next.hands[seat] = next.hands[seat].filter((item) => !sameCard(item, card));
  next.currentTrick.push({ seat, card });
  if (next.currentTrick.length === 1) {
    next.lastTrick = [];
  }

  if (next.trump && card.suit === next.trump.suit) {
    next.trumpBroken = true;
  }

  if (next.currentTrick.length < next.settings.seatCount) {
    next.currentSeat = nextSeat(seat, next.settings.seatCount);
    return next;
  }

  const winner = trickWinner(next.currentTrick, next.trump);
  next.tricks[winner] += 1;
  next.lastTrick = [...next.currentTrick];
  next.currentTrick = [];
  next.trickLeader = winner;
  next.currentSeat = winner;
  if (next.hands.every((hand) => hand.length === 0)) {
    return scoreRound(next);
  }
  next.phase = "trick-end";
  return next;
}

export function continueTrick(state: GameState): GameState {
  if (state.phase !== "trick-end") return state;
  const next = clone(state);
  if (next.hands.every((hand) => hand.length === 0)) {
    return scoreRound(next);
  }
  next.phase = "playing";
  next.currentSeat = next.trickLeader;
  return next;
}

export function trickWinner(trick: TrickPlay[], trump: Card | null) {
  const ledSuit = trick[0].card.suit;
  const trumpSuit = trump?.suit;
  const ranked = [...trick].sort((a, b) => {
    const aTrump = trumpSuit !== undefined && a.card.suit === trumpSuit;
    const bTrump = trumpSuit !== undefined && b.card.suit === trumpSuit;
    if (aTrump !== bTrump) return aTrump ? -1 : 1;
    const aFollows = a.card.suit === ledSuit;
    const bFollows = b.card.suit === ledSuit;
    if (!aTrump && !bTrump && aFollows !== bFollows) return aFollows ? -1 : 1;
    return rankValue(b.card.rank) - rankValue(a.card.rank);
  });
  return ranked[0].seat;
}

function scoreRound(state: GameState): GameState {
  const next = clone(state);
  const gained = next.bids.map((bid, index) =>
    evaluateFormula(next.settings.scoring, bid ?? 0, next.tricks[index])
  );
  next.scores = next.scores.map((score, index) => score + gained[index]);
  next.history.push({
    cards: cardsThisRound(next),
    trump: next.trump,
    bids: next.bids.map((bid) => bid ?? 0),
    tricks: [...next.tricks],
    scores: [...gained],
  });
  next.phase =
    next.roundIndex >= next.settings.pattern.length - 1
      ? "game-over"
      : "round-end";
  next.currentSeat = null;
  return next;
}

export function startRound(state: GameState): GameState {
  const next = clone(state);
  if (next.phase === "round-end") {
    next.roundIndex += 1;
    next.dealer = nextSeat(next.dealer, next.settings.seatCount);
  }

  const count = next.settings.pattern[next.roundIndex];
  if (!count) throw new GameError("No more rounds");

  const deck = shuffle(createDeck());
  next.hands = next.seats.map(() => []);
  for (let deal = 0; deal < count; deal++) {
    for (let seat = 0; seat < next.settings.seatCount; seat++) {
      const card = deck.pop();
      if (!card) throw new GameError("The deck ran out of cards");
      next.hands[seat].push(card);
    }
  }
  next.hands = next.hands.map(sortHand);
  next.trump = deck.pop() ?? null;
  next.trumpBroken = false;
  next.bids = next.seats.map(() => null);
  next.tricks = next.seats.map(() => 0);
  next.currentTrick = [];
  next.lastTrick = [];
  next.trickLeader = nextSeat(next.dealer, next.settings.seatCount);
  next.currentSeat = next.trickLeader;
  next.phase = "bidding";
  return next;
}

export function seatForPlayer(state: GameState, playerId: string) {
  return state.seats.find((seat) => seat.playerId === playerId) ?? null;
}

export function filledSeats(state: GameState) {
  return state.seats.filter((seat) => seat.playerId).length;
}

export function ranking(state: GameState) {
  return state.seats
    .map((seat, index) => ({
      seat: seat.index,
      name: seat.displayName ?? `Player ${seat.index + 1}`,
      score: state.scores[index],
    }))
    .sort((a, b) => b.score - a.score);
}
