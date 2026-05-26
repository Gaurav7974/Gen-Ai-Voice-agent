type SlideButtonProps = {
  label: string
  href?: string
  variant?: 'primary' | 'ghost' | 'ghost-nav'
  showArrow?: boolean
  className?: string
}

function ArrowIcon() {
  return (
    <svg
      className="w-4 h-4 text-black"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        d="M5 12h14M12 5l7 7-7 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PrimarySlideRow({ label, showArrow }: { label: string; showArrow: boolean }) {
  return (
    <div className="flex items-center gap-2 h-[24px]">
      <span className="text-black font-medium whitespace-nowrap">{label}</span>
      {showArrow && <ArrowIcon />}
    </div>
  )
}

export function SlideButton({
  label,
  href = '#',
  variant = 'primary',
  showArrow = false,
  className = '',
}: SlideButtonProps) {
  if (variant === 'ghost-nav') {
    return (
      <a
        href={href}
        className={`group relative flex items-center justify-center bg-white/5 border border-white/10 backdrop-blur-md rounded-lg px-6 h-[40px] overflow-hidden no-underline transition-all duration-200 hover:bg-white/15 hover:border-white/25 ${className}`}
      >
        <div className="flex flex-col items-center h-[20px] overflow-hidden pointer-events-none">
          <div className="flex flex-col transition-transform duration-300 ease-in-out group-hover:-translate-y-[24px]">
            <p className="text-white text-sm font-medium leading-[20px] text-center m-0 h-[20px] whitespace-nowrap">
              {label}
            </p>
            <p className="text-white text-sm font-medium leading-[20px] text-center m-0 h-[20px] whitespace-nowrap mt-[4px]">
              {label}
            </p>
          </div>
        </div>
      </a>
    )
  }

  if (variant === 'ghost') {
    return (
      <a
        href={href}
        className={`group/btn relative inline-flex items-center justify-center bg-white rounded-lg px-8 h-[48px] overflow-hidden no-underline transition-all duration-200 hover:bg-neutral-100 ${className}`}
      >
        <div className="flex flex-col items-center h-[24px] overflow-hidden pointer-events-none">
          <div className="flex flex-col transition-transform duration-300 ease-in-out group-hover/btn:-translate-y-[28px]">
            <PrimarySlideRow label={label} showArrow={showArrow} />
            <div className="mt-[4px]">
              <PrimarySlideRow label={label} showArrow={showArrow} />
            </div>
          </div>
        </div>
      </a>
    )
  }

  return (
    <a
      href={href}
      className={`group relative flex items-center justify-center bg-white rounded-lg px-8 h-[48px] overflow-hidden no-underline transition-all duration-200 hover:bg-neutral-100 ${className}`}
    >
      <div className="flex flex-col items-center h-[24px] overflow-hidden pointer-events-none">
        <div className="flex flex-col transition-transform duration-300 ease-in-out group-hover:-translate-y-[28px]">
          <PrimarySlideRow label={label} showArrow={showArrow} />
          <div className="mt-[4px]">
            <PrimarySlideRow label={label} showArrow={showArrow} />
          </div>
        </div>
      </div>
    </a>
  )
}
