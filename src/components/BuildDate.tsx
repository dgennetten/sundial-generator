import React from 'react';

const BuildDate: React.FC = () => {
  return (
    <div className="build-date-card">
      Build Date: {__BUILD_DATE__}
    </div>
  );
};

export default BuildDate;