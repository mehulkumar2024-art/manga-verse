import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CroppedImage from './CroppedImage';

export function DialogueStep({
  manifests, characters, panelCharMap, onUpdateRegionText, onSaveDialogues, onBack,
}) {
  const [selectedPanelId, setSelectedPanelId] = useState(null);
  
  // Find the selected panel across all manifests
  const selectedPanelObj = selectedPanelId 
    ? manifests.flatMap(m => (m.panels || []).map(p => ({ panel: p, imageUrl: m.imageUrl }))).find(p => p.panel.panelId === selectedPanelId)
    : null;

  const totalPanels = manifests.reduce((acc, m) => acc + (m.panels?.length || 0), 0);
  const panelsWithText = manifests.reduce((acc, m) => {
    return acc + (m.panels || []).filter(p => {
      const regions = panelCharMap[p.panelId] || [];
      return regions.some(r => r.text && r.text.trim().length > 0);
    }).length;
  }, 0);

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', background: '#0d0d0f' }}>
      
      {/* LEFT: Panel Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, color: 'white', letterSpacing: 1 }}>
            Dialogue Assignment
          </div>
          <div style={{ fontSize: 12, color: '#6b6b7e', marginTop: 4 }}>
            Click a panel to add narration or speech dialogue for its characters.
            &nbsp;·&nbsp;<span style={{ color: '#2ec97e' }}>{panelsWithText}/{totalPanels} panels have text</span>
          </div>
        </div>

        {manifests.map(m => (
          <div key={m._id} style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 10, color: '#35353f', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Page {m.pageNumber}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {(m.panels || []).map(panel => {
                const regions = panelCharMap[panel.panelId] || [];
                const hasText = regions.some(r => r.text && r.text.trim() !== '');
                
                return (
                  <div
                    key={panel.panelId}
                    onClick={() => setSelectedPanelId(panel.panelId)}
                    style={{
                      cursor: 'pointer', borderRadius: 8,
                      border: `2px solid ${hasText ? '#3a9bdc' : '#26262f'}`,
                      overflow: 'hidden', background: '#1a1a20',
                      aspectRatio: `${panel.bbox.w}/${panel.bbox.h}`,
                      maxWidth: 180, position: 'relative'
                    }}
                  >
                    <CroppedImage imageUrl={m.imageUrl} bbox={panel.bbox} style={{ width: '100%', height: '100%' }} />
                    {hasText && (
                      <div style={{ position: 'absolute', top: 4, right: 4, background: '#3a9bdc', color: 'white', fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>
                        TEXT
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 12, marginTop: 32, paddingTop: 24, borderTop: '1px solid #26262f' }}>
          <button onClick={onBack} style={{ padding: '10px 20px', borderRadius: 7, background: 'transparent', color: '#9898a8', border: '1px solid #35353f', fontSize: 13, cursor: 'pointer' }}>
            ← Back to Characters
          </button>
          <button onClick={onSaveDialogues} style={{ padding: '10px 24px', borderRadius: 7, background: '#3a9bdc', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Save Dialogues & Next →
          </button>
        </div>
      </div>

      {/* RIGHT: Editor Sidebar */}
      <div style={{ width: 380, flexShrink: 0, background: '#1a1a20', borderLeft: '1px solid #26262f', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #26262f', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>
            {selectedPanelObj ? `Edit Panel Dialogue` : `Select a Panel`}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {!selectedPanelObj ? (
            <div style={{ color: '#6b6b7e', fontSize: 12, textAlign: 'center', marginTop: 40 }}>
              Select a panel from the left to type out what the characters are saying.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #26262f' }}>
                <CroppedImage imageUrl={selectedPanelObj.imageUrl} bbox={selectedPanelObj.panel.bbox} style={{ width: '100%', height: 'auto', maxHeight: 200 }} />
              </div>

              <div>
                {(panelCharMap[selectedPanelId] || []).map((region, idx) => {
                  const character = characters.find(c => c._id === region.characterId);
                  const charName = character ? character.name : `Region ${idx + 1} (Unassigned)`;
                  const charColor = character ? character.colorTag : '#6b6b7e';
                  
                  return (
                    <div key={region.characterRegionId} style={{ marginBottom: 16 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9898a8', textTransform: 'uppercase', marginBottom: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: charColor }} />
                        {charName}
                      </label>
                      <textarea
                        value={region.text || ''}
                        onChange={(e) => onUpdateRegionText(selectedPanelId, region.characterRegionId, e.target.value)}
                        placeholder={`What is ${charName} saying in this panel?`}
                        style={{
                          width: '100%', minHeight: 80, padding: 12, borderRadius: 8,
                          background: '#26262f', border: '1px solid #35353f',
                          color: 'white', fontSize: 13, resize: 'vertical',
                          fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  );
                })}

                {(!panelCharMap[selectedPanelId] || panelCharMap[selectedPanelId].length === 0) && (
                  <div style={{ color: '#e8991a', fontSize: 12, padding: 12, background: '#e8991a11', borderRadius: 8 }}>
                    There are no characters tagged in this panel. Go back to Step 3 to tag characters before adding dialogue.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
