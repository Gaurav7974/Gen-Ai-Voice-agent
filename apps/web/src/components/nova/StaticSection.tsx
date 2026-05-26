const LOGOS = [
  'Vertex Core',
  'CloudPulse',
  'NeuralLink',
  'ApexSolutions',
  'ShieldFlow',
  'Quantas',
]

function LogoSet() {
  return (
    <div className="flex items-center gap-[84px] shrink-0">
      {LOGOS.map((name) => (
        <span key={name} className="text-white text-lg font-medium tracking-tight">
          {name}
        </span>
      ))}
    </div>
  )
}

export function StaticSection() {
  return (
    <section
      id="static"
      className="relative z-10 w-full flex flex-col items-center px-10 pb-32 -mt-2"
    >
      <div className="w-full max-w-[1200px] flex flex-col items-center gap-10">
        <div
          id="logo-section"
          className="w-full opacity-90 hover:opacity-100 transition-opacity duration-500"
        >
          <div className="flex flex-col lg:flex-row items-center gap-12 border-t border-white/5 pt-8">
            <div className="shrink-0 text-center lg:text-left min-w-[280px]">
              <h4 className="text-white text-lg font-medium tracking-tight">
                Empowering industries worldwide
              </h4>
            </div>

            <div className="flex-1 w-full h-[40px] relative overflow-hidden mask-marquee">
              <div className="animate-marquee flex flex-row items-center gap-[84px] h-full whitespace-nowrap">
                <LogoSet />
                <LogoSet />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
