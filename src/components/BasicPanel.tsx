// src/components/BasicPanel.tsx
// Basic mode: five simple steps to print a popup-with-brace dial. All dial state lives in
// App; the Advanced cards stay mounted (hidden) so print, map and gallery work unchanged.
import React, { useEffect, useRef, useState } from 'react';
import { Map, Printer, Plus, X, Camera, ChevronDown } from 'lucide-react';
import GnomonAssemblyGuide from './GnomonAssemblyGuide';
import { languages } from './WelcomeDialog';
import { basicStrings } from './basicTranslations';

export type BasicStyle = 'current' | 'other' | 'full';
type HalfYear = 'SummerToFall' | 'WinterToSpring';

// Short English names are the stored "Jul 4" format the date-line parser and renderer use;
// what the user sees is formatted in their language.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Date lines recur every year, so no year is asked for; February allows the 29th.
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const flagUrl = (countryCode: string) => `https://flagicons.lipis.dev/flags/4x3/${countryCode}.svg`;

function monthName(language: string, month: number): string {
  try {
    return new Date(2000, month, 1).toLocaleDateString(language, { month: 'long' });
  } catch {
    return new Date(2000, month, 1).toLocaleDateString('en', { month: 'long' });
  }
}

/** "Jul 4" (stored form) → the same day in the user's language, e.g. "4 juil." */
function displayDate(language: string, stored: string): string {
  const m = /^([A-Za-z]{3})\s+(\d{1,2})$/.exec(stored.trim());
  const month = m ? MONTHS.indexOf(m[1]) : -1;
  if (!m || month < 0) return stored;
  try {
    return new Date(2000, month, parseInt(m[2], 10)).toLocaleDateString(language, { month: 'short', day: 'numeric' });
  } catch {
    return stored;
  }
}

interface Props {
  language: string;
  onLanguageChange: (language: string) => void;
  locationName: string;
  latitude: number;
  longitude: number;
  onOpenMap: () => void;
  basicStyle: BasicStyle;
  onStyleChange: (style: BasicStyle) => void;
  currentHalf: HalfYear;
  otherHalf: HalfYear;
  pageSize: string;
  onPageSizeChange: (size: 'Letter' | 'A4') => void;
  todayActive: boolean;
  /** Today falls outside the selected half-year, so its line won't be printed. */
  todayOutOfRange: boolean;
  onTodayChange: (active: boolean) => void;
  customDates: { id: string; date: string; outOfRange: boolean }[];
  onAddDate: (monthDay: string) => void;
  onRemoveDate: (id: string) => void;
  onPrint: () => void;
  onOpenGallery: () => void;
  onSwitchToAdvanced: () => void;
}

const Step: React.FC<{ n: number; title: string; id?: string; aside?: React.ReactNode; children: React.ReactNode }> = ({ n, title, id, aside, children }) => (
  <section className="basic-step" id={id}>
    <h3 className="basic-step-title">
      <span className="basic-step-num">{n}</span>{title}
      {aside && <span className="basic-step-aside">{aside}</span>}
    </h3>
    <div className="basic-step-body">{children}</div>
  </section>
);

