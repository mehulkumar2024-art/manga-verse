import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CroppedImage from './CroppedImage';

const COLORS = ['#e8341a', '#3a9bdc', '#2ec97e', '#e8991a', '#9b6bdc', '#dc3a8f', '#3adccc', '#dcb83a'];

export default function PanelSidebar({
  editor, imageUrl, currentPage, totalPages, confirmedCount, manifests,
  onPageChange, onConfirm, onProceedToChars,
}) {
  const {
    sortedPanels, selectedId, status, isSaving, isDirty,
    setSelectedId, deletePanel, updatePanel, splitPanel, confirmPage,
  } = editor;

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  const openEdit = (panel) => {
    setEditingId(panel.panelId);
    setEditDraft({ label: panel.label, colorTag: panel.colorTag, readingOrder: panel.readingOrder + 1 });
  };
  const saveEdit = () => {
    updatePanel(editingId, {
      label: editDraft.label,
      colorTag: editDraft.colorTag,
      readingOrder: parseInt(editDraft.readingOrder || 1) - 1,
    });
    setEditingId(null);
  };

  const statusColor = status === 'confirmed' ? '#2ec97e' : status === 'reviewing' ? '#e8991a' : '#6b6b7e';
  const statusLabel = status === 'confirmed' ? 'Confirmed' : status === 'reviewing' ? 'Draft' : status === 'detected' ? 'Detected' : status;

  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: '#141417', borderLeft: '1px solid #26262f',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>

      {/* HEADER */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #26262f',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#6b6b7e' }}>
          Panels
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 20,
            background: '#26262f', color: '#9898a8', fontWeight: 600
          }}>{sortedPanels.length}</span>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 20,
            background: status === 'confirmed' ? '#082d1e' : '#26262f',
            color: statusColor, border: `1px solid ${statusColor}44`,
            fontWeight: 600, textTransform: 'uppercase'
          }}>{statusLabel}</span>
        </div>
      </div>

      {/* PANEL LIST */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
        <AnimatePresence>
          {sortedPanels.map((panel) => (
            <motion.div
              key={panel.panelId}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: .2 }}
            >
              <PanelCard
                panel={panel}
                imageUrl={imageUrl}
                isSelected={selectedId === panel.panelId}
                onSelect={() => setSelectedId(panel.panelId)}
                onEdit={() => openEdit(panel)}
                onDelete={() => deletePanel(panel.panelId)}
                onSplit={() => splitPanel(panel.panelId)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {sortedPanels.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#35353f' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>◰</div>
            <div style={{ fontSize: 13 }}>No panels detected yet.</div>
          </div>
        )}
      </div>

      {/* PAGE NAVIGATION */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid #26262f', background: '#0d0d0f'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#6b6b7e' }}>
            Page {currentPage} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              style={navBtnStyle(currentPage <= 1)}
            >←</button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              style={navBtnStyle(currentPage >= totalPages)}
            >→</button>
          </div>
        </div>
        <PageDot manifests={manifests} currentPage={currentPage} onPageChange={onPageChange} />
      </div>

      {/* ACTIONS */}
      <div style={{ padding: '16px 16px 20px', borderTop: '1px solid #26262f', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onConfirm}
          disabled={isSaving || sortedPanels.length === 0}
          style={{
            width: '100%', padding: '12px', borderRadius: 10,
            background: sortedPanels.length === 0 ? '#26262f' : status === 'confirmed' ? '#082d1e' : 'var(--accent)',
            color: sortedPanels.length === 0 ? '#35353f' : status === 'confirmed' ? '#2ec97e' : 'white',
            fontSize: 14, fontWeight: 600, border: 'none', cursor: (isSaving || sortedPanels.length === 0) ? 'not-allowed' : 'pointer',
            transition: 'all .2s',
            boxShadow: (status !== 'confirmed' && sortedPanels.length > 0) ? '0 4px 12px var(--accent-low)' : 'none'
          }}
        >
          {isSaving ? 'Processing…' : status === 'confirmed' ? '✓ Page Confirmed' : 'Confirm & Next Page'}
        </button>

        {confirmedCount === totalPages && totalPages > 0 && (
          <button
            onClick={onProceedToChars}
            style={{
              width: '100%', padding: '10px', borderRadius: 10,
              background: '#0d0d0f', color: 'var(--accent)',
              fontSize: 13, fontWeight: 600,
              border: '1px solid var(--accent)', cursor: 'pointer', transition: 'all .2s',
            }}
          >
            Finish Panel Step →
          </button>
        )}

        {sortedPanels.length > 0 && status !== 'confirmed' && (
          <button
            onClick={editor.resetToDetected}
            style={{
              width: '100%', padding: 8, borderRadius: 8,
              background: 'transparent', color: '#45454f',
              fontSize: 11, border: '1px solid transparent', cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.color = '#6b6b7e'}
            onMouseOut={(e) => e.target.style.color = '#45454f'}
          >
            Reset to auto-detected
          </button>
        )}
      </div>


      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingId && (
          <EditModal
            draft={editDraft}
            onChange={(k, v) => setEditDraft(d => ({ ...d, [k]: v }))}
            onSave={saveEdit}
            onClose={() => setEditingId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── PANEL CARD ────────────────────────────────────────────────────
function PanelCard({ panel, imageUrl, isSelected, onSelect, onEdit, onDelete, onSplit }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '10px', borderRadius: 8, marginBottom: 8,
        background: isSelected ? '#26262f' : hovered ? '#1e1e26' : 'transparent',
        border: `2px solid ${isSelected ? panel.colorTag : hovered ? '#35353f' : 'transparent'}`,
        cursor: 'pointer', transition: 'all .15s',
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: hovered ? '#6b6b7e' : '#26262f', fontSize: 13, cursor: 'grab' }}>⠿</span>
          <div style={{
            background: panel.colorTag, color: 'white',
            fontFamily: 'Bebas Neue, sans-serif', fontSize: 14,
            padding: '2px 8px', borderRadius: 4, lineHeight: 1.2, letterSpacing: 1
          }}>
            #{panel.readingOrder + 1}
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#c8c8d4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
            {panel.label}
          </div>
        </div>

        {/* Actions (on hover or selected) */}
        {(hovered || isSelected) && (
          <div style={{ display: 'flex', gap: 4 }}>
            <IconBtn onClick={(e) => { e.stopPropagation(); onEdit() }} title="Edit">✎</IconBtn>
            <IconBtn onClick={(e) => { e.stopPropagation(); onSplit() }} title="Split">⊘</IconBtn>
            <IconBtn onClick={(e) => { e.stopPropagation(); onDelete() }} title="Delete" color="#e8341a">✕</IconBtn>
          </div>
        )}
      </div>

      {/* Image Thumbnail */}
      <CroppedImage
        imageUrl={imageUrl}
        bbox={panel.bbox}
        colorTag={panel.colorTag}
        style={{
          maxHeight: 250,
          border: `1px solid ${panel.colorTag}44`,
          borderRadius: 6
        }}
      />

      <div style={{ fontSize: 10, color: '#6b6b7e', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}>
        {panel.bbox.w}×{panel.bbox.h}px
      </div>
    </div>
  );
}

function IconBtn({ onClick, children, title, color = '#9898a8' }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 22, height: 22, borderRadius: 5, border: '1px solid #35353f',
      background: '#26262f', color, fontSize: 11, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</button>
  );
}

// ── EDIT MODAL ────────────────────────────────────────────────────
function EditModal({ draft, onChange, onSave, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: .95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .95, y: 8 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1a1a20', borderRadius: 12, border: '1px solid #35353f',
          width: 380, padding: 24,
        }}
      >
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: 'white', letterSpacing: 1, marginBottom: 18 }}>
          Edit Panel
        </div>

        <Field label="Label">
          <input value={draft.label} onChange={e => onChange('label', e.target.value)}
            style={inputStyle} placeholder="e.g. Panel 3" />
        </Field>

        <Field label="Reading Order">
          <input type="number" min="1" value={draft.readingOrder} onChange={e => onChange('readingOrder', e.target.value)}
            style={inputStyle} />
        </Field>

        <Field label="Color Tag">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <div key={c} onClick={() => onChange('colorTag', c)} style={{
                width: 28, height: 28, borderRadius: 6, background: c,
                border: `3px solid ${draft.colorTag === c ? 'white' : 'transparent'}`,
                cursor: 'pointer', transition: 'transform .1s',
                transform: draft.colorTag === c ? 'scale(1.15)' : 'scale(1)',
              }} />
            ))}
          </div>
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 9, borderRadius: 7, background: '#26262f', color: '#9898a8', border: 'none', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={onSave} style={{ flex: 1, padding: 9, borderRadius: 7, background: '#9b6bdc', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Save Changes</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: '#6b6b7e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 11px', borderRadius: 7,
  background: '#26262f', border: '1px solid #35353f',
  color: 'white', fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif',
};

function PageDot({ manifests, currentPage, onPageChange }) {
  if (!manifests.length) return null;
  const STATUS_COLORS = { confirmed: '#2ec97e', reviewing: '#e8991a', detected: '#3a9bdc', detecting: '#9898a8' };
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 100 }}>
      {manifests.slice(0, 20).map(m => (
        <div
          key={m.pageNumber}
          onClick={() => onPageChange(m.pageNumber)}
          title={`Page ${m.pageNumber} — ${m.status}`}
          style={{
            width: m.pageNumber === currentPage ? 10 : 6,
            height: m.pageNumber === currentPage ? 10 : 6,
            borderRadius: '50%',
            background: STATUS_COLORS[m.status] || '#35353f',
            cursor: 'pointer', transition: 'all .15s',
            opacity: m.pageNumber === currentPage ? 1 : 0.5,
          }}
        />
      ))}
    </div>
  );
}

const navBtnStyle = (disabled) => ({
  padding: '4px 10px', borderRadius: 6,
  background: disabled ? 'transparent' : '#26262f',
  color: disabled ? '#35353f' : '#9898a8',
  fontSize: 14, border: '1px solid #26262f',
  cursor: disabled ? 'not-allowed' : 'pointer',
});
