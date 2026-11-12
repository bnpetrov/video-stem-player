import React, { useRef, useEffect } from 'react';

const cssFilters = [
  'none',                                    
  'sepia(1) saturate(3) hue-rotate(320deg)', 
  'invert(1)',                               
  'sepia(1) saturate(3) hue-rotate(180deg)', 
  'blur(4px) contrast(3)',                   
  'sepia(1) saturate(4) hue-rotate(45deg)',  
  'contrast(2) brightness(0.6)',             
  'sepia(0.8) hue-rotate(90deg) saturate(4)',
  'invert(1) contrast(1.5)',                 
  'sepia(1) hue-rotate(270deg) saturate(3)', 
  'brightness(1.5) contrast(1.2)'            
];

export default function VideoMixer({ videos, opacities, playbackRates, zoomLevels, pixelLevels, thresholdLevels, filterLevels, delayLevels, positions }) {
  const videoRefs = useRef([]);
  // Рефы для слоев-призраков (эхо)
  const ghost1Refs = useRef([]);
  const ghost2Refs = useRef([]);
  
  const delayLevelsRef = useRef(delayLevels);
  
  const blendModes = ['normal', 'screen', 'lighten', 'luminosity'];

  // Обновляем реф задержки для интервала синхронизации, чтобы не перезапускать его
  useEffect(() => {
    delayLevelsRef.current = delayLevels;
  }, [delayLevels]);

  // ГЛАВНЫЙ ИНТЕРВАЛ ВРЕМЕНИ ДЛЯ DELAY (ЭХО)
  useEffect(() => {
    const interval = setInterval(() => {
      videos.forEach((_, index) => {
        const delayLevel = delayLevelsRef.current[index] || 0;
        if (delayLevel <= 1) return; // Эхо выключено

        const main = videoRefs.current[index];
        const g1 = ghost1Refs.current[index];
        const g2 = ghost2Refs.current[index];

        if (!main) return;

        // Чем больше крутилка, тем сильнее отставание во времени (до 0.5s и 1.0s)
        const offset1 = (delayLevel / 100) * 0.5;
        const offset2 = (delayLevel / 100) * 1.0;

        const syncGhostTime = (ghost, offset) => {
          if (!ghost) return;
          // Синхронизируем базовые статусы
          if (ghost.paused && !main.paused) ghost.play().catch(()=>{});
          if (!ghost.paused && main.paused) ghost.pause();
          if (ghost.playbackRate !== main.playbackRate) ghost.playbackRate = main.playbackRate;

          if (main.duration > 0) {
            let targetTime = main.currentTime - offset;
            
            // Бесшовная склейка при зацикливании (loop)
            while (targetTime < 0) targetTime += main.duration;
            while (targetTime > main.duration) targetTime -= main.duration;

            let diff = Math.abs(ghost.currentTime - targetTime);
            
            // Подтягиваем время призрака только если он отстал/опередил больше чем на 0.1 сек
            // (игнорируем сам момент перескока loop, чтобы не было заиканий)
            if (diff > 0.15 && diff < (main.duration - 0.2)) {
              ghost.currentTime = targetTime;
            }
          }
        };

        syncGhostTime(g1, offset1);
        syncGhostTime(g2, offset2);
      });
    }, 100); // Проверяем рассинхрон 10 раз в секунду

    return () => clearInterval(interval);
  }, [videos]);

  // Обновление громкости и скорости (как раньше)
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
            if (videoEl.paused && vol > 0) videoEl.play().catch(() => {}); 
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
      
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {videos.map((_, index) => {
            const pixelSize = pixelLevels && pixelLevels[index] ? Math.max(0.01, pixelLevels[index]) : 0.01;
            const thresh = thresholdLevels && thresholdLevels[index] ? thresholdLevels[index] : 0;
            const cutoff = thresh / 100; 
            const intensity = Math.min(1, thresh / 20); 

            return (
              <React.Fragment key={index}>
                <filter id={`pixelate-${index}`}>
                  <feFlood x="4" y="4" height="2" width="2"/>
                  <feComposite width={pixelSize} height={pixelSize}/>
                  <feTile result="a"/>
                  <feComposite in="SourceGraphic" in2="a" operator="in"/>
                  <feMorphology operator="dilate" radius={Math.max(0, pixelSize / 2)}/>
                </filter>
                <filter id={`threshold-${index}`}>
                  <feColorMatrix in="SourceGraphic" type="matrix" result="gray" values="
                    0.2126 0.7152 0.0722 0 0
                    0.2126 0.7152 0.0722 0 0
                    0.2126 0.7152 0.0722 0 0
                    0 0 0 1 0" />
                  <feComponentTransfer in="gray" result="hardThresh">
                    <feFuncR type="linear" slope="255" intercept={-255 * cutoff}/>
                    <feFuncG type="linear" slope="255" intercept={-255 * cutoff}/>
                    <feFuncB type="linear" slope="255" intercept={-255 * cutoff}/>
                  </feComponentTransfer>
                  <feComposite in="hardThresh" in2="SourceGraphic" operator="arithmetic" k1="0" k2={intensity} k3={1 - intensity} k4="0" />
                </filter>
              </React.Fragment>
            );
          })}
        </defs>
      </svg>

      {videos.map((videoSrc, index) => {
        const opacity = opacities[index] !== undefined ? opacities[index] : 0;
        const currentBlendMode = activeCount <= 1 ? 'normal' : blendModes[index];
        const currentZoom = zoomLevels[index] !== undefined ? zoomLevels[index] : 1;
        const currentPos = positions[index] !== undefined ? positions[index] : {x:0, y:0};
        
        const isPixelated = pixelLevels && pixelLevels[index] > 1;
        const isThresholded = thresholdLevels && thresholdLevels[index] > 0.1; 
        const currentDelay = delayLevels && delayLevels[index] !== undefined ? delayLevels[index] : 0;
        
        const filterIdx = filterLevels && filterLevels[index] !== undefined ? Math.round(filterLevels[index]) : 0;
        const safeFilterIdx = Math.max(0, Math.min(cssFilters.length - 1, filterIdx));
        const selectedCssFilter = cssFilters[safeFilterIdx];

        const activeFilters = [];
        if (isPixelated) activeFilters.push(`url(#pixelate-${index})`);
        if (isThresholded) activeFilters.push(`url(#threshold-${index})`);
        if (selectedCssFilter !== 'none') activeFilters.push(selectedCssFilter);
        const filterStyle = activeFilters.length > 0 ? activeFilters.join(' ') : 'none';

        // Базовый стиль, общий для Оригинала и Призраков
        const baseStyle = {
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          objectFit: 'cover',
          translate: `${currentPos.x}% ${currentPos.y}%`,
          scale: currentZoom,
          filter: filterStyle, 
          imageRendering: isPixelated ? 'pixelated' : 'auto', 
          transition: 'opacity 0.1s ease-out, scale 0.1s linear', 
          pointerEvents: 'none'
        };

        // Чем больше крутилка Delay, тем ярче шлейф
        const ghost1Opacity = opacity * (currentDelay / 100) * 0.6;
        const ghost2Opacity = opacity * (currentDelay / 100) * 0.3;

        return (
          <React.Fragment key={index}>
            {/* ОРИГИНАЛЬНОЕ ВИДЕО (Самый нижний слой) */}
            <video
              ref={el => videoRefs.current[index] = el}
              src={videoSrc}
              autoPlay
              loop
              style={{ ...baseStyle, opacity: opacity, mixBlendMode: currentBlendMode }}
            />
            
            {/* ПРИЗРАК 1 (Отстает чуть-чуть, режим screen делает его светящимся поверх оригинала) */}
            {currentDelay > 1 && (
              <video
                ref={el => ghost1Refs.current[index] = el}
                src={videoSrc}
                autoPlay
                loop
                muted // Обязательно глушим звук у призраков!
                style={{ ...baseStyle, opacity: ghost1Opacity, mixBlendMode: 'screen' }}
              />
            )}

            {/* ПРИЗРАК 2 (Отстает сильнее всего) */}
            {currentDelay > 1 && (
              <video
                ref={el => ghost2Refs.current[index] = el}
                src={videoSrc}
                autoPlay
                loop
                muted
                style={{ ...baseStyle, opacity: ghost2Opacity, mixBlendMode: 'screen' }}
              />
            )}
          </React.Fragment>
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