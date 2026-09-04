import type { BridgeDealRecord, BridgeSide, BridgeStrain } from "./types"

export type Strain = BridgeStrain
export type Side = BridgeSide

export function otherSide(side: Side): Side {
  return side === "NS" ? "EW" : "NS"
}

export type Contract = {
  level: number
  strain: Strain
  doubles: 0 | 1 | 2
}

export type Deal = {
  declarer: Side
  contract: Contract
  tricks: number
  isLast?: boolean
}

export type Bonus = {
  title: string
  desc: string
  points: number
  dealIndex: number
  line: "above" | "below"
}

export type GameColumn = {
  above: Bonus[]
  below: Bonus[]
}

export type RubberGame = {
  completed: boolean
  winner: Side | null
  sides: Record<Side, GameColumn>
}

export type RubberPlay = {
  completed: boolean
  games: RubberGame[]
}

const BOOK = 6

const CONTRACT_POINTS: Record<Strain, [number, number]> = {
  clubs: [20, 20],
  diamonds: [20, 20],
  hearts: [30, 30],
  spades: [30, 30],
  notrump: [40, 30],
}

const OVERTRICK_POINTS: Record<Strain, [number, number, number]> = {
  clubs: [20, 100, 200],
  diamonds: [20, 100, 200],
  hearts: [30, 100, 200],
  spades: [30, 100, 200],
  notrump: [30, 100, 200],
}

const SLAM_BONUS: [[number, number], [number, number]] = [
  [500, 750],
  [1000, 1500],
]

const INSULT_POINTS: [number, number] = [50, 100]

type UndertrickTable = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
]

const UNDERTRICK_POINTS: [UndertrickTable, UndertrickTable] = [
  [
    [50, 100, 200],
    [50, 200, 400],
    [50, 300, 600],
  ],
  [
    [100, 200, 400],
    [100, 300, 600],
    [100, 300, 600],
  ],
]

const RUBBER_POINTS: [number, number] = [500, 700]
const UNFINISHED_POINTS: [number, number] = [300, 100]

function emptyColumn(): GameColumn {
  return { above: [], below: [] }
}

function emptyGame(): RubberGame {
  return {
    completed: false,
    winner: null,
    sides: { NS: emptyColumn(), EW: emptyColumn() },
  }
}

function rawTricks(contract: Contract) {
  return contract.level + BOOK
}

function contractPointsValue(contract: Contract): number {
  let total = 0
  for (let i = 0; i < contract.level; i++) {
    total += CONTRACT_POINTS[contract.strain][i === 0 ? 0 : 1]
  }
  return total * 2 ** contract.doubles
}

function isVulnerable(play: RubberPlay, side: Side): boolean {
  return play.games.some((game) => game.completed && game.winner === side)
}

function winCount(play: RubberPlay, side: Side): number {
  return play.games.filter((game) => game.winner === side).length
}

function sideContractPoints(play: RubberPlay, side: Side): number {
  return play.games.reduce(
    (sum, game) =>
      sum + game.sides[side].below.reduce((acc, b) => acc + b.points, 0),
    0
  )
}

function gameWinner(game: RubberGame): Side | null {
  for (const side of ["NS", "EW"] as const) {
    const pts = game.sides[side].below.reduce((acc, b) => acc + b.points, 0)
    if (pts >= 100) return side
  }
  return null
}

function ongoing(play: RubberPlay): RubberGame {
  if (play.completed) throw new Error("Rubber is complete")
  const last = play.games[play.games.length - 1]
  if (!last || last.completed) {
    const game = emptyGame()
    play.games.push(game)
    return game
  }
  return last
}

