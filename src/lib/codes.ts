import { customAlphabet } from "nanoid"

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
const make = customAlphabet(alphabet, 8)

export function gameCode() {
  return make()
}

export function isGameCode(value: string) {
  return /^[a-z0-9]{6,12}$/.test(value)
}
