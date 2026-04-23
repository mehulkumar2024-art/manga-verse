// src/hooks/usePanelEditor.js
// Encapsulates ALL panel editor state + undo/redo + API sync.
// Used by PanelEditorPage and sub-components.

import { useState, useCallback, useRef, useEffect } from 'react';
import { panelService } from '../services/panelService';

const COLORS = [
  '#e8341a','#3a9bdc','#2ec97e','#e8991a',
  '#9b6bdc','#dc3a8f','#3adccc','#dcb83a',
];

function generateId() {
  return `panel_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}

function normPanel(p, index) {
  return {
    panelId:      p.panelId      || generateId(),
    readingOrder: typeof p.readingOrder === 'number' ? p.readingOrder : index,
    label:        p.label        || `Panel ${index + 1}`,
    bbox: {
      x: Math.round(p.bbox?.x ?? 0),
      y: Math.round(p.bbox?.y ?? 0),
      w: Math.max(20, Math.round(p.bbox?.w ?? 100)),
      h: Math.max(20, Math.round(p.bbox?.h ?? 100)),
    },
    panelType:          p.panelType          || 'bordered',
    colorTag:           p.colorTag           || COLORS[index % COLORS.length],
    speechBubbles:      p.speechBubbles      || [],
    contentZones:       p.contentZones       || [],
    suggestedCamera:    p.suggestedCamera    || 'static',
    emotionalIntensity: p.emotionalIntensity || 0,
  };
}

export function usePanelEditor({ chapterId, pageNumber, initialManifest }) {
  const [panels, setPanelsRaw]  = useState(() =>
    (initialManifest?.panels || []).map(normPanel)
  );
  const [status, setStatus]         = useState(initialManifest?.status || 'detected');
  const [selectedId, setSelectedId] = useState(null);
  const [activeTool, setActiveTool] = useState('select'); // select|draw|split|merge
  const [isSaving, setIsSaving]     = useState(false);
  const [saveError, setSaveError]   = useState(null);
  const [isDirty, setIsDirty]       = useState(false);
  const [mergeFirst, setMergeFirst] = useState(null);

  // Undo/redo stacks (hold JSON snapshots)
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // Sync state when page or manifest changes
  useEffect(() => {
    setPanelsRaw((initialManifest?.panels || []).map(normPanel));
    setStatus(initialManifest?.status || 'detected');
    setSelectedId(null);
    setIsDirty(false);
    undoStack.current = [];
    redoStack.current = [];
  }, [chapterId, pageNumber, initialManifest]);

  // ── Internal setter that also marks dirty ──────────────────────
  function setPanels(next) {
    const arr = typeof next === 'function' ? next(panels) : next;
    setPanelsRaw(arr);
    setIsDirty(true);
  }

  // ── Undo/redo ──────────────────────────────────────────────────
  const snapshot = useCallback(() => {
    undoStack.current.push(JSON.stringify(panels));
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
  }, [panels]);

  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    redoStack.current.push(JSON.stringify(panels));
    const prev = JSON.parse(undoStack.current.pop());
    setPanelsRaw(prev);
    setIsDirty(true);
  }, [panels]);

  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    undoStack.current.push(JSON.stringify(panels));
    const next = JSON.parse(redoStack.current.pop());
    setPanelsRaw(next);
    setIsDirty(true);
  }, [panels]);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  // ── ADD panel ──────────────────────────────────────────────────
  const addPanel = useCallback((bbox) => {
    snapshot();
    const newPanel = normPanel({
      bbox,
      panelId:      generateId(),
      readingOrder: panels.length,
      label:        `Panel ${panels.length + 1}`,
      colorTag:     COLORS[panels.length % COLORS.length],
    }, panels.length);
    setPanels(prev => [...prev, newPanel]);
    setSelectedId(newPanel.panelId);
    return newPanel.panelId;
  }, [panels, snapshot]);

  // ── DELETE panel ───────────────────────────────────────────────
  const deletePanel = useCallback((panelId) => {
    snapshot();
    setPanels(prev => {
      const next = prev.filter(p => p.panelId !== panelId);
      return next.map((p, i) => ({ ...p, readingOrder: i }));
    });
    if (selectedId === panelId) setSelectedId(null);
  }, [snapshot, selectedId]);

  // ── MOVE panel ─────────────────────────────────────────────────
  const movePanel = useCallback((panelId, dx, dy) => {
    setPanels(prev => prev.map(p =>
      p.panelId === panelId
        ? { ...p, bbox: { ...p.bbox, x: Math.round(p.bbox.x + dx), y: Math.round(p.bbox.y + dy) } }
        : p
    ));
  }, []);

  const commitMove = useCallback((panelId, newX, newY) => {
    snapshot();
    setPanels(prev => prev.map(p =>
      p.panelId === panelId
        ? { ...p, bbox: { ...p.bbox, x: Math.round(newX), y: Math.round(newY) } }
        : p
    ));
  }, [snapshot]);

  // ── RESIZE panel ───────────────────────────────────────────────
  const commitResize = useCallback((panelId, newBbox) => {
    snapshot();
    setPanels(prev => prev.map(p =>
      p.panelId === panelId
        ? { ...p, bbox: { x: Math.round(newBbox.x), y: Math.round(newBbox.y), w: Math.max(20, Math.round(newBbox.w)), h: Math.max(20, Math.round(newBbox.h)) } }
        : p
    ));
  }, [snapshot]);

  // ── UPDATE panel meta (label, color, order) ────────────────────
  const updatePanel = useCallback((panelId, updates) => {
    snapshot();
    setPanels(prev => {
      let next = prev.map(p => p.panelId === panelId ? { ...p, ...updates } : p);
      // Re-sort + renumber if order changed
      next.sort((a, b) => a.readingOrder - b.readingOrder);
      next = next.map((p, i) => ({ ...p, readingOrder: i }));
      return next;
    });
  }, [snapshot]);

  // ── SPLIT panel ────────────────────────────────────────────────
  const splitPanel = useCallback((panelId) => {
    const p = panels.find(x => x.panelId === panelId);
    if (!p) return;
    snapshot();
    const isWide = p.bbox.w >= p.bbox.h;
    const newId  = generateId();
    setPanels(prev => {
      const next = prev.filter(x => x.panelId !== panelId);
      if (isWide) {
        const half = Math.floor(p.bbox.w / 2);
        next.push(
          { ...p, label: p.label + ' L', bbox: { ...p.bbox, w: half } },
          { ...p, panelId: newId, readingOrder: p.readingOrder + 0.5,
            label: p.label + ' R', colorTag: COLORS[(p.readingOrder + 1) % COLORS.length],
            bbox: { ...p.bbox, x: p.bbox.x + half, w: p.bbox.w - half } }
        );
      } else {
        const half = Math.floor(p.bbox.h / 2);
        next.push(
          { ...p, label: p.label + ' T', bbox: { ...p.bbox, h: half } },
          { ...p, panelId: newId, readingOrder: p.readingOrder + 0.5,
            label: p.label + ' B', colorTag: COLORS[(p.readingOrder + 1) % COLORS.length],
            bbox: { ...p.bbox, y: p.bbox.y + half, h: p.bbox.h - half } }
        );
      }
      next.sort((a, b) => a.readingOrder - b.readingOrder);
      return next.map((x, i) => ({ ...x, readingOrder: i }));
    });
    setSelectedId(null);
  }, [panels, snapshot]);

  // ── MERGE two panels ───────────────────────────────────────────
  const handleMergeClick = useCallback((panelId) => {
    if (!mergeFirst) {
      setMergeFirst(panelId);
      return 'first_selected';
    }
    if (mergeFirst === panelId) {
      setMergeFirst(null);
      return 'cancelled';
    }
    const a = panels.find(p => p.panelId === mergeFirst);
    const b = panels.find(p => p.panelId === panelId);
    if (!a || !b) { setMergeFirst(null); return 'error'; }
    snapshot();
    const x1 = Math.min(a.bbox.x, b.bbox.x);
    const y1 = Math.min(a.bbox.y, b.bbox.y);
    const x2 = Math.max(a.bbox.x + a.bbox.w, b.bbox.x + b.bbox.w);
    const y2 = Math.max(a.bbox.y + a.bbox.h, b.bbox.y + b.bbox.h);
    setPanels(prev => {
      const filtered = prev.filter(p => p.panelId !== mergeFirst && p.panelId !== panelId);
      filtered.push({
        ...a, bbox: { x: x1, y: y1, w: x2-x1, h: y2-y1 },
        label: `${a.label}+${b.label}`,
      });
      filtered.sort((x, y) => x.readingOrder - y.readingOrder);
      return filtered.map((p, i) => ({ ...p, readingOrder: i }));
    });
    setMergeFirst(null);
    setSelectedId(null);
    return 'merged';
  }, [mergeFirst, panels, snapshot]);

  // ── REORDER by drag (swap orders) ─────────────────────────────
  const reorderPanels = useCallback((fromId, toId) => {
    snapshot();
    setPanels(prev => {
      const from = prev.find(p => p.panelId === fromId);
      const to   = prev.find(p => p.panelId === toId);
      if (!from || !to) return prev;
      const fromOrder = from.readingOrder;
      const toOrder   = to.readingOrder;
      return prev.map(p => {
        if (p.panelId === fromId) return { ...p, readingOrder: toOrder };
        if (p.panelId === toId)   return { ...p, readingOrder: fromOrder };
        return p;
      }).sort((a, b) => a.readingOrder - b.readingOrder)
        .map((p, i) => ({ ...p, readingOrder: i }));
    });
  }, [snapshot]);

  // ── RESET to detected ─────────────────────────────────────────
  const resetToDetected = useCallback(async () => {
    snapshot();
    try {
      if (chapterId && pageNumber) {
        const res = await panelService.resetPage(chapterId, pageNumber);
        if (res.data?.panels) {
          setPanelsRaw(res.data.panels.map(normPanel));
          setStatus('detected');
          setIsDirty(false);
          return;
        }
      }
      // Fallback: use initialManifest
      setPanelsRaw((initialManifest?.detectedPanels || initialManifest?.panels || []).map(normPanel));
      setIsDirty(false);
    } catch (e) {
      setSaveError(e.message);
    }
  }, [chapterId, pageNumber, initialManifest, snapshot]);

  // ── SAVE panels to backend ────────────────────────────────────
  const savePanels = useCallback(async (note = '') => {
    if (!chapterId || !pageNumber) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await panelService.savePanels(chapterId, pageNumber, panels, note);
      setStatus('reviewing');
      setIsDirty(false);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setIsSaving(false);
    }
  }, [chapterId, pageNumber, panels]);

  // ── CONFIRM page ───────────────────────────────────────────────
  const confirmPage = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await panelService.savePanels(chapterId, pageNumber, panels, 'Final save before confirm');
      await panelService.confirmPage(chapterId, pageNumber);
      setStatus('confirmed');
      setIsDirty(false);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setIsSaving(false);
    }
  }, [chapterId, pageNumber, panels]);

  // ── UPDATE panels from detection result ────────────────────────
  const updatePanels = useCallback((newPanels) => {
    snapshot();
    setPanelsRaw((newPanels || []).map(normPanel));
    setStatus('detected');
    setIsDirty(false);
  }, [snapshot]);

  // ── SORTED panels (for render) ─────────────────────────────────
  const sortedPanels = [...panels].sort((a, b) => a.readingOrder - b.readingOrder);

  return {
    // State
    panels, sortedPanels, selectedId, activeTool, isSaving, saveError,
    isDirty, status, mergeFirst, canUndo, canRedo,
    // Setters
    setSelectedId, setActiveTool,
    // Actions
    addPanel, deletePanel, movePanel, commitMove, commitResize,
    updatePanel, splitPanel, handleMergeClick, reorderPanels,
    updatePanels, resetToDetected, savePanels, confirmPage,
    undo, redo, snapshot,
    // Utils
    COLORS,
  };
}
