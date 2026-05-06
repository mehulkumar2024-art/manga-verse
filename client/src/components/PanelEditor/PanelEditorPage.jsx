// src/components/PanelEditor/PanelEditorPage.jsx
// Complete manga upload workflow: Upload → Auto-Detect Panels → Review → Characters → Voices

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { usePanelEditor } from '../../hooks/usePanelEditor';
import { panelService, characterService } from '../../services/panelService';
import PanelCanvas from './PanelCanvas';
import PanelSidebar from './PanelSidebar';
import StepBar, { CharacterStep } from './StepBar';
import VoiceAssignmentStep from './VoiceAssignmentStep';
import { DialogueStep } from './DialogueStep';
import api from '../../config/api';

export default function PanelEditorPage() {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(2);
  const [manifests, setManifests] = useState([]);
  const [chapter, setChapter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [panelCharMap, setPanelCharMap] = useState({});
  const [chapterStatus, setChapterStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  // Current page's manifest
  const getVirtualManifest = () => {
    const existing = manifests.find(m => m.pageNumber === currentPage);
    if (existing) return existing;
    if (chapter) {
      const pages = typeof chapter.pages === 'string' ? JSON.parse(chapter.pages) : chapter.pages;
      const page = pages.find(p => p.pageNumber === currentPage);
      if (page) return { pageNumber: currentPage, imageUrl: page.url, status: 'pending_detection', panels: [] };
    }
    return null;
  };

  const currentManifest = getVirtualManifest();

  const editor = usePanelEditor({
    chapterId,
    pageNumber: currentPage,
    initialManifest: currentManifest,
  });

  // ── Load manifests + characters ──────────────────────────────
  const loadData = async () => {
    if (!chapterId) return;
    try {
      const [manifestRes, charRes, statusRes, chapterRes] = await Promise.all([
        panelService.getChapterManifests(chapterId),
        characterService.getMangaCharacters(mangaId),
        panelService.getChapterStatus(chapterId),
        fetch(`/api/chapters/${chapterId}`).then(res => res.json())
      ]);
      setManifests(manifestRes.data || []);
      setCharacters(charRes.data || []);
      setChapterStatus(statusRes.data);
      if (chapterRes.success) setChapter(chapterRes.chapter);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load chapter data');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [chapterId, mangaId]);

  // ── Detection Flow ───────────────────────────────────────────
  const handleAutoDetect = async () => {
    // If manifest doesn't exist yet, we can't detect unless we create it
    let manifestToDetect = currentManifest;

    if (!manifestToDetect && chapter) {
      // Find page in chapter
      const pages = typeof chapter.pages === 'string' ? JSON.parse(chapter.pages) : chapter.pages;
      const page = pages.find(p => p.pageNumber === currentPage);
      if (page) {
        manifestToDetect = { imageUrl: page.url };
      }
    }

    if (!manifestToDetect) {
      toast.error('Page image not found');
      return;
    }

    setDetecting(true);
    try {
      const result = await panelService.detectPage(chapterId, currentPage, {
        imageUrl: manifestToDetect.imageUrl,
        imageWidth: 800,
        imageHeight: 1100
      });

      if (!result.success) {
        toast.error(result.message || 'Detection failed');
        return;
      }

      // Load the detected panels
      const loadedResult = await panelService.getPageManifest(chapterId, currentPage);
      if (loadedResult.success && loadedResult.data) {
        editor.updatePanels(loadedResult.data.panels || []);
      }

      toast.success(`Detected ${result.data?.panelCount || 0} panels!`);
      await loadData();
    } catch (e) {
      console.error('Detection error:', e);
      toast.error(e.message || 'Detection failed');
    } finally {
      setDetecting(false);
    }
  };

  // ── Confirm all pages and proceed ────────────────────────────
  const handleConfirmPage = async () => {
    await editor.confirmPage();
    toast.success('Page confirmed!');
    await loadData();

    // Auto-advance or move to step 3
    if (currentPage < manifests.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Populate character map from manifests once they load
  useEffect(() => {
    if (manifests.length > 0) {
      const initialMap = {};
      manifests.forEach(m => {
        (m.panels || []).forEach(p => {
          if (p.characterRegions && p.characterRegions.length > 0) {
            initialMap[p.panelId] = p.characterRegions;
          }
        });
      });
      setPanelCharMap(prev => ({ ...initialMap, ...prev }));
    }
  }, [manifests]);

  // ── Character management ─────────────────────────────────────
  const addCharacter = async (payload) => {
    try {
      const res = await characterService.createCharacter(mangaId, payload);
      setCharacters(prev => [...prev, res.data]);
      toast.success(`Character "${res.data.name}" added`);
      return res.data;
    } catch (e) {
      toast.error(e.message);
    }
  };

  const updateCharacter = async (id, payload) => {
    try {
      const res = await characterService.updateCharacter(id, payload);
      setCharacters(prev => prev.map(c => c._id === id ? res.data : c));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const deleteCharacter = async (id) => {
    try {
      await characterService.deleteCharacter(id);
      setCharacters(prev => prev.filter(c => c._id !== id));
      toast.success('Character removed');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleAutoDetectCharacters = async (pageNumber) => {
    setDetecting(true);
    try {
      const data = await panelService.detectCharactersInstant(chapterId, pageNumber);
      if (!data.success) throw new Error(data.message);

      setPanelCharMap(prev => {
        const next = { ...prev };
        // data.data is { [panelId]: [ { characterRegionId, bbox, points, characterId }, ... ] }
        Object.keys(data.data).forEach(pid => {
          next[pid] = data.data[pid];
        });
        return next;
      });
      toast.success('Characters auto-detected!');
    } catch (e) {
      toast.error('Character detection failed: ' + e.message);
    } finally {
      setDetecting(false);
    }
  };

  const tagRegionInPanel = async (panelId, regionId, characterId) => {
    setPanelCharMap(prev => {
      const panels = { ...prev };
      const regions = panels[panelId] || [];
      panels[panelId] = regions.map(r =>
        r.characterRegionId === regionId
          ? { ...r, characterId: r.characterId === characterId ? null : characterId }
          : r
      );
      return panels;
    });
    // Optional: Sync this specific region update to backend here
  };

  const addManualRegion = async (panelId, points, bbox) => {
    setPanelCharMap(prev => {
      const panels = { ...prev };
      const regions = panels[panelId] || [];
      const newRegion = {
        characterRegionId: 'manual_' + Date.now(),
        points,
        bbox,
        characterId: null,
        type: 'manual'
      };
      panels[panelId] = [...regions, newRegion];
      return panels;
    });
  };

  const removeRegion = async (panelId, regionId) => {
    setPanelCharMap(prev => {
      const panels = { ...prev };
      panels[panelId] = (panels[panelId] || []).filter(r => r.characterRegionId !== regionId);
      return panels;
    });
  };

  const handleSaveCharacterMappings = async (nextStep = 4) => {
    try {
      setSaving(true);
      // Group panels by page and update manifests
      for (const m of manifests) {
        const updatedPanels = m.panels.map(p => ({
          ...p,
          characterRegions: panelCharMap[p.panelId] || []
        }));
        await panelService.savePanels(chapterId, m.pageNumber, updatedPanels);
      }
      toast.success('Character mappings saved!');
      setCurrentStep(nextStep); 
    } catch (e) {
      toast.error('Failed to save mappings: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRegionText = (panelId, regionId, text) => {
    setPanelCharMap(prev => {
      const panels = { ...prev };
      const regions = panels[panelId] || [];
      panels[panelId] = regions.map(r => 
        r.characterRegionId === regionId ? { ...r, text } : r
      );
      return panels;
    });
  };

  const handleAssignVoiceToCharacter = async (charId, voiceId, voiceType) => {
    try {
      await characterService.assignVoice(charId, { voiceId, voiceType });
      setCharacters(prev => prev.map(c => c._id === charId ? { ...c, voiceId, voiceType } : c));
      toast.success('Voice assigned successfully');
    } catch (e) {
      toast.error('Failed to assign voice: ' + e.message);
    }
  };

  const getPagesCount = () => {
    if (chapter?.pages) {
      const pages = typeof chapter.pages === 'string' ? JSON.parse(chapter.pages) : chapter.pages;
      return pages.length;
    }
    return manifests.length || 1;
  };

  const totalPages = getPagesCount();
  const confirmedCount = chapterStatus?.confirmed || 0;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0d0f', color: '#9898a8', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: '#fefefe', marginBottom: 12, letterSpacing: '-0.5px' }}>Manga Studio</div>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontSize: 14 }}>Loading chapter...</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0d0d0f', fontFamily: 'DM Sans, sans-serif', color: '#c8c8d4' }}>
      <StepBar
        current={currentStep}
        confirmedPages={confirmedCount}
        totalPages={totalPages}
        onStep={(s) => {
          if (s === 2) setCurrentStep(2);
          if (s >= 3 && s <= 5 && confirmedCount > 0) setCurrentStep(s);
        }}
        onConfirmPage={handleConfirmPage}
        onAutoDetect={handleAutoDetect}
        detecting={detecting}
        editor={editor}
      />

      {/* ── STEP 2: PANEL EDITOR ── */}
      <AnimatePresence mode="wait">
        {currentStep === 2 && (
          <motion.div
            key="panel-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: .3 }}
            style={{ display: 'flex', flex: 1, overflow: 'hidden' }}
          >
            {/* Main canvas */}
            <PanelCanvas
              editor={editor}
              imageUrl={currentManifest?.imageUrl}
              onDetect={handleAutoDetect}
            />
            {/* Sidebar */}
            <PanelSidebar
              editor={editor}
              imageUrl={currentManifest?.imageUrl}
              currentPage={currentPage}
              totalPages={totalPages}
              confirmedCount={confirmedCount}
              manifests={manifests}
              onPageChange={setCurrentPage}
              onConfirm={handleConfirmPage}
              onProceedToChars={() => setCurrentStep(3)}
            />
          </motion.div>
        )}

        {/* ── STEP 3: CHARACTER IDENTIFICATION ── */}
        {currentStep === 3 && (
          <motion.div
            key="char-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: .2 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <CharacterStep
              manifests={manifests}
              characters={characters}
              panelCharMap={panelCharMap}
              onAddCharacter={addCharacter}
              onUpdateCharacter={updateCharacter}
              onDeleteCharacter={deleteCharacter}
              onTagRegion={tagRegionInPanel}
              onAddManualRegion={addManualRegion}
              onRemoveRegion={removeRegion}
              onDetectCharacters={handleAutoDetectCharacters}
              detecting={detecting}
              onBack={() => setCurrentStep(2)}
              onNext={handleSaveCharacterMappings}
            />
          </motion.div>
        )}

        {currentStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{ flex: 1, overflow: 'hidden', display: 'flex' }}
          >
            <DialogueStep
              manifests={manifests}
              characters={characters}
              panelCharMap={panelCharMap}
              onUpdateRegionText={handleUpdateRegionText}
              onBack={() => setCurrentStep(3)}
              onSaveDialogues={() => handleSaveCharacterMappings(5)}
            />
          </motion.div>
        )}

        {currentStep === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{ flex: 1, overflow: 'hidden', display: 'flex' }}
          >
            <VoiceAssignmentStep
              characters={characters}
              onAssignVoice={handleAssignVoiceToCharacter}
              onBack={() => setCurrentStep(4)}
              onFinish={async () => {
                try {
                  setCurrentStep(6);
                  await api.post(`/manga/${mangaId}/publish`);
                  setCurrentStep(7);
                  toast.success('Cinematic generation started! Manga is now published and viewable.');
                  setTimeout(() => {
                    navigate(`/manga/${mangaId}/chapter/${chapterId}`);
                  }, 1500);
                } catch (e) {
                  setCurrentStep(5);
                  toast.error('Failed to publish manga: ' + e.message);
                }
              }}
            />
          </motion.div>
        )}

        {(currentStep === 6 || currentStep === 7) && (
          <motion.div
            key="step-publish"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}
          >
            <div style={{ fontSize: 60, marginBottom: 20 }}>{currentStep === 6 ? '🎬' : '✅'}</div>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: 'white' }}>
              {currentStep === 6 ? 'Generating Cinematic Experience...' : 'Manga Published Successfully!'}
            </h2>
            {currentStep === 6 && <div className="spinner" style={{ marginTop: 20 }} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── TOP BAR COMPONENT ────────────────────────────────────────────
function TopBar({ isDirty, navigate }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 24px', height: 56,
      background: '#141417', borderBottom: '1px solid #26262f',
      flexShrink: 0,
    }}>
      <span style={{ fontWeight: 700, fontSize: 18, color: '#fefefe', letterSpacing: '-0.5px' }}>
        Manga <span style={{ color: 'var(--accent)' }}>Studio</span>
      </span>
      <span style={{ width: 1, height: 24, background: '#26262f' }} />
      <span style={{ fontSize: 13, color: '#6b6b7e' }}>Page Review & Layout</span>
      <span style={{ flex: 1 }} />
      {isDirty && (
        <span style={{ fontSize: 12, color: '#e8991a', display: 'flex', alignItems: 'center', gap: 6, background: '#e8991a11', padding: '4px 10px', borderRadius: 20 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e8991a', display: 'inline-block' }} />
          Draft Changes
        </span>
      )}
      <button
        onClick={() => navigate(-1)}
        style={{ padding: '7px 16px', borderRadius: 8, background: 'transparent', border: '1px solid #26262f', color: '#9898a8', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
      >
        Save & Exit
      </button>
    </div>
  );
}