function scoreDeal(play: RubberPlay, deal: Deal, dealIndex: number) {
  const game = ongoing(play)
  const we = deal.declarer
  const they = otherSide(we)
  const needed = rawTricks(deal.contract)
  const made = deal.tricks >= needed
  const vulnerable = isVulnerable(play, we)

  if (made) {
    const pts = contractPointsValue(deal.contract)
    game.sides[we].below.push({
      title: "Contract Points",
      desc: "Points for bidding and making the contract",
      points: pts,
      dealIndex,
      line: "below",
    })

    const overtricks = deal.tricks - needed
    if (overtricks > 0) {
      const base = OVERTRICK_POINTS[deal.contract.strain][deal.contract.doubles]
      const multiplier =
        deal.contract.doubles > 0 && vulnerable ? 2 : 1
      game.sides[we].above.push({
        title: "Overtrick Bonus",
        desc: "Points awarded for overtricks",
        points: multiplier * base * overtricks,
        dealIndex,
        line: "above",
      })
    }

    if (deal.contract.level === 6) {
      game.sides[we].above.push({
        title: "Small Slam",
        desc: "Points awarded for winning a small slam",
        points: SLAM_BONUS[0][vulnerable ? 1 : 0],
        dealIndex,
        line: "above",
      })
    }
    if (deal.contract.level === 7) {
      game.sides[we].above.push({
        title: "Grand Slam",
        desc: "Points awarded for winning a grand slam",
        points: SLAM_BONUS[1][vulnerable ? 1 : 0],
        dealIndex,
        line: "above",
      })
    }

    if (deal.contract.doubles > 0) {
      game.sides[we].above.push({
        title: "Insult Bonus",
        desc: `Points for making a ${deal.contract.doubles === 1 ? "doubled" : "redoubled"} contract`,
        points: INSULT_POINTS[deal.contract.doubles - 1],
        dealIndex,
        line: "above",
      })
    }
  } else {
    const undertricks = needed - deal.tricks
    const table = UNDERTRICK_POINTS[vulnerable ? 1 : 0]
    let penalty = 0
    for (let i = 0; i < undertricks; i++) {
      const row = i === 0 ? 0 : i >= 3 ? 2 : 1
      penalty += table[row][deal.contract.doubles]
    }
    game.sides[they].above.push({
      title: "Penalty Bonus",
      desc: "Points awarded for undertricks",
      points: penalty,
      dealIndex,
      line: "above",
    })
  }

  const winner = gameWinner(game)
  if (winner) {
    game.completed = true
    game.winner = winner
  }

  const nsWins = winCount(play, "NS")
  const ewWins = winCount(play, "EW")

  if (nsWins >= 2 || ewWins >= 2) {
    const rubberWinner: Side = nsWins >= 2 ? "NS" : "EW"
    const otherWins = rubberWinner === "NS" ? ewWins : nsWins
    game.sides[rubberWinner].above.push({
      title: "Rubber Bonus",
      desc: `Points for winning a ${otherWins > 0 ? "slow" : "fast"} rubber`,
      points: RUBBER_POINTS[otherWins > 0 ? 0 : 1],
      dealIndex,
      line: "above",
    })
    play.completed = true
  } else if (deal.isLast) {
    let uniqueWinner: Side | undefined
    if (nsWins === 1 && ewWins === 0) uniqueWinner = "NS"
    if (ewWins === 1 && nsWins === 0) uniqueWinner = "EW"

    if (uniqueWinner) {
      game.sides[uniqueWinner].above.push({
        title: "Unfinished Rubber",
        desc: "Points for winning the only game in an unfinished rubber",
        points: UNFINISHED_POINTS[0],
        dealIndex,
        line: "above",
      })
    } else {
      const nsPts = sideContractPoints(play, "NS")
      const ewPts = sideContractPoints(play, "EW")
      let uniquePart: Side | undefined
      if (nsPts > 0 && ewPts === 0) uniquePart = "NS"
      if (ewPts > 0 && nsPts === 0) uniquePart = "EW"
      if (uniquePart) {
        game.sides[uniquePart].above.push({
          title: "Unfinished Rubber",
          desc: "Points for the only part score in an unfinished rubber",
          points: UNFINISHED_POINTS[1],
          dealIndex,
          line: "above",
        })
      }
    }
    play.completed = true
  }
}

export function scoreRubber(deals: Deal[]): RubberPlay {
  const play: RubberPlay = { completed: false, games: [] }
  deals.forEach((deal, index) => scoreDeal(play, deal, index))
  return play
}

export function sidePoints(play: RubberPlay, side: Side): number {
  return play.games.reduce((sum, game) => {
    const col = game.sides[side]
    return (
      sum +
      col.above.reduce((a, b) => a + b.points, 0) +
      col.below.reduce((a, b) => a + b.points, 0)
    )
  }, 0)
}

export function dealNetPoints(play: RubberPlay, dealIndex: number, declarer: Side): number {
  const they = otherSide(declarer)
  let wePts = 0
  let theyPts = 0
  for (const game of play.games) {
    for (const bonus of [...game.sides[declarer].above, ...game.sides[declarer].below]) {
      if (bonus.dealIndex === dealIndex) wePts += bonus.points
    }
    for (const bonus of [...game.sides[they].above, ...game.sides[they].below]) {
      if (bonus.dealIndex === dealIndex) theyPts += bonus.points
    }
  }
  return wePts - theyPts
}

export function isSideVulnerable(play: RubberPlay, side: Side): boolean {
  return isVulnerable(play, side)
}

export function rubberWinners(play: RubberPlay): Side[] {
  if (!play.completed) return []
  const ns = sidePoints(play, "NS")
  const ew = sidePoints(play, "EW")
  if (ns > ew) return ["NS"]
  if (ew > ns) return ["EW"]
  return ["NS", "EW"]
}

export function playFromHistory(history: BridgeDealRecord[]): RubberPlay {
  return scoreRubber(
    history.map((deal) => ({
      declarer: deal.side,
      contract: {
        level: deal.level,
        strain: deal.strain,
        doubles: deal.doubles,
      },
      tricks: deal.tricks,
      isLast: deal.isLast,
    }))
  )
}

export function declarerTricksFromSides(
  tricks: number[],
  declarer: number
): number {
  const partner = (declarer + 2) % 4
  return tricks[declarer] + tricks[partner]
}
