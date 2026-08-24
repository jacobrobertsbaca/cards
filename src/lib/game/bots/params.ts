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

/** Weights from offline evolution against the legacy naive bot. */
export const TRAINED_BOT_PARAMS: BotParams = {
  ace: 0.30012702269199243,
  king: 0.20184887591010311,
  queen: 0.350640793011178,
  jack: 0,
  trumpAce: 1.2988100732138121,
  trumpKing: 1.0169786159686662,
  trumpQueen: 0.6855969738429248,
  trumpJack: 0.4360171762360896,
  trumpLow: 0.5185507213800231,
  longSuitPerCard: 0.21346697631208666,
  shortSuitPenalty: 0,
  voidBonus: 0.4097462899190196,
  bidConservatism: 0.17736437636553765,
  hookPush: 0.8990746364448359,
  winWithLowRank: 1.673321836214416,
  loseWithHighRank: 1.2112691027327356,
  trumpOnlyWhenNeed: 1.087479439034401,
  leadWinnerRank: 1.4068764778599665,
  leadLoserRank: 0.8504931996828216,
}
