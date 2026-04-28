import React from 'react';

const BuildDate: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <div className="build-date-card">
      {__VERSION__} © {year}, K. Douglas Gennetten
    </div>
  );
};

export default BuildDate;
