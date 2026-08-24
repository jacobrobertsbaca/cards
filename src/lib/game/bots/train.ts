import { TRAINED_BOT_PARAMS } from "./params"
import {
  LEGACY_BOT,
  defaultSettings,
  evolveParams,
  makeParamBot,
  makeStrongBot,
  runCandidateVsLegacy,
} from "./sim"

const gamesPerCandidate = Number(process.env.BOT_TRAIN_GAMES ?? 36)
const generations = Number(process.env.BOT_TRAIN_GENERATIONS ?? 24)
const population = Number(process.env.BOT_TRAIN_POPULATION ?? 20)
const validationGames = Number(process.env.BOT_TRAIN_VALIDATE ?? 80)

console.log("Evolving rollout heuristic weights...")
const { params, score } = evolveParams({
  generations,
  population,
  gamesPerCandidate,
  seed: TRAINED_BOT_PARAMS,
})

const heuristic = makeParamBot(params)
const strong = makeStrongBot(params)

console.log("Validating against legacy...")
const heuristicTotals = runCandidateVsLegacy(heuristic, validationGames)
const strongTotals = runCandidateVsLegacy(strong, validationGames)
const seats = defaultSettings().seatCount - 1

const heuristicAvg = heuristicTotals[0] / validationGames
const strongAvg = strongTotals[0] / validationGames
const legacyVsStrong =
  strongTotals.slice(1).reduce((sum, value) => sum + value, 0) /
  (validationGames * seats)

console.log("Training complete")
console.log(`Evolution best raw score: ${score.toFixed(1)}`)
console.log(`Heuristic vs legacy (seat 0): ${heuristicAvg.toFixed(2)}`)
console.log(`Search bot vs legacy (seat 0): ${strongAvg.toFixed(2)}`)
console.log(`Legacy avg vs search bot: ${legacyVsStrong.toFixed(2)}`)
console.log(`Search advantage: ${(strongAvg - legacyVsStrong).toFixed(2)} points/game`)
console.log(JSON.stringify(params, null, 2))
