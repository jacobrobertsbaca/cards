import { createDeck, sameCard, shuffle, sortHand, rankValue } from "@/lib/game/cards"
import { randomBotName } from "@/lib/names"
import { defaultGameTitle } from "@/lib/game/title"
import type { Card, TrickPlay } from "@/lib/game/types"
import {
  BRIDGE_SEAT_COUNT,
  DEFAULT_BRIDGE_SETTINGS,
  compareBids,
  partnerSeat,
  sideForSeat,
  type BridgeCall,
  type BridgeContract,
  type BridgeSettings,
  type BridgeState,
  type BridgeStrain,
} from "./types"
import {
  dealNetPoints,
  declarerTricksFromSides,
  playFromHistory,
} from "./scoring"

export class BridgeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BridgeError"
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function nextSeat(index: number) {
  return (index + 1) % BRIDGE_SEAT_COUNT
}

export function createBridgeGame(
  settings: BridgeSettings = DEFAULT_BRIDGE_SETTINGS
): BridgeState {
  if (settings.kind !== "bridge" || settings.seatCount !== 4) {
    throw new BridgeError("Bridge requires exactly 4 players")
  }

  return {
    title: defaultGameTitle("bridge"),
    settings: { ...settings },
    seats: Array.from({ length: BRIDGE_SEAT_COUNT }, (_, index) => ({
      index,
      playerId: null,
      displayName: null,
      isBot: false,
    })),
    dealer: 0,
    dealIndex: 0,
    phase: "lobby",
    currentSeat: null,
    hands: Array.from({ length: BRIDGE_SEAT_COUNT }, () => []),
    auction: [],
    contract: null,
    trumpSuit: null,
    openingLeadDone: false,
    tricks: [0, 0, 0, 0],
    currentTrick: [],
    lastTrick: [],
    trickLeader: 0,
    history: [],
    rematchCode: null,
  }
}

export function joinBridgeGame(
  state: BridgeState,
  playerId: string,
  displayName: string
): BridgeState {
  const next = clone(state)
  const existing = next.seats.find((seat) => seat.playerId === playerId)
  if (existing) {
    existing.displayName = displayName
    return next
  }
  const open = next.seats.find((seat) => seat.playerId === null)
  if (!open) throw new BridgeError("This table is full")
  open.playerId = playerId
  open.displayName = displayName
  open.isBot = false
  return next
}

export function makeBridgeBot(state: BridgeState, seatIndex: number): BridgeState {
  if (state.phase !== "lobby") throw new BridgeError("The game has already started")
  const next = clone(state)
  const seat = next.seats[seatIndex]
  if (!seat) throw new BridgeError("Invalid seat")
  if (seat.playerId) throw new BridgeError("That seat is taken")
  seat.playerId = `bot:${seatIndex}`
  seat.displayName = randomBotName()
  seat.isBot = true
  return next
}

export function removeBridgeBot(state: BridgeState, seatIndex: number): BridgeState {
  if (state.phase !== "lobby") throw new BridgeError("The game has already started")
  const next = clone(state)
  const seat = next.seats[seatIndex]
  if (!seat?.isBot) throw new BridgeError("That seat is not a bot")
  seat.playerId = null
  seat.displayName = null
  seat.isBot = false
  return next
}

export function leaveBridgeGame(state: BridgeState, playerId: string): BridgeState {
  if (state.phase !== "lobby") throw new BridgeError("The game has already started")
  const next = clone(state)
  const seat = next.seats.find((item) => item.playerId === playerId)
  if (!seat || seat.isBot) throw new BridgeError("You are not seated")
  seat.playerId = null
  seat.displayName = null
  seat.isBot = false
  return next
}

export function swapBridgeSeats(
  state: BridgeState,
  playerId: string,
  targetSeatIndex: number
): BridgeState {
  if (state.phase !== "lobby") throw new BridgeError("The game has already started")
  const next = clone(state)
  const from = next.seats.find((seat) => seat.playerId === playerId)
  const to = next.seats[targetSeatIndex]
  if (!from) throw new BridgeError("You are not seated")
  if (!to) throw new BridgeError("Invalid seat")
  if (from.index === targetSeatIndex) throw new BridgeError("That is your seat")

  if (!to.playerId) {
    to.playerId = from.playerId
    to.displayName = from.displayName
    to.isBot = from.isBot
    from.playerId = null
    from.displayName = null
    from.isBot = false
  } else {
    const saved = {
      playerId: from.playerId,
      displayName: from.displayName,
      isBot: from.isBot,
    }
    from.playerId = to.playerId
    from.displayName = to.displayName
    from.isBot = to.isBot
    to.playerId = saved.playerId
    to.displayName = saved.displayName
    to.isBot = saved.isBot
  }

  for (const seat of next.seats) {
    if (seat.isBot) seat.playerId = `bot:${seat.index}`
  }
  return next
}

