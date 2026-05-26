import { useEffect, useState } from 'react';

const SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&auto=format&fit=crop&q=80',
    alt: 'Voice AI research environment',
  },
  {
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80',
    alt: 'Team collaborating with technology',
  },
  {
    url: 'https://images.unsplash.com/photo-1521737852567-6949f5f9f962?w=1200&auto=format&fit=crop&q=80',
    alt: 'Connected workspace',
  },
] as const;

const ACCORDION_STEPS = [
  {
    title: 'Step 1: Customize Your Voice Agent',
    desc: 'Choose the languages and features you need—from native Indic speech processing (Hinglish, Tamil, Telugu, Hindi) to selecting a vocal persona like the Ratan voice model.',
  },
  {
    title: 'Step 2: Connect Your Knowledge Base',
    desc: 'Upload files or hook up your document API. ChromaDB and BM25 hybrid semantic search ground your agent in accurate facts with zero hallucination risk.',
  },
  {
    title: 'Step 3: Connect & Control Latency',
    desc: 'Experience lightning-fast sub-1.5s voice interactions. The system transcribes audio, retrieves context, and streams grounded responses in real time.',
  },
  {
    title: 'Step 4: Enjoy Intelligent Living',
    desc: 'Deploy natural voice communication that works every day—built on the fastest, most secure infrastructure for Bharat-scale teams.',
  },
] as const;

const PHONE_FEATURES = [
  {
    label: 'Languages',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
          fill="currentColor"
        />
        <path
          d="M19 11a7 7 0 0 1-14 0"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path d="M12 18v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Security',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3 5 6v6c0 4.5 3.2 8.7 7 9.8 3.8-1.1 7-5.3 7-9.8V6l-7-3Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path d="M9.5 12.5 11.5 14.5 15 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Knowledge',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
        <path d="M20 20l-4.2-4.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Latency',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
] as const;

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function LyraMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2l2.2 6.8H21l-5.5 4 2.1 6.7L12 16.8 6.4 19.5l2.1-6.7L3 8.8h6.8L12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

type HowItWorksSectionProps = {
  onStart: () => void;
};

export default function HowItWorksSection({ onStart }: HowItWorksSectionProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % SLIDES.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  const toggleStep = (index: number) => {
    setActiveStep((prev) => (prev === index ? -1 : index));
  };

  return (
    <div className="how-split-container fade-up">
      <div className="how-left-box">
        <div className="how-device-wrapper">
          <div className="how-phone">
            <div className="how-phone-logo">
              <div className="how-phone-star">
                <LyraMark />
              </div>
              <h2>Lyra</h2>
            </div>

            <div className="how-slider">
              <div
                className="how-slides"
                style={{ transform: `translateX(-${slideIndex * 100}%)` }}
              >
                {SLIDES.map((slide) => (
                  <div
                    key={slide.url}
                    className="how-slide"
                    style={{ backgroundImage: `url('${slide.url}')` }}
                    role="img"
                    aria-label={slide.alt}
                  />
                ))}
              </div>
              <div className="how-slider-dots" role="tablist" aria-label="Feature previews">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={slideIndex === i}
                    aria-label={`Slide ${i + 1}`}
                    className={`how-slider-dot ${slideIndex === i ? 'is-active' : ''}`}
                    onClick={() => setSlideIndex(i)}
                  />
                ))}
              </div>
            </div>

            <div className="how-phone-grid">
              {PHONE_FEATURES.map((item) => (
                <div key={item.label} className="how-phone-item">
                  <div className="how-phone-circle">{item.svg}</div>
                  <p>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="how-right-box">
        <div className="how-accordion">
          {ACCORDION_STEPS.map((step, index) => {
            const isActive = activeStep === index;
            return (
              <div
                key={step.title}
                className={`how-accordion-item ${isActive ? 'active' : ''}`}
              >
                <button
                  type="button"
                  className="how-accordion-header"
                  onClick={() => toggleStep(index)}
                  aria-expanded={isActive}
                >
                  <span className="how-accordion-title">{step.title}</span>
                  <ChevronDown className="how-accordion-chevron" />
                </button>
                <div className="how-accordion-content">
                  <div className="how-accordion-content-inner">
                    <p>{step.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="how-bottom">
          <button type="button" className="how-btn" onClick={onStart}>
            Start now
          </button>
          <div className="how-time">
            <ClockIcon />
            <span>2 mins to complete setup</span>
          </div>
        </div>
      </div>
    </div>
  );
}
