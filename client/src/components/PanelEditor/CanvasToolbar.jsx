// src/components/PanelEditor/CanvasToolbar.jsx
import { useEffect } from 'react';

const TOOLS = [
  { id:'select', label:'Select',      key:'S', icon:'⬚', hint:'Click to select · Drag to move · Corner to resize · Double-click to edit' },
  { id:'draw',   label:'Draw Panel',  key:'D', icon:'＋', hint:'Click and drag on the page to draw a new panel' },
  { id:'split',  label:'Split',       key:'X', icon:'⊘', hint:'Click any panel to split it in half' },
];

export default function CanvasToolbar({ editor }) {
  const { activeTool, setActiveTool, undo, redo, canUndo, canRedo, resetToDetected, isDirty, isSaving, savePanels } = editor;
  const active = TOOLS.find(t=>t.id===activeTool);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key==='s'||e.key==='S') setActiveTool('select');
      if (e.key==='d'||e.key==='D') setActiveTool('draw');
      if (e.key==='x'||e.key==='X') setActiveTool('split');
      if ((e.ctrlKey||e.metaKey) && e.key==='z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.shiftKey&&e.key==='Z'))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); savePanels(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActiveTool, undo, redo, savePanels]);

  const btn = (onClick, children, disabled=false, style={}) => (
    <button onClick={onClick} disabled={disabled} style={{
      display:'flex', alignItems:'center', gap:5,
      padding:'5px 11px', borderRadius:6,
      fontSize:12, fontWeight:500,
      border:'1px solid #35353f',
      background: disabled ? 'transparent' : '#26262f',
      color: disabled ? '#35353f' : '#c8c8d4',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition:'all .12s',
      ...style,
    }}>{children}</button>
  );

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:6, flexWrap:'wrap',
      padding:'7px 14px', background:'#1a1a20',
      borderBottom:'1px solid #26262f', flexShrink:0,
    }}>
      {TOOLS.map(t => (
        <button key={t.id} onClick={() => setActiveTool(t.id)} style={{
          display:'flex', alignItems:'center', gap:5,
          padding:'5px 11px', borderRadius:6, fontSize:12, fontWeight:500,
          border: '1px solid ' + (activeTool===t.id ? '#e8341a' : '#35353f'),
          background: activeTool===t.id ? '#e8341a' : '#26262f',
          color: activeTool===t.id ? 'white' : '#c8c8d4',
          cursor:'pointer', transition:'all .12s', whiteSpace:'nowrap',
        }}>
          <span>{t.icon}</span> {t.label}
          <span style={{ fontSize:9, opacity:.6, marginLeft:2 }}>{t.key}</span>
        </button>
      ))}

      <div style={{width:1,height:22,background:'#35353f',margin:'0 2px'}}/>

      {btn(undo, '↩ Undo', !canUndo)}
      {btn(redo, '↪ Redo', !canRedo)}

      <div style={{width:1,height:22,background:'#35353f',margin:'0 2px'}}/>

      {btn(resetToDetected, '⟳ Reset', false, { color:'#9898a8' })}
      {btn(() => savePanels(), isSaving ? 'Saving…' : (isDirty ? '↑ Save' : '✓ Saved'), isSaving,
        isDirty ? { background:'#3d2808', border:'1px solid #e8991a', color:'#e8991a' } : {}
      )}

      <div style={{flex:1,minWidth:8}}/>

      <span style={{ fontSize:11, color:'#6b6b7e', fontStyle:'italic' }}>
        {active?.hint}
      </span>
    </div>
  );
}
