import { WaveformBars } from './WaveformBars'

export function SpeakingPill() {
  return (
    <div className="inline-flex items-center h-8 gap-2.5 rounded-full border border-brand-primary/20 bg-brand-primary/[0.06] pl-2.5 pr-3.5">
      <WaveformBars variant="agent" bars={5} className="h-3.5" />
      <span className="text-[11px] font-medium text-brand-primary leading-none">
        Speaking
      </span>
    </div>
  )
}