export function renameBridgeSeat(
  state: BridgeState,
  playerId: string,
  displayName: string
): BridgeState {
  const next = clone(state)
  const seat = next.seats.find((item) => item.playerId === playerId)
  if (seat) seat.displayName = displayName
  return next
}

export function renameBridgeGame(state: BridgeState, title: string): BridgeState {
  const trimmed = title.trim().slice(0, 48)
  if (!trimmed || trimmed === state.title) return state
  const next = clone(state)
  next.title = trimmed
  return next
}

export function updateBridgeSettings(
  state: BridgeState,
  settings: BridgeSettings
): BridgeState {
  if (state.phase !== "lobby") throw new BridgeError("The game has already started")
  if (settings.seatCount !== 4) throw new BridgeError("Bridge requires 4 players")
  const next = clone(state)
  next.settings = { ...settings }
  return next
}

export function startBridgeGame(state: BridgeState): BridgeState {
  if (state.phase !== "lobby") throw new BridgeError("The game has already started")
  if (!state.seats.every((seat) => seat.playerId)) {
    throw new BridgeError("Waiting for more players")
  }
  return startBridgeDeal(state)
}

function lastBid(auction: BridgeCall[]): Extract<BridgeCall, { type: "bid" }> | null {
  for (let i = auction.length - 1; i >= 0; i--) {
    const call = auction[i]
    if (call.type === "bid") return call
  }
  return null
}

function lastBidIndex(auction: BridgeCall[]): number {
  for (let i = auction.length - 1; i >= 0; i--) {
    if (auction[i].type === "bid") return i
  }
  return -1
}

function doublesLevel(auction: BridgeCall[]): 0 | 1 | 2 {
  let doubles: 0 | 1 | 2 = 0
  for (let i = lastBidIndex(auction); i < auction.length; i++) {
    if (i < 0) break
    const call = auction[i]
    if (call.type === "double") doubles = 1
    if (call.type === "redouble") doubles = 2
  }
  return doubles
}

/** Seat that made the most recent bid (not pass/double). */
function lastBidderSeat(state: BridgeState): number | null {
  const idx = lastBidIndex(state.auction)
  if (idx < 0) return null
  const first = nextSeat(state.dealer)
  return (first + idx) % BRIDGE_SEAT_COUNT
}

export function legalBridgeCalls(state: BridgeState, seat: number): BridgeCall[] {
  if (state.phase !== "bidding" || state.currentSeat !== seat) return []
  const calls: BridgeCall[] = [{ type: "pass" }]
  const bid = lastBid(state.auction)
  const doubles = doublesLevel(state.auction)
  const bidder = lastBidderSeat(state)

  if (bid) {
    for (let level = 1; level <= 7; level++) {
      for (const strain of [
        "clubs",
        "diamonds",
        "hearts",
        "spades",
        "notrump",
      ] as BridgeStrain[]) {
        if (compareBids({ level, strain }, bid) > 0) {
          calls.push({ type: "bid", level, strain })
        }
      }
    }
  } else {
    for (let level = 1; level <= 7; level++) {
      for (const strain of [
        "clubs",
        "diamonds",
        "hearts",
        "spades",
        "notrump",
      ] as BridgeStrain[]) {
        calls.push({ type: "bid", level, strain })
      }
    }
  }

  if (bid && doubles === 0 && bidder !== null) {
    const sameSide = sideForSeat(seat) === sideForSeat(bidder)
    if (!sameSide) calls.push({ type: "double" })
  }
  if (bid && doubles === 1 && bidder !== null) {
    const sameSide = sideForSeat(seat) === sideForSeat(bidder)
    if (sameSide) calls.push({ type: "redouble" })
  }

  return calls
}

function isCallLegal(state: BridgeState, seat: number, call: BridgeCall): boolean {
  return legalBridgeCalls(state, seat).some((legal) => {
    if (legal.type !== call.type) return false
    if (call.type === "bid" && legal.type === "bid") {
      return legal.level === call.level && legal.strain === call.strain
    }
    return true
  })
}

