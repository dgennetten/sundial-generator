// src/components/BasicPanel.tsx
// Basic mode: six simple steps to print a popup-with-brace dial. All dial state lives in
// App; the Advanced cards stay mounted (hidden) so print, map and gallery work unchanged.
import React, { useEffect, useState } from 'react';
import { Map, Printer, Plus, X, Camera } from 'lucide-react';
import GnomonAssemblyGuide from './GnomonAssemblyGuide';

export type BasicStyle = 'current' | 'other' | 'full';

// Short names match the "Jul 4" format the date-line parser and renderer use.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// Date lines recur every year, so no year is asked for; February allows the 29th.
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const OUT_OF_RANGE_NOTE = 'Not in this half-year — won’t print. Pick the other half or Full year.';

interface Props {
  locationName: string;
  latitude: number;
  longitude: number;
  onOpenMap: () => void;
  basicStyle: BasicStyle;
  onStyleChange: (style: BasicStyle) => void;
  currentHalfLabel: string;
  otherHalfLabel: string;
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

const Step: React.FC<{ n: number; title: string; id?: string; children: React.ReactNode }> = ({ n, title, id, children }) => (
  <section className="basic-step" id={id}>
    <h3 className="basic-step-title"><span className="basic-step-num">{n}</span>{title}</h3>
    <div className="basic-step-body">{children}</div>
  </section>
);

const BasicPanel: React.FC<Props> = ({
  locationName, latitude, longitude, onOpenMap, basicStyle, onStyleChange, currentHalfLabel, otherHalfLabel,
  pageSize, onPageSizeChange, todayActive, todayOutOfRange, onTodayChange, customDates, onAddDate, onRemoveDate,
  onPrint, onOpenGallery, onSwitchToAdvanced,
}) => {
  const [addingDate, setAddingDate] = useState(false);
  const [draftMonth, setDraftMonth] = useState(() => new Date().getMonth());
  const [draftDay, setDraftDay] = useState(() => new Date().getDate());
  const [printSignal, setPrintSignal] = useState(0);

  useEffect(() => {
    if (!printSignal) return;
    // Let the print dialog close before scrolling the guide into view.
    const t = setTimeout(() => {
      document.getElementById('basic-step-enjoy')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
    return () => clearTimeout(t);
  }, [printSignal]);

  const commitDate = () => {
    onAddDate(`${MONTHS[draftMonth]} ${Math.min(draftDay, DAYS_IN_MONTH[draftMonth])}`);
    setAddingDate(false);
  };

  // A spot picked on the map (not a named search result) has no name, so show its coordinates.
  const locationLabel = locationName === 'Custom Lat/Long'
    ? `${locationName} ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
    : locationName;

  const styleOptions: { value: BasicStyle; label: string; hint: string; badge?: string }[] = [
    { value: 'current', label: 'Current half-year', hint: currentHalfLabel, badge: 'Easiest to Use' },
    { value: 'other', label: 'Other half-year', hint: otherHalfLabel },
    { value: 'full', label: 'Full year', hint: 'Figure-8 hour lines' },
  ];

  return (
    <div className="basic-panel">
      <div className="basic-hero">
        <h1 className="basic-hero-title">Precision Sundial</h1>
        <p className="basic-hero-sub">Print a pop-up sundial for your location in a few easy steps.</p>
      </div>

      <Step n={1} title="Where">
        <button type="button" className="btn btn-primary basic-map-btn" onClick={onOpenMap}>
          <Map size={18} /> Open Map
        </button>
        <div className="basic-location" title={locationLabel}>{locationLabel}</div>
      </Step>

      <Step n={2} title="Style">
        <div className="basic-choices" role="radiogroup" aria-label="Dial style">
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

      <Step n={3} title="Special Dates">
        <label className="basic-check">
          <input type="checkbox" checked={todayActive} onChange={(e) => onTodayChange(e.target.checked)} />
          Today
          {todayActive && todayOutOfRange && <span className="basic-date-note">{OUT_OF_RANGE_NOTE}</span>}
        </label>
        {customDates.map((d) => (
          <div key={d.id} className="basic-date-row">
            <span>{d.date}</span>
            {d.outOfRange && <span className="basic-date-note">{OUT_OF_RANGE_NOTE}</span>}
            <button type="button" className="basic-icon-btn" onClick={() => onRemoveDate(d.id)} aria-label={`Remove ${d.date}`}>
              <X size={14} />
            </button>
          </div>
        ))}
        {addingDate ? (
          <div className="basic-date-row">
            <select className="form-input" value={draftMonth} autoFocus aria-label="Month"
              onChange={(e) => setDraftMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((name, i) => <option key={name} value={i}>{name}</option>)}
            </select>
            <select className="form-input basic-day-select" aria-label="Day"
              value={Math.min(draftDay, DAYS_IN_MONTH[draftMonth])}
              onChange={(e) => setDraftDay(Number(e.target.value))}>
              {Array.from({ length: DAYS_IN_MONTH[draftMonth] }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <button type="button" className="btn btn-primary basic-small-btn" onClick={commitDate}>Add</button>
            <button type="button" className="basic-icon-btn" onClick={() => setAddingDate(false)} aria-label="Cancel">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button type="button" className="basic-link-btn" onClick={() => setAddingDate(true)}>
            <Plus size={14} /> Add a date (birthday, anniversary…)
          </button>
        )}
      </Step>

      <Step n={4} title="Print">
        <div className="basic-print-row">
          <div className="basic-segment" role="radiogroup" aria-label="Paper size">
            {(['Letter', 'A4'] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={pageSize === s}
                className={`basic-segment-btn${pageSize === s ? ' active' : ''}`} onClick={() => onPageSizeChange(s)}>
                {s}
              </button>
            ))}
          </div>
          <button type="button" className="basic-print-btn" onClick={() => { onPrint(); setPrintSignal((n) => n + 1); }}>
            <Printer size={22} /> Print!
          </button>
        </div>
      </Step>

      <Step n={5} title="Cut, Fold, and Enjoy!" id="basic-step-enjoy">
        <GnomonAssemblyGuide restartSignal={printSignal} />
        <div className="basic-enjoy-links">
          <button type="button" className="basic-link-btn" onClick={onOpenGallery}>
            <Camera size={14} /> Share a photo of your dial!
          </button>
          <button type="button" className="basic-link-btn" onClick={onSwitchToAdvanced}>
            Want more control? Advanced →
          </button>
        </div>
      </Step>
    </div>
  );
};

export default BasicPanel;
