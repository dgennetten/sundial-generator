import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import {
  DEFAULT_PIN_LIMIT,
  DEFAULT_TOUR_LENGTH,
  MAX_PIN_LIMIT,
  MAX_TOUR_LENGTH,
  MIN_PIN_LIMIT,
  MIN_TOUR_LENGTH,
  getAdminPerfOverride,
  getAdminPinLimit,
  getGlobalAdminSettings,
  getTourDuplicatesMode,
  getTourLength,
  getTourOrderMode,
  getTourShadowVisible,
  getTourSpeedMode,
  getTourStartMode,
  isAdminUnlocked,
  saveGlobalAdminSettings,
  unlockAdmin,
  type GlobalAdminSettings,
  type TourDuplicatesMode,
  type TourOrderMode,
  type TourSpeedMode,
  type TourStartMode,
} from '../lib/adminPrefs';
import { deleteSundialPrint, fetchSundialPrints } from '../utils/sundialPrintUtils';
import { getPrintDecorationFirstLine } from '../utils/adminPrintUtils';
import { shortLocationName } from '../utils/worldTourRoute';
import type { SundialPrint } from '../types/sundial';
import { perfOverlayEnabled } from '../lib/animationPerf';

interface AdminPanelProps {
  onClose: () => void;
  onPinLimitChange: (limit: number) => void;
  onPerfChange: (enabled: boolean) => void;
  onPrintsChanged: () => void;
  /** Load this print into the main sundial preview. */
  onPrintSelect?: (print: SundialPrint) => void;
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: '7px 8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: active ? 650 : 500,
              background: active ? '#2563eb' : '#f8fafc',
              color: active ? '#fff' : '#475569',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  onClose,
  onPinLimitChange,
  onPerfChange,
  onPrintsChanged,
  onPrintSelect,
}) => {
  const [unlocked, setUnlocked] = useState(() => isAdminUnlocked());
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [perfOn, setPerfOn] = useState(() => {
    const o = getAdminPerfOverride();
    return o !== null ? o : perfOverlayEnabled();
  });
  const [tourStart, setTourStart] = useState<TourStartMode>(() => getTourStartMode());
  const [tourOrder, setTourOrder] = useState<TourOrderMode>(() => getTourOrderMode());
  const [tourShadow, setTourShadow] = useState(() => getTourShadowVisible());
  const [tourDuplicates, setTourDuplicates] = useState<TourDuplicatesMode>(() => getTourDuplicatesMode());
  const [tourLengthInput, setTourLengthInput] = useState(() => String(getTourLength()));
  const [tourSpeed, setTourSpeed] = useState<TourSpeedMode>(() => getTourSpeedMode());
  const [pinLimitInput, setPinLimitInput] = useState(() => String(getAdminPinLimit()));
  const [prints, setPrints] = useState<SundialPrint[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const syncFormFromSettings = useCallback((s: GlobalAdminSettings) => {
    setTourStart(s.tourStart);
    setTourOrder(s.tourOrder);
    setTourShadow(s.tourShadow);
    setTourDuplicates(s.tourDuplicates);
    setTourLengthInput(String(s.tourLength));
    setTourSpeed(s.tourSpeed);
    setPinLimitInput(String(s.pinLimit));
    setPerfOn(s.showPerf !== null ? s.showPerf : perfOverlayEnabled());
  }, []);

  const persist = useCallback(async (partial: Partial<GlobalAdminSettings>, okMsg?: string) => {
    setSaving(true);
    setStatusMsg('Saving for all users…');
    try {
      const next = await saveGlobalAdminSettings(partial);
      syncFormFromSettings(next);
      setStatusMsg(okMsg ?? 'Saved for all users');
      return next;
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Save failed');
      return null;
    } finally {
      setSaving(false);
    }
  }, [syncFormFromSettings]);

  const loadPrints = useCallback(async (limit: number) => {
    setListLoading(true);
    setListError(null);
    try {
      const { prints: rows, totalCount: total } = await fetchSundialPrints(limit);
      setPrints(rows);
      setTotalCount(total);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load prints');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    syncFormFromSettings(getGlobalAdminSettings());
    void loadPrints(getAdminPinLimit());
  }, [unlocked, loadPrints, syncFormFromSettings]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockAdmin(password.trim())) {
      setUnlocked(true);
      setAuthError('');
      setPassword('');
    } else {
      setAuthError('Incorrect password');
    }
  };

  const handlePerfToggle = () => {
    const next = !perfOn;
    setPerfOn(next);
    void persist({ showPerf: next }).then((s) => {
      if (s) onPerfChange(next);
    });
  };

  const handleApplyPinLimit = () => {
    const n = parseInt(pinLimitInput, 10);
    if (!Number.isFinite(n)) {
      setStatusMsg('Enter a valid number');
      return;
    }
    void persist({ pinLimit: n }, undefined).then((s) => {
      if (!s) return;
      setPinLimitInput(String(s.pinLimit));
      onPinLimitChange(s.pinLimit);
      setStatusMsg(`Showing ${s.pinLimit} pins on the map (all users)`);
      void loadPrints(s.pinLimit);
    });
  };

  const handleDelete = async (print: SundialPrint) => {
    if (print.id == null) return;
    const id = Number(print.id);
    if (!Number.isFinite(id) || id < 1) return;
    const label = shortLocationName(
      print.location,
      Number(print.latitude),
      Number(print.longitude),
    );
    if (!confirm(`Delete print #${id}?\n${label}`)) return;
    setDeletingId(id);
    setStatusMsg('');
    try {
      await deleteSundialPrint(id);
      // Optimistic remove (coerce ids — JSON/MySQL can yield string ids)
      setPrints((prev) => prev.filter((p) => Number(p.id) !== id));
      setTotalCount((c) => Math.max(0, c - 1));
      onPrintsChanged();
      setStatusMsg(`Deleted #${id}`);
      // Silent refetch so list/total stay accurate after deletion
      void fetchSundialPrints(getAdminPinLimit())
        .then(({ prints: rows, totalCount: total }) => {
          setPrints(rows);
          setTotalCount(total);
        })
        .catch(() => {
          /* keep optimistic state */
        });
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10050,
        padding: 16,
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 650 }}>Admin</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close admin"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#64748b',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 16, overflow: 'auto' }}>
          {!unlocked ? (
            <form onSubmit={handleUnlock}>
              <label className="form-label" htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setAuthError('');
                }}
                autoFocus
                autoComplete="current-password"
              />
              {authError && (
                <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{authError}</div>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: 12, width: '100%' }}
              >
                Unlock
              </button>
            </form>
          ) : (
            <>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                Settings are saved to the server and apply for all visitors.
                {saving ? ' Saving…' : ''}
              </p>
              <section style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 650, color: '#334155' }}>
                  Perf panel
                </h3>
                <label
                  className="form-checkbox"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <input
                    type="checkbox"
                    checked={perfOn}
                    onChange={handlePerfToggle}
                  />
                  Show performance overlay
                </label>
              </section>

              <section style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 650, color: '#334155' }}>
                  World Tour
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Start at</div>
                    <Segmented<TourStartMode>
                      value={tourStart}
                      options={[
                        { value: 'latest', label: 'Latest' },
                        { value: 'earliest', label: 'Earliest' },
                      ]}
                      onChange={(v) => {
                        setTourStart(v);
                        void persist({ tourStart: v });
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Order</div>
                    <Segmented<TourOrderMode>
                      value={tourOrder}
                      options={[
                        { value: 'linear', label: 'Linear' },
                        { value: 'random', label: 'Random' },
                      ]}
                      onChange={(v) => {
                        setTourOrder(v);
                        void persist({ tourOrder: v });
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Shadow</div>
                    <Segmented<'show' | 'hide'>
                      value={tourShadow ? 'show' : 'hide'}
                      options={[
                        { value: 'show', label: 'Show' },
                        { value: 'hide', label: 'Hide' },
                      ]}
                      onChange={(v) => {
                        const show = v === 'show';
                        setTourShadow(show);
                        void persist({ tourShadow: show });
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                      Duplicates (same lat/lng, contiguous)
                    </div>
                    <Segmented<TourDuplicatesMode>
                      value={tourDuplicates}
                      options={[
                        { value: 'skip', label: 'Skip' },
                        { value: 'include', label: 'Include' },
                      ]}
                      onChange={(v) => {
                        setTourDuplicates(v);
                        void persist({ tourDuplicates: v });
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                      Length ({MIN_TOUR_LENGTH}–{MAX_TOUR_LENGTH} stops, default {DEFAULT_TOUR_LENGTH})
                    </div>
                    <input
                      type="number"
                      className="form-input"
                      min={MIN_TOUR_LENGTH}
                      max={MAX_TOUR_LENGTH}
                      value={tourLengthInput}
                      onChange={(e) => setTourLengthInput(e.target.value)}
                      onBlur={() => {
                        const n = parseInt(tourLengthInput, 10);
                        void persist({
                          tourLength: Number.isFinite(n) ? n : DEFAULT_TOUR_LENGTH,
                        }).then((s) => {
                          if (s) setTourLengthInput(String(s.tourLength));
                        });
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Speed</div>
                    <Segmented<TourSpeedMode>
                      value={tourSpeed}
                      options={[
                        { value: 'slow', label: 'Slow' },
                        { value: 'normal', label: 'Normal' },
                        { value: 'fast', label: 'Fast' },
                      ]}
                      onChange={(v) => {
                        setTourSpeed(v);
                        void persist({ tourSpeed: v });
                      }}
                    />
                  </div>
                </div>
              </section>

              <section style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 650, color: '#334155' }}>
                  Recent prints / exports
                </h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="admin-pin-limit">
                      Pins shown ({MIN_PIN_LIMIT}–{MAX_PIN_LIMIT})
                    </label>
                    <input
                      id="admin-pin-limit"
                      type="number"
                      className="form-input"
                      min={MIN_PIN_LIMIT}
                      max={MAX_PIN_LIMIT}
                      value={pinLimitInput}
                      onChange={(e) => setPinLimitInput(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleApplyPinLimit}
                    style={{ flexShrink: 0 }}
                  >
                    Apply
                  </button>
                </div>

                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  {listLoading
                    ? 'Loading…'
                    : `${prints.length} loaded · ${totalCount} total in database`}
                  {statusMsg ? ` · ${statusMsg}` : ''}
                </div>
                {listError && (
                  <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{listError}</div>
                )}

                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    maxHeight: 280,
                    overflow: 'auto',
                  }}
                >
                  {prints.length === 0 && !listLoading ? (
                    <div style={{ padding: 12, fontSize: 13, color: '#94a3b8' }}>No prints</div>
                  ) : (
                    prints.map((print) => {
                      const lat = Number(print.latitude);
                      const lng = Number(print.longitude);
                      const label = shortLocationName(print.location, lat, lng);
                      const decoration = getPrintDecorationFirstLine(print.config_json);
                      return (
                        <div
                          key={print.id ?? `${lat},${lng},${print.created_at}`}
                          role={onPrintSelect ? 'button' : undefined}
                          tabIndex={onPrintSelect ? 0 : undefined}
                          onClick={() => onPrintSelect?.(print)}
                          onKeyDown={(e) => {
                            if (!onPrintSelect) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onPrintSelect(print);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 10px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: 13,
                            cursor: onPrintSelect ? 'pointer' : 'default',
                          }}
                          title={onPrintSelect ? 'Show in preview' : undefined}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 560,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={print.location || label}
                            >
                              #{print.id} · {label}
                            </div>
                            {decoration && (
                              <div
                                style={{
                                  color: '#64748b',
                                  fontSize: 12,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={decoration}
                              >
                                {decoration}
                              </div>
                            )}
                            <div style={{ color: '#94a3b8', fontSize: 11 }}>
                              {print.created_at ?? ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            title="Delete this entry"
                            disabled={print.id == null || deletingId === print.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(print);
                            }}
                            style={{
                              padding: '4px 8px',
                              color: '#dc2626',
                              flexShrink: 0,
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 11, color: '#94a3b8' }}>
                  Default pin limit is {DEFAULT_PIN_LIMIT}. Delete requires the updated API on the server.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
