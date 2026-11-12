import React, { useRef, useEffect } from 'react';

// Палитра из 10 мощных CSS фильтров.
// Четные: структурные (идеальны для ЧБ). Нечетные: цветовые (красят даже ЧБ через sepia).
const cssFilters = [
  'none',                                    // 0: Оригинал
  'sepia(1) saturate(3) hue-rotate(320deg)', // 1: Розовый неон (Заливка)
  'invert(1)',                               // 2: Жесткая инверсия негатива (Структура)
  'sepia(1) saturate(3) hue-rotate(180deg)', // 3: Циановый / Лед (Заливка)
  'blur(4px) contrast(3)',                   // 4: Глоу / Свечение (Структура)
  'sepia(1) saturate(4) hue-rotate(45deg)',  // 5: Золотой / Желтый (Заливка)
  'contrast(2) brightness(0.6)',             // 6: Дарк / Жесткие тени (Структура)
  'sepia(0.8) hue-rotate(90deg) saturate(4)',// 7: Ядовито-зеленый (Заливка)
  'invert(1) contrast(1.5)',                 // 8: Резкий негатив (Структура)
  'sepia(1) hue-rotate(270deg) saturate(3)', // 9: Глубокий фиолетовый (Заливка)
  'brightness(1.5) contrast(1.2)'            // 10: Пересвет / Выгорание (Структура)
];

export default function VideoMixer({ videos, opacities, playbackRates, zoomLevels, pixelLevels, thresholdLevels, filterLevels, positions }) {
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

                  <feComposite in="hardThresh" in2="SourceGraphic" operator="arithmetic" 
                               k1="0" k2={intensity} k3={1 - intensity} k4="0" />
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
        
        // Получаем целое число (индекс фильтра от 0 до 10)
        const filterIdx = filterLevels && filterLevels[index] !== undefined ? Math.round(filterLevels[index]) : 0;
        const safeFilterIdx = Math.max(0, Math.min(cssFilters.length - 1, filterIdx));
        const selectedCssFilter = cssFilters[safeFilterIdx];

        const activeFilters = [];
        if (isPixelated) activeFilters.push(`url(#pixelate-${index})`);
        if (isThresholded) activeFilters.push(`url(#threshold-${index})`);
        // Добавляем выбранный CSS фильтр поверх SVG (если он не 'none')
        if (selectedCssFilter !== 'none') activeFilters.push(selectedCssFilter);
        
        const filterStyle = activeFilters.length > 0 ? activeFilters.join(' ') : 'none';

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
              filter: filterStyle, 
              imageRendering: isPixelated ? 'pixelated' : 'auto', 
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