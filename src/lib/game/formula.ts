import type { FormulaCase, FormulaCondition, ScoringFormula } from "./types"
import { DEFAULT_FORMULA } from "./types"

function tokenize(input: string) {
  const tokens: string[] = []
  const src = input.replace(/\s+/g, "")
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if ("+-*/()".includes(ch)) {
      tokens.push(ch)
      i += 1
      continue
    }
    if (ch === "b" || ch === "t") {
      tokens.push(ch)
      i += 1
      continue
    }
    if (/\d/.test(ch)) {
      let n = ch
      i += 1
      while (i < src.length && /\d/.test(src[i])) {
        n += src[i]
        i += 1
      }
      tokens.push(n)
      continue
    }
    throw new Error(`Unexpected “${ch}” in scoring formula`)
  }
  return tokens
}

function parseExpression(input: string, bid: number, tricks: number) {
  const tokens = tokenize(input)
  let i = 0

  const peek = () => tokens[i]
  const eat = (expected?: string) => {
    const token = tokens[i]
    if (expected && token !== expected) {
      throw new Error(`Expected ${expected}`)
    }
    i += 1
    return token
  }

  const parsePrimary = (): number => {
    const token = peek()
    if (token === "b") {
      eat()
      return bid
    }
    if (token === "t") {
      eat()
      return tricks
    }
    if (token === "(") {
      eat()
      const value = parseAdd()
      eat(")")
      return value
    }
    if (token && /^-?\d+$/.test(token)) {
      eat()
      return Number(token)
    }
    throw new Error("Invalid scoring expression")
  }

  const parseUnary = (): number => {
    if (peek() === "-") {
      eat()
      return -parseUnary()
    }
    if (peek() === "+") {
      eat()
      return parseUnary()
    }
    return parsePrimary()
  }

  const parseMul = (): number => {
    let value = parseUnary()
    while (peek() === "*" || peek() === "/") {
      const op = eat()
      const right = parseUnary()
      value = op === "*" ? value * right : value / right
    }
    return value
  }

  const parseAdd = (): number => {
    let value = parseMul()
    while (peek() === "+" || peek() === "-") {
      const op = eat()
      const right = parseMul()
      value = op === "+" ? value + right : value - right
    }
    return value
  }

  const value = parseAdd()
  if (i !== tokens.length) {
    throw new Error("Invalid scoring expression")
  }
  return value
}

function matches(condition: FormulaCondition, bid: number, tricks: number) {
  switch (condition) {
    case "eq":
      return bid === tricks
    case "neq":
      return bid !== tricks
    case "gt":
      return bid > tricks
    case "lt":
      return bid < tricks
    case "always":
      return true
  }
}

export function evaluateFormula(
  formula: ScoringFormula,
  bid: number,
  tricks: number
) {
  const cases = formula.cases.length ? formula.cases : DEFAULT_FORMULA.cases
  for (const rule of cases) {
    if (matches(rule.condition, bid, tricks)) {
      const value = parseExpression(rule.expression, bid, tricks)
      if (!Number.isFinite(value)) {
        throw new Error("Scoring formula produced a non-finite value")
      }
      return Math.trunc(value)
    }
  }
  return 0
}

export function prettyExpression(expression: string) {
  return expression
    .replace(/\s+/g, "")
    .replace(/\*/g, "")
    .replace(/b/g, "b")
    .replace(/t/g, "t")
    .replace(/\+/g, " + ")
    .replace(/-/g, " − ")
    .replace(/\//g, " / ")
}

export function conditionLabel(condition: FormulaCondition) {
  switch (condition) {
    case "eq":
      return "b = t"
    case "neq":
      return "b ≠ t"
    case "gt":
      return "b > t"
    case "lt":
      return "b < t"
    case "always":
      return "otherwise"
  }
}

export function formulaExplanation(formula: ScoringFormula) {
  const lines = formula.cases.map((rule) => {
    const expr = prettyExpression(rule.expression)
    if (rule.condition === "always") {
      return `Otherwise you score ${expr}, where b is your bid and t is tricks taken.`
    }
    return `If ${conditionLabel(rule.condition)}, you score ${expr}.`
  })
  return lines.join(" ")
}

export function validateExpression(expression: string) {
  try {
    parseExpression(expression, 3, 2)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid expression"
  }
}

export function newFormulaCase(
  condition: FormulaCondition = "always",
  expression = "t"
): FormulaCase {
  return {
    id: crypto.randomUUID(),
    condition,
    expression,
  }
}
