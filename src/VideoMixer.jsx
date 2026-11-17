import React, { useRef, useEffect } from 'react';

const MOVIE_TITLES = [
  "1. THE NEON HORIZON",
  "2. MIDNIGHT PROTOCOL",
  "3. ECHOES OF TOMORROW",
  "4. SOLARIS DESCENT",
  "5. QUANTUM PARADOX",
  "6. NEUROMANCER'S DREAM",
  "7. CYBERDYNE SYSTEMS",
  "8. BLADE RUNNER'S LEGACY",
  "9. GHOST IN THE MACHINE",
  "10. MATRIX RELOADED",
  "11. VOID WALKER",
  "12. STARLIGHT EXPRESS",
  "13. EVENT HORIZON",
  "14. DARK STAR",
  "15. INTERSTELLAR OVERDRIVE",
  "16. GALACTIC REBELLION",
  "17. ASTEROID MINERS",
  "18. SUPERNOVA SERENADE",
  "19. BLACK HOLE SUN",
  "20. NEBULA NAVIGATORS",
  "21. COSMIC DRIFTERS",
  "22. TIME PARADOX",
  "23. CHRONOS ENGINE",
  "24. FUTURE PAST",
  "25. RETROGRADE",
  "26. SYNTHWAVE NIGHTS",
  "27. ARCADE CHAMPION",
  "28. PIXEL WARRIORS",
  "29. DIGITAL FRONTIER",
  "30. VIRTUAL INSANITY"
];

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

const clipMasks = [
  'none', 
  'circle(50% at 50% 50%)', 
  'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', 
  'polygon(0 0, 25% 0, 25% 100%, 0% 100%, 50% 0, 75% 0, 75% 100%, 50% 100%)', 
  'polygon(0 10%, 100% 10%, 100% 30%, 0 30%, 0 50%, 100% 50%, 100% 70%, 0 70%, 0 90%, 100% 90%, 100% 100%, 0 100%)', 
  'polygon(10% 0, 20% 0, 20% 100%, 10% 100%, 30% 0, 40% 0, 40% 100%, 30% 100%, 50% 0, 60% 0, 60% 100%, 50% 100%, 70% 0, 80% 0, 80% 100%, 70% 100%, 90% 0, 100% 0, 100% 100%, 90% 100%)', 
  'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)', 
  'polygon(0 0, 0 100%, 20% 100%, 20% 20%, 80% 20%, 80% 80%, 20% 80%, 20% 100%, 100% 100%, 100% 0)', 
  'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' 
];

