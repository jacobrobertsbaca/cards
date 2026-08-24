import type { FormulaCase, ScoringFormula } from "./types"
import { DEFAULT_FORMULA } from "./types"

export const MATH_VARS = {
  b: "Your bid this round",
  t: "Tricks you took this round",
} as const

export type MathVar = keyof typeof MATH_VARS

type Cmp = "=" | "≠" | "<" | ">" | "≤" | "≥"
type Cursor = { tokens: string[]; i: number }

const LEGACY: Record<string, string> = {
  eq: "b = t",
  neq: "b ≠ t",
  gt: "b > t",
  lt: "b < t",
  always: "otherwise",
}

const CMP: Cmp[] = ["=", "≠", "<", ">", "≤", "≥"]
const SPACED = new Set(["+", "-", "=", "≠", "<", ">", "≤", "≥", "and", "or", "·"])

export function normalizeCondition(condition: string) {
  return LEGACY[condition] ?? condition
}

export function isCatchAll(condition: string) {
  try {
    const tokens = tokenize(normalizeCondition(condition))
    if (tokens.length === 0) return true
    return tokens.length === 1 && tokens[0] === "true"
  } catch {
    const text = condition.trim().toLowerCase()
    return ["otherwise", "else", "always", "true", ""].includes(text)
  }
}

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
    if (["==", "!=", "<=", ">=", "&&", "||", "**"].includes(two)) {
      tokens.push(canonicalOp(two))
      i += 2
      continue
    }
    if ("≠≤≥·×^".includes(ch)) {
      tokens.push(canonicalOp(ch))
      i += 1
      continue
    }
    if ("+-*/()=<>".includes(ch)) {
      tokens.push(canonicalOp(ch))
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
  if (op === "==") return "="
  if (op === "!=" || op === "≠") return "≠"
  if (op === "<=" || op === "≤") return "≤"
  if (op === ">=" || op === "≥") return "≥"
  if (op === "*" || op === "·" || op === "×") return "*"
  if (op === "**" || op === "^") return "^"
  if (op === "&&") return "and"
  if (op === "||") return "or"
  return op
}

function canonicalWord(word: string) {
  const key = word.toLowerCase()
  if (key === "bid") return "b"
  if (key === "tricks" || key === "taken") return "t"
  if (["otherwise", "else", "always", "true"].includes(key)) return "true"
  if (key === "and" || key === "or") return key
  if (key === "b" || key === "t") return key
  throw new Error(`Unknown name “${word}”`)
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
  return token === "b" || token === "t" || Boolean(token && /^\d+$/.test(token))
}

