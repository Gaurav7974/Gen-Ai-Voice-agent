import { useEffect, useState } from 'react'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  voice?: boolean
}

export type ChatPhase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'ready'

const SCRIPT: Omit<ChatMessage, 'id'>[] = [
  {
    role: 'user',
    voice: true,
    text: "What's blocking our enterprise rollout this week?",
  },
  {
    role: 'assistant',
    text: 'Three dependencies flagged: vendor API latency, a pending security review, and the ops handoff. Want me to draft an action plan?',
  },
  {
    role: 'user',
    voice: true,
    text: 'Yes — prioritize security and notify the ops lead.',
  },
  {
    role: 'assistant',
    text: 'On it. Scheduling sync, drafting the security brief, and pinging the ops lead now.',
  },
]

const LISTEN_MS = 2400
const THINK_MS = 1600
const SPEAK_MS = 3200
const GAP_MS = 500
const RESET_MS = 2800

type DemoSignal = { cancelled: boolean; timeouts: number[] }

function delay(ms: number, signal: DemoSignal) {
  return new Promise<void>((resolve) => {
    const id = window.setTimeout(() => {
      if (!signal.cancelled) resolve()
    }, ms)
    signal.timeouts.push(id)
  })
}

export function useChatDemo() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [phase, setPhase] = useState<ChatPhase>('idle')
  const [showTyping, setShowTyping] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [listeningPreview, setListeningPreview] = useState(false)

  useEffect(() => {
    const signal = { cancelled: false, timeouts: [] as number[] }

    async function runLoop() {
      await delay(900, signal)

      while (!signal.cancelled) {
        for (let i = 0; i < SCRIPT.length; i++) {
          const item = SCRIPT[i]
          const id = `msg-${i}-${Date.now()}`

          if (item.role === 'user') {
            setPhase('listening')
            setListeningPreview(true)
            await delay(LISTEN_MS, signal)
            if (signal.cancelled) return

            setListeningPreview(false)
            setMessages((prev) => [...prev, { ...item, id }])
            setPhase('ready')
            await delay(GAP_MS, signal)
          } else {
            setPhase('thinking')
            setShowTyping(true)
            await delay(THINK_MS, signal)
            if (signal.cancelled) return

            setShowTyping(false)
            setMessages((prev) => [...prev, { ...item, id }])
            setPhase('speaking')
            setSpeakingId(id)
            await delay(SPEAK_MS, signal)
            if (signal.cancelled) return

            setSpeakingId(null)
            setPhase('ready')
            await delay(GAP_MS, signal)
          }
        }

        setPhase('idle')
        await delay(RESET_MS, signal)
        if (signal.cancelled) return

        setMessages([])
        await delay(400, signal)
      }
    }

    runLoop()

    return () => {
      signal.cancelled = true
      signal.timeouts.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  const statusLabel =
    phase === 'listening'
      ? 'Listening…'
      : phase === 'thinking'
        ? 'Processing…'
        : phase === 'speaking'
          ? 'Nova is speaking'
          : phase === 'idle'
            ? 'Connected'
            : 'Ready'

  return {
    messages,
    phase,
    showTyping,
    speakingId,
    listeningPreview,
    statusLabel,
  }
}
