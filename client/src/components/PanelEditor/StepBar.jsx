// src/components/PanelEditor/StepBar.jsx
export default function StepBar({ current, confirmedPages, totalPages, onStep, onConfirmPage, onAutoDetect, detecting, editor }) {
  const steps = [
    { n: 1, label: 'Upload' },
    { n: 2, label: 'Panel Review' },
    { n: 3, label: 'Characters', locked: confirmedPages === 0 },
    { n: 4, label: 'Dialogue', locked: confirmedPages === 0 },
    { n: 5, label: 'Voices', locked: confirmedPages === 0 },
    { n: 6, label: 'Animate', locked: current < 6 },
    { n: 7, label: 'Publish', locked: current < 7 },
  ];

  const showPanelActions = current === 2;

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '0 24px', height: 52,
      background: '#0d0d0f', borderBottom: '1px solid #26262f', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
        {steps.map((s, i) => {
          const done = s.n < current;
          const active = s.n === current;
          const locked = s.locked;
          return (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => !locked && onStep(s.n)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0 20px', height: 52,
                  fontSize: 13, fontWeight: 600,
                  color: done ? '#2ec97e' : active ? 'white' : locked ? '#35353f' : '#6b6b7e',
                  background: 'transparent', border: 'none',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  transition: 'all .2s', whiteSpace: 'nowrap',
                  opacity: locked ? 0.5 : 1,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  background: done ? '#2ec97e' : active ? 'var(--accent)' : '#26262f',
                  color: done ? '#0d0d0f' : active ? 'white' : '#6b6b7e',
                  boxShadow: active ? '0 0 15px var(--accent-glow)' : 'none'
                }}>
                  {done ? '✓' : s.n}
                </div>
                {s.label}
                {s.n === 2 && totalPages > 0 && (
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 20,
                    background: '#26262f', color: '#9898a8', marginLeft: 6,
                    fontWeight: 600
                  }}>{confirmedPages}/{totalPages}</span>
                )}
              </button>
              {i < steps.length - 1 && (
                <span style={{ color: '#26262f', fontSize: 18, margin: '0 4px', fontWeight: 300 }}>/</span>
              )}
            </div>
          );
        })}
      </div>

      {showPanelActions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onAutoDetect} disabled={detecting} className="button secondary">
            {detecting ? 'Detecting...' : 'Auto-Detect Panels'}
          </button>
          <button onClick={onConfirmPage} disabled={!editor || editor.sortedPanels.length === 0} className="button primary">
            Confirm Page & Next →
          </button>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// src/components/PanelEditor/CharacterStep.jsx
// ─────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CroppedImage from './CroppedImage';

const CHAR_COLORS = ['#e8341a', '#3a9bdc', '#2ec97e', '#e8991a', '#9b6bdc', '#dc3a8f', '#ff9f40', '#3adccc'];
const VOICE_TYPES = [
  { id: 'male_young', label: 'Young Male', icon: '🧑' },
  { id: 'male_adult', label: 'Adult Male', icon: '👨' },
  { id: 'male_old', label: 'Older Male', icon: '👴' },
  { id: 'female_young', label: 'Young Female', icon: '👩' },
  { id: 'female_adult', label: 'Adult Female', icon: '👩' },
  { id: 'female_old', label: 'Older Female', icon: '👵' },
  { id: 'child', label: 'Child', icon: '🧒' },
  { id: 'robot', label: 'Robot/Monster', icon: '🤖' },
];

