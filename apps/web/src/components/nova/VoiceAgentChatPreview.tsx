import { useEffect, useRef, type ElementType } from 'react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import { ChatMessage, ListeningBubble } from './chat-preview/ChatMessage'
import { CHAT } from './chat-preview/chatLayout'
import { TypingIndicator } from './chat-preview/TypingIndicator'
import { MicIcon, SendIcon } from './chat-preview/VoiceIcons'
import { WaveformBars } from './chat-preview/WaveformBars'
import { useChatDemo } from './chat-preview/useChatDemo'

function AmbientGlow() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <div className="absolute -top-[320px] left-1/2 -translate-x-1/2 w-[1100px] h-[580px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#ffffff20_1px,transparent_1px)] bg-[size:1px_8px] [mask-image:linear-gradient(to_right,black_1px,transparent_1px)] [mask-size:56px_100%]" />
      </div>
      <div className="absolute -top-[120px] left-1/2 -translate-x-1/2 w-[640px] h-[240px] bg-brand-primary/20 blur-[100px] rounded-full" />
      <div className="absolute -top-px left-1/2 -translate-x-1/2 w-[65%] h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  )
}

function WindowChrome() {
  return (
    <div className="flex items-center gap-2 shrink-0" aria-hidden>
      <span className="w-2.5 h-2.5 rounded-full bg-white/10 border border-white/5" />
      <span className="w-2.5 h-2.5 rounded-full bg-white/10 border border-white/5" />
      <span className="w-2.5 h-2.5 rounded-full bg-white/10 border border-white/5" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-10 mx-auto max-w-[32rem]">
      <div className="relative group mb-8">
        <div className="absolute inset-0 bg-brand-primary/25 blur-3xl rounded-full scale-90 group-hover:scale-110 transition-transform duration-1000" />
        <div className="relative w-16 h-16 rounded-[20px] border border-white/[0.1] bg-gradient-to-b from-white/[0.08] to-transparent flex items-center justify-center shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-brand-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <MicIcon className="w-7 h-7 text-brand-primary" />
        </div>
      </div>
      <p className="text-[19px] font-bold text-white/90 tracking-tight leading-tight">
        Voice session ready
      </p>
      <p className="mt-4 text-[15px] text-white/30 leading-[1.65] max-w-[300px] font-medium">
        Speak or type — Nova understands context and executes next steps autonomously.
      </p>
      <div className="mt-8 flex gap-3">
        {['Ask about risk', 'Start ops review'].map((hint) => (
          <span key={hint} className="px-3 py-1.5 rounded-full border border-white/[0.05] bg-white/[0.02] text-[11px] font-bold text-white/20 uppercase tracking-widest">
            {hint}
          </span>
        ))}
      </div>
    </div>
  )
}

function GridTexture() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.03]" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
    </div>
  )
}

function SidebarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon?: ElementType
  label: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12px] font-semibold text-white/40 hover:text-white/80 hover:bg-white/[0.03] transition-all duration-200 group"
    >
      {Icon && <Icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />}
      {label}
    </button>
  )
}

