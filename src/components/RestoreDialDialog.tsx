// src/components/RestoreDialDialog.tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { RotateCcw, X, Trash2, Calendar } from 'lucide-react';
import type { SavedDialConfig } from '../utils/dialSaveRestore';

interface RestoreDialDialogProps {
  open: boolean;
  onClose: () => void;
  onRestore: (config: SavedDialConfig['config']) => void;
  onDelete: (id: string) => void;
  savedConfigs: SavedDialConfig[];
}

const RestoreDialDialog: React.FC<RestoreDialDialogProps> = ({ open, onClose, onRestore, onDelete, savedConfigs }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      // Second click - confirm delete
      onDelete(id);
      setConfirmDeleteId(null);
      setDeletingId(id);
      // Clear deleting state after animation
      setTimeout(() => setDeletingId(null), 200);
    } else {
      // First click - show confirmation
      setConfirmDeleteId(id);
      // Clear confirmation after 3 seconds
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRestore = (config: SavedDialConfig['config']) => {
    onRestore(config);
    onClose();
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
          minWidth: 500,
          maxWidth: '90vw',
          maxHeight: '90vh',
          boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw color="#2563eb" size={20} />
            Restore Dial Configuration
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

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 200, maxHeight: '60vh' }}>
          {savedConfigs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
              <RotateCcw size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '0.95rem' }}>No saved configurations found.</p>
              <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#9ca3af' }}>
                Save a dial configuration to restore it later.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {savedConfigs
                .sort((a, b) => b.savedAt - a.savedAt) // Sort by most recent first
                .map((config) => (
                  <div
                    key={config.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: 12,
                      cursor: deletingId === config.id ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: deletingId === config.id ? '#fee2e2' : '#fff',
                      opacity: deletingId === config.id ? 0.5 : 1,
                    }}
                    onClick={() => deletingId !== config.id && handleRestore(config.config)}
                    onMouseEnter={(e) => {
                      if (deletingId !== config.id) {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (deletingId !== config.id) {
                        e.currentTarget.style.backgroundColor = '#fff';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: 4, fontSize: '0.95rem' }}>
                          {config.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={14} />
                          {formatDate(config.savedAt)}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                          {config.config.locationName || `${config.config.latitude.toFixed(4)}, ${config.config.longitude.toFixed(4)}`}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteClick(config.id, e)}
                        style={{
                          background: confirmDeleteId === config.id ? '#dc2626' : 'transparent',
                          border: confirmDeleteId === config.id ? '1px solid #dc2626' : '1px solid #e5e7eb',
                          borderRadius: '4px',
                          padding: '6px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          color: confirmDeleteId === config.id ? 'white' : '#dc2626',
                          transition: 'all 0.2s',
                          flexShrink: 0,
                          marginLeft: 8,
                        }}
                        title={confirmDeleteId === config.id ? 'Click again to confirm' : 'Delete'}
                        onMouseEnter={(e) => {
                          if (confirmDeleteId !== config.id) {
                            e.currentTarget.style.backgroundColor = '#fee2e2';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (confirmDeleteId !== config.id) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
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
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

export default RestoreDialDialog;