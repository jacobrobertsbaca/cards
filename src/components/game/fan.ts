export function fanPose(
  count: number,
  index: number,
  radius: number,
  maxHalfAngle: number,
  degreesPerGap = 1.15
) {
  if (count <= 1) {
    return { x: 0, y: 0, rotate: 0, depth: 0 }
  }
  const mid = (count - 1) / 2
  const halfAngle = Math.min(maxHalfAngle, degreesPerGap * (count - 1))
  const angle = ((index - mid) / mid) * halfAngle
  const rad = (angle * Math.PI) / 180
  const x = radius * Math.sin(rad)
  const y = radius * (1 - Math.cos(rad))
  const depth = radius * (1 - Math.cos((halfAngle * Math.PI) / 180))
  return { x, y, rotate: angle, depth }
}

export const FAN_CARD = {
  xs: { w: 40, h: 59.2, radius: 180, maxHalfAngle: 10 },
  sm: { w: 36, h: 50.4, radius: 200, maxHalfAngle: 10 },
  md: { w: 56, h: 82.4, radius: 280, maxHalfAngle: 10 },
  lg: { w: 85.6, h: 120, radius: 360, maxHalfAngle: 11 },
  xl: { w: 96, h: 134.4, radius: 420, maxHalfAngle: 12 },
} as const
