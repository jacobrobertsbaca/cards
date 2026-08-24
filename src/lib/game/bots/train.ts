import { TRAINED_BOT_PARAMS } from "./params"
import {
  LEGACY_BOT,
  defaultSettings,
  evolveParams,
  makeParamBot,
  runCandidateVsLegacy,
} from "./sim"

const gamesPerCandidate = Number(process.env.BOT_TRAIN_GAMES ?? 48)
const generations = Number(process.env.BOT_TRAIN_GENERATIONS ?? 45)
const population = Number(process.env.BOT_TRAIN_POPULATION ?? 28)
const validationGames = Number(process.env.BOT_TRAIN_VALIDATE ?? 240)

const baseline = runCandidateVsLegacy(LEGACY_BOT, validationGames)
const baselineAvg = baseline[0] / validationGames

const { params, score } = evolveParams({
  generations,
  population,
  gamesPerCandidate,
  seed: TRAINED_BOT_PARAMS,
})

const candidate = makeParamBot(params)
const trained = runCandidateVsLegacy(candidate, validationGames)
const trainedAvg = trained[0] / validationGames
const legacyAvg = trained.slice(1).reduce((sum, value) => sum + value, 0) /
  (validationGames * (defaultSettings().seatCount - 1))

console.log("Training complete")
console.log(`Baseline seat-0 avg (legacy mirror): ${baselineAvg.toFixed(2)}`)
console.log(`Evolution best raw score (${gamesPerCandidate}-game eval): ${score.toFixed(1)}`)
console.log(`Trained seat-0 avg: ${trainedAvg.toFixed(2)}`)
console.log(`Legacy opponent avg: ${legacyAvg.toFixed(2)}`)
console.log(`Advantage: ${(trainedAvg - legacyAvg).toFixed(2)} points/game`)
console.log(JSON.stringify(params, null, 2))
