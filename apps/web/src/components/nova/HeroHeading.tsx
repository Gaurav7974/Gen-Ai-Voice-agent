import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import { SlideButton } from './SlideButton'

export function HeroHeading() {
  const ref = useScrollAnimation<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className="relative z-20 flex flex-col items-center text-center gap-6 max-w-[850px]"
    >
      <h1 className="text-4xl lg:text-[58px] font-medium leading-[1.1] tracking-[-0.04em] text-white">
        Scale your operations with autonomous AI agents
      </h1>
      <p className="text-lg lg:text-18px text-text-secondary max-w-[500px] leading-[1.6]">
        Deploy custom AI agents for complex workflows.
        <br />
        Focus on strategy while Nova handles the execution.
      </p>
      <div className="mt-2">
        <SlideButton label="Get started today" showArrow />
      </div>
    </div>
  )
}
