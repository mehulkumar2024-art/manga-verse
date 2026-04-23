// src/components/PanelEditor/StepBar.jsx
export default function StepBar({ current, confirmedPages, totalPages, onStep, onConfirmPage, onAutoDetect, detecting, editor }) {
  const steps = [
    { n:1, label:'Upload' },
    { n:2, label:'Panel Review' },
    { n:3, label:'Characters', locked: confirmedPages === 0 },
    { n:4, label:'Voices',     locked: true },
    { n:5, label:'Animate',    locked: true },
    { n:6, label:'Publish',    locked: true },
  ];

  const showPanelActions = current === 2;

  return (
    <div style={{
      display:'flex', alignItems:'center',
      padding:'0 24px', height:52,
      background:'#0d0d0f', borderBottom:'1px solid #26262f', flexShrink:0,
    }}>
      <div style={{ display:'flex', alignItems:'center', flexGrow:1 }}>
        {steps.map((s, i) => {
          const done   = s.n < current;
          const active = s.n === current;
          const locked = s.locked;
          return (
            <div key={s.n} style={{ display:'flex', alignItems:'center' }}>
              <button
                onClick={() => !locked && onStep(s.n)}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'0 20px', height:52,
                  fontSize:13, fontWeight:600,
                  color: done ? '#2ec97e' : active ? 'white' : locked ? '#35353f' : '#6b6b7e',
                  background:'transparent', border:'none',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  transition:'all .2s', whiteSpace:'nowrap',
                  opacity: locked ? 0.5 : 1,
                }}
              >
                <div style={{
                  width:20, height:20, borderRadius:'50%', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:700,
                  background: done ? '#2ec97e' : active ? 'var(--accent)' : '#26262f',
                  color: done ? '#0d0d0f' : active ? 'white' : '#6b6b7e',
                  boxShadow: active ? '0 0 15px var(--accent-glow)' : 'none'
                }}>
                  {done ? '✓' : s.n}
                </div>
                {s.label}
                {s.n===2 && totalPages>0 && (
                  <span style={{
                    fontSize:10, padding:'2px 8px', borderRadius:20,
                    background:'#26262f', color:'#9898a8', marginLeft:6,
                    fontWeight:600
                  }}>{confirmedPages}/{totalPages}</span>
                )}
              </button>
              {i < steps.length-1 && (
                <span style={{ color:'#26262f', fontSize:18, margin:'0 4px', fontWeight:300 }}>/</span>
              )}
            </div>
          );
        })}
      </div>

      {showPanelActions && (
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
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

const CHAR_COLORS = ['#e8341a','#3a9bdc','#2ec97e','#e8991a','#9b6bdc','#dc3a8f','#ff9f40','#3adccc'];
const VOICE_TYPES = [
  { id:'male_young',   label:'Young Male',   icon:'🧑' },
  { id:'male_adult',   label:'Adult Male',   icon:'👨' },
  { id:'male_old',     label:'Older Male',   icon:'👴' },
  { id:'female_young', label:'Young Female', icon:'👩' },
  { id:'female_adult', label:'Adult Female', icon:'👩' },
  { id:'female_old',   label:'Older Female', icon:'👵' },
  { id:'child',        label:'Child',        icon:'🧒' },
  { id:'robot',        label:'Robot/Monster',icon:'🤖' },
];

export function CharacterStep({
  manifests, characters, panelCharMap,
  onAddCharacter, onUpdateCharacter, onDeleteCharacter,
  onTagChar, onBack, onNext,
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDraft, setAddDraft]         = useState({ name:'', voiceType:'male_young', colorTag: CHAR_COLORS[0] });
  const [selectedChar, setSelectedChar] = useState(null);
  const [previewPanel, setPreviewPanel] = useState(null);

  const handleAdd = async () => {
    if (!addDraft.name.trim()) return;
    await onAddCharacter(addDraft);
    setShowAddModal(false);
    setAddDraft({ name:'', voiceType:'male_young', colorTag: CHAR_COLORS[characters.length % CHAR_COLORS.length] });
  };

  // Build panel grid from all confirmed manifests
  const allPanels = manifests.flatMap(m =>
    (m.panels || []).map(p => ({ ...p, pageNumber: m.pageNumber, manifestId: m._id }))
  ).sort((a,b) => a.pageNumber - b.pageNumber || a.readingOrder - b.readingOrder);

  const tagged = allPanels.filter(p => (panelCharMap[p.panelId]||[]).length > 0).length;

  return (
    <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

      {/* PANEL GRID */}
      <div style={{ flex:1, overflow:'auto', padding:24, background:'#0d0d0f' }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:26, color:'white', letterSpacing:1 }}>
            Character Identification
          </div>
          <div style={{ fontSize:12, color:'#6b6b7e', marginTop:4 }}>
            Click a panel to tag which characters appear. We use this to automatically assign voices.
            &nbsp;·&nbsp;<span style={{color:'#2ec97e'}}>{tagged}/{allPanels.length} panels tagged</span>
          </div>
        </div>

        {/* Page groups */}
        {manifests.map(m => (
          <div key={m._id} style={{ marginBottom:32 }}>
            <div style={{ fontSize:10, color:'#35353f', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
              Page {m.pageNumber}
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {(m.panels || []).map(panel => {
                const chars = (panelCharMap[panel.panelId]||[]).map(id=>characters.find(c=>c._id===id)).filter(Boolean);
                return (
                  <PanelThumb
                    key={panel.panelId}
                    panel={panel}
                    pageNumber={m.pageNumber}
                    imageUrl={m.imageUrl}
                    chars={chars}
                    characters={characters}
                    panelCharMap={panelCharMap}
                    onTagChar={onTagChar}
                    selectedChar={selectedChar}
                    onPreview={(p) => setPreviewPanel(p)}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Bottom actions */}
        <div style={{ display:'flex', gap:12, marginTop:32, paddingTop:24, borderTop:'1px solid #26262f' }}>
          <button onClick={onBack} style={{ padding:'10px 20px', borderRadius:7, background:'transparent', color:'#9898a8', border:'1px solid #35353f', fontSize:13, cursor:'pointer' }}>
            ← Back to Panels
          </button>
          <button onClick={onNext} style={{ padding:'10px 24px', borderRadius:7, background:'#e8341a', color:'white', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Assign Voices →
          </button>
        </div>
      </div>

      {/* CHARACTER SIDEBAR */}
      <div style={{
        width:280, flexShrink:0, background:'#1a1a20', borderLeft:'1px solid #26262f',
        display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        <div style={{ padding:'12px 14px', borderBottom:'1px solid #26262f', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:10, textTransform:'uppercase', letterSpacing:.8, color:'#6b6b7e' }}>Characters</span>
          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#26262f', color:'#9898a8' }}>{characters.length}</span>
        </div>

        {/* Quick select hint */}
        {characters.length > 0 && (
          <div style={{ padding:'8px 12px', borderBottom:'1px solid #26262f', fontSize:11, color:'#6b6b7e' }}>
            {selectedChar
              ? <span style={{color:'#2ec97e'}}>Click panels to tag <strong>{characters.find(c=>c._id===selectedChar)?.name}</strong></span>
              : 'Click a character to activate tagging mode'}
          </div>
        )}

        <div style={{ flex:1, overflowY:'auto' }}>
          {characters.map(c => {
            const count = Object.values(panelCharMap).filter(arr=>arr.includes(c._id)).length;
            const color = c.colorTag || CHAR_COLORS[0];
            const isActive = selectedChar === c._id;
            return (
              <div
                key={c._id}
                onClick={() => setSelectedChar(isActive ? null : c._id)}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 12px', borderBottom:'1px solid #26262f',
                  cursor:'pointer', transition:'background .12s',
                  background: isActive ? color+'22' : 'transparent',
                  borderLeft: `3px solid ${isActive ? color : 'transparent'}`,
                }}
              >
                <div style={{
                  width:36, height:36, borderRadius:'50%',
                  background: color+'22', color,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'Bebas Neue, sans-serif', fontSize:18, flexShrink:0,
                }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'white' }}>{c.name}</div>
                  <div style={{ fontSize:10, color:'#6b6b7e' }}>
                    {count} panel{count!==1?'s':''} · {VOICE_TYPES.find(v=>v.id===c.voiceType)?.label || c.voiceType}
                  </div>
                </div>
                <button
                  onClick={e=>{e.stopPropagation();onDeleteCharacter(c._id)}}
                  style={{ opacity:.4, background:'transparent', border:'none', color:'#e8341a', cursor:'pointer', fontSize:14, padding:2 }}
                >✕</button>
              </div>
            );
          })}

          {!characters.length && (
            <div style={{ padding:'32px 16px', textAlign:'center', color:'#35353f', fontSize:12 }}>
              No characters yet.<br/>Add characters and tag them in panels.
            </div>
          )}
        </div>

        <div style={{ padding:'10px 10px 12px', borderTop:'1px solid #26262f', display:'flex', flexDirection:'column', gap:7 }}>
          <button onClick={()=>setShowAddModal(true)} style={{
            width:'100%', padding:10, borderRadius:7,
            background:'#9b6bdc', color:'white', fontSize:13, fontWeight:600, border:'none', cursor:'pointer',
          }}>+ Add Character</button>
          <div style={{ fontSize:10, color:'#35353f', lineHeight:1.6, padding:'0 2px' }}>
            Tip: Tag all speaking characters. Unknown speakers can be "Unknown 1", "Unknown 2" etc.
          </div>
        </div>
      </div>

      {/* ADD CHARACTER MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}
            onClick={()=>setShowAddModal(false)}
          >
            <motion.div
              initial={{scale:.95,y:8}} animate={{scale:1,y:0}} exit={{scale:.95,y:8}}
              onClick={e=>e.stopPropagation()}
              style={{ background:'#1a1a20', borderRadius:12, border:'1px solid #35353f', width:400, padding:24 }}
            >
              <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:22, color:'white', letterSpacing:1, marginBottom:18 }}>Add Character</div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, color:'#6b6b7e', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Name</div>
                <input
                  autoFocus
                  value={addDraft.name}
                  onChange={e=>setAddDraft(d=>({...d,name:e.target.value}))}
                  onKeyDown={e=>e.key==='Enter'&&handleAdd()}
                  placeholder="e.g. Akira, Unknown 1…"
                  style={{ width:'100%', padding:'8px 11px', borderRadius:7, background:'#26262f', border:'1px solid #35353f', color:'white', fontSize:13, outline:'none', fontFamily:'DM Sans, sans-serif', boxSizing:'border-box' }}
                />
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, color:'#6b6b7e', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>Voice Type</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                  {VOICE_TYPES.map(v => (
                    <div key={v.id} onClick={()=>setAddDraft(d=>({...d,voiceType:v.id}))} style={{
                      padding:'8px 10px', borderRadius:7, textAlign:'center',
                      background: addDraft.voiceType===v.id ? '#9b6bdc22' : '#26262f',
                      border:`1px solid ${addDraft.voiceType===v.id?'#9b6bdc':'#35353f'}`,
                      color: addDraft.voiceType===v.id ? '#9b6bdc' : '#9898a8',
                      cursor:'pointer', fontSize:11, transition:'all .12s',
                    }}>
                      <div style={{fontSize:18,marginBottom:2}}>{v.icon}</div>
                      {v.label}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:10, color:'#6b6b7e', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>Colour Tag</div>
                <div style={{ display:'flex', gap:8 }}>
                  {CHAR_COLORS.map(c => (
                    <div key={c} onClick={()=>setAddDraft(d=>({...d,colorTag:c}))} style={{
                      width:28, height:28, borderRadius:6, background:c, cursor:'pointer',
                      border:`3px solid ${addDraft.colorTag===c?'white':'transparent'}`,
                      transform: addDraft.colorTag===c?'scale(1.15)':'scale(1)', transition:'transform .1s',
                    }}/>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>setShowAddModal(false)} style={{ flex:1, padding:9, borderRadius:7, background:'#26262f', color:'#9898a8', border:'none', cursor:'pointer', fontSize:13 }}>Cancel</button>
                <button onClick={handleAdd} style={{ flex:1, padding:9, borderRadius:7, background:'#9b6bdc', color:'white', border:'none', cursor:'pointer', fontSize:13, fontWeight:500 }}>Add Character</button>
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
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.9)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
            onClick={()=>setPreviewPanel(null)}
          >
            <motion.div
              initial={{scale:.9,y:10}} animate={{scale:1,y:0}} exit={{scale:.9,y:10}}
              onClick={e=>e.stopPropagation()}
              style={{ background:'#1a1a20', borderRadius:12, border:'2px solid #e8341a', padding:24, maxWidth:800, maxHeight:'90vh', overflow:'auto', display:'flex', flexDirection:'column', gap:16 }}
            >
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <div>
                  <div style={{ fontFamily:'Bebas Neue, sans-serif', fontSize:26, color:'white', letterSpacing:1 }}>
                    Panel #{previewPanel.panel.readingOrder+1}
                  </div>
                  <div style={{ fontSize:12, color:'#6b6b7e', marginTop:4 }}>Page {previewPanel.pageNumber}</div>
                </div>
                <button onClick={()=>setPreviewPanel(null)} style={{ background:'none', border:'none', color:'#e8341a', fontSize:32, cursor:'pointer', padding:0, lineHeight:1, width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              </div>

              {/* Large panel preview */}
              <CroppedImage
                imageUrl={previewPanel.imageUrl}
                bbox={previewPanel.panel.bbox}
                colorTag={previewPanel.panel.colorTag}
                style={{
                  maxWidth: 700,
                  margin: '0 auto',
                  borderRadius: 8,
                  border: `3px solid ${previewPanel.panel.colorTag}`
                }}
              />

              <div style={{ fontSize:13, color:'#9898a8', lineHeight:1.8, maxWidth:500 }}>
                <strong style={{color:'white'}}>Panel Info:</strong><br/>
                Position: ({Math.round(previewPanel.panel.bbox.x)}, {Math.round(previewPanel.panel.bbox.y)})<br/>
                Size: {Math.round(previewPanel.panel.bbox.w)} × {Math.round(previewPanel.panel.bbox.h)}
              </div>

              <button onClick={()=>setPreviewPanel(null)} style={{ padding:'12px 24px', borderRadius:7, background:'#e8341a', color:'white', border:'none', fontSize:14, fontWeight:600, cursor:'pointer', alignSelf:'flex-start' }}>
                Close Preview
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── PANEL THUMBNAIL ───────────────────────────────────────────────
function PanelThumb({ panel, pageNumber, imageUrl, chars, characters, panelCharMap, onTagChar, selectedChar, onPreview }) {
  const [showMenu, setShowMenu] = useState(false);
  const taggedIds = panelCharMap[panel.panelId] || [];

  const handleClick = () => {
    if (selectedChar) {
      onTagChar(selectedChar, panel.panelId);
    } else {
      onPreview({ panel, imageUrl, pageNumber });
    }
  };

  const handlePreview = (e) => {
    e.stopPropagation();
    onPreview({ panel, imageUrl, pageNumber });
  };

  return (
    <div style={{ position:'relative' }}>
      <div
        onClick={handleClick}
        style={{
          cursor:'pointer', borderRadius:8,
          border:`2px solid ${chars.length>0?'#2ec97e':'#26262f'}`,
          overflow:'hidden', transition:'border-color .15s',
          background:'#1a1a20',
          aspectRatio: `${panel.bbox.w}/${panel.bbox.h}`,
          maxWidth: 180,
        }}
      >
        {/* Panel preview — crop from page image using CroppedImage */}
        <CroppedImage
          imageUrl={imageUrl}
          bbox={panel.bbox}
          colorTag={panel.colorTag}
          style={{ width: '100%', height: '100%' }}
        />
        
        {/* Character dots */}
          <div style={{ position:'absolute', top:5, right:5, display:'flex', gap:3 }}>
            {chars.map(c => (
              <div key={c._id} style={{ width:8, height:8, borderRadius:'50%', background:c.colorTag||'#9b6bdc' }}/>
            ))}
          </div>
          {/* Panel number badge */}
          <div style={{
            position:'absolute', top:4, left:4,
            background: panel.colorTag, color:'white',
            fontFamily:'Bebas Neue, sans-serif', fontSize:12, letterSpacing:1,
            padding:'2px 8px', borderRadius:'2px',
            pointerEvents:'none', lineHeight:1.2,
          }}>
            #{panel.readingOrder+1}
          </div>
        <div style={{ padding:'6px 8px', fontSize:10, color:'#6b6b7e', fontFamily:'JetBrains Mono, monospace', borderTop:'1px solid #26262f', display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
          <span>{panel.label || `#${panel.readingOrder+1}`}</span>
          {!selectedChar && (
            <button onClick={(e)=>{e.stopPropagation(); setShowMenu(v=>!v)}} style={{ background:'#26262f', border:'1px solid #35353f', color:'#9898a8', cursor:'pointer', fontSize:9, padding:'2px 6px', borderRadius:3, transition:'all .12s' }} title="Tag character">
              Tag
            </button>
          )}
        </div>
      </div>

      {/* Character tag dropdown */}
      <AnimatePresence>
        {showMenu && !selectedChar && (
          <motion.div
            initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}}
            style={{
              position:'absolute', top:'100%', left:0, zIndex:50, marginTop:4,
              background:'#1a1a20', border:'1px solid #35353f', borderRadius:8,
              minWidth:160, boxShadow:'0 8px 24px rgba(0,0,0,.5)', overflow:'hidden',
            }}
          >
            {characters.length === 0 && (
              <div style={{ padding:'12px 14px', fontSize:11, color:'#6b6b7e' }}>Add characters first</div>
            )}
            {characters.map(c => {
              const tagged = taggedIds.includes(c._id);
              return (
                <div key={c._id} onClick={()=>{ onTagChar(c._id, panel.panelId); setShowMenu(false); }} style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'8px 12px', cursor:'pointer', transition:'background .1s',
                  background: tagged ? c.colorTag+'22' : 'transparent',
                  fontSize:12,
                }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background: c.colorTag||'#9b6bdc' }}/>
                  <span style={{ color: tagged ? 'white' : '#9898a8', flex:1 }}>{c.name}</span>
                  {tagged && <span style={{ color:'#2ec97e', fontSize:11 }}>✓</span>}
                </div>
              );
            })}
            <div onClick={()=>setShowMenu(false)} style={{ padding:'7px 12px', fontSize:11, color:'#35353f', borderTop:'1px solid #26262f', cursor:'pointer' }}>Close</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
