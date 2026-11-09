import React, { useRef, useEffect } from 'react';

export default function VideoMixer({ videos, opacities, playbackRates }) {
  const videoRefs = useRef([]);
  const blendModes = ['normal', 'screen', 'lighten', 'luminosity'];

  useEffect(() => {
    videos.forEach((_, index) => {
      if (videoRefs.current[index]) {
        const videoEl = videoRefs.current[index];
        
        // 1. Применяем громкость
        const vol = opacities[index] !== undefined ? opacities[index] : 0;
        videoEl.volume = Math.max(0, Math.min(1, vol));

        // 2. Применяем скорость (0 = стопкадр)
        const rate = playbackRates[index] !== undefined ? playbackRates[index] : 1;
        
        // Если скорость упала почти в ноль — безопасно ставим на паузу
        if (rate <= 0.05) {
          if (!videoEl.paused) videoEl.pause();
        } else {
          // Защита от краша: браузеры падают, если передать playbackRate < 0.0625
          const safeRate = Math.max(0.1, Math.min(2.0, rate));
          
          try {
            videoEl.playbackRate = safeRate;
            if (videoEl.paused && vol > 0) {
              videoEl.play().catch(() => {}); // catch глушит ошибки прерывания play()
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
      {videos.map((videoSrc, index) => {
        const opacity = opacities[index] !== undefined ? opacities[index] : 0;
        const currentBlendMode = activeCount <= 1 ? 'normal' : blendModes[index];

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
              transition: 'opacity 0.1s ease-out',
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