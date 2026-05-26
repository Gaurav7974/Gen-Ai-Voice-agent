type WaveformBarsProps = {
  bars?: number
  variant?: 'agent' | 'idle' | 'listening'
  className?: string
}

const HEIGHTS = {
  agent: [0.45, 0.85, 0.6, 1, 0.7],
  idle: [0.3, 0.45, 0.35, 0.5, 0.4],
  listening: [0.25, 0.5, 0.4, 0.65, 0.35],
}

const DELAYS = ['0s', '0.11s', '0.05s', '0.14s', '0.08s']

export function WaveformBars({
  bars,
  variant = 'agent',
  className = '',
}: WaveformBarsProps) {
  const heights = HEIGHTS[variant]
  const count = bars ?? heights.length
  const color =
    variant === 'idle' ? 'bg-white/20' : 'bg-brand-primary'

  const animClass =
    variant === 'idle' ? 'chat-wave-idle' : variant === 'listening' ? 'chat-wave-listen' : 'chat-wave-active'

  return (
    <div className={`inline-flex items-end gap-[2px] h-4 ${className}`} aria-hidden>
      {heights.slice(0, count).map((h, i) => (
        <span
          key={i}
          className={`w-[2px] rounded-full origin-bottom ${color} ${animClass}`}
          style={{
            height: `${h * 14}px`,
            animationDelay: DELAYS[i % DELAYS.length],
          }}
        />
      ))}
    </div>
  )
}
