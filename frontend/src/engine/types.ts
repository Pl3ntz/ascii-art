export type ColorMode = 'green' | 'rainbow' | 'synthwave' | 'depth' | 'white'

export interface RenderConfig {
  readonly cols: number
  readonly rows: number
  readonly colorMode: ColorMode
  readonly majorRadius: number
  readonly halfWidth: number
  readonly uStep: number
  readonly vStep: number
  readonly viewDistance: number
  readonly lightDirection: readonly [number, number, number]
}

export interface AnimationState {
  readonly angleA: number
  readonly angleB: number
  readonly angleC: number
}

export interface RenderFrame {
  readonly output: string
}