const LanguagePicker: React.FC<{ language: string; label: string; onChange: (language: string) => void }> = ({ language, label, onChange }) => {
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

const BasicPanel: React.FC<Props> = ({
  language, onLanguageChange, locationName, latitude, longitude, onOpenMap, basicStyle, onStyleChange,
  currentHalf, otherHalf, pageSize, onPageSizeChange, todayActive, todayOutOfRange, onTodayChange,
  customDates, onAddDate, onRemoveDate, onPrint, onOpenGallery, onSwitchToAdvanced,
}) => {
  const t = basicStrings(language);
  const [addingDate, setAddingDate] = useState(false);
  const [draftMonth, setDraftMonth] = useState(() => new Date().getMonth());
  const [draftDay, setDraftDay] = useState(() => new Date().getDate());
  const [printSignal, setPrintSignal] = useState(0);

  useEffect(() => {
    if (!printSignal) return;
    // Let the print dialog close before scrolling the guide into view.
    const timer = setTimeout(() => {
      document.getElementById('basic-step-enjoy')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
    return () => clearTimeout(timer);
  }, [printSignal]);

  const commitDate = () => {
    onAddDate(`${MONTHS[draftMonth]} ${Math.min(draftDay, DAYS_IN_MONTH[draftMonth])}`);
    setAddingDate(false);
  };

  // A spot picked on the map (not a named search result) has no name, so show its coordinates.
  const locationLabel = locationName === 'Custom Lat/Long'
    ? `${t.customLatLong} ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
    : locationName;

  const halfLabel = (half: HalfYear) => (half === 'SummerToFall' ? t.summerFall : t.winterSpring);
  const styleOptions: { value: BasicStyle; label: string; hint: string; badge?: string }[] = [
    { value: 'current', label: t.currentHalf, hint: halfLabel(currentHalf), badge: t.easiest },
    { value: 'other', label: t.otherHalf, hint: halfLabel(otherHalf) },
    { value: 'full', label: t.fullYear, hint: t.figure8 },
  ];

  return (
    <div className="basic-panel" dir={language === 'ar' ? 'rtl' : undefined}>
      <div className="basic-hero">
        <h1 className="basic-hero-title">Precision Sundial</h1>
        <p className="basic-hero-sub">{t.subtitle}</p>
      </div>

      <Step n={1} title={t.stepWhere} aside={<LanguagePicker language={language} label={t.language} onChange={onLanguageChange} />}>
        <button type="button" className="btn btn-primary basic-map-btn" onClick={onOpenMap}>
          <Map size={18} /> {t.openMap}
        </button>
        <div className="basic-location" title={locationLabel}>{locationLabel}</div>
      </Step>

      <Step n={2} title={t.stepStyle}>
        <div className="basic-choices" role="radiogroup" aria-label={t.stepStyle}>
          {styleOptions.map((o) => (
            <label key={o.value} className={`basic-choice${basicStyle === o.value ? ' active' : ''}`}>
              <input type="radio" name="basic-style" value={o.value} checked={basicStyle === o.value}
                onChange={() => onStyleChange(o.value)} />
              <span className="basic-choice-label">
                {o.label}
                {o.badge && <span className="basic-badge">{o.badge}</span>}
              </span>
              <span className="basic-choice-hint">{o.hint}</span>
            </label>
          ))}
        </div>
      </Step>

      <Step n={3} title={t.stepDates}>
        <label className="basic-check">
          <input type="checkbox" checked={todayActive} onChange={(e) => onTodayChange(e.target.checked)} />
          {t.today}
          {todayActive && todayOutOfRange && <span className="basic-date-note">{t.outOfRange}</span>}
        </label>
        {customDates.map((d) => (
          <div key={d.id} className="basic-date-row">
            <span>{displayDate(language, d.date)}</span>
            {d.outOfRange && <span className="basic-date-note">{t.outOfRange}</span>}
            <button type="button" className="basic-icon-btn" onClick={() => onRemoveDate(d.id)}
              aria-label={`${t.remove} ${displayDate(language, d.date)}`}>
              <X size={14} />
            </button>
          </div>
        ))}
        {addingDate ? (
          <div className="basic-date-row">
            <select className="form-input" value={draftMonth} autoFocus aria-label={t.month}
              onChange={(e) => setDraftMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{monthName(language, i)}</option>)}
            </select>
            <select className="form-input basic-day-select" aria-label={t.day}
              value={Math.min(draftDay, DAYS_IN_MONTH[draftMonth])}
              onChange={(e) => setDraftDay(Number(e.target.value))}>
              {Array.from({ length: DAYS_IN_MONTH[draftMonth] }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <button type="button" className="btn btn-primary basic-small-btn" onClick={commitDate}>{t.add}</button>
            <button type="button" className="basic-icon-btn" onClick={() => setAddingDate(false)} aria-label={t.cancel}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <button type="button" className="basic-link-btn" onClick={() => setAddingDate(true)}>
            <Plus size={14} /> {t.addDate}
          </button>
        )}
      </Step>

      <Step n={4} title={t.stepPrint}>
        <div className="basic-print-row">
          <div className="basic-segment" role="radiogroup" aria-label={t.paperSize}>
            {(['Letter', 'A4'] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={pageSize === s}
                className={`basic-segment-btn${pageSize === s ? ' active' : ''}`} onClick={() => onPageSizeChange(s)}>
                {s}
              </button>
            ))}
          </div>
          <button type="button" className="basic-print-btn" onClick={() => { onPrint(); setPrintSignal((n) => n + 1); }}>
            <Printer size={22} /> {t.print}
          </button>
        </div>
      </Step>

      <Step n={5} title={t.stepEnjoy} id="basic-step-enjoy">
        <GnomonAssemblyGuide restartSignal={printSignal} strings={t} />
        <div className="basic-enjoy-links">
          <button type="button" className="basic-link-btn" onClick={onOpenGallery}>
            <Camera size={14} /> {t.sharePhoto}
          </button>
          <button type="button" className="basic-link-btn" onClick={onSwitchToAdvanced}>
            {t.moreControl}
          </button>
        </div>
      </Step>
    </div>
  );
};

export default BasicPanel;
