# Mobius Strip - 3D ASCII Animation

## Overview
Rotating 3D Mobius strip rendered entirely with ASCII characters and ANSI 24-bit colors in xterm.js. All computation is client-side — no backend.

**Branch:** main

## Documentation
- **README.md** — User-facing documentation: features, controls, setup instructions, inspired by donut.c
- **docs/ARCHITECTURE.md** — Technical deep-dive: rendering pipeline, performance analysis, bottlenecks, memory layout

## Stack
- **Frontend:** React 18, TypeScript, Vite, Bun, xterm.js (WebGL), Tailwind CSS
- **Infra:** Docker Compose, Traefik

## URL
- https://ascii.vitorplentz.com.br

## Commands
```bash
docker compose ps
docker compose logs -f frontend --tail 50
docker compose up -d --build frontend
```

## Architecture
- `engine/types.ts` (23 lines) — Types (ColorMode, RenderConfig, AnimationState, RenderFrame)
- `engine/bufferPool.ts` (22 lines) — Reusable typed array buffers (zero GC pressure)
- `engine/renderer.ts` (222 lines) — Rendering engine: z-buffer, inlined Mobius math, Phong lighting, ANSI output
- `components/TerminalView.tsx` (235 lines) — xterm.js + RAF loop + mouse/touch/keyboard interactions
- `App.tsx` (9 lines) — Mounts TerminalView with vignette + scanlines
- `main.tsx` (13 lines) — React entry point
- `index.css` (81 lines) — Global styles, CRT effects (vignette + scanlines)

**Total:** 605 lines of source code (TypeScript + CSS).

## Rendering Technique
donut.c-style: parametric surface → 3D rotation → perspective projection → Blinn-Phong lighting → z-buffer → ASCII chars with ANSI 24-bit colors. Uses Math.abs(luminance) for bilateral illumination (non-orientable surface).

**Performance:** ~186,000 surface points sampled per frame, ~60fps on modern hardware. Trig precomputation reduces calls by 99.85% (from 1.86M to 2.8K per frame).

## Features
- **5 color modes:** green (1), rainbow (2), synthwave (3), depth (4), white (5)
- **Phong specular highlights** with Blinn-Phong half-vector (exponent 16, unrolled)
- **Reactive lighting** — mouse position controls light direction
- **Mouse drag rotation** — click and drag to rotate, auto-resumes after 2s
- **Touch support** — single-finger drag on mobile
- **Keyboard shortcuts:** Space=pause, 1-5=colors, +/-=speed
- **Boot sequence** — fake terminal initialization on load
- **Background stars** — sparse dim dots for depth (~1.5% pixel density)
- **Vignette + scanlines** — CRT atmosphere via CSS overlays
- **Buffer pooling** — zero allocations per frame (5 typed arrays reused)
- **Trig precomputation** — sin/cos computed once per u-value, not per point
- **~60fps target** with 16ms frame throttle

## Parametric Mobius Strip Equation
```
P(u, v) = [
  (R + v·cos(u/2)) · cos(u),
  (R + v·cos(u/2)) · sin(u),
  v · sin(u/2)
]
```
Where `u ∈ [0, 2π]`, `v ∈ [-w, w]`, `R = 2.0` (major radius), `w = 0.8` (half-width).

## Inspired By
Andy Sloane's legendary [donut.c](https://www.a1k0n.net/2011/10/10/donut-math.html) — a masterclass in creative coding and 3D ASCII rendering.