export function CharacterStep({
  manifests, characters, panelCharMap,
  onAddCharacter, onUpdateCharacter, onDeleteCharacter,
  onTagRegion, onAddManualRegion, onRemoveRegion, onDetectCharacters, detecting,
  onBack, onNext,
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDraft, setAddDraft] = useState({ name: '', voiceType: 'male_young', voiceId: '', colorTag: CHAR_COLORS[0] });
  const [selectedChar, setSelectedChar] = useState(null);
  const [previewPanel, setPreviewPanel] = useState(null);
  const [isLassoing, setIsLassoing] = useState(false);
  const [lassoPoints, setLassoPoints] = useState([]);

  const handleAdd = async () => {
    if (!addDraft.name.trim()) return;
    await onAddCharacter(addDraft);
    setShowAddModal(false);
    setAddDraft({ name: '', voiceType: 'male_young', voiceId: '', colorTag: CHAR_COLORS[characters.length % CHAR_COLORS.length] });
  };

  // Build panel grid from all confirmed manifests
  const allPanels = manifests.flatMap(m =>
    (m.panels || []).map(p => ({ ...p, pageNumber: m.pageNumber, manifestId: m._id }))
  ).sort((a, b) => a.pageNumber - b.pageNumber || a.readingOrder - b.readingOrder);

  const totalRegions = allPanels.reduce((acc, p) => acc + (panelCharMap[p.panelId] || []).length, 0);
  const taggedRegions = allPanels.reduce((acc, p) => acc + (panelCharMap[p.panelId] || []).filter(r => r.characterId).length, 0);

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>

      {/* PANEL GRID */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: '#0d0d0f' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, color: 'white', letterSpacing: 1 }}>
            Character Identification
          </div>
          <div style={{ fontSize: 12, color: '#6b6b7e', marginTop: 4 }}>
            Click a panel to tag which characters appear. We use this to automatically assign voices.
            &nbsp;·&nbsp;<span style={{ color: '#2ec97e' }}>{taggedRegions}/{totalRegions} regions tagged</span>
          </div>
        </div>

        {/* Page groups */}
        {manifests.map(m => (
          <div key={m._id} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: '#35353f', textTransform: 'uppercase', letterSpacing: 1 }}>
                Page {m.pageNumber}
              </div>
              <button
                onClick={() => onDetectCharacters(m.pageNumber)}
                disabled={detecting}
                style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '4px 12px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
              >
                {detecting ? 'Detecting...' : 'Auto-Detect Characters'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {(m.panels || []).map(panel => {
                const regions = panelCharMap[panel.panelId] || [];
                return (
                  <PanelThumb
                    key={panel.panelId}
                    panel={panel}
                    pageNumber={m.pageNumber}
                    imageUrl={m.imageUrl}
                    regions={regions}
                    characters={characters}
                    onTagRegion={onTagRegion}
                    selectedChar={selectedChar}
                    onPreview={(p) => setPreviewPanel(p)}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Bottom actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32, paddingTop: 24, borderTop: '1px solid #26262f' }}>
          <button onClick={onBack} style={{ padding: '10px 20px', borderRadius: 7, background: 'transparent', color: '#9898a8', border: '1px solid #35353f', fontSize: 13, cursor: 'pointer' }}>
            ← Back to Panels
          </button>
          <button onClick={onNext} style={{ padding: '10px 24px', borderRadius: 7, background: '#e8341a', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Assign Voices →
          </button>
        </div>
      </div>

      {/* CHARACTER SIDEBAR */}
      <div style={{
        width: 280, flexShrink: 0, background: '#1a1a20', borderLeft: '1px solid #26262f',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #26262f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: .8, color: '#6b6b7e' }}>Characters</span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#26262f', color: '#9898a8' }}>{characters.length}</span>
        </div>

        {/* Quick select hint */}
        {characters.length > 0 && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #26262f', fontSize: 11, color: '#6b6b7e' }}>
            {selectedChar
              ? <span style={{ color: '#2ec97e' }}>Click panels to tag <strong>{characters.find(c => c._id === selectedChar)?.name}</strong></span>
              : 'Click a character to activate tagging mode'}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {characters.map(c => {
            const count = Object.values(panelCharMap).flat().filter(r => r.characterId === c._id).length;
            const color = c.colorTag || CHAR_COLORS[0];
            const isActive = selectedChar === c._id;
            return (
              <div
                key={c._id}
                onClick={() => setSelectedChar(isActive ? null : c._id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderBottom: '1px solid #26262f',
                  cursor: 'pointer', transition: 'background .12s',
                  background: isActive ? color + '22' : 'transparent',
                  borderLeft: `3px solid ${isActive ? color : 'transparent'}`,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: color + '22', color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, flexShrink: 0,
                }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: '#6b6b7e' }}>
                    {count} region{count !== 1 ? 's' : ''} · Voice {c.voiceId ? `#${c.voiceId}` : c.voiceType}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onDeleteCharacter(c._id) }}
                  style={{ opacity: .4, background: 'transparent', border: 'none', color: '#e8341a', cursor: 'pointer', fontSize: 14, padding: 2 }}
                >✕</button>
              </div>
            );
          })}

          {!characters.length && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#35353f', fontSize: 12 }}>
              No characters yet.<br />Add characters and tag them in panels.
            </div>
          )}
        </div>

        <div style={{ padding: '10px 10px 12px', borderTop: '1px solid #26262f', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <button onClick={() => setShowAddModal(true)} style={{
            width: '100%', padding: 10, borderRadius: 7,
            background: '#9b6bdc', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}>+ Add Character</button>
          <div style={{ fontSize: 10, color: '#35353f', lineHeight: 1.6, padding: '0 2px' }}>
            Tip: Tag all speaking characters. Unknown speakers can be "Unknown 1", "Unknown 2" etc.
          </div>
        </div>
      </div>

      {/* ADD CHARACTER MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: .95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .95, y: 8 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#1a1a20', borderRadius: 12, border: '1px solid #35353f', width: 400, padding: 24 }}
            >
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: 'white', letterSpacing: 1, marginBottom: 18 }}>Add Character</div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#6b6b7e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Name</div>
                <input
                  autoFocus
                  value={addDraft.name}
                  onChange={e => setAddDraft(d => ({ ...d, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="e.g. Akira, Unknown 1…"
                  style={{ width: '100%', padding: '8px 11px', borderRadius: 7, background: '#26262f', border: '1px solid #35353f', color: 'white', fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#6b6b7e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Voice Number / ID (Optional)</div>
                <input
                  value={addDraft.voiceId}
                  onChange={e => setAddDraft(d => ({ ...d, voiceId: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="e.g. 1, 2, or specific Voice ID"
                  style={{ width: '100%', padding: '8px 11px', borderRadius: 7, background: '#26262f', border: '1px solid #35353f', color: 'white', fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#6b6b7e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>Voice Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                  {VOICE_TYPES.map(v => (
                    <div key={v.id} onClick={() => setAddDraft(d => ({ ...d, voiceType: v.id }))} style={{
                      padding: '8px 10px', borderRadius: 7, textAlign: 'center',
                      background: addDraft.voiceType === v.id ? '#9b6bdc22' : '#26262f',
                      border: `1px solid ${addDraft.voiceType === v.id ? '#9b6bdc' : '#35353f'}`,
                      color: addDraft.voiceType === v.id ? '#9b6bdc' : '#9898a8',
                      cursor: 'pointer', fontSize: 11, transition: 'all .12s',
                    }}>
                      <div style={{ fontSize: 18, marginBottom: 2 }}>{v.icon}</div>
                      {v.label}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, color: '#6b6b7e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>Colour Tag</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {CHAR_COLORS.map(c => (
                    <div key={c} onClick={() => setAddDraft(d => ({ ...d, colorTag: c }))} style={{
                      width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer',
                      border: `3px solid ${addDraft.colorTag === c ? 'white' : 'transparent'}`,
                      transform: addDraft.colorTag === c ? 'scale(1.15)' : 'scale(1)', transition: 'transform .1s',
                    }} />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: 9, borderRadius: 7, background: '#26262f', color: '#9898a8', border: 'none', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button onClick={handleAdd} style={{ flex: 1, padding: 9, borderRadius: 7, background: '#9b6bdc', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Add Character</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PANEL PREVIEW MODAL */}
      <AnimatePresence>
        {previewPanel && (
          <motion.div
            key="preview-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.9)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setPreviewPanel(null)}
          >
            <motion.div
              initial={{ scale: .9, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .9, y: 10 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#1a1a20', borderRadius: 12, border: '2px solid #e8341a', padding: 24, maxWidth: 800, maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, color: 'white', letterSpacing: 1 }}>
                    Manual Character Tagging
                  </div>
                  <div style={{ fontSize: 12, color: '#6b6b7e', marginTop: 4 }}>
                    Click and drag to lasso a character
                  </div>
                </div>
                <button onClick={() => setPreviewPanel(null)} style={{ background: 'none', border: 'none', color: '#e8341a', fontSize: 32, cursor: 'pointer', padding: 0, lineHeight: 1, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              {/* Interactive preview with lasso support */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: `${previewPanel.panel.bbox.w}/${previewPanel.panel.bbox.h}`,
                  background: '#1a1a20',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: `3px solid ${previewPanel.panel.colorTag}`,
                  cursor: isLassoing ? 'crosshair' : 'default',
                  userSelect: 'none'
                }}
                onMouseDown={(e) => {
                  if (e.button !== 0) return; // only left click
                  e.preventDefault();
                  setIsLassoing(true);
                  const rect = e.currentTarget.getBoundingClientRect();
                  const scaleX = previewPanel.panel.bbox.w / rect.width;
                  const scaleY = previewPanel.panel.bbox.h / rect.height;
                  const x = previewPanel.panel.bbox.x + (e.clientX - rect.left) * scaleX;
                  const y = previewPanel.panel.bbox.y + (e.clientY - rect.top) * scaleY;
                  setLassoPoints([{ x, y }]);
                }}
                onMouseMove={(e) => {
                  if (!isLassoing) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const scaleX = previewPanel.panel.bbox.w / rect.width;
                  const scaleY = previewPanel.panel.bbox.h / rect.height;
                  const x = previewPanel.panel.bbox.x + (e.clientX - rect.left) * scaleX;
                  const y = previewPanel.panel.bbox.y + (e.clientY - rect.top) * scaleY;
                  setLassoPoints(prev => [...prev, { x, y }]);
                }}
                onMouseUp={() => {
                  if (!isLassoing) return;
                  setIsLassoing(false);
                  if (lassoPoints.length > 5) { // Ensure it's an actual shape
                    const minX = Math.min(...lassoPoints.map(p => p.x));
                    const maxX = Math.max(...lassoPoints.map(p => p.x));
                    const minY = Math.min(...lassoPoints.map(p => p.y));
                    const maxY = Math.max(...lassoPoints.map(p => p.y));

                    onAddManualRegion(previewPanel.panel.panelId, lassoPoints, { x: minX, y: minY, w: maxX - minX, h: maxY - minY });
                  }
                  setLassoPoints([]);
                }}
                onMouseLeave={() => {
                  if (isLassoing) {
                    setIsLassoing(false);
                    setLassoPoints([]);
                  }
                }}
              >
                <CroppedImage
                  imageUrl={previewPanel.imageUrl}
                  bbox={previewPanel.panel.bbox}
                  colorTag={previewPanel.panel.colorTag}
                  style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                >
                  <svg
                    viewBox={`${previewPanel.panel.bbox.x} ${previewPanel.panel.bbox.y} ${Math.max(1, previewPanel.panel.bbox.w)} ${Math.max(1, previewPanel.panel.bbox.h)}`}
                    preserveAspectRatio="none"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                  >
                    {/* Render existing regions */}
                    {(panelCharMap[previewPanel.panel.panelId] || []).map(r => {
                      const char = characters.find(c => c._id === r.characterId);
                      const color = char ? char.colorTag : '#9898a8';
                      const strokeDasharray = char ? 'none' : '4 4';
                      const fill = char ? color + '44' : 'transparent';
                      const pts = r.points.map(p => `${p.x},${p.y}`).join(' ');
                      const minX = Math.min(...r.points.map(p => p.x));
                      const minY = Math.min(...r.points.map(p => p.y));

                      return (
                        <g key={r.characterRegionId}>
                          <polygon
                            points={pts}
                            fill={fill}
                            stroke={color}
                            strokeWidth="2"
                            strokeDasharray={strokeDasharray}
                            style={{ pointerEvents: 'auto', cursor: selectedChar ? 'pointer' : 'crosshair' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedChar) onTagRegion(previewPanel.panel.panelId, r.characterRegionId, selectedChar);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onRemoveRegion(previewPanel.panel.panelId, r.characterRegionId);
                            }}
                          />
                          {char && (
                            <text
                              x={minX}
                              y={minY - 5}
                              fill="white"
                              style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                paintOrder: 'stroke',
                                stroke: color,
                                strokeWidth: '3px',
                                strokeLinejoin: 'round',
                                pointerEvents: 'none',
                                textShadow: '0 1px 4px rgba(0,0,0,0.5)'
                              }}
                            >
                              {char.name} {char.voiceId ? `(#${char.voiceId})` : ''}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Render active lasso drawing */}
                    {lassoPoints.length > 0 && (
                      <polyline
                        points={lassoPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="rgba(46, 201, 126, 0.2)"
                        stroke="#2ec97e"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                    )}
                  </svg>
                </CroppedImage>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: '#9898a8' }}>
                  Select a character on the left, then click regions to tag them. <strong style={{ color: '#e8341a' }}>Right-click a shape to delete it.</strong>
                </div>
                <button onClick={() => setPreviewPanel(null)} style={{ padding: '10px 24px', borderRadius: 7, background: '#35353f', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── PANEL THUMBNAIL ───────────────────────────────────────────────
function PanelThumb({ panel, pageNumber, imageUrl, regions, characters, onTagRegion, selectedChar, onPreview }) {
  const handleClick = () => {
    onPreview({ panel, imageUrl, pageNumber });
  };

  const hasRegions = regions.length > 0;
  const isFullyTagged = hasRegions && regions.every(r => r.characterId);

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={handleClick}
        style={{
          cursor: 'pointer', borderRadius: 8,
          border: `2px solid ${isFullyTagged ? '#2ec97e' : hasRegions ? '#e8991a' : '#26262f'}`,
          overflow: 'hidden', transition: 'border-color .15s',
          background: '#1a1a20',
          aspectRatio: `${panel.bbox.w}/${panel.bbox.h}`,
          maxWidth: 180,
        }}
      >
        <CroppedImage
          imageUrl={imageUrl}
          bbox={panel.bbox}
          colorTag={panel.colorTag}
          style={{ width: '100%', height: '100%' }}
        >
          <svg
            viewBox={`${panel.bbox.x} ${panel.bbox.y} ${Math.max(1, panel.bbox.w)} ${Math.max(1, panel.bbox.h)}`}
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            {regions.map(r => {
              const char = characters.find(c => c._id === r.characterId);
              const color = char ? char.colorTag : '#9898a8';
              const strokeDasharray = char ? 'none' : '4 4';
              const fill = char ? color + '44' : 'transparent';
              const pts = r.points.map(p => `${p.x},${p.y}`).join(' ');
              const minX = Math.min(...r.points.map(pts => pts.x));
              const minY = Math.min(...r.points.map(pts => pts.y));

              return (
                <g key={r.characterRegionId}>
                  <polygon
                    points={pts}
                    fill={fill}
                    stroke={color}
                    strokeWidth="3"
                    strokeDasharray={strokeDasharray}
                    style={{ pointerEvents: 'auto', transition: 'all 0.2s', cursor: selectedChar ? 'pointer' : 'default' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedChar) onTagRegion(panel.panelId, r.characterRegionId, selectedChar);
                    }}
                    onMouseEnter={(e) => {
                      if (selectedChar) e.currentTarget.style.fill = 'rgba(255,255,255,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.fill = fill;
                    }}
                  />
                  {char && (
                    <text
                      x={minX}
                      y={minY - 5}
                      fill="white"
                      style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        paintOrder: 'stroke',
                        stroke: color,
                        strokeWidth: '4px',
                        strokeLinejoin: 'round',
                        pointerEvents: 'none'
                      }}
                    >
                      {char.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </CroppedImage>

        {/* Character dots summary */}
        <div style={{ position: 'absolute', top: 5, right: 5, display: 'flex', gap: 3 }}>
          {regions.filter(r => r.characterId).map(r => {
            const char = characters.find(c => c._id === r.characterId);
            return char ? <div key={r.characterRegionId} style={{ width: 8, height: 8, borderRadius: '50%', background: char.colorTag || '#9b6bdc', boxShadow: '0 0 4px rgba(0,0,0,.5)' }} /> : null;
          })}
        </div>

        {/* Panel number badge */}
        <div style={{
          position: 'absolute', top: 4, left: 4,
          background: panel.colorTag, color: 'white',
          fontFamily: 'Bebas Neue, sans-serif', fontSize: 12, letterSpacing: 1,
          padding: '2px 8px', borderRadius: '2px',
          pointerEvents: 'none', lineHeight: 1.2,
          boxShadow: '0 2px 4px rgba(0,0,0,.5)'
        }}>
          #{panel.readingOrder + 1}
        </div>
      </div>

      <div style={{ padding: '6px 8px', fontSize: 10, color: '#6b6b7e', fontFamily: 'JetBrains Mono, monospace', borderTop: '1px solid #26262f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span>{panel.label || `#${panel.readingOrder + 1}`}</span>
        <span style={{ fontSize: 9, color: isFullyTagged ? '#2ec97e' : hasRegions ? '#e8991a' : '#6b6b7e' }}>
          {regions.length} chars
        </span>
      </div>
    </div>
  );
}