function parsePrimary(cur: Cursor, vars: FormulaVars): number {
  const token = peek(cur)
  if (token === "b" || token === "t") {
    eat(cur)
    return vars[token]
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

function parseUnary(cur: Cursor, vars: FormulaVars): number {
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

function parsePow(cur: Cursor, vars: FormulaVars): number {
  const value = parseUnary(cur, vars)
  if (peek(cur) !== "^") return value
  eat(cur)
  return value ** parsePow(cur, vars)
}

function parseMul(cur: Cursor, vars: FormulaVars): number {
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

function parseAdd(cur: Cursor, vars: FormulaVars): number {
  let value = parseMul(cur, vars)
  while (peek(cur) === "+" || peek(cur) === "-") {
    const op = eat(cur)
    const right = parseMul(cur, vars)
    value = op === "+" ? value + right : value - right
  }
  return value
}

function compare(op: Cmp, left: number, right: number) {
  if (op === "=") return left === right
  if (op === "≠") return left !== right
  if (op === "<") return left < right
  if (op === ">") return left > right
  if (op === "≤") return left <= right
  return left >= right
}

function parseCmp(cur: Cursor, vars: FormulaVars): boolean {
  if (peek(cur) === "true") {
    eat(cur)
    return true
  }
  const left = parseAdd(cur, vars)
  const op = peek(cur)
  if (op && (CMP as string[]).includes(op)) {
    eat(cur)
    return compare(op as Cmp, left, parseAdd(cur, vars))
  }
  throw new Error("Expected a comparison")
}

function parseAnd(cur: Cursor, vars: FormulaVars): boolean {
  let value = parseCmp(cur, vars)
  while (peek(cur) === "and") {
    eat(cur)
    const next = parseCmp(cur, vars)
    value = value && next
  }
  return value
}

function parseOr(cur: Cursor, vars: FormulaVars): boolean {
  let value = parseAnd(cur, vars)
  while (peek(cur) === "or") {
    eat(cur)
    value = parseAnd(cur, vars) || value
  }
  return value
}

type FormulaVars = { b: number; t: number }

function parseNumeric(input: string, vars: FormulaVars) {
  const cur: Cursor = { tokens: tokenize(input), i: 0 }
  if (cur.tokens.length === 0) throw new Error("Enter a score")
  const value = parseAdd(cur, vars)
  if (cur.i !== cur.tokens.length) throw new Error("Invalid scoring expression")
  return value
}

function parseBoolean(input: string, vars: FormulaVars) {
  const cur: Cursor = { tokens: tokenize(normalizeCondition(input)), i: 0 }
  if (cur.tokens.length === 0) throw new Error("Enter a condition")
  const value = parseOr(cur, vars)
  if (cur.i !== cur.tokens.length) throw new Error("Invalid condition")
  return value
}

function prettyFromTokens(tokens: string[]) {
  if (tokens.length === 1 && tokens[0] === "true") return "otherwise"
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
    const shown =
      token === "true" ? "otherwise" : token === "-" ? "−" : token === "*" ? "·" : token
    const pad =
      SPACED.has(token) ||
      token === "-" ||
      token === "and" ||
      token === "or" ||
      shown === "otherwise"
    if (pad) text += ` ${shown} `
    else text += shown
  }
  return text.replace(/\s+/g, " ").trim()
}

function prettify(input: string, kind: "expr" | "cond") {
  const source = kind === "cond" ? normalizeCondition(input) : input
  const tokens = tokenize(source)
  if (kind === "expr" && tokens.includes("true")) {
    throw new Error("Invalid scoring expression")
  }
  return prettyFromTokens(tokens)
}

export function prettyExpression(expression: string) {
  try {
    return prettify(expression, "expr")
  } catch {
    return expression.trim()
  }
}

export function prettyCondition(condition: string) {
  try {
    return prettify(condition, "cond")
  } catch {
    return normalizeCondition(condition).trim()
  }
}

export type MathToken =
  | { kind: "var"; name: MathVar }
  | { kind: "text"; value: string }

export function mathTokens(source: string, kind: "expr" | "cond"): MathToken[] {
  const pretty = kind === "expr" ? prettyExpression(source) : prettyCondition(source)
  return highlightMath(pretty)
}

export function highlightMath(text: string): MathToken[] {
  const tokens: MathToken[] = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    const isolated =
      (ch === "b" || ch === "t") &&
      (i === 0 || !/[A-Za-z]/.test(text[i - 1])) &&
      (i === text.length - 1 || !/[A-Za-z]/.test(text[i + 1]))
    if (isolated) {
      tokens.push({ kind: "var", name: ch })
      i += 1
      continue
    }
    let value = ch
    i += 1
    while (i < text.length) {
      const next = text[i]
      const nextVar =
        (next === "b" || next === "t") &&
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
  const cases = formula.cases.length ? formula.cases : DEFAULT_FORMULA.cases
  const vars = { b: bid, t: tricks }
  for (const rule of cases) {
    if (parseBoolean(rule.condition, vars)) {
      const value = parseNumeric(rule.expression, vars)
      if (!Number.isFinite(value)) {
        throw new Error("Scoring formula produced a non-finite value")
      }
      return Math.trunc(value)
    }
  }
  return 0
}

export function formulaExplanation(formula: ScoringFormula) {
  const lines = formula.cases.map((rule) => {
    const expr = prettyExpression(rule.expression)
    const cond = prettyCondition(rule.condition)
    if (isCatchAll(rule.condition)) {
      return `Otherwise you score ${expr}.`
    }
    return `If ${cond}, you score ${expr}.`
  })
  return `${lines.join(" ")} b is your bid, t is tricks taken.`
}

export function validateExpression(expression: string) {
  try {
    parseNumeric(expression, { b: 3, t: 2 })
    return null
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid expression"
  }
}

export function validateCondition(condition: string) {
  try {
    parseBoolean(condition, { b: 3, t: 2 })
    return null
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid condition"
  }
}

export function newFormulaCase(
  condition = "otherwise",
  expression = "t"
): FormulaCase {
  return {
    id: crypto.randomUUID(),
    condition,
    expression,
  }
}
