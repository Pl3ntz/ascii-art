import { useEffect, useRef, useCallback } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebglAddon } from "@xterm/addon-webgl"
import "@xterm/xterm/css/xterm.css"
import { renderFrame, createDefaultConfig } from "../engine/renderer"
import type { ColorMode } from "../engine/types"

const COLOR_MODES: readonly ColorMode[] = ['green', 'rainbow', 'synthwave', 'depth', 'white']

const BOOT_LINES: ReadonlyArray<{ readonly text: string; readonly delay: number }> = [
  { text: '\x1b[38;2;0;255;65m> MOBIUS STRIP v1.0\x1b[0m', delay: 80 },
  { text: '\x1b[38;2;0;130;0m  initializing render pipeline...\x1b[0m', delay: 350 },
  { text: '\x1b[38;2;0;130;0m  computing parametric surface...\x1b[0m', delay: 300 },
  { text: '\x1b[38;2;0;130;0m  loading webgl acceleration...\x1b[0m', delay: 250 },
  { text: '\x1b[38;2;0;255;65m  ready.\x1b[0m', delay: 450 },
]

export default function TerminalView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const bootedRef = useRef(false)

  const angleARef = useRef(0)
  const angleBRef = useRef(0)
  const angleCRef = useRef(0)

  const speedRef = useRef(1.0)
  const colorIdxRef = useRef(0)
  const pausedRef = useRef(false)

  const lightXRef = useRef(0)
  const lightYRef = useRef(1)

  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragAngleStartRef = useRef({ a: 0, b: 0 })
  const autoRotateRef = useRef(true)

  const animate = useCallback((time: number) => {
    const terminal = terminalRef.current
    if (!terminal) return
    rafRef.current = requestAnimationFrame(animate)
    if (!bootedRef.current) return

    const delta = time - lastTimeRef.current
    if (delta < 16) return  // ~60fps target
    lastTimeRef.current = time

    if (!pausedRef.current && autoRotateRef.current) {
      const dt = (delta / 1000) * speedRef.current
      angleARef.current += 0.4 * dt
      angleBRef.current += 0.5 * dt
      angleCRef.current += 0.3 * dt
    }

    const cols = terminal.cols
    const rows = terminal.rows
    const lx = lightXRef.current
    const ly = lightYRef.current
    const len = Math.sqrt(lx * lx + ly * ly + 1)

    const config = {
      ...createDefaultConfig(cols, rows),
      colorMode: COLOR_MODES[colorIdxRef.current],
      uStep: 0.009,
      vStep: 0.006,
      lightDirection: [lx / len, ly / len, -1 / len] as readonly [number, number, number],
    }

    const frame = renderFrame(config, {
      angleA: angleARef.current,
      angleB: angleBRef.current,
      angleC: angleCRef.current,
    })

    terminal.write(frame.output)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    const terminal = new Terminal({
      disableStdin: true,
      cursorBlink: false,
      cursorInactiveStyle: "none",
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 8,
      lineHeight: 1.0,
      scrollback: 0,
      allowTransparency: true,
      theme: {
        background: "#0a0a0a",
        foreground: "#e6edf3",
      },
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(containerRef.current)

    try {
      terminal.loadAddon(new WebglAddon())
    } catch {
      // canvas fallback
    }

    fitAddon.fit()
    terminal.attachCustomKeyEventHandler(() => false)
    terminalRef.current = terminal

    // Boot sequence
    const boot = async () => {
      terminal.write('\x1b[2J\x1b[H')
      for (const line of BOOT_LINES) {
        await new Promise<void>(r => setTimeout(r, line.delay))
        if (cancelled) return
        terminal.write('  ' + line.text + '\r\n')
      }
      await new Promise<void>(r => setTimeout(r, 600))
      if (cancelled) return
      terminal.write('\x1b[2J')
      bootedRef.current = true
    }
    boot()

    // Resize
    const handleResize = () => fitAddon.fit()
    window.addEventListener("resize", handleResize)

    // Mouse: reactive light + drag rotation
    const container = containerRef.current!

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - dragStartRef.current.x
        const dy = e.clientY - dragStartRef.current.y
        angleBRef.current = dragAngleStartRef.current.b + dx * 0.008
        angleARef.current = dragAngleStartRef.current.a + dy * 0.008
        return
      }
      lightXRef.current = (e.clientX / window.innerWidth - 0.5) * 2
      lightYRef.current = -(e.clientY / window.innerHeight - 0.5) * 2
    }

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true
      autoRotateRef.current = false
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      dragAngleStartRef.current = { a: angleARef.current, b: angleBRef.current }
      e.preventDefault()
    }

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      setTimeout(() => { autoRotateRef.current = true }, 2000)
    }

    // Touch support
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      isDraggingRef.current = true
      autoRotateRef.current = false
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      dragAngleStartRef.current = { a: angleARef.current, b: angleBRef.current }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !isDraggingRef.current) return
      const dx = e.touches[0].clientX - dragStartRef.current.x
      const dy = e.touches[0].clientY - dragStartRef.current.y
      angleBRef.current = dragAngleStartRef.current.b + dx * 0.008
      angleARef.current = dragAngleStartRef.current.a + dy * 0.008
    }

    const handleTouchEnd = () => {
      isDraggingRef.current = false
      setTimeout(() => { autoRotateRef.current = true }, 2000)
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          pausedRef.current = !pausedRef.current
          break
        case '1': case '2': case '3': case '4': case '5':
          colorIdxRef.current = Number(e.key) - 1
          break
        case '+': case '=':
          speedRef.current = Math.min(3, speedRef.current + 0.2)
          break
        case '-':
          speedRef.current = Math.max(0.2, speedRef.current - 0.2)
          break
      }
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('keydown', handleKeyDown)

    lastTimeRef.current = performance.now()
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelled = true
      window.removeEventListener("resize", handleResize)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      cancelAnimationFrame(rafRef.current)
      terminal.dispose()
    }
  }, [animate])

  return (
    <div className="w-screen h-screen overflow-hidden cursor-grab active:cursor-grabbing">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
