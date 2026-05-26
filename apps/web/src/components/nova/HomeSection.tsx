import { HeroHeading } from './HeroHeading'
import { Navigation } from './Navigation'
import { VoiceAgentChatPreview } from './VoiceAgentChatPreview'

export function HomeSection() {
  return (
    <section
      id="home"
      className="relative flex flex-col items-center justify-center w-full min-h-[70vh] overflow-hidden pt-32 pb-16 px-10"
    >
      <Navigation />

      <div className="relative z-10 w-full max-w-[1200px] flex flex-col items-center pt-6 gap-12">
        <HeroHeading />
        <VoiceAgentChatPreview />
      </div>
    </section>
  )
}
