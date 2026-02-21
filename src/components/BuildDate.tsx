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
      
      clearWelcomeDismissed();
      document.querySelector<HTMLElement>('.controls-panel')?.scrollTo(0, 0);
      try { sessionStorage.setItem('sundial-scroll-panel-to-top', '1'); } catch (_) {}
      window.location.hash = '';
      window.location.reload();
    }
  };

  return (
    <div className="build-date-card">
      {__VERSION__} | <button 
        id="reset-button"
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