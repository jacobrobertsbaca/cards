import type { ScoringFormula } from "./types"
import { DEFAULT_FORMULA } from "./types"

type Cursor = { tokens: string[]; i: number }

function tokenize(input: string) {
  const tokens: string[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    const two = input.slice(i, i + 2)
    if (two === "**") {
      tokens.push("^")
      i += 2
      continue
    }
    if ("≠≤≥·×^".includes(ch)) {
      tokens.push(canonicalOp(ch))
      i += 1
      continue
    }
    if ("+-*/()".includes(ch)) {
      tokens.push(ch)
      i += 1
      continue
    }
    if (/[a-zA-Z]/.test(ch)) {
      let word = ch
      i += 1
      while (i < input.length && /[a-zA-Z]/.test(input[i])) {
        word += input[i]
        i += 1
      }
      tokens.push(canonicalWord(word))
      continue
    }
    if (/\d/.test(ch)) {
      let n = ch
      i += 1
      while (i < input.length && /\d/.test(input[i])) {
        n += input[i]
        i += 1
      }
      tokens.push(n)
      continue
    }
    throw new Error(`Unexpected “${ch}”`)
  }
  return tokens
}

function canonicalOp(op: string) {
  if (op === "*" || op === "·" || op === "×") return "*"
  if (op === "^") return "^"
  return op
}

function canonicalWord(word: string) {
  const key = word.toLowerCase()
  if (key === "t" || key === "tricks" || key === "taken") return "t"
  throw new Error(`Only t is allowed`)
}

function peek(cur: Cursor) {
  return cur.tokens[cur.i]
}

function eat(cur: Cursor, expected?: string) {
  const token = cur.tokens[cur.i]
  if (expected && token !== expected) {
    throw new Error(`Expected ${expected}`)
  }
  if (token === undefined) throw new Error("Unexpected end of formula")
  cur.i += 1
  return token
}

function isAtom(token: string | undefined) {
  return token === "t" || Boolean(token && /^\d+$/.test(token))
}

function parsePrimary(cur: Cursor, vars: { t: number }): number {
  const token = peek(cur)
  if (token === "t") {
    eat(cur)
    return vars.t
  }
  if (token === "(") {
    eat(cur)
    const value = parseAdd(cur, vars)
    eat(cur, ")")
    return value
  }
  if (token && /^\d+$/.test(token)) {
    eat(cur)
    return Number(token)
  }
  throw new Error("Invalid scoring expression")
}

function parseUnary(cur: Cursor, vars: { t: number }): number {
  if (peek(cur) === "-") {
    eat(cur)
    return -parseUnary(cur, vars)
  }
  if (peek(cur) === "+") {
    eat(cur)
    return parseUnary(cur, vars)
  }
  return parsePrimary(cur, vars)
}

function parsePow(cur: Cursor, vars: { t: number }): number {
  const value = parseUnary(cur, vars)
  if (peek(cur) !== "^") return value
  eat(cur)
  return value ** parsePow(cur, vars)
}

function parseMul(cur: Cursor, vars: { t: number }): number {
  let value = parsePow(cur, vars)
  while (true) {
    const next = peek(cur)
    if (next === "*" || next === "/") {
      const op = eat(cur)
      const right = parsePow(cur, vars)
      value = op === "*" ? value * right : value / right
      continue
    }
    if (next === "(" || isAtom(next)) {
      value *= parsePow(cur, vars)
      continue
    }
    break
  }
  return value
}

function parseAdd(cur: Cursor, vars: { t: number }): number {
  let value = parseMul(cur, vars)
  while (peek(cur) === "+" || peek(cur) === "-") {
    const op = eat(cur)
    const right = parseMul(cur, vars)
    value = op === "+" ? value + right : value - right
  }
  return value
}

function parseNumeric(input: string, vars: { t: number }) {
  const cur: Cursor = { tokens: tokenize(input), i: 0 }
  if (cur.tokens.length === 0) throw new Error("Enter a score")
  const value = parseAdd(cur, vars)
  if (cur.i !== cur.tokens.length) throw new Error("Invalid scoring expression")
  return value
}

function prettyFromTokens(tokens: string[]) {
  let text = ""
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const prev = tokens[i - 1]
    const next = tokens[i + 1]
    if (token === "*") {
      const juxtapose =
        Boolean(prev && next) &&
        ((/^\d+$/.test(prev) && isAtom(next)) ||
          (prev === ")" && (next === "(" || isAtom(next))) ||
          (isAtom(prev) && next === "("))
      text += juxtapose ? "" : "·"
      continue
    }
    const shown = token === "-" ? "−" : token === "*" ? "·" : token
    text += shown
  }
  return text
}

export function prettyExpression(expression: string) {
  try {
    return prettyFromTokens(tokenize(expression))
  } catch {
    return expression.trim()
  }
}

export type MathToken =
  | { kind: "var"; name: "t" }
  | { kind: "text"; value: string }

export function mathTokens(source: string): MathToken[] {
  return highlightMath(prettyExpression(source))
}

export function highlightMath(text: string): MathToken[] {
  const tokens: MathToken[] = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    const isolated =
      ch === "t" &&
      (i === 0 || !/[A-Za-z]/.test(text[i - 1])) &&
      (i === text.length - 1 || !/[A-Za-z]/.test(text[i + 1]))
    if (isolated) {
      tokens.push({ kind: "var", name: "t" })
      i += 1
      continue
    }
    let value = ch
    i += 1
    while (i < text.length) {
      const next = text[i]
      const nextVar =
        next === "t" &&
        (i === 0 || !/[A-Za-z]/.test(text[i - 1])) &&
        (i === text.length - 1 || !/[A-Za-z]/.test(text[i + 1]))
      if (nextVar) break
      value += next
      i += 1
    }
    tokens.push({ kind: "text", value })
  }
  return tokens
}

export function evaluateFormula(
  formula: ScoringFormula,
  bid: number,
  tricks: number
) {
  const fallback = DEFAULT_FORMULA
  const made = formula.made || fallback.made
  const miss = formula.miss || fallback.miss
  const source = bid === tricks ? made : miss
  const value = parseNumeric(source, { t: tricks })
  if (!Number.isFinite(value)) {
    throw new Error("Scoring formula produced a non-finite value")
  }
  return Math.trunc(value)
}

export function formulaExplanation(formula: ScoringFormula) {
  const made = prettyExpression(formula.made)
  const miss = prettyExpression(formula.miss)
  return `If bid made, you score ${made}. Otherwise you score ${miss}.`
}

export function validateExpression(expression: string) {
  try {
    parseNumeric(expression, { t: 2 })
    return null
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid expression"
  }
}
