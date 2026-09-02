import React from 'react';
import { FlaskConical } from 'lucide-react';
import type { CorrectionFlags } from '../utils/sundialMath';

interface ComponentsOfCorrectionCardProps {
  correctionFlags: CorrectionFlags;
  onCorrectionFlagsChange: (flags: CorrectionFlags) => void;
}

const CORRECTIONS: {
  key: keyof CorrectionFlags;
  label: string;
  description: string;
  implemented: boolean;
}[] = [
  {
    key: 'latitude',
    label: 'Latitude',
    description: 'Spreads hour lines into a fan based on geographic latitude.',
    implemented: true,
  },
  {
    key: 'longitude',
    label: 'Longitude',
    description: 'Shifts noon relative to the time-zone meridian.',
    implemented: true,
  },
  {
    key: 'equationOfTime',
    label: 'Equation of Time',
    description: 'Adds the figure-8 analemma loop to each hour line.',
    implemented: true,
  },
  {
    key: 'solarDeclination',
    label: 'Solar Declination',
    description: 'Shows date lines (solstice, equinox, etc.) across the dial face.',
    implemented: true,
  },
  {
    key: 'mysteryError',
    label: 'Mystery Error',
    description: 'What un-corrected source of error is not yet addressed in today\'s dials or software? It\'s a larger error than Refraction. Sometimes much larger. See my 2027 NASS Presentation and accompanying Compendium paper.',
    implemented: false,
  },
  {
    key: 'refraction',
    label: 'Atmospheric Refraction',
    description: 'Bends sunlight near the horizon — shifts hour lines near sunrise/sunset.',
    implemented: true,
  },
  {
    key: 'declinationDrift',
    label: 'Declination Drift',
    description: "The Sun's declination keeps changing through the day — fastest at the equinoxes, near zero at the solstices. Redraws each date line as its true morning-to-evening trace instead of a fixed-declination snapshot, so the equinox becomes two curves that cross near noon and each cross-quarter pair separates. Note: defaults ON for half-year dials and OFF for full-year dials.",
    implemented: true,
  },
  {
    key: 'currentYearAnchoring',
    label: 'Current-Year Anchoring',
    description: "Anchors each date-line declination to this specific year's Sun. The equinox and solstice instants drift about ±¾ day across the 4-year leap cycle, so a fixed calendar date lands on a slightly different declination each year (up to ~0.3° near the equinoxes; negligible near the solstices). Checked (default) = dead-on for the current year. Uncheck to average over the whole leap cycle — never more than ~⅜ day off in any year, best for a dial printed once and used for years.",
    implemented: true,
  },
];

const ComponentsOfCorrectionCard: React.FC<ComponentsOfCorrectionCardProps> = ({
  correctionFlags,
  onCorrectionFlagsChange,
}) => {
  const handleCorrectionChange = (key: keyof CorrectionFlags, checked: boolean) => {
    onCorrectionFlagsChange({ ...correctionFlags, [key]: checked });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <FlaskConical color="#2563eb" size={20} style={{ marginRight: 6 }} /> Components of Correction
        </h3>
      </div>
      <div className="card-content">
        <p style={{ margin: '0 0 0.75rem 0', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
          Uncheck to remove a correction and see its effect on the dial in real time.
          Listed from largest to smallest source of error. Smaller components are best viewed on a desktop display.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {CORRECTIONS.map(({ key, label, description, implemented }) => {
            const checked = correctionFlags[key];
            const disabled = !implemented;
            return (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.45 : 1,
                }}
                title={disabled ? 'Not yet implemented' : description}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={e => handleCorrectionChange(key, e.target.checked)}
                  style={{ marginTop: '2px', flexShrink: 0 }}
                />
                <span style={{ fontSize: '13px', lineHeight: 1.4 }}>
                  <strong style={{ color: disabled ? '#94a3b8' : '#1e293b' }}>{label}</strong>
                  {' '}
                  <span style={{ color: '#64748b', fontSize: '12px' }}>{description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ComponentsOfCorrectionCard);
