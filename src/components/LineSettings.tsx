import React from 'react';
import { PenLine } from 'lucide-react';
import { saveLineStyles, emptyLine } from './lineStyleUtils';

export type LineStyle = {
  width: string; // e.g. 'hairline', '0.5mm'
  color: string; // e.g. 'black', '#ff0000'
  style: 'solid' | 'dashed' | 'dotted';
  name: string;
  id: string; // unique id for each style
  fixed?: boolean; // true for the default, non-deletable
};

const LineSettings: React.FC<{
  lineStyles: LineStyle[];
  setLineStyles: (styles: LineStyle[]) => void;
}> = ({ lineStyles, setLineStyles }) => {
  // Handle editing
  const handleChange = (idx: number, field: keyof LineStyle, value: string) => {
    const updated = [...lineStyles];
    updated[idx] = { ...updated[idx], [field]: value };
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
        <h3 className="card-title"><PenLine color="#2563eb" size={20} style={{marginRight: 6}} /> Line Styles</h3>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
                        <input
                          type="color"
                          value={style.color}
                          onChange={e => handleChange(idx, 'color', e.target.value)}
                          style={{ width: 24, height: 24, border: 'none', background: 'none', padding: 0 }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          value={style.color}
                          onChange={e => handleChange(idx, 'color', e.target.value)}
                          style={{ width: '70px', fontSize: '0.9rem' }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '0.3rem 0.3rem' }}>
                      <select
                        className="form-select"
                        value={style.style}
                        onChange={e => handleChange(idx, 'style', e.target.value)}
                        style={{ fontSize: '0.9rem' }}
                      >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.3rem 0.3rem' }}>
                      {!style.fixed && (
                        <button
                          className="btn btn-xs"
                          onClick={() => handleDelete(idx)}
                          title="Delete"
                          style={{ fontSize: '0.8rem', width: 18, height: 18, minWidth: 0, padding: 0, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
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
      </div>
    </div>
  );
};

export default LineSettings;