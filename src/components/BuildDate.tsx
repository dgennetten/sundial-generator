import React from 'react';
import { clearWelcomeDismissed } from './WelcomeDialog';

const BuildDate: React.FC = () => {
  const handleReset = () => {
    if (confirm('This will reset all your custom settings (line styles, declination lines, etc.) to defaults. Are you sure?')) {
      // Clear all localStorage items related to the app
      const keysToRemove = [
        'sundial-line-styles',
        'sundial-declination-lines',
        'sundial-hourline-intervals',
        'sundial-hourline-overrides',
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear welcome dialog dismissed state so it shows again
      clearWelcomeDismissed();
      
      // Reload the page to apply defaults
      window.location.reload();
    }
  };

  return (
    <div className="build-date-card">
      {__VERSION__} | <button 
        onClick={handleReset}
        className="reset-link"
        title="Reset all settings to defaults"
      >
        reset
      </button> | © 2025, K. Douglas Gennetten
    </div>
  );
};

export default BuildDate;