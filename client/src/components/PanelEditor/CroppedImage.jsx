import { useState, useEffect } from 'react';

export default function CroppedImage({ imageUrl, bbox, colorTag, style, className, children }) {
  const [naturalSize, setNaturalSize] = useState({ w: 800, h: 1100 });
  const [loaded, setLoaded] = useState(false);

  // Pre-load image to get natural dimensions accurately
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setLoaded(true);
    };
    img.src = imageUrl;
    if (img.complete) {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setLoaded(true);
    }
  }, [imageUrl]);

  return (
    <div className={className} style={{
      position: 'relative',
      width: '100%',
      aspectRatio: `${Math.max(10, bbox.w)}/${Math.max(10, bbox.h)}`,
      background: colorTag ? colorTag + '22' : 'transparent',
      overflow: 'hidden',
      ...style
    }}>
      {imageUrl && loaded ? (
        <svg
          viewBox={`${bbox.x} ${bbox.y} ${Math.max(1, bbox.w)} ${Math.max(1, bbox.h)}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <image
            href={imageUrl}
            x="0"
            y="0"
            width={naturalSize.w}
            height={naturalSize.h}
            preserveAspectRatio="none"
          />
        </svg>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 11, color: colorTag }}>
          {imageUrl ? 'Loading...' : 'No Image'}
        </div>
      )}
      {children}
    </div>
  );
}
