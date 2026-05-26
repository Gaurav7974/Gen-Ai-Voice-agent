import type { ChatMessage as ChatMessageType } from './useChatDemo'
import { CHAT } from './chatLayout'
import { SpeakingPill } from './SpeakingPill'
import { NovaAvatar, UserAvatar, VoiceBadgeIcon } from './VoiceIcons'

type ChatMessageProps = {
  message: ChatMessageType
  isSpeaking: boolean
}

const KEYWORD_PATTERN =
  /(vendor API latency|security review|ops handoff|security brief|ops lead)/gi

const KEYWORD_SET = new Set([
  'vendor api latency',
  'security review',
  'ops handoff',
  'security brief',
  'ops lead',
])

function formatAssistantText(text: string) {
  const parts = text.split(KEYWORD_PATTERN)
  return parts.map((part, i) =>
    KEYWORD_SET.has(part.toLowerCase()) ? (
      <strong key={i} className="font-medium text-white">
        {part}
      </strong>
    ) : (
      part
    ),
  )
}

function MessageMeta({
  name,
  voice,
  align,
}: {
  name: string
  voice?: boolean
  align: 'left' | 'right'
}) {
  return (
    <div
      className={`flex items-center gap-2.5 mb-2 ${
        align === 'right' ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-white/30 leading-none">
        {name}
      </span>
      {voice && (
        <span className="inline-flex items-center gap-1.5 h-5.5 px-2 rounded-full bg-brand-primary/[0.08] border border-brand-primary/20 text-[9px] font-bold uppercase tracking-tight text-brand-primary/80 leading-none">
          <VoiceBadgeIcon className="w-2.5 h-2.5" />
          Voice
        </span>
      )}
    </div>
  )
}

export function ChatMessage({ message, isSpeaking }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <article
      className={`chat-msg-enter w-full flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div
        className={`flex items-end ${CHAT.avatarGap} ${CHAT.bubbleMax} ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        <div className="shrink-0 pb-1">
          {isUser ? <UserAvatar /> : <NovaAvatar speaking={isSpeaking} />}
        </div>

        <div className={`flex flex-col min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
          <MessageMeta
            name={isUser ? 'You' : 'Nova'}
            voice={message.voice}
            align={isUser ? 'right' : 'left'}
          />

          <div
            className={`${CHAT.bubblePad} ${CHAT.innerRadius} border text-[14px] leading-[1.55] text-white/90 shadow-xl transition-all duration-300 w-fit ${
              isUser
                ? 'rounded-br-none bg-[rgb(24,24,28)] border-white/[0.1] shadow-black/20 selection:bg-brand-primary/20'
                : 'rounded-bl-none bg-gradient-to-br from-brand-primary/[0.12] to-brand-primary/[0.04] border-brand-primary/25 shadow-brand-primary/[0.03] ring-1 ring-brand-primary/5'
            }`}
          >
            <p className="m-0 tracking-tight">{isUser ? message.text : formatAssistantText(message.text)}</p>
          </div>
        </div>
      </div>

      {!isUser && isSpeaking && (
        <div className={`${CHAT.metaOffset} mt-4 chat-speaking-enter w-fit`}>
          <SpeakingPill />
        </div>
      )}
    </article>
  )
}

export function ListeningBubble() {
  return (
    <article className="chat-msg-enter w-full flex justify-end">
      <div className={`flex items-end ${CHAT.avatarGap} flex-row-reverse ${CHAT.bubbleMax}`}>
        <div className="shrink-0 pb-1">
          <UserAvatar />
        </div>
        <div className="flex flex-col items-end w-fit">
          <MessageMeta name="You" align="right" />
          <div
            className={`${CHAT.bubblePad} ${CHAT.innerRadius} rounded-br-none border border-brand-primary/30 bg-brand-primary/[0.06] shadow-[0_0_20px_-5px_rgba(0,195,201,0.2)] flex items-center gap-4 w-fit min-w-[160px]`}
          >
            <span className="flex gap-1 items-center h-5" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="chat-wave-listen w-[3.5px] rounded-full bg-brand-primary/70 origin-bottom"
                  style={{
                    height: `${[8, 14, 20, 12, 10][i]}px`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </span>
            <span className="text-[13px] font-semibold text-brand-primary tracking-tight leading-none">
              Listening…
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
