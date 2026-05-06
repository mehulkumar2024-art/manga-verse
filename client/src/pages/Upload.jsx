import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiX, FiPlus, FiCheck, FiImage } from 'react-icons/fi';
import api from '../config/api';
import toast from 'react-hot-toast';

const GENRES = [
  'Action','Adventure','Comedy','Drama','Fantasy','Horror',
  'Mystery','Romance','Sci-Fi','Slice of Life','Sports',
  'Supernatural','Thriller','Historical','Isekai','Mecha',
  'Psychological','Shounen','Shoujo','Seinen','Josei'
];

const STATUS = ['Ongoing', 'Completed', 'Hiatus'];

export default function Upload() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: manga info, 2: first chapter
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [createdManga, setCreatedManga] = useState(null);

  // Step 1: manga fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  // Step 2: chapter fields
  const [chapterNumber, setChapterNumber] = useState('1');
  const [chapterTitle, setChapterTitle] = useState('');
  const [pages, setPages] = useState([]);

  const onCoverDrop = useCallback((accepted) => {
    if (accepted[0]) {
      setCoverFile(accepted[0]);
      setCoverPreview(URL.createObjectURL(accepted[0]));
    }
  }, []);

  const { getRootProps: getCoverProps, getInputProps: getCoverInput, isDragActive: coverDrag } = useDropzone({
    onDrop: onCoverDrop, accept: { 'image/*': [] }, maxFiles: 1
  });

  const onPagesDrop = useCallback((accepted) => {
    const newFiles = accepted.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setPages(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps: getPagesProps, getInputProps: getPagesInput, isDragActive: pagesDrag } = useDropzone({
    onDrop: onPagesDrop, accept: { 'image/*': [] }, multiple: true
  });

  const toggleGenre = (g) => {
    setSelectedGenres(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : prev.length < 5 ? [...prev, g] : prev
    );
  };

  const removePage = (i) => setPages(prev => prev.filter((_, idx) => idx !== i));

  const handleCreateManga = async (e) => {
    e.preventDefault();
    if (!coverFile) return toast.error('Please upload a cover image');
    if (!title.trim()) return toast.error('Title is required');
    if (!description.trim()) return toast.error('Description is required');
    if (selectedGenres.length === 0) return toast.error('Select at least one genre');

    setLoading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('status', 'Draft');
      formData.append('genres', JSON.stringify(selectedGenres));
      formData.append('cover', coverFile);

      const res = await api.post('/manga', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });

      if (res.data.success) {
        setCreatedManga(res.data.manga);
        toast.success('Manga created! Now add your first chapter.');
        setProgress(0);
        setStep(2);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
    setLoading(false);
  };

  const handleUploadChapter = async (e) => {
    e.preventDefault();
    if (pages.length === 0) return toast.error('Upload at least one page');

    setLoading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('mangaId', createdManga._id);
      formData.append('chapterNumber', chapterNumber);
      formData.append('title', chapterTitle);
      
      pages.forEach(p => {
        formData.append('pages', p.file);
      });

      const res = await api.post('/chapters', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
          
          window.dispatchEvent(new CustomEvent('manga-upload-progress', {
            detail: { mangaId: createdManga._id, progress: percentCompleted }
          }));
        }
      });

      if (res.data.success) {
        toast.success('Chapter uploaded! Now opening detection studio...');
        navigate(`/upload/studio/${createdManga._id}/${res.data.chapter._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
    setLoading(false);
    setProgress(0);
  };

  const skipChapter = () => navigate(`/manga/${createdManga._id}`);

  return (
    <div className="fade-up" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Progress bar */}
      {loading && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{ marginBottom: 24, textAlign: 'center' }}
        >
          <div style={{
            background: 'var(--bg-2)', 
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            position: 'relative'
          }}>
            <div style={{ marginBottom: 8, fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent)' }}>
              Uploading... {progress}%
            </div>
            <div style={{
              width: '100%',
              height: 8,
              background: 'var(--bg-3)',
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent), #ff6b9d)',
                  borderRadius: 4
                }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36 }}>
        {[{ n: 1, label: 'Manga Info' }, { n: 2, label: 'First Chapter' }].map(({ n, label }, i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 1 ? 1 : 'auto' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              opacity: step >= n ? 1 : 0.4
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem',
                background: step > n ? 'var(--accent)' : step === n ? 'var(--accent)' : 'var(--bg-4)',
                color: step >= n ? '#fff' : 'var(--text-2)'
              }}>
                {step > n ? <FiCheck /> : n}
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: step === n ? 600 : 400, color: step >= n ? 'var(--text-0)' : 'var(--text-3)' }}>
                {label}
              </span>
            </div>
            {i < 1 && <div style={{ flex: 1, height: 2, background: step > 1 ? 'var(--accent)' : 'var(--border)', margin: '0 16px' }} />}
          </div>
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
        {step === 1 ? (
          <form onSubmit={handleCreateManga}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: 1, marginBottom: 28 }}>
              PUBLISH YOUR <span style={{ color: 'var(--accent)' }}>MANGA</span>
            </h1>

            {/* Cover upload */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelSt}>Cover Image *</label>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div
                  {...getCoverProps()}
                  style={{
                    width: 160, flexShrink: 0, aspectRatio: '2/3',
                    border: `2px dashed ${coverDrag ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', overflow: 'hidden',
                    background: coverDrag ? 'var(--accent-glow)' : 'var(--bg-3)',
                    transition: 'all 0.2s', position: 'relative'
                  }}
                >
                  <input {...getCoverInput()} />
                  {coverPreview ? (
                    <img src={coverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: 16 }}>
                      <FiImage size={32} color="var(--text-3)" style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Drop cover here or click</p>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                    Your cover is the first thing readers see. Use a high-quality image with a 2:3 ratio (e.g. 800×1200px).
                    JPG, PNG or WebP accepted.
                  </p>
                </div>
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelSt}>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Your manga title" required maxLength={100} />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelSt}>Description / Synopsis *</label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Tell readers what your manga is about..."
                required rows={5} maxLength={2000}
                style={{ resize: 'vertical', lineHeight: 1.6 }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>{description.length}/2000</p>
            </div>

            {/* Status (Removed, defaults to Draft) */}

            {/* Genres */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelSt}>Genres * <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({selectedGenres.length}/5 selected)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {GENRES.map(g => (
                  <button
                    key={g} type="button"
                    onClick={() => toggleGenre(g)}
                    className={`btn ${selectedGenres.includes(g) ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  >
                    {selectedGenres.includes(g) && <FiCheck size={12} />} {g}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '14px 36px', fontSize: '1rem' }} disabled={loading}>
              {loading ? 'Creating...' : 'Create Manga & Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUploadChapter}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
              {createdManga?.coverImage && (
                <img src={createdManga.coverImage} alt="" style={{ width: 60, borderRadius: 8, aspectRatio: '2/3', objectFit: 'cover' }} />
              )}
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: 1 }}>
                  UPLOAD <span style={{ color: 'var(--accent)' }}>CHAPTER</span>
                </h1>
                <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>{createdManga?.title}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelSt}>Chapter Number *</label>
                <input type="number" value={chapterNumber} onChange={e => setChapterNumber(e.target.value)} min="1" required />
              </div>
              <div>
                <label style={labelSt}>Chapter Title (optional)</label>
                <input value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} placeholder="e.g. The Beginning" maxLength={100} />
              </div>
            </div>

            {/* Pages drop zone */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelSt}>Pages * <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(files will be sorted by filename)</span></label>
              <div
                {...getPagesProps()}
                style={{
                  border: `2px dashed ${pagesDrag ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)', padding: '32px', textAlign: 'center',
                  background: pagesDrag ? 'var(--accent-glow)' : 'var(--bg-3)', cursor: 'pointer',
                  transition: 'all 0.2s', marginBottom: 16
                }}
              >
                <input {...getPagesInput()} />
                <FiUploadCloud size={36} color={pagesDrag ? 'var(--accent)' : 'var(--text-3)'} style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
                  Drop manga pages here or click to select
                </p>
                <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: 4 }}>
                  Name files as 001.jpg, 002.jpg... for correct order
                </p>
              </div>

              {/* Pages preview */}
              {pages.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
                  {pages.map((p, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '2/3', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-4)' }}>
                      <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                        padding: 6, opacity: 0, transition: 'opacity 0.2s'
                      }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                      >
                        <span style={{ color: '#fff', fontSize: '0.7rem', marginBottom: 4 }}>p.{i + 1}</span>
                        <button type="button" onClick={() => removePage(i)}
                          style={{ background: 'var(--accent)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                          <FiX size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div
                    {...getPagesProps()}
                    style={{
                      aspectRatio: '2/3', borderRadius: 8, border: '2px dashed var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', background: 'var(--bg-3)'
                    }}
                  >
                    <input {...getPagesInput()} />
                    <FiPlus color="var(--text-3)" />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '13px 32px', fontSize: '0.95rem' }} disabled={loading || pages.length === 0}>
                {loading ? 'Uploading...' : `Upload ${pages.length} Page${pages.length !== 1 ? 's' : ''}`}
              </button>
              <button type="button" className="btn btn-ghost" onClick={skipChapter} disabled={loading}>
                Skip for Now
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

const labelSt = { display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 8, fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase' };