export default function VideoMixer({ videos, opacities, volumes, playbackRates, zoomLevels, pixelLevels, thresholdLevels, filterLevels, delayLevels, maskLevels, positions, zIndices }) {
  const videoRefs = useRef([]);
  const ghost1Refs = useRef([]);
  const ghost2Refs = useRef([]);

  // Рефы для 5-го канала (Титры)
  const creditsMainRef = useRef(null);
  const creditsGhost1Ref = useRef(null);
  const creditsGhost2Ref = useRef(null);
  const creditsPosRef = useRef(0);
  
  const delayLevelsRef = useRef(delayLevels);
  const playbackRatesRef = useRef(playbackRates);
  const blendModes = ['normal', 'screen', 'lighten', 'luminosity', 'screen'];

  useEffect(() => {
    delayLevelsRef.current = delayLevels;
    playbackRatesRef.current = playbackRates;
  }, [delayLevels, playbackRates]);

  // ГЛАВНЫЙ ИНТЕРВАЛ ВРЕМЕНИ ДЛЯ DELAY ВИДЕО (ЭХО)
  useEffect(() => {
    const interval = setInterval(() => {
      videos.forEach((_, index) => {
        const delayLevel = delayLevelsRef.current[index] || 0;
        if (delayLevel <= 1) return; 

        const main = videoRefs.current[index];
        const g1 = ghost1Refs.current[index];
        const g2 = ghost2Refs.current[index];

        if (!main) return;

        const offset1 = (delayLevel / 100) * 0.5;
        const offset2 = (delayLevel / 100) * 1.0;

        const syncGhostTime = (ghost, offset) => {
          if (!ghost) return;
          if (ghost.paused && !main.paused) ghost.play().catch(()=>{});
          if (!ghost.paused && main.paused) ghost.pause();
          if (ghost.playbackRate !== main.playbackRate) ghost.playbackRate = main.playbackRate;

          if (main.duration > 0) {
            let targetTime = main.currentTime - offset;
            while (targetTime < 0) targetTime += main.duration;
            while (targetTime > main.duration) targetTime -= main.duration;

            let diff = Math.abs(ghost.currentTime - targetTime);
            if (diff > 0.15 && diff < (main.duration - 0.2)) {
              ghost.currentTime = targetTime;
            }
          }
        };

        syncGhostTime(g1, offset1);
        syncGhostTime(g2, offset2);
      });
    }, 100); 

    return () => clearInterval(interval);
  }, [videos]);

  // АНИМАЦИЯ ТИТРОВ СВЕРХУ ВНИЗ (60 FPS)
  useEffect(() => {
    let reqId;
    let lastTime = performance.now();

    const animateCredits = (now) => {
      const dt = Math.min(now - lastTime, 100);
      lastTime = now;

      const rate = playbackRatesRef.current[4] !== undefined ? playbackRatesRef.current[4] : 1;
      const delay = delayLevelsRef.current[4] || 0;
      const baseSpeed = 90; // Пикселей в секунду при скорости 1.0x

      const singleListHeight = creditsMainRef.current ? creditsMainRef.current.scrollHeight / 2 : 1800;

      if (rate > 0.05 && singleListHeight > 0) {
        creditsPosRef.current = (creditsPosRef.current + (baseSpeed * rate * dt) / 1000) % singleListHeight;
      }

      // Двигаем сверху вниз: из -singleListHeight к 0
      const mainY = -singleListHeight + creditsPosRef.current;
      if (creditsMainRef.current) {
        creditsMainRef.current.style.transform = `translateY(${mainY}px)`;
      }

      if (delay > 1 && singleListHeight > 0) {
        const lag1 = (delay / 100) * 60;
        const lag2 = (delay / 100) * 120;
        const pos1 = (creditsPosRef.current - lag1 + singleListHeight) % singleListHeight;
        const pos2 = (creditsPosRef.current - lag2 + singleListHeight) % singleListHeight;

        if (creditsGhost1Ref.current) {
          creditsGhost1Ref.current.style.transform = `translateY(${-singleListHeight + pos1}px)`;
        }
        if (creditsGhost2Ref.current) {
          creditsGhost2Ref.current.style.transform = `translateY(${-singleListHeight + pos2}px)`;
        }
      }

      reqId = requestAnimationFrame(animateCredits);
    };

    reqId = requestAnimationFrame(animateCredits);
    return () => cancelAnimationFrame(reqId);
  }, []);

  // СИНХРОНИЗАЦИЯ ВИДЕО
  useEffect(() => {
    videos.forEach((_, index) => {
      if (videoRefs.current[index]) {
        const videoEl = videoRefs.current[index];
        
        const audioVol = volumes && volumes[index] !== undefined ? volumes[index] : 1;
        videoEl.volume = Math.max(0, Math.min(1, audioVol));

        const rate = playbackRates[index] !== undefined ? playbackRates[index] : 1;
        
        if (rate <= 0.05) {
          if (!videoEl.paused) videoEl.pause();
        } else {
          const safeRate = Math.max(0.1, Math.min(2.0, rate));
          try {
            videoEl.playbackRate = safeRate;
            const isVisible = opacities[index] !== undefined && opacities[index] > 0;
            const isAudible = audioVol > 0;
            
            if (videoEl.paused && (isVisible || isAudible)) {
              videoEl.play().catch(() => {}); 
            }
          } catch (err) {
            console.warn('Playback rate guard prevented crash:', err);
          }
        }
      }
    });
  }, [opacities, volumes, videos, playbackRates]);

  const activeCount = opacities.filter(op => op > 0).length;

  const renderCreditsList = (ref) => (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        textAlign: 'center',
        color: '#ffffff',
        fontFamily: 'monospace, sans-serif',
        fontSize: '2.2rem',
        fontWeight: 'bold',
        letterSpacing: '3px',
        textShadow: '0 2px 12px rgba(0,0,0,0.9)',
        willChange: 'transform'
      }}
    >
      {[...MOVIE_TITLES, ...MOVIE_TITLES].map((title, i) => (
        <div key={i} style={{ padding: '18px 0' }}>
          {title}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      position: 'relative', width: '100%', height: '60vh',
      backgroundColor: '#000', overflow: 'hidden', borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    }}>
      
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {[0, 1, 2, 3, 4].map((index) => {
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

      {[0, 1, 2, 3, 4].map((index) => {
        const isCredits = index === 4;
        const videoSrc = videos[index];

        if (!isCredits && !videoSrc) return null;

        const opacity = opacities[index] !== undefined ? opacities[index] : 0;
        const currentBlendMode = activeCount <= 1 ? 'normal' : blendModes[index];
        const currentZoom = zoomLevels[index] !== undefined ? zoomLevels[index] : 1;
        const currentPos = positions[index] !== undefined ? positions[index] : {x:0, y:0};
        const currentZIndex = zIndices && zIndices[index] !== undefined ? zIndices[index] : index;
        
        const isPixelated = pixelLevels && pixelLevels[index] > 1;
        const isThresholded = thresholdLevels && thresholdLevels[index] > 0.1; 
        const currentDelay = delayLevels && delayLevels[index] !== undefined ? delayLevels[index] : 0;
        
        const filterIdx = filterLevels && filterLevels[index] !== undefined ? Math.round(filterLevels[index]) : 0;
        const safeFilterIdx = Math.max(0, Math.min(cssFilters.length - 1, filterIdx));
        const selectedCssFilter = cssFilters[safeFilterIdx];

        const maskIdx = maskLevels && maskLevels[index] !== undefined ? maskLevels[index] : 0;
        const selectedMask = clipMasks[maskIdx] || 'none';

        const activeFilters = [];
        if (isPixelated) activeFilters.push(`url(#pixelate-${index})`);
        if (isThresholded) activeFilters.push(`url(#threshold-${index})`);
        if (selectedCssFilter !== 'none') activeFilters.push(selectedCssFilter);
        const filterStyle = activeFilters.length > 0 ? activeFilters.join(' ') : 'none';

        const baseStyle = {
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          objectFit: 'cover',
          translate: `${currentPos.x}% ${currentPos.y}%`,
          scale: currentZoom,
          filter: filterStyle, 
          imageRendering: isPixelated ? 'pixelated' : 'auto',
          clipPath: selectedMask, 
          transition: 'opacity 0.1s ease-out, scale 0.1s linear, clip-path 0.2s ease-out', 
          pointerEvents: 'none',
          zIndex: currentZIndex 
        };

        const ghost1Opacity = opacity * (currentDelay / 100) * 0.6;
        const ghost2Opacity = opacity * (currentDelay / 100) * 0.3;

        if (isCredits) {
          return (
            <React.Fragment key={index}>
              <div style={{ ...baseStyle, overflow: 'hidden', opacity: opacity, mixBlendMode: currentBlendMode }}>
                {renderCreditsList(creditsMainRef)}
              </div>
              
              {currentDelay > 1 && (
                <div style={{ ...baseStyle, overflow: 'hidden', opacity: ghost1Opacity, mixBlendMode: 'screen' }}>
                  {renderCreditsList(creditsGhost1Ref)}
                </div>
              )}

              {currentDelay > 1 && (
                <div style={{ ...baseStyle, overflow: 'hidden', opacity: ghost2Opacity, mixBlendMode: 'screen' }}>
                  {renderCreditsList(creditsGhost2Ref)}
                </div>
              )}
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={index}>
            <video
              ref={el => videoRefs.current[index] = el}
              src={videoSrc}
              autoPlay
              loop
              style={{ ...baseStyle, opacity: opacity, mixBlendMode: currentBlendMode }}
            />
            
            {currentDelay > 1 && (
              <video
                ref={el => ghost1Refs.current[index] = el}
                src={videoSrc}
                autoPlay
                loop
                muted 
                style={{ ...baseStyle, opacity: ghost1Opacity, mixBlendMode: 'screen' }}
              />
            )}

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
      
      {videos.length === 0 && opacities[4] === 0 && (
        <div style={{ color: '#555', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <h2>Загрузите видео (до 4 шт.) или включите титры (Ch 49 + Knob 73)</h2>
        </div>
      )}
    </div>
  );
}