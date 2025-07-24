import React from 'react';

const BuildDate: React.FC = () => {
  const handleReset = () => {
    if (confirm('This will reset all your custom settings (line styles, declination lines, etc.) to defaults. Are you sure?')) {
      // Clear all localStorage items related to the app
      const keysToRemove = [
        'sundial-line-styles',
        'sundial-declination-lines', 
        'sundial-hourline-intervals'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Reload the page to apply defaults
      window.location.reload();
    }
  };

  return (
    <div className="build-date-card">
      Build Date: {__BUILD_DATE__} | <button 
        onClick={handleReset}
        className="reset-link"
        title="Reset all settings to defaults"
      >
        reset
      </button>
    </div>
  );
};

export default BuildDate;