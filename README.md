# Mobius Strip - 3D ASCII Art

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=black)
![xterm.js](https://img.shields.io/badge/xterm.js-5.5-00c851?logo=windowsterminal&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1.0-fbf0df?logo=bun&logoColor=black)

A rotating 3D Mobius strip rendered entirely with ASCII characters and ANSI 24-bit colors in the browser. Inspired by Andy Sloane's legendary [donut.c](https://www.a1k0n.net/2011/10/10/donut-math.html), this project uses the same mathematical approach: parametric surface equations, 3D rotation matrices, perspective projection, and z-buffer depth testing — all running client-side at ~60fps.

> *Open [ascii.vitorplentz.com.br](https://ascii.vitorplentz.com.br) for the live demo*

**Live demo:** https://ascii.vitorplentz.com.br

---

## What is This?

This is a donut.c-style 3D renderer that computes a Mobius strip surface parametrically, rotates it in 3D space, projects it onto a 2D terminal grid, applies Blinn-Phong lighting with specular highlights, and outputs ANSI escape codes for 24-bit color. The entire scene is rendered using ASCII characters ranging from space to @ (brightest), with luminance calculated per-pixel using a physically-based lighting model.

Unlike traditional 3D graphics which rely on GPU pipelines, this renderer is a pure CPU implementation that echoes the aesthetic and constraints of 1990s terminal graphics — but with modern WebGL-accelerated terminal rendering via xterm.js.

---

## Features

- **5 Color Modes**
  - **Green (1):** Classic terminal phosphor green with luminance-based brightness
  - **Rainbow (2):** Hue derived from the Mobius strip's u-parameter (position along the strip)
  - **Synthwave (3):** Magenta-cyan gradient, 180° hue shift from u-value
  - **Depth (4):** Blue (near) to red (far) depth mapping using normalized inverse-Z
  - **White (5):** Monochrome luminance ramp for pure form visualization

- **Blinn-Phong Specular Lighting**  
  Physically-based lighting with ambient (0.06), diffuse (0.65), and specular (0.55) components. Specular highlight uses Blinn-Phong half-vector with exponent 16 (inlined multiplication to avoid Math.pow overhead).

- **Reactive Lighting**  
  Mouse position controls light direction in real-time — move your cursor to see the Mobius strip respond dynamically.

- **Mouse Drag Rotation**  
  Click and drag anywhere to manually rotate the strip. Auto-rotation resumes after 2 seconds of inactivity.

- **Touch Support**  
  Single-finger drag on mobile devices for rotation control.

- **Keyboard Shortcuts**

| Key | Action |
|-----|--------|
| Space | Pause/resume animation |
| 1 | Green mode |
| 2 | Rainbow mode |
| 3 | Synthwave mode |
| 4 | Depth mode |
| 5 | White mode |
| + or = | Increase rotation speed |
| - | Decrease rotation speed |

- **Boot Sequence Animation**  
  Terminal-style initialization sequence on page load (MOBIUS STRIP v1.0).

- **Background Star Field**  
  Sparse pseudo-random dim stars rendered in background pixels (~1.5% density).

- **CRT Effects**  
  Vignette + scanline overlays for authentic retro terminal atmosphere.

- **Zero Garbage Collection Pressure**  
  Buffer pooling with reused Float64Array and Uint8Array buffers — no allocations per frame.

- **Trigonometry Precomputation**  
  sin/cos computed once per u-value (not per point) for ~40% reduction in trig calls.

- **~60fps Target**  
  Frame throttling at 16ms with requestAnimationFrame loop.

---

## How It Works

### Parametric Mobius Strip Equations

A Mobius strip is a non-orientable surface with a single continuous side and edge. It's defined parametrically as:

```
P(u, v) = [
  (R + v·cos(u/2)) · cos(u),
  (R + v·cos(u/2)) · sin(u),
  v · sin(u/2)
]
```

Where:
- `u ∈ [0, 2π]` — position along the strip's centerline
- `v ∈ [-w, w]` — distance from centerline (width parameter)
- `R` — major radius (default: 2.0)
- `w` — half-width (default: 0.8)

### Rendering Pipeline

1. **Surface Sampling**  
   Iterate over `u` and `v` with configurable step sizes (`uStep = 0.009`, `vStep = 0.006`) to generate point cloud.

2. **Normal Calculation**  
   Compute partial derivatives `∂P/∂u` and `∂P/∂v`, then calculate normal as `n = (∂P/∂u) × (∂P/∂v)` using cross product. Normalize to unit vector.

3. **3D Rotation**  
   Apply rotation matrices `Rx(A) · Ry(B) · Rz(C)` to both point and normal. Rotation angles increment per frame for continuous animation.

4. **Perspective Projection**  
   Project 3D point `(x, y, z)` onto 2D terminal grid:
   ```
   ooz = 1 / (z + K2)
   screenX = halfCols + K1 · ooz · x
   screenY = halfRows - K1 · ooz · y · 0.5
   ```
   Where `K2 = viewDistance + R + w + 1` and `K1` scales screen coordinates.

5. **Z-Buffer Depth Testing**  
   Store `ooz` (inverse depth) per screen pixel. Only render point if `ooz > zBuffer[pixel]` (closer to camera).

6. **Blinn-Phong Lighting**  
   Compute luminance using:
   ```
   diffuse = |n · L|
   specular = |n · H|^16
   intensity = 0.06 + 0.65·diffuse + 0.55·specular
   ```
   Where `L` is light direction and `H` is half-vector between light and view direction. `Math.abs()` ensures bilateral illumination (Mobius strip is non-orientable — both "sides" are the same side).

7. **Character Mapping**  
   Map intensity to ASCII character ramp: ` .,-~:;=!*#$@` (12 levels).

8. **Color Encoding**  
   Convert intensity to ANSI 24-bit RGB escape codes based on color mode.

9. **ANSI Output**  
   Build output string with ANSI cursor positioning, color codes, and characters. xterm.js interprets and renders the ANSI sequence.

### Performance Optimizations

| Optimization | Impact |
|--------------|--------|
| **Buffer Pooling** | Zero allocations per frame — reuse typed arrays |
| **Trigonometry Precomputation** | Compute sin(u), cos(u), sin(u/2), cos(u/2) once per u-loop, not per point (~40% fewer trig calls) |
| **Inlined Parametric Math** | No function calls for mobiusPoint() or rotatePoint() — all logic inlined in hot loop |
| **Inlined Normal Calculation** | Cross product computed inline without intermediate vectors |
| **Rotation Matrix Precomputation** | Compute sin(A), cos(A), etc. once per frame (6 trig calls total) |
| **Integer-Only Bitwise Truncation** | Use pipe-zero for fast float-to-int conversion |
| **Specular Exponent Optimization** | Inlined multiplication avoids Math.pow overhead |
| **String Concatenation via Array** | Build output as array of strings, then join once at end |
| **Frame Throttling** | Skip frames if delta < 16ms to maintain ~60fps target |
| **WebGL Acceleration** | xterm.js WebglAddon for GPU-accelerated terminal rendering |

---

## Architecture

Total: **605 lines** of TypeScript (excluding config files and CSS).

| File | Lines | Purpose |
|------|-------|---------|
| engine/types.ts | 23 | Type definitions: ColorMode, RenderConfig, AnimationState, RenderFrame |
| engine/bufferPool.ts | 22 | Reusable typed array buffers (z-buffer, luminance, chars, u-values, depth) |
| engine/renderer.ts | 222 | Core rendering engine: parametric math, rotation, projection, lighting, ANSI output |
| components/TerminalView.tsx | 235 | xterm.js integration, RAF loop, mouse/touch/keyboard event handlers |
| App.tsx | 9 | Root component with vignette + scanlines |
| main.tsx | 13 | React entry point |
| index.css | 81 | Global styles, scanlines, vignette, custom range input |

### Key Modules

**engine/renderer.ts**
- `createDefaultConfig()` — Factory for default render configuration
- `renderFrame()` — Main render loop: surface sampling → rotation → projection → lighting → ANSI output
- `normalizeVec()` — Vector normalization utility
- `hslToRgb()` — HSL to RGB color conversion for rainbow/synthwave modes
- `colorize()` — Maps intensity + metadata to ANSI 24-bit color codes

**engine/bufferPool.ts**
- `getBuffers()` — Returns reused typed arrays, resizing only when terminal dimensions change

**components/TerminalView.tsx**
- xterm.js terminal lifecycle management
- FitAddon for responsive terminal sizing
- WebglAddon for GPU-accelerated rendering (with canvas fallback)
- Mouse/touch drag handling with rotation state
- Keyboard shortcut handler
- Boot sequence animation
- requestAnimationFrame render loop

---

## Color Modes

| Mode | Description | Mapping Strategy |
|------|-------------|------------------|
| **Green** | Classic terminal phosphor | Pure luminance → green channel (0, lum, 0) |
| **Rainbow** | Full spectrum hue cycle | hue = (u / 2π) · 360°, HSL(hue, 90%, 12-67%) |
| **Synthwave** | Magenta-cyan gradient | hue = 180° + (u / 2π) · 140°, HSL(hue, 85%, 12-62%) |
| **Depth** | Blue (near) to red (far) | hue = (1 - depth) · 240°, HSL(hue, 80%, 12-62%) |
| **White** | Monochrome luminance | RGB(lum, lum, lum) |

> All modes clamp minimum brightness to 18 to prevent pure black on dark backgrounds.

---

## Getting Started

### Prerequisites
- **Bun** 1.0+ (or Node.js 18+)
- **Docker** + **Docker Compose** (for deployment)

### Local Development

```bash
# Navigate to frontend directory
cd ascii-art/frontend

# Install dependencies
bun install

# Start dev server (http://localhost:4173)
bun run dev
```

### Docker Deployment

```bash
# Build and start container
docker compose up -d --build frontend

# Check status
docker compose ps

# View logs
docker compose logs -f frontend --tail 50

# Stop container
docker compose down
```

Container is automatically configured with Traefik labels for reverse proxy + Let's Encrypt SSL when deployed in production.

---

## Tech Stack

| Technology | Version | Role |
|------------|---------|------|
| **React** | 18.3 | UI framework |
| **TypeScript** | 5.7 | Type-safe development |
| **Vite** | 6.0 | Build tool + dev server |
| **Bun** | 1.0 | Runtime + package manager |
| **xterm.js** | 5.5 | Terminal emulator |
| **xterm.js WebGL Addon** | 0.18 | GPU-accelerated rendering |
| **xterm.js Fit Addon** | 0.10 | Responsive terminal sizing |
| **Tailwind CSS** | 3.4 | Utility-first CSS |
| **Docker** | 24+ | Containerization |
| **Traefik** | 2.10+ | Reverse proxy + SSL |

---

## Inspired By

This project is inspired by **Andy Sloane's [donut.c](https://www.a1k0n.net/2011/10/10/donut-math.html)** — a masterclass in creative coding that renders a 3D torus in pure ASCII using the same fundamental techniques demonstrated here. Andy's work has inspired countless developers to explore the intersection of mathematics, graphics, and creative constraints.

If you enjoyed this project, I highly recommend reading Andy's original article to understand the beautiful mathematics behind parametric surface rendering.

---

## License

MIT License - see LICENSE file for details.

---

## Author

**Vitor Plentz**  
Portfolio: [vitorplentz.com.br](https://vitorplentz.com.br)  
GitHub: [@Pl3ntz](https://github.com/Pl3ntz)

---

**Built with curiosity and love for retro computing aesthetics.**
