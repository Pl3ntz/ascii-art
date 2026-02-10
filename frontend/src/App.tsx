import TerminalView from "./components/TerminalView"

export default function App() {
  return (
    <div className="vignette scanlines">
      <TerminalView />
      <div className="fixed bottom-3 right-4 z-50 flex items-center gap-3 font-mono text-[10px] tracking-wider opacity-40 hover:opacity-80 transition-opacity">
        <span className="text-neutral-500">
          [space] pause &middot; [1-5] colors &middot; drag to rotate
        </span>
        <a
          href="https://vitorplentz.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-500/70 hover:text-green-400 transition-colors"
        >
          vitorplentz.com.br
        </a>
      </div>
    </div>
  )
}
