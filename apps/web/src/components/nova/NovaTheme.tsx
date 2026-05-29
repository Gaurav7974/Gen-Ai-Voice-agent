import React, { ReactNode } from 'react';

interface NovaThemeProps {
  children: ReactNode;
}

export const NovaTheme: React.FC<NovaThemeProps> = ({ children }) => {
  return (
    <>
      <style>{`
        .nova-theme {
          --bg: #0b0d14;
          --surface: #111420;
          --surface-hover: #1a1f2e;
          --accent: #f5622e;
          --accent-light: #fef0eb;
          --accent-dark: #e04a1a;
          --accent-glow: rgba(245, 98, 46, 0.15);
          --teal: #0fa87e;
          --teal-glow: rgba(15, 168, 126, 0.15);
          --text: #f5f5f5;
          --text-secondary: #a0a0a0;
          --text-muted: #707070;
          --border: #2a2f3f;
          --border-light: #1a1f2e;
          --border-dark: #3a3f4f;
        }

        .nova-theme * {
          --bg: #0b0d14;
          --surface: #111420;
          --surface-hover: #1a1f2e;
          --text: #f5f5f5;
          --text-secondary: #a0a0a0;
          --text-muted: #707070;
          --border: #2a2f3f;
        }
      `}</style>
      <div className="nova-theme">
        {children}
      </div>
    </>
  );
};

export const novaThemeStyles = `
  .nova-theme {
    --bg: #0b0d14;
    --surface: #111420;
    --surface-hover: #1a1f2e;
    --accent: #f5622e;
    --accent-light: #fef0eb;
    --accent-dark: #e04a1a;
    --accent-glow: rgba(245, 98, 46, 0.15);
    --teal: #0fa87e;
    --teal-glow: rgba(15, 168, 126, 0.15);
    --text: #f5f5f5;
    --text-secondary: #a0a0a0;
    --text-muted: #707070;
    --border: #2a2f3f;
    --border-light: #1a1f2e;
    --border-dark: #3a3f4f;
    background-color: var(--bg);
    color: var(--text);
  }

  .nova-theme h1,
  .nova-theme h2,
  .nova-theme h3,
  .nova-theme h4,
  .nova-theme h5,
  .nova-theme h6 {
    color: var(--text);
  }

  .nova-theme p {
    color: var(--text-secondary);
  }

  .nova-theme input,
  .nova-theme textarea,
  .nova-theme select {
    background-color: var(--surface);
    color: var(--text);
    border-color: var(--border);
  }

  .nova-theme input::placeholder,
  .nova-theme textarea::placeholder {
    color: var(--text-muted);
  }

  .nova-theme button {
    background-color: var(--accent);
    color: white;
  }

  .nova-theme button:hover {
    background-color: var(--accent-dark);
  }

  .nova-theme .card,
  .nova-theme [role="dialog"] {
    background-color: var(--surface);
    border-color: var(--border);
  }

  .nova-theme .border {
    border-color: var(--border);
  }
`;