function resolveContract(state: BridgeState): BridgeContract | null {
  const bid = lastBid(state.auction)
  if (!bid) return null
  const bidIdx = lastBidIndex(state.auction)
  const first = nextSeat(state.dealer)
  const bidderSeat = (first + bidIdx) % BRIDGE_SEAT_COUNT

  // Declarer is the first player on the winning side who bid the strain
  const winningSide = sideForSeat(bidderSeat)
  let declarer = bidderSeat
  for (let i = 0; i <= bidIdx; i++) {
    const call = state.auction[i]
    if (call.type !== "bid" || call.strain !== bid.strain) continue
    const seat = (first + i) % BRIDGE_SEAT_COUNT
    if (sideForSeat(seat) === winningSide) {
      declarer = seat
      break
    }
  }

  return {
    level: bid.level,
    strain: bid.strain,
    doubles: doublesLevel(state.auction),
    declarer,
    dummy: partnerSeat(declarer),
  }
}

function auctionComplete(auction: BridgeCall[]): "passout" | "contract" | null {
  if (auction.length < 4) return null
  const lastThree = auction.slice(-3)
  if (!lastThree.every((c) => c.type === "pass")) return null
  if (auction.length === 4 && auction.every((c) => c.type === "pass")) return "passout"
  if (lastBid(auction)) return "contract"
  return "passout"
}

export function placeBridgeCall(
  state: BridgeState,
  seat: number,
  call: BridgeCall
): BridgeState {
  if (state.phase !== "bidding") throw new BridgeError("Bidding is closed")
  if (state.currentSeat !== seat) throw new BridgeError("It is not your bid")
  if (!isCallLegal(state, seat, call)) throw new BridgeError("That call is not allowed")

  const next = clone(state)
  next.auction.push(call)
  const done = auctionComplete(next.auction)
  if (!done) {
    next.currentSeat = nextSeat(seat)
    return next
  }

  if (done === "passout") {
    // Redeal: rotate dealer, no score
    next.dealer = nextSeat(next.dealer)
    return startBridgeDeal(next)
  }

  const contract = resolveContract(next)
  if (!contract) throw new BridgeError("No contract")
  next.contract = contract
  next.trumpSuit = contract.strain === "notrump" ? null : contract.strain
  next.phase = "playing"
  next.trickLeader = nextSeat(contract.declarer)
  next.currentSeat = next.trickLeader
  next.openingLeadDone = false
  return next
}

export function wouldBeLegalBridgePlay(
  state: BridgeState,
  seat: number,
  card: Card
): boolean {
  if (state.phase !== "playing") return false

  // Declarer plays dummy's cards when it's dummy's turn
  const actingSeat = actingSeatFor(state, seat)
  if (actingSeat === null) return false

  const hand = state.hands[actingSeat]
  if (!hand.some((item) => sameCard(item, card))) return false

  const led = state.currentTrick[0]?.card
  if (!led) return true
  const canFollow = hand.some((item) => item.suit === led.suit)
  return !canFollow || card.suit === led.suit
}

/** Whose hand is being played when `controller` clicks. */
export function actingSeatFor(state: BridgeState, controller: number): number | null {
  if (state.currentSeat === null) return null
  // After the opening lead, only declarer may play from dummy — never the dummy seat itself.
  if (
    state.contract &&
    state.openingLeadDone &&
    state.currentSeat === state.contract.dummy
  ) {
    return controller === state.contract.declarer ? state.contract.dummy : null
  }
  if (state.currentSeat === controller) return controller
  return null
}

export function isLegalBridgePlay(state: BridgeState, seat: number, card: Card) {
  return wouldBeLegalBridgePlay(state, seat, card)
}

export function bridgeTrickWinner(trick: TrickPlay[], trumpSuit: BridgeState["trumpSuit"]) {
  const ledSuit = trick[0].card.suit
  const ranked = [...trick].sort((a, b) => {
    const aTrump = trumpSuit !== null && a.card.suit === trumpSuit
    const bTrump = trumpSuit !== null && b.card.suit === trumpSuit
    if (aTrump !== bTrump) return aTrump ? -1 : 1
    const aFollows = a.card.suit === ledSuit
    const bFollows = b.card.suit === ledSuit
    if (!aTrump && !bTrump && aFollows !== bFollows) return aFollows ? -1 : 1
    return rankValue(b.card.rank) - rankValue(a.card.rank)
  })
  return ranked[0].seat
}

