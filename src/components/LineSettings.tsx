import React from 'react';
import { PenLine } from 'lucide-react';
import { saveLineStyles, emptyLine, isValidCssColor } from './lineStyleUtils';

export type LineStyle = {
  width: string; // e.g. 'hairline', '0.5mm'
  color: string; // e.g. 'black', '#ff0000'
  style: 'solid' | 'dashed' | 'dotted' | 'calculated';
  name: string;
  id: string; // unique id for each style
  fixed?: boolean; // true for the default, non-deletable
  calculatedType?: 'declination-2min-dot' | 'declination-5min-dot' | 'hourline-5-2-day-dash' | 'declination-2min-dash' | 'hourline-2-5-day-dash'; // for calculated styles
  applicableToLines?: ('hourline' | 'declination' | 'border')[]; // which line types this style can be applied to
};

const LineSettings: React.FC<{
  lineStyles: LineStyle[];
  setLineStyles: (styles: LineStyle[]) => void;
}> = React.memo(({ lineStyles, setLineStyles }) => {
  // Handle editing
  const handleChange = (idx: number, field: keyof LineStyle, value: string) => {
    const updated = [...lineStyles];
    // For color, validate and normalize HTML color names and hex
    if (field === 'color') {
      if (isValidCssColor(value)) {
        updated[idx] = { ...updated[idx], [field]: value };
      } else {
        updated[idx] = { ...updated[idx], [field]: value };
        // Optionally, you could set an error state here
      }
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    // If editing the blank row, add a new blank row
    if (idx === lineStyles.length - 1 && lineStyles[idx].id === '') {
      // Only add if at least name is filled
      if (value.trim() !== '' && field === 'name') {
        updated[idx].id = `user-${Date.now()}`;
        updated.push({ ...emptyLine });
      }
    }
    setLineStyles(updated);
    saveLineStyles(updated.filter((s) => s.id));
  };

  // Handle delete
  const handleDelete = (idx: number) => {
    const updated = lineStyles.filter((_, i) => i !== idx);
    setLineStyles(updated);
    saveLineStyles(updated.filter((s) => s.id));
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
              {(lineStyles[lineStyles.length - 1]?.id === '' ? lineStyles : [...lineStyles, { ...emptyLine }]).map((style, idx) => {
                // For color validation feedback
                const colorValid = isValidCssColor(style.color) || style.color === '';
                return (
                  <tr key={style.id || `blank-${idx}`}>
                    <td style={{ padding: '0.3rem 0.3rem', minWidth: '70px' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={style.name}
                        onChange={e => handleChange(idx, 'name', e.target.value)}
                        disabled={!!style.fixed}
                        style={{ width: '100%', fontSize: '0.9rem' }}
                        placeholder={style.id === '' ? "Style Name" : undefined}
                      />
                    </td>
                    <td style={{ padding: '0.3rem 0.3rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={style.width}
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
                            background: colorValid ? style.color : '#fff',
                            position: 'relative',
                            overflow: 'hidden',
                            verticalAlign: 'middle'
                          }}
                          title={style.color}
                        >
                          <input
                            type="color"
                            value={
                              /^#([0-9a-f]{3}){1,2}$/i.test(style.color.trim())
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
                          value={style.color}
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
                        value={style.style}
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
        <div style={{ 
          marginTop: '0.75rem', 
          padding: '0.5rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px', 
          fontSize: '0.85rem', 
          color: '#6b7280',
          fontStyle: 'italic'
        }}>
          Note: 'D' styles only apply to Declination lines; 'H' styles only apply to Hourlines
        </div>
      </div>
    </div>
  );
});

export default LineSettings;