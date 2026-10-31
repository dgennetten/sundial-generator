// src/components/LanguagePicker.tsx
// Flag-and-name language dropdown shown beside the Basic/Advanced toggle in both modes.
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { languages } from './WelcomeDialog';

const flagUrl = (countryCode: string) => `https://flagicons.lipis.dev/flags/4x3/${countryCode}.svg`;

interface Props {
  language: string;
  label: string;
  onChange: (language: string) => void;
}

const LanguagePicker: React.FC<Props> = ({ language, label, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = languages.find((l) => l.code === language) ?? languages[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="basic-lang" ref={ref}>
      <button type="button" className="basic-lang-btn" aria-haspopup="listbox" aria-expanded={open}
        aria-label={`${label}: ${current.name}`} onClick={() => setOpen((o) => !o)}>
        <img src={flagUrl(current.countryCode)} alt="" className="basic-lang-flag" />
        <span>{current.name}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <ul className="basic-lang-menu" role="listbox" aria-label={label}>
          {languages.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === current.code}>
              <button type="button" className={`basic-lang-item${l.code === current.code ? ' active' : ''}`}
                onClick={() => { onChange(l.code); setOpen(false); }}>
                <img src={flagUrl(l.countryCode)} alt="" className="basic-lang-flag" />
                <span>{l.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguagePicker;
