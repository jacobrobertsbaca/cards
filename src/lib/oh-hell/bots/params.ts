export type BotParams = {
  ace: number
  king: number
  queen: number
  jack: number
  trumpAce: number
  trumpKing: number
  trumpQueen: number
  trumpJack: number
  trumpLow: number
  longSuitPerCard: number
  shortSuitPenalty: number
  voidBonus: number
  bidConservatism: number
  hookPush: number
  winWithLowRank: number
  loseWithHighRank: number
  trumpOnlyWhenNeed: number
  leadWinnerRank: number
  leadLoserRank: number
}

export const DEFAULT_BOT_PARAMS: BotParams = {
  ace: 0.92,
  king: 0.58,
  queen: 0.34,
  jack: 0.18,
  trumpAce: 0.98,
  trumpKing: 0.82,
  trumpQueen: 0.62,
  trumpJack: 0.45,
  trumpLow: 0.22,
  longSuitPerCard: 0.08,
  shortSuitPenalty: 0.06,
  voidBonus: 0.35,
  bidConservatism: 0.12,
  hookPush: 0.55,
  winWithLowRank: 1.4,
  loseWithHighRank: 1.2,
  trumpOnlyWhenNeed: 0.85,
  leadWinnerRank: 1.1,
  leadLoserRank: 0.9,
}

/**
 * Weights from offline evolution + hand-tuned floors so offsuit winners
 * stay respected against human opponents.
 */
export const TRAINED_BOT_PARAMS: BotParams = {
  ace: 0.72,
  king: 0.35,
  queen: 0.31619970873995346,
  jack: 0.0989145110704851,
  trumpAce: 1.4094275292122485,
  trumpKing: 1.0394557013620112,
  trumpQueen: 0.55,
  trumpJack: 0.42572058365085,
  trumpLow: 0.631100661038865,
  longSuitPerCard: 0.12,
  shortSuitPenalty: 0.05,
  voidBonus: 0.614355088008503,
  bidConservatism: 0.1,
  hookPush: 0.8195068155902121,
  winWithLowRank: 1.50460464107791,
  loseWithHighRank: 1.25,
  trumpOnlyWhenNeed: 0.95,
  leadWinnerRank: 1.6483431880501764,
  leadLoserRank: 1.2915444257052706,
}
