import { getBuffers } from './bufferPool'
import type { RenderConfig, AnimationState, RenderFrame } from './types'

const CHAR_RAMP = ' .,-~:;=!*#$@'
const RAMP_MAX = CHAR_RAMP.length - 1

export function createDefaultConfig(cols: number, rows: number): RenderConfig {
  return {
    cols,
    rows,
    colorMode: 'green',
    majorRadius: 2,
    halfWidth: 0.8,
    uStep: 0.07,
    vStep: 0.05,
    viewDistance: 5,
    lightDirection: [0, 1, -1] as const,
  }
}

function normalizeVec(
  x: number, y: number, z: number
): readonly [number, number, number] {
  const len = Math.sqrt(x * x + y * y + z * z)
  if (len === 0) return [0, 0, 1] as const
  return [x / len, y / len, z / len] as const
}

function hslToRgb(h: number, s: number, l: number): readonly [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0, g = 0, b = 0
  if (h < 60)       { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else              { r = c; b = x }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ] as const
}

function colorize(
  char: string,
  intensity: number,
  u: number,
  depth: number,
  mode: string
): string {
  const brightness = Math.round(intensity * 255)

  switch (mode) {
    case 'rainbow': {
      const hue = ((u / (2 * Math.PI)) * 360 + 360) % 360
      const [r, g, b] = hslToRgb(hue, 0.9, 0.12 + intensity * 0.55)
      return `\x1b[38;2;${r};${g};${b}m${char}`
    }
    case 'synthwave': {
      const t = u / (2 * Math.PI)
      const hue = (180 + t * 140) % 360
      const [r, g, b] = hslToRgb(hue, 0.85, 0.12 + intensity * 0.5)
      return `\x1b[38;2;${r};${g};${b}m${char}`
    }
    case 'depth': {
      const hue = (1 - depth) * 240
      const [r, g, b] = hslToRgb(hue, 0.8, 0.12 + intensity * 0.5)
      return `\x1b[38;2;${r};${g};${b}m${char}`
    }
    case 'white': {
      const v = Math.max(18, brightness)
      return `\x1b[38;2;${v};${v};${v}m${char}`
    }
    default: {
      const g = Math.max(18, brightness)
      return `\x1b[38;2;0;${g};0m${char}`
    }
  }
}

export function renderFrame(config: RenderConfig, state: AnimationState): RenderFrame {
  const { cols, rows, colorMode, majorRadius: R, halfWidth, uStep, vStep, viewDistance } = config
  const size = cols * rows
  const { zBuffer, lumBuffer, charBuffer, uBuffer, depthBuffer } = getBuffers(size)

  const [lx, ly, lz] = normalizeVec(
    config.lightDirection[0],
    config.lightDirection[1],
    config.lightDirection[2]
  )

  // Blinn-Phong half vector (view dir = [0, 0, -1])
  const [hx, hy, hz] = normalizeVec(lx, ly, lz - 1)

  const K2 = viewDistance + R + halfWidth + 1
  const K1 = Math.min(cols, rows * 2) * K2 * 0.18

  // Depth range for normalization
  const minOoz = 1 / (K2 + R + halfWidth)
  const maxOoz = 1 / (K2 - R - halfWidth)
  const oozRange = maxOoz - minOoz

  // Precompute rotation trig (6 calls total per frame)
  const sinA = Math.sin(state.angleA), cosA = Math.cos(state.angleA)
  const sinB = Math.sin(state.angleB), cosB = Math.cos(state.angleB)
  const sinC = Math.sin(state.angleC), cosC = Math.cos(state.angleC)

  const twoPi = 2 * Math.PI
  const halfCols = cols / 2
  const halfRows = rows / 2

  for (let u = 0; u < twoPi; u += uStep) {
    // Precompute trig for this u value (4 calls per u, NOT per point)
    const cosU = Math.cos(u)
    const sinU = Math.sin(u)
    const cosHU = Math.cos(u * 0.5)
    const sinHU = Math.sin(u * 0.5)

    // Partial derivative dP/dv (only depends on u)
    const pvx = cosHU * cosU
    const pvy = cosHU * sinU
    const pvz = sinHU

    for (let v = -halfWidth; v <= halfWidth; v += vStep) {
      // Inline mobiusPoint
      const rad = R + v * cosHU
      const px = rad * cosU
      const py = rad * sinU
      const pz = v * sinHU

      // Inline rotation (Rx * Ry * Rz)
      const py1 = py * cosA - pz * sinA
      const pz1 = py * sinA + pz * cosA
      const px2 = px * cosB + pz1 * sinB
      const pz2 = -px * sinB + pz1 * cosB
      const rx = px2 * cosC - py1 * sinC
      const ry = px2 * sinC + py1 * cosC
      const rz = pz2

      // Perspective projection
      const ooz = 1 / (rz + K2)
      const xp = (halfCols + K1 * ooz * rx) | 0
      const yp = (halfRows - K1 * ooz * ry * 0.5) | 0

      if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) continue

      const idx = yp * cols + xp
      if (ooz <= zBuffer[idx]) continue
      zBuffer[idx] = ooz

      // Inline normal: dP/du cross dP/dv
      const dvH = -v * sinHU * 0.5
      const pux = dvH * cosU - rad * sinU
      const puy = dvH * sinU + rad * cosU
      const puz = v * cosHU * 0.5

      let nx = puy * pvz - puz * pvy
      let ny = puz * pvx - pux * pvz
      let nz = pux * pvy - puy * pvx
      const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz)
      if (nLen > 0) { nx /= nLen; ny /= nLen; nz /= nLen }

      // Rotate normal
      const ny1 = ny * cosA - nz * sinA
      const nz1 = ny * sinA + nz * cosA
      const nx2 = nx * cosB + nz1 * sinB
      const nz2 = -nx * sinB + nz1 * cosB
      const rnx = nx2 * cosC - ny1 * sinC
      const rny = nx2 * sinC + ny1 * cosC
      const rnz = nz2

      // Phong lighting (bilateral for non-orientable surface)
      const diffuse = Math.abs(rnx * lx + rny * ly + rnz * lz)
      const specDot = Math.abs(rnx * hx + rny * hy + rnz * hz)
      const s2 = specDot * specDot
      const s4 = s2 * s2
      const s8 = s4 * s4
      const specular = s8 * s8  // x^16 via exponentiation by squaring (4 muls)

      const intensity = Math.min(1, 0.06 + diffuse * 0.65 + specular * 0.55)

      charBuffer[idx] = Math.min((intensity * RAMP_MAX + 0.5) | 0, RAMP_MAX)
      lumBuffer[idx] = intensity
      uBuffer[idx] = u
      depthBuffer[idx] = (ooz - minOoz) / oozRange
    }
  }

  // Build output string
  const parts: string[] = ['\x1b[H']

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x
      if (zBuffer[idx] === -Infinity) {
        // Background stars (seeded pseudo-random, ~1.5% density)
        if (((x * 7919 + y * 104729 + 12345) % 97) < 2) {
          parts.push('\x1b[38;2;16;16;22m.')
        } else {
          parts.push(' ')
        }
      } else {
        parts.push(colorize(
          CHAR_RAMP[charBuffer[idx]],
          lumBuffer[idx],
          uBuffer[idx],
          depthBuffer[idx],
          colorMode
        ))
      }
    }
    if (y < rows - 1) parts.push('\r\n')
  }

  parts.push('\x1b[0m')
  return { output: parts.join('') }
}
