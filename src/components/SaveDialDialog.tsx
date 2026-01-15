// src/components/SaveDialDialog.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Save, X } from 'lucide-react';

interface SaveDialDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  existingNames?: string[]; // For duplicate checking
}

const SaveDialDialog: React.FC<SaveDialDialogProps> = ({ open, onClose, onSave, existingNames = [] }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setError(null);
      // Focus input after dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleSave = () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    if (trimmedName.length > 100) {
      setError('Name must be 100 characters or less');
      return;
    }

    // Check for duplicates (optional warning, but allow saving)
    if (existingNames.includes(trimmedName)) {
      setError('A dial with this name already exists. You can still save with this name.');
      // Still allow saving, just show warning
    }

    onSave(trimmedName);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  const modal = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 24,
          minWidth: 400,
          maxWidth: '90vw',
          boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Save color="#2563eb" size={20} />
            Save Dial Configuration
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              color: '#6b7280',
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="dial-name-input"
            style={{
              display: 'block',
              marginBottom: 8,
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
            }}
          >
            Configuration Name
          </label>
          <input
            ref={inputRef}
            id="dial-name-input"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyPress}
            placeholder="Enter a name for this configuration"
            maxLength={100}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: error ? '1px solid #dc2626' : '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <div style={{ marginTop: 8, fontSize: '0.875rem', color: '#dc2626' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            className="form-input"
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              color: '#374151',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: name.trim() ? '#2563eb' : '#f3f4f6',
              border: '1px solid #d1d5db',
              color: name.trim() ? 'white' : '#9ca3af',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

export default SaveDialDialog;