export function playBridgeCard(
  state: BridgeState,
  controller: number,
  card: Card
): BridgeState {
  if (!isLegalBridgePlay(state, controller, card)) {
    throw new BridgeError("That card cannot be played")
  }
  const fromSeat = actingSeatFor(state, controller)
  if (fromSeat === null) throw new BridgeError("That card cannot be played")

  const next = clone(state)
  next.hands[fromSeat] = next.hands[fromSeat].filter((item) => !sameCard(item, card))
  next.currentTrick.push({ seat: fromSeat, card })
  if (next.currentTrick.length === 1) {
    next.lastTrick = []
    if (!next.openingLeadDone) next.openingLeadDone = true
  }

  if (next.currentTrick.length < BRIDGE_SEAT_COUNT) {
    next.currentSeat = nextSeat(fromSeat)
    return next
  }

  const winner = bridgeTrickWinner(next.currentTrick, next.trumpSuit)
  next.tricks[winner] += 1
  next.lastTrick = [...next.currentTrick]
  next.currentTrick = []
  next.trickLeader = winner
  next.currentSeat = winner

  if (next.hands.every((hand) => hand.length === 0)) {
    return scoreBridgeDeal(next)
  }
  next.phase = "trick-end"
  return next
}

export function continueBridgeTrick(state: BridgeState): BridgeState {
  if (state.phase !== "trick-end") return state
  const next = clone(state)
  if (next.hands.every((hand) => hand.length === 0)) {
    return scoreBridgeDeal(next)
  }
  next.phase = "playing"
  next.currentSeat = next.trickLeader
  return next
}

function scoreBridgeDeal(state: BridgeState): BridgeState {
  const next = clone(state)
  const contract = next.contract
  if (!contract) throw new BridgeError("No contract to score")

  const tricks = declarerTricksFromSides(next.tricks, contract.declarer)
  const side = sideForSeat(contract.declarer)
  const record = {
    declarer: contract.declarer,
    side,
    level: contract.level,
    strain: contract.strain,
    doubles: contract.doubles,
    tricks,
    net: 0,
  }
  next.history.push(record)
  const play = playFromHistory(next.history)
  record.net = dealNetPoints(play, next.history.length - 1, side)

  if (play.completed) {
    next.phase = "game-over"
  } else {
    next.phase = "round-end"
  }
  next.currentSeat = null
  return next
}

export function startBridgeDeal(state: BridgeState): BridgeState {
  const next = clone(state)
  if (next.phase === "round-end") {
    next.dealIndex += 1
    next.dealer = nextSeat(next.dealer)
  }

  const deck = shuffle(createDeck())
  next.hands = next.seats.map(() => [])
  for (let i = 0; i < 13; i++) {
    for (let seat = 0; seat < BRIDGE_SEAT_COUNT; seat++) {
      const card = deck.pop()
      if (!card) throw new BridgeError("The deck ran out of cards")
      next.hands[seat].push(card)
    }
  }
  next.hands = next.hands.map(sortHand)
  next.auction = []
  next.contract = null
  next.trumpSuit = null
  next.openingLeadDone = false
  next.tricks = [0, 0, 0, 0]
  next.currentTrick = []
  next.lastTrick = []
  next.trickLeader = nextSeat(next.dealer)
  next.currentSeat = next.trickLeader
  next.phase = "bidding"
  return next
}

export function seatForBridgePlayer(state: BridgeState, playerId: string) {
  return state.seats.find((seat) => seat.playerId === playerId) ?? null
}

export function createBridgeRematch(state: BridgeState): BridgeState {
  const next = createBridgeGame(state.settings)
  next.title = state.title
  next.seats = state.seats.map((seat) => ({
    index: seat.index,
    playerId: seat.playerId,
    displayName: seat.displayName,
    isBot: seat.isBot,
  }))
  return next
}

export function beginBridgeRematch(state: BridgeState, code: string): BridgeState {
  if (state.phase !== "game-over") throw new BridgeError("The game is not over")
  if (state.rematchCode) return state
  const next = clone(state)
  next.rematchCode = code
  return next
}

export function filledBridgeSeats(state: BridgeState) {
  return state.seats.filter((seat) => seat.playerId).length
}

export function bridgeContractLabel(contract: BridgeContract): string {
  const strain =
    contract.strain === "notrump"
      ? "NT"
      : { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" }[contract.strain]
  return `${contract.level}${strain}${"X".repeat(contract.doubles)}`
}
