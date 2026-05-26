type IconProps = { className?: string }

export function MicIcon({ className = 'w-[18px] h-[18px]' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path
        d="M5 11v1a7 7 0 0 0 14 0v-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M12 19v2M9 21h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function SendIcon({ className = 'w-[18px] h-[18px]' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h12M13 8l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function VoiceBadgeIcon({ className = 'w-3 h-3' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5a2.5 2.5 0 0 0-2.5 2.5v3A2.5 2.5 0 0 0 8 9.5a2.5 2.5 0 0 0 2.5-2.5v-3A2.5 2.5 0 0 0 8 1.5z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="M4 8.5a4 4 0 0 0 8 0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

export function NovaAvatar({
  speaking = false,
  thinking = false,
}: {
  speaking?: boolean
  thinking?: boolean
}) {
  const active = speaking || thinking

  return (
    <div className="relative shrink-0 w-8 h-8">
      {active && (
        <span
          className={`absolute -inset-0.5 rounded-[10px] border border-brand-primary/35 ${
            speaking ? 'chat-avatar-ring-speaking' : 'chat-avatar-ring-thinking'
          }`}
        />
      )}
      <div
        className={`relative w-8 h-8 rounded-[10px] flex items-center justify-center text-[11px] font-semibold tracking-tight ${
          speaking
            ? 'bg-brand-primary text-[rgb(9,9,11)]'
            : 'bg-[rgb(18,20,22)] border border-white/10 text-brand-primary'
        }`}
      >
        N
      </div>
    </div>
  )
}

export function UserAvatar() {
  return (
    <div className="shrink-0 w-8 h-8 rounded-[10px] bg-[rgb(28,28,32)] border border-white/10 flex items-center justify-center text-[11px] font-medium text-white/60">
      Y
    </div>
  )
}
