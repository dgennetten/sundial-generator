// src/components/WelcomeDialog.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const WELCOME_DISMISSED_KEY = 'sundial-welcome-dismissed';

interface WelcomeDialogProps {
  onClose?: () => void;
}

const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ onClose }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the welcome dialog
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
    if (!dismissed) {
      setShowDialog(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
    }
    setShowDialog(false);
    onClose?.();
  };

  if (!showDialog) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          position: 'relative',
          margin: '20px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X size={20} color="#6b7280" />
        </button>

        <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>
          🧭 How to Build Your Custom Sundial
        </h2>

        <div style={{ fontSize: '1rem', lineHeight: '1.6', color: '#4b5563', marginBottom: '24px' }}>
          <ul style={{ paddingLeft: '24px', margin: '0 0 16px 0' }}>
            <li style={{ marginBottom: '12px' }}>
              <strong>Set your location</strong> using the dropdown menu, the interactive map, or by entering latitude and longitude directly.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Choose your dial's size and shape</strong>, whether you prefer a classic rectangle or a graceful oval.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Pick a gnomon style</strong>—and don't miss the innovative <strong>popup gnomon</strong>, perfect for paper dials and hands‑on experimentation.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Select a date range</strong>: "<strong>Winter–Spring</strong>" or "<strong>Fall–Summer</strong>" for a cleaner, easier‑to‑read layout tailored to half‑year seasons.
            </li>
          </ul>
          
          <p style={{ margin: '16px 0 0 0' }}>
            Enjoy exploring, experimenting, and crafting your perfect dial.<br />
            <strong>Happy Dialing!</strong>
          </p>
        </div>

        <div style={{ 
          marginTop: '24px', 
          paddingTop: '20px', 
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer',
            fontSize: '0.9rem',
            color: '#4b5563',
          }}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Don't show again</span>
          </label>

          <button
            onClick={handleClose}
            style={{
              padding: '10px 24px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

// Export function to clear the dismissed state (for reset functionality)
export const clearWelcomeDismissed = () => {
  localStorage.removeItem(WELCOME_DISMISSED_KEY);
};

export default WelcomeDialog;