export function VoiceAgentChatPreview() {
  const ref = useScrollAnimation<HTMLDivElement>()
  const threadRef = useRef<HTMLDivElement>(null)
  const { messages, phase, showTyping, speakingId, listeningPreview } =
    useChatDemo()

  const micActive = phase === 'listening'


  useEffect(() => {
    const el = threadRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    })
  }, [messages, showTyping, listeningPreview, speakingId])

  const showThread = messages.length > 0 || listeningPreview || showTyping

  return (
    <div ref={ref} className="relative z-10 w-full max-w-[1100px] h-[660px]">
      <AmbientGlow />

      <div className={`relative z-10 w-full h-full ${CHAT.radius} p-px bg-gradient-to-b from-white/[0.15] via-white/[0.05] to-white/[0.1] shadow-2xl overflow-hidden`}>
        <div className={`absolute inset-px ${CHAT.innerRadius} border border-white/[0.03] pointer-events-none z-20`} />
        
        <div className={`w-full h-full ${CHAT.innerRadius} bg-[rgb(11,11,13)] flex flex-col overflow-hidden relative`}>
          {/* Title bar */}
          <header className="h-12 shrink-0 flex items-center gap-4 px-5 border-b border-white/[0.05] bg-[rgb(14,14,16)] z-30">
            <WindowChrome />
            <div className="flex-1 flex items-center justify-center min-w-0">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.04]">
                <div className="w-1 h-1 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(0,195,201,0.5)] animate-pulse" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                  Nova — Session Live
                </span>
              </div>
            </div>
            <div className="w-[100px] flex justify-end" />
          </header>

          <div className="flex flex-1 min-h-0 z-10">
            {/* Sidebar */}
            <aside
              className={`hidden lg:flex ${CHAT.sidebarW} shrink-0 flex-col border-r border-white/[0.04] bg-[rgb(9,9,11)]`}
            >
              <div className="px-5 pt-6 pb-4 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/15">
                  History
                </p>
                <button className="w-5 h-5 rounded-md border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-white/30 hover:text-white/80 hover:bg-white/[0.05] transition-all">
                  <span className="text-[14px] leading-none">+</span>
                </button>
              </div>
              
              <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-hidden">
                <button
                  type="button"
                  className="group relative text-left rounded-lg px-3 py-2.5 bg-white/[0.03] border border-white/[0.04] transition-all duration-300 shadow-sm"
                >
                  <div className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-r-full bg-brand-primary" />
                  <p className="text-[12px] font-bold text-white/90 truncate pl-1">
                    Logistics rollout
                  </p>
                </button>

                {['Q4 risk review', 'Ops handoff'].map((title) => (
                  <button
                    key={title}
                    type="button"
                    className="group text-left rounded-lg px-3 py-2.5 text-white/20 hover:text-white/60 hover:bg-white/[0.01] transition-all duration-200"
                  >
                    <p className="text-[12px] font-medium truncate group-hover:translate-x-0.5 transition-transform duration-200">
                      {title}
                    </p>
                  </button>
                ))}
              </nav>

              <div className="p-4 border-t border-white/[0.03]">
                <SidebarButton label="Settings" />
                <SidebarButton label="Support" />
              </div>
            </aside>

            {/* Main panel */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[rgb(12,12,14)] relative">
              <GridTexture />
              
              {/* In-panel header */}
              <div className="shrink-0 flex items-center justify-between h-14 px-6 border-b border-white/[0.04] bg-[rgb(12,12,14)]/50 backdrop-blur-md relative z-20">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-white/90 leading-none tracking-tight">
                      Logistics rollout
                    </h3>
                    <p className="text-[10px] font-bold text-white/15 uppercase tracking-[0.15em] mt-1.5">Enterprise Node · US-East</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex p-0.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                    <button className="h-6 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider text-brand-primary bg-brand-primary/[0.08] shadow-sm">Voice</button>
                    <button className="h-6 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider text-white/20 hover:text-white/40 transition-colors">Chat</button>
                  </div>
                  <div className="w-px h-4 bg-white/[0.08] mx-1" />
                  <button className="w-8 h-8 rounded-lg border border-white/[0.05] flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/[0.02] transition-all">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={threadRef}
                className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar ${CHAT.threadPad}`}
              >
                <div className={`flex flex-col ${CHAT.threadGap} mx-auto w-full max-w-[42rem]`}>
                  {!showThread && <EmptyState />}

                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      isSpeaking={speakingId === msg.id}
                    />
                  ))}

                  {listeningPreview && <ListeningBubble />}
                  {showTyping && <TypingIndicator />}
                </div>
              </div>

              {/* Composer */}
              <footer className="shrink-0 px-6 py-3.5 border-t border-white/[0.06] bg-[rgb(10,10,12)]/80 backdrop-blur-sm">
                <div
                  className={`flex items-center gap-2.5 h-9.5 px-2.5 ${CHAT.innerRadius} border transition-all duration-500 shadow-lg ${
                    micActive
                      ? 'border-brand-primary/40 bg-brand-primary/[0.06] shadow-brand-primary/5'
                      : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.04]'
                  }`}
                >
                  <button
                    type="button"
                    aria-label={micActive ? 'Listening' : 'Start voice input'}
                    className={`group relative shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                      micActive
                        ? 'bg-brand-primary text-[rgb(9,9,11)] chat-mic-active'
                        : 'bg-white/[0.05] text-brand-primary border border-white/[0.08] hover:scale-105 active:scale-95'
                    }`}
                  >
                    {micActive && (
                      <span className="absolute inset-0 rounded-full border border-brand-primary/40 chat-mic-ring" />
                    )}
                    <MicIcon className="w-3.5 h-3.5" />
                    <div className="absolute inset-0 rounded-full bg-brand-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </button>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p
                      className={`text-[12px] font-medium leading-none truncate transition-colors duration-300 ${
                        micActive ? 'text-brand-primary' : 'text-white/25'
                      }`}
                    >
                      {micActive ? 'Listening…' : 'Message Nova…'}
                    </p>
                    {micActive && (
                      <p className="text-[8.5px] font-bold text-brand-primary/50 uppercase tracking-widest mt-1 animate-pulse">
                        Processing
                      </p>
                    )}
                  </div>

                  <div className="hidden sm:flex items-center gap-2.5 shrink-0">
                    <WaveformBars
                      variant={micActive ? 'listening' : 'idle'}
                      className="opacity-60 scale-[0.8] origin-right"
                    />
                    <div className="w-px h-3 bg-white/[0.08]" />
                    <button
                      type="button"
                      aria-label="Send message"
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white/20 hover:text-white/70 hover:bg-white/[0.08] transition-all duration-300 active:scale-95"
                    >
                      <SendIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
