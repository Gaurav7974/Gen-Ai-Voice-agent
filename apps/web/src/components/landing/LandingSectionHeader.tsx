import type React from 'react';

type LandingSectionHeaderProps = {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
};

export default function LandingSectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className = '',
}: LandingSectionHeaderProps) {
  return (
    <header className={`lp-section-header lp-section-header--${align} fade-up ${className}`.trim()}>
      <p className="lp-section-eyebrow">{eyebrow}</p>
      <h2 className="lp-section-title">{title}</h2>
      {subtitle ? <p className="lp-section-sub">{subtitle}</p> : null}
    </header>
  );
}
