import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PenLine, X } from 'lucide-react';
import { saveLineStyles, emptyLine, isValidCssColor, DEFAULT_LINE_STYLES } from './lineStyleUtils';
import type { HourlineInterval } from './hourlineUtils';
import type { DeclinationLine } from './DeclinationLineOptions';

export type LineStyle = {
  width: string; // e.g. 'hairline', '0.5mm'
  color: string; // e.g. 'black', '#ff0000'
  style: 'solid' | 'dashed' | 'dotted' | 'calculated';
  name: string;
  id: string; // unique id for each style
  fixed?: boolean; // true for the default, non-deletable
  calculatedType?: 'declination-2min-dot' | 'declination-5min-dot' | 'hourline-5-2-day-dash' | 'declination-2min-dash' | 'hourline-2-5-day-dash' | 'hourline-2-2-day-dash'; // for calculated styles
  applicableToLines?: ('hourline' | 'declination' | 'border')[]; // which line types this style can be applied to
};

const LineSettings: React.FC<{
  lineStyles: LineStyle[];
  setLineStyles: (styles: LineStyle[]) => void;
  hourlineIntervals?: HourlineInterval[];
  declinationLines?: DeclinationLine[];
}> = React.memo(({ lineStyles, setLineStyles, hourlineIntervals, declinationLines }) => {
  const [showCalculatedPopup, setShowCalculatedPopup] = useState(false);
  const [pendingStyleIndex, setPendingStyleIndex] = useState<number | null>(null);
  const [selectedCalculatedType, setSelectedCalculatedType] = useState<string>('');
  const [showOnlyUsed, setShowOnlyUsed] = useState<boolean>(true);
  const newStyleNameInputRef = useRef<HTMLInputElement | null>(null);

  // Get all calculated styles from defaults
  const calculatedStyles = DEFAULT_LINE_STYLES.filter(s => s.style === 'calculated');

  // Get currently used style IDs
  const usedStyleIds = useMemo(() => {
    const used = new Set<string>();
    if (hourlineIntervals) {
      hourlineIntervals
        .filter(interval => interval.active)
        .forEach(interval => used.add(interval.styleId));
    }
    if (declinationLines) {
      declinationLines
        .filter(line => line.active)
        .forEach(line => used.add(line.styleId));
    }
    return used;
  }, [hourlineIntervals, declinationLines]);

  // Filter line styles based on showOnlyUsed checkbox
  const displayedLineStyles = useMemo(() => {
    if (!showOnlyUsed || usedStyleIds.size === 0) {
      return lineStyles;
    }
    return lineStyles.filter(style => {
      // Always include the blank row (new style being added) so it stays editable
      if (!style.id || style.id === '') return true;
      return usedStyleIds.has(style.id) || usedStyleIds.has(style.name);
    });
  }, [lineStyles, showOnlyUsed, usedStyleIds]);

  // Focus the new style name input only on initial mount (not when list length changes, to avoid stealing focus while typing)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      newStyleNameInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Handle editing - find the actual index in the original lineStyles array
  const handleChange = (displayIdx: number, field: keyof LineStyle, value: string) => {
    // Get the style from displayedLineStyles to find its id
    const hasBlankRow = displayedLineStyles.length > 0 && displayedLineStyles[displayedLineStyles.length - 1]?.id === '';
    const stylesToShow = hasBlankRow ? displayedLineStyles : [...displayedLineStyles, { ...emptyLine }];
    const style = stylesToShow[displayIdx];
    
    // Find the actual index in the original lineStyles array
    let actualIdx = -1;
    if (style.id === '') {
      // It's the blank row - find it in the original array
      actualIdx = lineStyles.findIndex(s => s.id === '');
      if (actualIdx === -1) {
        actualIdx = lineStyles.length;
      }
    } else {
      actualIdx = lineStyles.findIndex(s => s.id === style.id);
    }
    
    if (actualIdx === -1) {
      console.warn('Could not find style in original array');
      return;
    }

    // Special handling for when "calculated" is selected
    if (field === 'style' && value === 'calculated') {
      setPendingStyleIndex(actualIdx);
      setSelectedCalculatedType('');
      setShowCalculatedPopup(true);
      return;
    }

    const updated = [...lineStyles];
    // When editing the virtual blank row we're appending; ensure it has emptyLine base so id === '' and it stays in the list
    const base = actualIdx >= lineStyles.length ? emptyLine : updated[actualIdx];
    // For color, validate and normalize HTML color names and hex
    if (field === 'color') {
      if (isValidCssColor(value)) {
        updated[actualIdx] = { ...base, [field]: value };
      } else {
        updated[actualIdx] = { ...base, [field]: value };
      }
    } else {
      updated[actualIdx] = { ...base, [field]: value };
    }
    setLineStyles(updated);
    saveLineStyles(updated.filter((s) => s.id));
  };

  // Commit the new style (assign id and add next blank row) on blur or Enter, not on every keystroke
  const handleCommitNewStyle = (displayIdx: number) => {
    const hasBlankRow = displayedLineStyles.length > 0 && displayedLineStyles[displayedLineStyles.length - 1]?.id === '';
    const stylesToShow = hasBlankRow ? displayedLineStyles : [...displayedLineStyles, { ...emptyLine }];
    const style = stylesToShow[displayIdx];
    if (style.id !== '' || !(style.name || '').trim()) return;
    let actualIdx = lineStyles.findIndex(s => s.id === '');
    if (actualIdx === -1) actualIdx = lineStyles.length - 1;
    if (actualIdx < 0) return;
    const updated = [...lineStyles];
    if (actualIdx >= updated.length) return;
    updated[actualIdx] = { ...updated[actualIdx], id: `user-${Date.now()}` };
    updated.push({ ...emptyLine });
    setLineStyles(updated);
    saveLineStyles(updated.filter((s) => s.id));
  };

  // Handle delete - find the actual index in the original lineStyles array
  const handleDelete = (displayIdx: number) => {
    // Get the style from displayedLineStyles to find its id
    const hasBlankRow = displayedLineStyles.length > 0 && displayedLineStyles[displayedLineStyles.length - 1]?.id === '';
    const stylesToShow = hasBlankRow ? displayedLineStyles : [...displayedLineStyles, { ...emptyLine }];
    const style = stylesToShow[displayIdx];
    
    if (!style || style.id === '') {
      return; // Can't delete the blank row
    }
    
    // Find the actual index in the original lineStyles array
    const actualIdx = lineStyles.findIndex(s => s.id === style.id);
    if (actualIdx === -1) {
      return;
    }
    
    const updated = lineStyles.filter((_, i) => i !== actualIdx);
    setLineStyles(updated);
    saveLineStyles(updated.filter((s) => s.id));
  };

  // Handle calculated style selection confirmation
  const handleCalculatedConfirm = () => {
    if (pendingStyleIndex === null || !selectedCalculatedType) {
      return;
    }

    const selectedStyle = calculatedStyles.find(s => s.calculatedType === selectedCalculatedType);
    if (!selectedStyle) {
      return;
    }

    try {
      // Generate a unique name with suffix
      const baseName = selectedStyle.name;
      const existingNames = lineStyles.map(s => s.name);
      let suffix = 2;
      let newName = `${baseName} (${suffix})`;

      while (existingNames.includes(newName)) {
        suffix++;
        newName = `${baseName} (${suffix})`;
      }

      const updated = [...lineStyles];
      updated[pendingStyleIndex] = {
        ...updated[pendingStyleIndex],
        style: 'calculated',
        name: newName,
        calculatedType: selectedCalculatedType as LineStyle['calculatedType'],
        applicableToLines: selectedStyle.applicableToLines
      };

      // If editing the blank row, add a new blank row
      if (pendingStyleIndex === lineStyles.length - 1 && lineStyles[pendingStyleIndex].id === '') {
        updated[pendingStyleIndex].id = `user-${Date.now()}`;
        updated.push({ ...emptyLine });
      }

      setLineStyles(updated);
      saveLineStyles(updated.filter((s) => s.id));

      // Close popup
      setShowCalculatedPopup(false);
      setPendingStyleIndex(null);
      setSelectedCalculatedType('');
    } catch {
      // Close popup even if there's an error
      setShowCalculatedPopup(false);
      setPendingStyleIndex(null);
      setSelectedCalculatedType('');
    }
  };

  // Handle calculated style selection cancellation
  const handleCalculatedCancel = () => {
    setShowCalculatedPopup(false);
    setPendingStyleIndex(null);
    setSelectedCalculatedType('');
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <PenLine color="#2563eb" size={20} style={{ marginRight: 6 }} /> Line Styles
        </h3>
      </div>
      <div className="card-content">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.3rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.3rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Width</th>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.3rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Color</th>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.3rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Style</th>
                <th style={{ textAlign: 'left', padding: '0.3rem 0.3rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}></th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Always include the blank row for adding new styles
                const hasBlankRow = displayedLineStyles.length > 0 && displayedLineStyles[displayedLineStyles.length - 1]?.id === '';
                return hasBlankRow ? displayedLineStyles : [...displayedLineStyles, { ...emptyLine }];
              })().map((style, idx) => {
                // For color validation feedback
                const colorValid = isValidCssColor(style.color || '') || (style.color || '') === '';
                return (
                  <tr key={style.id || `blank-${idx}`}>
                    <td style={{ padding: '0.3rem 0.3rem', minWidth: '70px' }}>
                      <input
                        ref={style.id === '' ? newStyleNameInputRef : undefined}
                        type="text"
                        className="form-input"
                        value={style.name || ''}
                        onChange={e => handleChange(idx, 'name', e.target.value)}
                        onBlur={() => style.id === '' && handleCommitNewStyle(idx)}
                        onKeyDown={e => {
                          if (style.id === '' && e.key === 'Enter') {
                            handleCommitNewStyle(idx);
                            e.preventDefault();
                          }
                        }}
                        disabled={!!style.fixed}
                        style={{ width: '100%', fontSize: '0.9rem' }}
                        placeholder={style.id === '' ? "Style Name" : undefined}
                        aria-label={style.id === '' ? 'New style name' : 'Style name'}
                      />
                    </td>
                    <td style={{ padding: '0.3rem 0.3rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={style.width || ''}
                        onChange={e => handleChange(idx, 'width', e.target.value)}
                        style={{ width: '50px', fontSize: '0.9rem' }}
                      />
                    </td>
                    <td style={{ padding: '0.3rem 0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {/* Swatch with overlayed color input */}
                        <span
                          style={{
                            display: 'inline-block',
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            border: '1px solid #ccc',
                            background: colorValid ? (style.color || '#fff') : '#fff',
                            position: 'relative',
                            overflow: 'hidden',
                            verticalAlign: 'middle'
                          }}
                          title={style.color || ''}
                        >
                          <input
                            type="color"
                            value={
                              style.color && /^#([0-9a-f]{3}){1,2}$/i.test(style.color.trim())
                                ? style.color
                                : '#000000'
                            }
                            onChange={e => handleChange(idx, 'color', e.target.value)}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              opacity: 0,
                              cursor: 'pointer',
                              border: 'none',
                              padding: 0,
                              margin: 0,
                            }}
                            tabIndex={-1}
                            aria-label="Pick color"
                          />
                        </span>
                        <input
                          type="text"
                          className="form-input"
                          value={style.color || ''}
                          onChange={e => handleChange(idx, 'color', e.target.value)}
                          style={{
                            width: '35px', // was '70px'
                            fontSize: '0.9rem',
                            borderColor: colorValid ? undefined : 'red',
                            background: colorValid ? undefined : '#ffeaea'
                          }}
                          placeholder="e.g. #ff0000 or cornsilk"
                        />
                      </div>
                      {!colorValid && (
                        <div style={{ color: 'red', fontSize: '0.75rem' }}>
                          Invalid color
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.3rem 0.3rem' }}>
                      <select
                        className="form-select"
                        value={style.style || 'solid'}
                        onChange={e => handleChange(idx, 'style', e.target.value)}
                        style={{
                          fontSize: '0.9rem',
                          backgroundColor: style.style === 'calculated' ? '#f5f5f5' : undefined,
                          color: style.style === 'calculated' ? '#666' : undefined
                        }}
                        disabled={style.style === 'calculated'}
                      >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                        <option value="calculated">Calculated</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.3rem 0.3rem' }}>
                      {!style.fixed && (
                        <button
                          className="btn btn-xs"
                          onClick={() => handleDelete(idx)}
                          title="Delete"
                          style={{
                            fontSize: '0.8rem',
                            width: 18,
                            height: 18,
                            minWidth: 0,
                            padding: 0,
                            lineHeight: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showOnlyUsed}
              onChange={(e) => setShowOnlyUsed(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.875rem', color: '#4a5568' }}>Show Only Currently Used Line Styles</span>
          </label>
        </div>
        <div style={{
          marginTop: '0.75rem',
          padding: '0.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '0.85rem',
          color: '#6b7280',
          fontStyle: 'italic'
        }}>
          Note: 'D' styles only apply to Date lines; 'H' styles only apply to Hourlines
        </div>
      </div>

      {/* Calculated Style Selection Popup */}
      {showCalculatedPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            minWidth: '400px',
            maxWidth: '500px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                Choose desired calculated dash pattern
              </h3>
              <button
                onClick={handleCalculatedCancel}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '4px'
                }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              {calculatedStyles.map((style) => (
                <label
                  key={style.calculatedType}
                  style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: selectedCalculatedType === style.calculatedType ? '#f0f9ff' : 'white'
                  }}
                >
                  <input
                    type="radio"
                    name="calculatedType"
                    value={style.calculatedType}
                    checked={selectedCalculatedType === style.calculatedType}
                    onChange={(e) => setSelectedCalculatedType(e.target.value)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ fontWeight: 'medium' }}>{style.name}</span>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    marginLeft: '1.25rem',
                    marginTop: '0.25rem'
                  }}>
                    Applicable to: {style.applicableToLines?.join(', ') || 'all line types'}
                  </div>
                </label>
              ))}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={handleCalculatedCancel}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCalculatedConfirm}
                className="btn btn-primary"
                disabled={!selectedCalculatedType}
                style={{
                  padding: '0.5rem 1rem',
                  opacity: selectedCalculatedType ? 1 : 0.5
                }}
              >
                Create Style
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default LineSettings;