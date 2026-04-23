// src/components/PanelEditor/PanelCanvas.jsx
// The main interactive canvas: draw, move, resize, split, merge panels.
// Works at the scaled image level and converts to original pixel coords.

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PanelBox from './PanelBox';
import CanvasToolbar from './CanvasToolbar';

export default function PanelCanvas({ editor, imageUrl, onDetect, activePanelIndex, isDrawing, setIsDrawing, singlePanelMode }) {
  const {
    sortedPanels, selectedId, activeTool, mergeFirst,
    setSelectedId, setActiveTool,
    addPanel, commitMove, commitResize, splitPanel, handleMergeClick,
    snapshot,
  } = editor;

  const containerRef = useRef(null);
  const [drawState, setDrawState]  = useState(null); // { startX, startY }
  const [ghostBox, setGhostBox]    = useState(null);  // { x,y,w,h } in px
  const [imgLoaded, setImgLoaded]  = useState(false);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 800, h: 1131 });
  const [scale, setScale]          = useState(1);

  // Update scale when container resizes
  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const available = containerRef.current.clientWidth - 48;
      const s = Math.min(1, available / imgNaturalSize.w);
      setScale(s);
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [imgNaturalSize]);

  const scaledW = Math.round(imgNaturalSize.w * scale);
  const scaledH = Math.round(imgNaturalSize.h * scale);

  // Convert mouse position to image-space coords
  const getImagePos = useCallback((e) => {
    const rect = e.currentTarget?.closest?.('[data-page]')?.getBoundingClientRect()
               || e.currentTarget.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - rect.left) / scale),
      y: Math.round((e.clientY - rect.top)  / scale),
    };
  }, [scale]);

  // ── DRAW new panel ────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (singlePanelMode) {
      if (isDrawing) return;
      const pos = getImagePos(e);
      setDrawState({ startX: pos.x, startY: pos.y });
      setIsDrawing(true);
      return;
    }
    if (activeTool !== 'draw') return;
    if (e.button !== 0) return;
    e.preventDefault();
    const pos = getImagePos(e);
    setDrawState({ startX: pos.x, startY: pos.y });
  }, [activeTool, getImagePos, singlePanelMode, isDrawing, setIsDrawing]);

  const onMouseMove = useCallback((e) => {
    if (!drawState) return;
    const pos = getImagePos(e);
    const x = Math.min(drawState.startX, pos.x);
    const y = Math.min(drawState.startY, pos.y);
    const w = Math.abs(pos.x - drawState.startX);
    const h = Math.abs(pos.y - drawState.startY);
    setGhostBox({ x, y, w, h });
  }, [drawState, getImagePos]);

  const onMouseUp = useCallback((e) => {
    if (!drawState) return;
    const pos = getImagePos(e);
    const x = Math.min(drawState.startX, pos.x);
    const y = Math.min(drawState.startY, pos.y);
    const w = Math.abs(pos.x - drawState.startX);
    const h = Math.abs(pos.y - drawState.startY);
    setDrawState(null);
    setGhostBox(null);
    if (w < 15 || h < 15) {
      if (singlePanelMode) setIsDrawing(false);
      return; 
    }
    addPanel({ x, y, w, h });
    if (singlePanelMode) {
      setIsDrawing(false);
    } else {
      setActiveTool('select');
    }
  }, [drawState, getImagePos, addPanel, setActiveTool, singlePanelMode, setIsDrawing]);

  // ── Deselect on canvas click ──────────────────────────────────
  const onCanvasClick = (e) => {
    if (e.target === e.currentTarget || e.target.dataset.page) {
      setSelectedId(null);
    }
  };

  const cursor = (singlePanelMode && !isDrawing) ? 'crosshair'
               : activeTool === 'draw'  ? 'crosshair'
               : activeTool === 'split' ? 'cell'
               : activeTool === 'merge' ? 'copy'
               : 'default';

  const showDetectionOverlay = !singlePanelMode && sortedPanels.length === 0;

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* TOOLBAR */}
      {!singlePanelMode && <CanvasToolbar editor={editor} />}

      {/* CANVAS SCROLL AREA */}
      <div
        ref={containerRef}
        style={{ flex:1, overflow:'auto', padding:24, display:'flex', justifyContent:'center', alignItems:'flex-start' }}
      >
        <div
          data-page
          style={{
            position:'relative',
            width: scaledW, height: scaledH,
            flexShrink:0,
            cursor,
            userSelect:'none',
            boxShadow:'0 20px 80px rgba(0,0,0,.8)',
            borderRadius:6,
            background:'#1a1a20',
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onClick={onCanvasClick}
        >
          {/* PAGE IMAGE */}
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Manga page"
              style={{ display:'block', width:scaledW, height:scaledH, pointerEvents:'none', borderRadius:6, opacity: imgLoaded ? 1 : 0, transition:'opacity 0.3s' }}
              onLoad={(e) => {
                setImgNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
                setImgLoaded(true);
              }}
            />
          ) : (
            <div style={{
              width:scaledW, height:scaledH,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#35353f', fontSize:13, borderRadius:6,
            }}>
               <div className="spinner" />
            </div>
          )}

          {/* DETECTION OVERLAY */}
          <AnimatePresence>
            {showDetectionOverlay && onDetect && (
              <motion.div
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                exit={{ opacity:0 }}
                style={{
                  position:'absolute', inset:0, zIndex:10,
                  background:'rgba(13,13,15,0.4)', backdropFilter:'blur(2px)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  borderRadius:6,
                }}
              >
                <div style={{ textAlign:'center', background:'#1a1a20', padding:32, borderRadius:16, border:'1px solid #35353f', boxShadow:'0 10px 40px rgba(0,0,0,0.5)' }}>
                  <div style={{ fontSize:20, fontWeight:600, color:'white', marginBottom:8 }}>Ready for Detection</div>
                  <div style={{ fontSize:13, color:'#6b6b7e', marginBottom:24, maxWidth:240 }}>
                    Run the automated panel detection to get started with this page.
                  </div>
                  <button
                    onClick={onDetect}
                    style={{
                      padding:'12px 24px', borderRadius:10, background:'var(--accent)',
                      color:'white', border:'none', fontSize:14, fontWeight:600, cursor:'pointer',
                      boxShadow:'0 4px 12px var(--accent-low)',
                    }}
                  >
                    Run Auto-Detection
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LOADING STATE */}
          {editor.detecting && (
            <div style={{
              position:'absolute', inset:0, zIndex:20,
              background:'rgba(13,13,15,0.6)', backdropFilter:'blur(4px)',
              display:'flex', alignItems:'center', justifyContent:'center',
              borderRadius:6,
            }}>
               <div style={{ textAlign:'center' }}>
                  <div className="spinner" style={{ margin:'0 auto 16px' }} />
                  <div style={{ fontSize:14, color:'white', fontWeight:500 }}>Analyzing layout…</div>
               </div>
            </div>
          )}

          {/* PANEL BOXES */}
          {sortedPanels.map((panel, index) => (
            <PanelBox
              key={panel.panelId}
              panel={panel}
              scale={scale}
              isSelected={!singlePanelMode && selectedId === panel.panelId}
              isMergeTarget={!singlePanelMode && mergeFirst && mergeFirst !== panel.panelId}
              onSelect={!singlePanelMode ? () => setSelectedId(panel.panelId) : undefined}
              onMove={!singlePanelMode ? commitMove : undefined}
              onResize={!singlePanelMode ? commitResize : undefined}
              onMerge={!singlePanelMode ? () => handleMergeClick(panel.panelId) : undefined}
              isHighlighted={singlePanelMode && index === activePanelIndex}
            />
          ))}

          {/* GHOST BOX for drawing */}
          {ghostBox && (
            <div style={{
              position:'absolute',
              left:  ghostBox.x * scale,
              top:   ghostBox.y * scale,
              width: ghostBox.w * scale,
              height:ghostBox.h * scale,
              border:'2px dashed var(--accent)',
              background:'var(--accent-low)',
              pointerEvents:'none',
              borderRadius:2,
            }}/>
          )}
        </div>
      </div>
    </div>
  );
}
