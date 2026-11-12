import React, { useRef, useEffect } from 'react';

export default function VideoMixer({ videos, opacities, playbackRates, zoomLevels, pixelLevels, positions }) {
  const videoRefs = useRef([]);
  const blendModes = ['normal', 'screen', 'lighten', 'luminosity'];

  useEffect(() => {
    videos.forEach((_, index) => {
      if (videoRefs.current[index]) {
        const videoEl = videoRefs.current[index];
        
        const vol = opacities[index] !== undefined ? opacities[index] : 0;
        videoEl.volume = Math.max(0, Math.min(1, vol));

        const rate = playbackRates[index] !== undefined ? playbackRates[index] : 1;
        
        if (rate <= 0.05) {
          if (!videoEl.paused) videoEl.pause();
        } else {
          const safeRate = Math.max(0.1, Math.min(2.0, rate));
          try {
            videoEl.playbackRate = safeRate;
            if (videoEl.paused && vol > 0) {
              videoEl.play().catch(() => {}); 
            }
          } catch (err) {
            console.warn('Playback rate guard prevented crash:', err);
          }
        }
      }
    });
  }, [opacities, videos, playbackRates]);

  const activeCount = opacities.filter(op => op > 0).length;

  return (
    <div style={{
      position: 'relative', width: '100%', height: '60vh',
      backgroundColor: '#000', overflow: 'hidden', borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    }}>
      
      {/* Скрытый SVG блок для генерации фильтра пикселизации */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {videos.map((_, index) => {
            const pixelSize = pixelLevels && pixelLevels[index] ? Math.max(0.01, pixelLevels[index]) : 0.01;
            // Генерируем уникальный фильтр для каждого видео
            return (
              <filter id={`pixelate-${index}`} key={index}>
                <feFlood x="4" y="4" height="2" width="2"/>
                <feComposite width={pixelSize} height={pixelSize}/>
                <feTile result="a"/>
                <feComposite in="SourceGraphic" in2="a" operator="in"/>
                <feMorphology operator="dilate" radius={Math.max(0, pixelSize / 2)}/>
              </filter>
            );
          })}
        </defs>
      </svg>

      {videos.map((videoSrc, index) => {
        const opacity = opacities[index] !== undefined ? opacities[index] : 0;
        const currentBlendMode = activeCount <= 1 ? 'normal' : blendModes[index];
        const currentZoom = zoomLevels[index] !== undefined ? zoomLevels[index] : 1;
        const currentPos = positions[index] !== undefined ? positions[index] : {x:0, y:0};
        
        // Если уровень пикселизации больше 1, применяем SVG фильтр
        const isPixelated = pixelLevels && pixelLevels[index] > 1;
        const filterStyle = isPixelated ? `url(#pixelate-${index})` : 'none';

        return (
          <video
            key={index}
            ref={el => videoRefs.current[index] = el}
            src={videoSrc}
            autoPlay
            loop
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: opacity,
              mixBlendMode: currentBlendMode,
              translate: `${currentPos.x}% ${currentPos.y}%`,
              scale: currentZoom,
              filter: filterStyle, // ПРИМЕНЯЕМ ПИКСЕЛИЗАЦИЮ
              imageRendering: isPixelated ? 'pixelated' : 'auto', // Убирает сглаживание
              transition: 'opacity 0.1s ease-out, scale 0.1s linear', 
              pointerEvents: 'none'
            }}
          />
        );
      })}
      
      {videos.length === 0 && (
        <div style={{ color: '#555', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <h2>Загрузите видео (до 4 шт.)</h2>
        </div>
      )}
    </div>
  );
}