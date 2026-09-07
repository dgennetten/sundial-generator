import React from 'react';

interface BuildDateProps {
  /** Click the author name to open Admin (password-gated). */
  onAuthorClick?: () => void;
}

const BuildDate: React.FC<BuildDateProps> = ({ onAuthorClick }) => {
  const year = new Date().getFullYear();
  return (
    <div className="build-date-card">
      {__VERSION__} © {year},{' '}
      {onAuthorClick ? (
        <button
          type="button"
          onClick={onAuthorClick}
          title="Admin"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            font: 'inherit',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          K. Douglas Gennetten
        </button>
      ) : (
        'K. Douglas Gennetten'
      )}
    </div>
  );
};

export default BuildDate;
