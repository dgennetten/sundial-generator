import React from 'react';

export type LineStyle = {
  width: string; // e.g. 'hairline', '0.5mm'
  color: string; // e.g. 'black', '#ff0000'
  style: 'solid' | 'dashed' | 'dotted';
  name: string;
  id: string; // unique id for each style
  fixed?: boolean; // true for the default, non-deletable
};

const DEFAULT_LINE_STYLES: LineStyle[] = [
  {
    width: 'hairline',
    color: 'black',
    style: 'solid',
    name: 'default hairline',
    id: 'default-hairline',
    fixed: true,
  },
  {
    width: 'hairline',
    color: 'black',
    style: 'dashed',
    name: 'dashed hairline',
    id: 'dashed-hairline',
    fixed: true,
  },
  {
    width: 'hairline',
    color: 'black',
    style: 'dotted',
    name: 'dotted hairline',
    id: 'dotted-hairline',
    fixed: true,
  },
  {
    width: '0.5mm',
    color: 'black',
    style: 'solid',
    name: '.5mm black',
    id: '0.5mm-black',
  },
];

const LOCAL_STORAGE_KEY = 'sundial-line-styles';

function loadLineStyles(): LineStyle[] {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return DEFAULT_LINE_STYLES;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Always ensure the default is present
      const hasDefault = parsed.some((s) => s.id === 'default-hairline');
      if (!hasDefault) return [DEFAULT_LINE_STYLES[0], ...parsed];
      return parsed;
    }
    return DEFAULT_LINE_STYLES;
  } catch {
    return DEFAULT_LINE_STYLES;
  }
}

function saveLineStyles(styles: LineStyle[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(styles));
}

// Utility to check if a string is a valid CSS color
function isValidCssColor(str: string) {
  if (!str) return false;
  const s = new Option().style;
  s.color = '';
  s.color = str;
  return !!s.color;
}

const emptyLine: LineStyle = {
  width: '',
  color: '',
  style: 'solid',
  name: '',
  id: '',
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
        <h3 className="card-title">🎨 Line Styles</h3>
      </div>
      <div className="card-content">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Width</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Color</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}>Style</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568' }}></th>
              </tr>
            </thead>
            <tbody>
              {(lineStyles[lineStyles.length - 1]?.id === '' ? lineStyles : [...lineStyles, { ...emptyLine }]).map((style, idx) => {
                const isBlank = !style.id && !style.name && !style.width && !style.color;
                const isDefault = style.fixed;
                const showDelete = !isDefault && !isBlank && style.name;
                return (
                  <tr key={style.id || `blank-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', minWidth: '90px' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={style.name}
                        onChange={e => handleChange(idx, 'name', e.target.value)}
                        disabled={!!style.fixed}
                        style={{ width: '100%', fontSize: '0.9rem' }}
                      />
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={style.width}
                        onChange={e => handleChange(idx, 'width', e.target.value)}
                        style={{ width: '50px', fontSize: '0.9rem' }}
                      />
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={style.color}
                          onChange={e => handleChange(idx, 'color', e.target.value)}
                          style={{ width: '45px', fontSize: '0.9rem' }}
                          placeholder="red"
                          title="Enter color name or hex value"
                        />
                        <input
                          type="color"
                          value={isValidCssColor(style.color) ? style.color : '#000000'}
                          onChange={e => handleChange(idx, 'color', e.target.value)}
                          style={{ 
                            width: '30px', 
                            height: '30px', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          title="Click to pick color"
                        />
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <select
                        className="form-select"
                        value={style.style}
                        onChange={e => handleChange(idx, 'style', e.target.value)}
                        style={{ fontSize: '0.9rem', width: '80px' }}
                      >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {showDelete && (
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={() => handleDelete(idx)} 
                          title="Delete"
                          style={{ padding: '0.125rem 0.25rem', fontSize: '0.7rem', minWidth: '20px', height: '20px' }}
                        >
                          ✕
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

export { loadLineStyles, saveLineStyles };
export default LineSettings; 