import React, { useEffect, useState } from 'react';

export type LineStyle = {
  width: string; // e.g. 'hairline', '0.5mm'
  color: string; // e.g. 'black', '#ff0000'
  style: 'solid' | 'dashed';
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
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Line Settings</strong></legend>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Width</th>
            <th>Color</th>
            <th>Style</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(lineStyles[lineStyles.length - 1]?.id === '' ? lineStyles : [...lineStyles, { ...emptyLine }]).map((style, idx, arr) => {
            const isBlank = !style.id && !style.name && !style.width && !style.color;
            const isDefault = style.fixed;
            const showDelete = !isDefault && !isBlank && style.name;
            // Determine color sample
            let colorSample = '#000000';
            if (style.color) {
              if (style.color.startsWith('#') && /^#[0-9a-fA-F]{3,8}$/.test(style.color)) {
                colorSample = style.color;
              } else if (isValidCssColor(style.color)) {
                colorSample = style.color;
              }
            }
            return (
              <tr key={style.id || `blank-${idx}`}>
                <td>
                  <input
                    type="text"
                    value={style.name}
                    onChange={e => handleChange(idx, 'name', e.target.value)}
                    disabled={!!style.fixed}
                    style={{ width: '100%' }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={style.width}
                    onChange={e => handleChange(idx, 'width', e.target.value)}
                    style={{ width: '80px' }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={style.color}
                    onChange={e => handleChange(idx, 'color', e.target.value)}
                    style={{ width: '60px', marginLeft: '4px' }}
                  />
                  {/* Color swatch for any valid CSS color */}
                  <span style={{
                    display: 'inline-block',
                    width: 18,
                    height: 18,
                    marginLeft: 6,
                    verticalAlign: 'middle',
                    border: '1px solid #888',
                    background: isValidCssColor(style.color) ? style.color : 'transparent',
                  }} title={style.color} />
                </td>
                <td>
                  <select
                    value={style.style}
                    onChange={e => handleChange(idx, 'style', e.target.value)}
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                  </select>
                </td>
                <td>
                  {showDelete && (
                    <button type="button" onClick={() => handleDelete(idx)} title="Delete">X</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </fieldset>
  );
};

export { loadLineStyles, saveLineStyles };
export default LineSettings; 