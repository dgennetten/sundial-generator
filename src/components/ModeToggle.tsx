// src/components/ModeToggle.tsx
import React from 'react';

export type UiMode = 'basic' | 'advanced';

interface Props {
  mode: UiMode;
  onChange: (mode: UiMode) => void;
}

const ModeToggle: React.FC<Props> = ({ mode, onChange }) => (
  <div className="mode-toggle" role="radiogroup" aria-label="Interface mode">
    {(['basic', 'advanced'] as const).map((m) => (
      <button
        key={m}
        type="button"
        role="radio"
        aria-checked={mode === m}
        className={`mode-toggle-btn${mode === m ? ' active' : ''}`}
        onClick={() => mode !== m && onChange(m)}
      >
        {m === 'basic' ? 'Basic' : 'Advanced'}
      </button>
    ))}
  </div>
);

export default ModeToggle;
