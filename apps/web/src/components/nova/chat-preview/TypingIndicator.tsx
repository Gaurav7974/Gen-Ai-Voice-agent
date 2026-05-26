import { CHAT } from './chatLayout'
import { NovaAvatar } from './VoiceIcons'

export function TypingIndicator() {
  return (
    <div className={`flex items-end ${CHAT.avatarGap} chat-msg-enter ${CHAT.bubbleMax}`}>
      <NovaAvatar thinking />
      <div className={`${CHAT.bubblePad} ${CHAT.innerRadius} rounded-bl-none border border-white/[0.1] bg-white/[0.04] shadow-lg w-fit`}>
        <div className="flex items-center gap-1.5 h-[18px] px-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="chat-typing-dot w-1.5 h-1.5 rounded-full bg-brand-primary/60"
              style={{ animationDelay: `${i * 0.14}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
