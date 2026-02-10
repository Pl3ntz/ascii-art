let zBuffer = new Float64Array(0)
let lumBuffer = new Float64Array(0)
let charBuffer = new Uint8Array(0)
let uBuffer = new Float64Array(0)
let depthBuffer = new Float64Array(0)
let currentSize = 0

export function getBuffers(size: number) {
  if (size !== currentSize) {
    zBuffer = new Float64Array(size)
    lumBuffer = new Float64Array(size)
    charBuffer = new Uint8Array(size)
    uBuffer = new Float64Array(size)
    depthBuffer = new Float64Array(size)
    currentSize = size
  }

  zBuffer.fill(-Infinity)
  charBuffer.fill(0)

  return { zBuffer, lumBuffer, charBuffer, uBuffer, depthBuffer }
}
