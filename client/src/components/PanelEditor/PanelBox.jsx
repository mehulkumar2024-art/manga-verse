// src/components/PanelEditor/PanelBox.jsx
// Individual panel overlay: click to select, drag to move, handle to resize.
// All positions are in IMAGE-SPACE coords; scale is applied via CSS.

import { useRef, useCallback } from 'react';

export default function PanelBox({
  panel, scale, isSelected, isMergeTarget, isHighlighted,
  onSelect, onMove, onResize, onMerge,
}) {
  const { panelId, bbox, label, colorTag, readingOrder } = panel;
  const moveStart = useRef(null);
  const resizeStart = useRef(null);

  const left   = Math.round(bbox.x * scale);
  const top    = Math.round(bbox.y * scale);
  const width  = Math.round(bbox.w * scale);
  const height = Math.round(bbox.h * scale);

  const borderColor = isMergeTarget ? '#e8991a' : colorTag;
  const glowStyle   = isSelected
    ? `0 0 0 2px #0d0d0f, 0 0 0 4px ${colorTag}`
    : isMergeTarget
    ? `0 0 0 2px #0d0d0f, 0 0 0 4px #e8991a`
    : isHighlighted
    ? `0 0 0 3px #0d0d0f, 0 0 0 6px #0af`
    : 'none';

  // ── MOVE ──────────────────────────────────────────────────────
  const startMove = useCallback((e) => {
    if (!onMove) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    moveStart.current = { mx: e.clientX, my: e.clientY, ox: bbox.x, oy: bbox.y };

    const handleMove = (ev) => {
      if (!moveStart.current) return;
      const dx = (ev.clientX - moveStart.current.mx) / scale;
      const dy = (ev.clientY - moveStart.current.my) / scale;
      const el = document.getElementById('pb_' + panelId);
      if (el) {
        el.style.left = Math.round((moveStart.current.ox + dx) * scale) + 'px';
        el.style.top  = Math.round((moveStart.current.oy + dy) * scale) + 'px';
      }
    };
    const handleUp = (ev) => {
      if (!moveStart.current) return;
      const dx = (ev.clientX - moveStart.current.mx) / scale;
      const dy = (ev.clientY - moveStart.current.my) / scale;
      onMove(panelId, moveStart.current.ox + dx, moveStart.current.oy + dy);
      moveStart.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [bbox, scale, panelId, onMove]);

  // ── RESIZE ────────────────────────────────────────────────────
  const startResize = useCallback((handle, e) => {
    if (!onResize) return;
    e.stopPropagation();
    e.preventDefault();
    resizeStart.current = { handle, mx: e.clientX, my: e.clientY, ox: bbox.x, oy: bbox.y, ow: bbox.w, oh: bbox.h };

    const handleMove = (ev) => {
      if (!resizeStart.current) return;
      const dx = (ev.clientX - resizeStart.current.mx) / scale;
      const dy = (ev.clientY - resizeStart.current.my) / scale;

      let newX = resizeStart.current.ox;
      let newY = resizeStart.current.oy;
      let newW = resizeStart.current.ow;
      let newH = resizeStart.current.oh;

      if (handle.includes('e')) newW += dx;
      if (handle.includes('s')) newH += dy;
      if (handle.includes('w')) { newW -= dx; newX += dx; }
      if (handle.includes('n')) { newH -= dy; newY += dy; }

      const el = document.getElementById('pb_' + panelId);
      if (el) {
        el.style.left   = Math.round(newX * scale) + 'px';
        el.style.top    = Math.round(newY * scale) + 'px';
        el.style.width  = Math.max(20, Math.round(newW * scale)) + 'px';
        el.style.height = Math.max(20, Math.round(newH * scale)) + 'px';
      }
    };
    const handleUp = (ev) => {
      if (!resizeStart.current) return;
      const dx = (ev.clientX - resizeStart.current.mx) / scale;
      const dy = (ev.clientY - resizeStart.current.my) / scale;

      let newX = resizeStart.current.ox;
      let newY = resizeStart.current.oy;
      let newW = resizeStart.current.ow;
      let newH = resizeStart.current.oh;

      if (handle.includes('e')) newW += dx;
      if (handle.includes('s')) newH += dy;
      if (handle.includes('w')) { newW -= dx; newX += dx; }
      if (handle.includes('n')) { newH -= dy; newY += dy; }

      onResize(panelId, { x: newX, y: newY, w: newW, h: newH });
      resizeStart.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [bbox, scale, panelId, onResize]);

  const canInteract = !!onMove;

  return (
    <div
      id={'pb_' + panelId}
      style={{
        position:    'absolute',
        left, top, width, height,
        border:      `2.5px solid ${borderColor}`,
        borderRadius: 3,
        boxShadow:    glowStyle,
        cursor:       canInteract ? 'move' : 'default',
        transition:   'box-shadow .12s, border-color .12s',
      }}
      onMouseDown={canInteract ? startMove : undefined}
      onClick={(e) => { e.stopPropagation(); if (onSelect) onSelect(); if (onMerge) onMerge(); }}
    >
      {/* Fill tint */}
      <div style={{
        position:'absolute', inset:0, borderRadius:2,
        background: colorTag,
        opacity: isSelected ? 0.18 : 0.08,
        transition: 'opacity .12s',
        pointerEvents:'none',
      }}/>

      {/* Reading order badge */}
      <div style={{
        position:'absolute', top:-1, left:-1,
        background: colorTag, color:'white',
        fontFamily:'Bebas Neue, sans-serif', fontSize:14, letterSpacing:1,
        padding:'1px 7px', borderRadius:'3px 0 6px 0',
        pointerEvents:'none', lineHeight:1.4,
      }}>
        #{readingOrder + 1}
      </div>

      {/* Label (if selected or large enough) */}
      {(isSelected || width > 100) && (
        <div style={{
          position:'absolute', top:4, right:4,
          background:'rgba(0,0,0,.65)', color:'white',
          fontSize:9, fontFamily:'JetBrains Mono, monospace',
          padding:'2px 5px', borderRadius:8,
          pointerEvents:'none',
          maxWidth: width - 16, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        }}>
          {label}
        </div>
      )}

      {/* Resize handles */}
      {canInteract && ['n','s','e','w','ne','nw','se','sw'].map(handle => (
        <div
          key={handle}
          style={{
            position:'absolute',
            ...getHandleStyle(handle),
          }}
          onMouseDown={(e) => startResize(handle, e)}
          onClick={(e) => e.stopPropagation()}
        />
      ))}
    </div>
  );
}

function getHandleStyle(handle) {
  const size = 12;
  const style = {
    width: size, height: size,
    background:'white',
    border:'2px solid #0af',
    borderRadius:2,
  };

  if (handle.includes('n')) { style.top = -size/2; style.cursor = 'n-resize'; }
  if (handle.includes('s')) { style.bottom = -size/2; style.cursor = 's-resize'; }
  if (handle.includes('e')) { style.right = -size/2; style.cursor = 'e-resize'; }
  if (handle.includes('w')) { style.left = -size/2; style.cursor = 'w-resize'; }

  if (handle === 'n' || handle === 's') { style.left = '50%'; style.transform = 'translateX(-50%)'; style.width = 24; }
  if (handle === 'e' || handle === 'w') { style.top = '50%'; style.transform = 'translateY(-50%)'; style.height = 24; }

  if (handle === 'ne') style.cursor = 'ne-resize';
  if (handle === 'nw') style.cursor = 'nw-resize';
  if (handle === 'se') style.cursor = 'se-resize';
  if (handle === 'sw') style.cursor = 'sw-resize';

  return style;
}
