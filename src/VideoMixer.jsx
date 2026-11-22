import React, { useRef, useEffect, useState } from 'react';

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

// КУРАТОРСКАЯ ПАЛИТРА КИНО-ФИЛЬТРОВ (11 пресетов)
const cssFilters = [
  'none',                                                                      // 0: Clean Original
  'sepia(0.85) contrast(1.25) brightness(0.95) saturate(1.4)',                 // 1: 35mm Vintage Sepia
  'sepia(0.6) hue-rotate(135deg) saturate(2.6) contrast(1.2)',                 // 2: Wong Kar-wai Emerald
  'sepia(0.7) hue-rotate(285deg) saturate(2.8) contrast(1.25)',                // 3: Neon Giallo (Magenta/Violet)
  'grayscale(1) contrast(1.6) brightness(1.05)',                               // 4: Silver Film Noir
  'sepia(0.9) hue-rotate(345deg) saturate(3.2) contrast(1.15)',                // 5: Tarkovsky Amber / Solaris
  'sepia(0.7) hue-rotate(175deg) saturate(2.5) contrast(1.3)',                 // 6: Cyber Cyan / Night Drive
  'contrast(1.75) saturate(0.45) brightness(0.9)',                             // 7: Bleach Bypass
  'blur(3px) contrast(1.45) saturate(1.8) brightness(1.05)',                   // 8: Dream Sequence / Halation
  'invert(0.92) hue-rotate(180deg) contrast(1.3)',                             // 9: Thermal / X-Ray Negative
  'sepia(1) hue-rotate(65deg) saturate(3.5) contrast(1.35)'                    // 10: Festival Acid Lime
];

// ИНДИВИДУАЛЬНЫЕ МАСКИ КАНАЛОВ (8 штук, двигаются и зумируются вместе с видео)
const clipMasks = [
  'none',                                                                                                    // 0: Выкл
  'circle(24vh at 50% 50%)',                                                                                 // 1 (48): Идеальный круг в центре
  'inset(12% 33% 12% 33%)',                                                                                  // 2 (50): Ровный квадрат в центре
  'polygon(50% 8%, 76% 50%, 50% 92%, 24% 50%)',                                                              // 3 (52): Строгий ромб
  'inset(28% 8% 28% 8%)',                                                                                    // 4 (53): Широкоэкранное каше (Cinemascope)
  'inset(8% 36% 8% 36%)',                                                                                    // 5 (55): Вертикальный монолит
  'polygon(0% 0%, 100% 0%, 100% 33%, 0% 33%, 0% 67%, 100% 67%, 100% 100%, 0% 100%)',                         // 6 (57): Негативное пространство (верх и низ видео, центр пустой)
  'polygon(0% 0%, 0% 100%, 18% 100%, 18% 18%, 82% 18%, 82% 82%, 18% 82%, 18% 100%, 100% 100%, 100% 0%)',     // 7 (59): Прямоугольная рамка с окном
  'polygon(42% 10%, 58% 10%, 58% 36%, 73% 36%, 73% 64%, 58% 64%, 58% 90%, 42% 90%, 42% 64%, 27% 64%, 27% 36%, 42% 36%)' // 8 (60): Швейцарский крест
];

// SPLIT-3: 8 ИДЕАЛЬНО РОВНЫХ ВЕРТИКАЛЬНЫХ ПОЛОС (Без косых срезов)
const slicer8Combo = [
  'polygon(0% 0%, 0% 100%, 12.5% 100%, 12.5% 0%, 37.5% 0%, 37.5% 100%, 62.5% 100%, 62.5% 0%, 75% 0%, 75% 100%, 87.5% 100%, 87.5% 0%)',
  'polygon(0% 0%, 0% 100%, 25% 100%, 25% 0%, 62.5% 0%, 62.5% 100%, 87.5% 100%, 87.5% 0%)',
  'polygon(12.5% 0%, 12.5% 100%, 37.5% 100%, 37.5% 0%, 50% 0%, 50% 100%, 62.5% 100%, 62.5% 0%, 87.5% 0%, 87.5% 100%, 100% 100%, 100% 0%)',
  'polygon(25% 0%, 25% 100%, 50% 100%, 50% 0%, 62.5% 0%, 62.5% 100%, 75% 100%, 75% 0%, 87.5% 0%, 87.5% 100%, 100% 100%, 100% 0%)'
];

// SPLIT-4: ЧИСТЫЕ ПЕРЕКРЫВАЮЩИЕСЯ КОЛОННЫ
const wideOverlapColumns = [
  'inset(0% 62% 0% 0%)',   // Канал A: 0% - 38%
  'inset(0% 38% 0% 22%)',  // Канал B: 22% - 62%
  'inset(0% 22% 0% 38%)',  // Канал C: 38% - 78%
  'inset(0% 0% 0% 62%)'    // Канал D: 62% - 100%
];

export default function VideoMixer({
  videos,
  opacities,
  volumes,
  playbackRates,
  zoomLevels,
  pixelLevels,
  thresholdLevels,
  filterLevels,
  delayLevels,
  maskLevels,
  masterMask,
  positions,
  zIndices,
  flashSignal = { count: 0, intensity: 0 }
}) {
  const videoRefs = useRef([]);
  const ghost1Refs = useRef([]);
  const ghost2Refs = useRef([]);

  const creditsMainRef = useRef(null);
  const creditsGhost1Ref = useRef(null);
  const creditsGhost2Ref = useRef(null);
  const creditsPosRef = useRef(0);
  
  const delayLevelsRef = useRef(delayLevels);
  const playbackRatesRef = useRef(playbackRates);

  // Анимация короткой плёночной вспышки + зум-ин (Пэд 39)
  const [flashLevel, setFlashLevel] = useState(0);
  const flashValRef = useRef(0);
  const flashRafRef = useRef(null);

  const upperLayerBlends = ['screen', 'lighten', 'exclusion', 'screen'];

  useEffect(() => {
    delayLevelsRef.current = delayLevels;
    playbackRatesRef.current = playbackRates;
  }, [delayLevels, playbackRates]);

  // ЗАПУСК И ПЛАВНОЕ ЗАТУХАНИЕ ВСПЫШКИ (160–200 мс, независимо от частоты монитора)
  useEffect(() => {
    if (!flashSignal || flashSignal.count === 0) return;

    flashValRef.current = flashSignal.intensity || 1;
    setFlashLevel(flashValRef.current);

    if (flashRafRef.current) cancelAnimationFrame(flashRafRef.current);

    let lastTime = performance.now();
    const decay = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      flashValRef.current *= Math.exp(-dt * 15);

      if (flashValRef.current < 0.015) {
        flashValRef.current = 0;
        setFlashLevel(0);
        flashRafRef.current = null;
        return;
      }

      setFlashLevel(flashValRef.current);
      flashRafRef.current = requestAnimationFrame(decay);
    };

    flashRafRef.current = requestAnimationFrame(decay);
    return () => {
      if (flashRafRef.current) cancelAnimationFrame(flashRafRef.current);
    };
  }, [flashSignal]);

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

        const offset1 = (delayLevel / 100) * 0.45;
        const offset2 = (delayLevel / 100) * 0.9;

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
      const baseSpeed = 90;

      const singleListHeight = creditsMainRef.current ? creditsMainRef.current.scrollHeight / 2 : 1800;

      if (rate > 0.05 && singleListHeight > 0) {
        creditsPosRef.current = (creditsPosRef.current + (baseSpeed * rate * dt) / 1000) % singleListHeight;
      }

      const mainY = -singleListHeight + creditsPosRef.current;
      if (creditsMainRef.current) {
        creditsMainRef.current.style.transform = `translateY(${mainY}px)`;
      }

      if (delay > 1 && singleListHeight > 0) {
        const lag1 = (delay / 100) * 55;
        const lag2 = (delay / 100) * 110;
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

  // СИНХРОНИЗАЦИЯ АУДИО И СКОРОСТИ ВИДЕО
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

  // Динамическое определение самого нижнего видимого видеоканала для плотной подложки 'normal'
  const visibleVideoIndices = [0, 1, 2, 3].filter(i => videos[i] && (opacities[i] || 0) > 0.01);
  let bottomVisibleChannel = 0;
  if (visibleVideoIndices.length > 0) {
    bottomVisibleChannel = visibleVideoIndices.reduce((lowestIdx, currIdx) => {
      const zLow = zIndices && zIndices[lowestIdx] !== undefined ? zIndices[lowestIdx] : lowestIdx;
      const zCurr = zIndices && zIndices[currIdx] !== undefined ? zIndices[currIdx] : currIdx;
      return zCurr < zLow ? currIdx : lowestIdx;
    }, visibleVideoIndices[0]);
  }

  const hasAnyActiveLayer = visibleVideoIndices.length > 0 || (opacities[4] || 0) > 0.01;

  const getPairBlend = (idxA, idxB, currentIdx, upperBlend = 'screen') => {
    const visA = videos[idxA] && (opacities[idxA] || 0) > 0.01;
    const visB = videos[idxB] && (opacities[idxB] || 0) > 0.01;
    if (!visA || !visB) return 'normal';
    const zA = zIndices ? zIndices[idxA] : idxA;
    const zB = zIndices ? zIndices[idxB] : idxB;
    const lowerIdx = zA <= zB ? idxA : idxB;
    return currentIdx === lowerIdx ? 'normal' : upperBlend;
  };

  // ВЫЧИСЛЕНИЕ МАСКИ (ОТДЕЛЬНО ДЛЯ МАСТЕРА И КАНАЛА) И РЕЖИМА НАЛОЖЕНИЯ
  const getMaskAndBlend = (index) => {
    const individualMaskIdx = maskLevels && maskLevels[index] !== undefined ? maskLevels[index] : 0;
    const individualMask = clipMasks[individualMaskIdx] || 'none';

    if (index === 4) {
      return {
        masterClip: 'none',
        channelClip: individualMask,
        blend: 'normal'
      };
    }

    const dynamicFreeBlend = (visibleVideoIndices.length <= 1 || index === bottomVisibleChannel)
      ? 'normal'
      : upperLayerBlends[index % upperLayerBlends.length];

    if (!masterMask || masterMask === 0) {
      return {
        masterClip: 'none',
        channelClip: individualMask,
        blend: dynamicFreeBlend
      };
    }

    if (masterMask === 1) {
      return {
        masterClip: index < 2 ? 'inset(0% 0% 50% 0%)' : 'inset(50% 0% 0% 0%)',
        channelClip: individualMask,
        blend: index < 2 ? getPairBlend(0, 1, index, 'screen') : getPairBlend(2, 3, index, 'screen')
      };
    }

    if (masterMask === 2) {
      return {
        masterClip: index < 2 ? 'inset(0% 50% 0% 0%)' : 'inset(0% 0% 0% 50%)',
        channelClip: individualMask,
        blend: index < 2 ? getPairBlend(0, 1, index, 'screen') : getPairBlend(2, 3, index, 'screen')
      };
    }

    if (masterMask === 3) {
      return {
        masterClip: slicer8Combo[index],
        channelClip: individualMask,
        blend: index === bottomVisibleChannel ? 'normal' : 'screen'
      };
    }

    if (masterMask === 4) {
      return {
        masterClip: wideOverlapColumns[index],
        channelClip: individualMask,
        blend: index === bottomVisibleChannel ? 'normal' : 'lighten'
      };
    }

    if (masterMask === 5) {
      const grid2x2 = [
        'inset(0% 50% 50% 0%)',
        'inset(0% 0% 50% 50%)',
        'inset(50% 50% 0% 0%)',
        'inset(50% 0% 0% 50%)'
      ];
      return { masterClip: grid2x2[index], channelClip: individualMask, blend: 'normal' };
    }

    if (masterMask === 6) {
      if (index < 2) {
        return {
          masterClip: 'circle(24vh at 50% 50%)',
          channelClip: individualMask,
          blend: getPairBlend(0, 1, index, 'screen')
        };
      }
      return {
        masterClip: 'inset(0% 0% 0% 0%)',
        channelClip: individualMask,
        blend: getPairBlend(2, 3, index, 'lighten')
      };
    }

    if (masterMask === 7) {
      const horizontalStrips = [
        'inset(0% 0% 75% 0%)',
        'inset(25% 0% 50% 0%)',
        'inset(50% 0% 25% 0%)',
        'inset(75% 0% 0% 0%)'
      ];
      return { masterClip: horizontalStrips[index], channelClip: individualMask, blend: 'normal' };
    }

    if (masterMask === 8) {
      if (index < 2) {
        return {
          masterClip: 'inset(0% 25% 0% 25%)',
          channelClip: individualMask,
          blend: getPairBlend(0, 1, index, 'screen')
        };
      }
      if (index === 2) return { masterClip: 'inset(0% 75% 0% 0%)', channelClip: individualMask, blend: 'normal' };
      return { masterClip: 'inset(0% 0% 0% 75%)', channelClip: individualMask, blend: 'normal' };
    }

    return { masterClip: 'none', channelClip: individualMask, blend: dynamicFreeBlend };
  };

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
        textShadow: '0 2px 14px rgba(0,0,0,0.95)',
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
      backgroundColor: '#050505', overflow: 'hidden', borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
    }}>
      
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {[0, 1, 2, 3, 4].map((index) => {
            const rawPixel = pixelLevels && pixelLevels[index] ? pixelLevels[index] : 0;
            const pixelSize = rawPixel > 0 ? 2 + Math.pow(rawPixel / 100, 1.35) * 62 : 2;

            const thresh = thresholdLevels && thresholdLevels[index] ? thresholdLevels[index] : 0;
            const cutoff = (thresh / 100) * 1.05; 
            const slope = 25 + (thresh / 100) * 80;
            const intensity = Math.min(1, thresh / 18); 

            return (
              <React.Fragment key={index}>
                <filter id={`pixelate-${index}`}>
                  <feFlood x="0" y="0" height="1" width="1" />
                  <feComposite x="0" y="0" width={pixelSize} height={pixelSize} />
                  <feTile result="a" />
                  <feComposite in="SourceGraphic" in2="a" operator="in" />
                  <feMorphology operator="dilate" radius={pixelSize / 2} />
                </filter>

                <filter id={`threshold-${index}`} colorInterpolationFilters="sRGB">
                  <feColorMatrix in="SourceGraphic" type="matrix" result="gray" values="
                    0.299 0.587 0.114 0 0
                    0.299 0.587 0.114 0 0
                    0.299 0.587 0.114 0 0
                    0 0 0 1 0" />
                  <feComponentTransfer in="gray" result="hardThresh">
                    <feFuncR type="linear" slope={slope} intercept={-slope * cutoff}/>
                    <feFuncG type="linear" slope={slope} intercept={-slope * cutoff}/>
                    <feFuncB type="linear" slope={slope} intercept={-slope * cutoff}/>
                  </feComponentTransfer>
                  <feComposite in="hardThresh" in2="SourceGraphic" operator="arithmetic" k1="0" k2={intensity} k3={1 - intensity} k4="0" />
                </filter>
              </React.Fragment>
            );
          })}
        </defs>
      </svg>

      {/* НИЖНИЙ ИЗОЛИРОВАННЫЙ СЛОЙ: ВСЕ ВИДЕОКАНАЛЫ (0..3) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, isolation: 'isolate' }}>
        {[0, 1, 2, 3].map((index) => {
          const videoSrc = videos[index];
          if (!videoSrc) return null;

          const opacity = opacities[index] !== undefined ? opacities[index] : 0;
          const isActive = opacity > 0.01;
          const activeFlash = isActive ? flashLevel : 0;

          const { masterClip, channelClip, blend: rawBlendMode } = getMaskAndBlend(index);
          const currentBlendMode = opacity >= 0.999 ? 'normal' : rawBlendMode;

          const baseZoom = zoomLevels[index] !== undefined ? zoomLevels[index] : 1;
          const currentZoom = baseZoom * (1 + activeFlash * 0.12);
          const currentPos = positions[index] !== undefined ? positions[index] : { x: 0, y: 0 };
          const currentZIndex = zIndices && zIndices[index] !== undefined ? zIndices[index] : index;

          const isPixelated = pixelLevels && pixelLevels[index] > 1;
          const isThresholded = thresholdLevels && thresholdLevels[index] > 0.5;
          const currentDelay = delayLevels && delayLevels[index] !== undefined ? delayLevels[index] : 0;

          const filterIdx = filterLevels && filterLevels[index] !== undefined ? Math.round(filterLevels[index]) : 0;
          const safeFilterIdx = Math.max(0, Math.min(cssFilters.length - 1, filterIdx));
          const selectedCssFilter = cssFilters[safeFilterIdx];

          const activeFilters = [];
          if (isPixelated) activeFilters.push(`url(#pixelate-${index})`);
          if (isThresholded) activeFilters.push(`url(#threshold-${index})`);
          if (selectedCssFilter !== 'none') activeFilters.push(selectedCssFilter);
          if (activeFlash > 0.01) {
            activeFilters.push(`brightness(${(1 + activeFlash * 1.15).toFixed(2)}) contrast(${(1 + activeFlash * 0.35).toFixed(2)})`);
          }
          const filterStyle = activeFilters.length > 0 ? activeFilters.join(' ') : 'none';

          const effectiveZIndex = masterMask === 6
            ? (index < 2 ? 20 + (currentZIndex % 10) : currentZIndex % 10)
            : currentZIndex;

          const masterSlotStyle = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            clipPath: masterClip,
            mixBlendMode: currentBlendMode,
            transition: 'clip-path 0.2s ease-out, opacity 0.1s ease-out',
            pointerEvents: 'none',
            zIndex: effectiveZIndex,
            overflow: 'hidden'
          };

          const mediaTransformStyle = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            translate: `${currentPos.x}% ${currentPos.y}%`,
            scale: currentZoom,
            clipPath: channelClip,
            filter: filterStyle,
            imageRendering: isPixelated ? 'pixelated' : 'auto',
            transition: activeFlash > 0.01 ? 'clip-path 0.2s ease-out' : 'scale 0.08s linear, clip-path 0.2s ease-out',
            pointerEvents: 'none'
          };

          const ghost1Filter = `${filterStyle !== 'none' ? filterStyle : ''} hue-rotate(25deg) saturate(1.4)`.trim();
          const ghost2Filter = `${filterStyle !== 'none' ? filterStyle : ''} hue-rotate(-35deg) saturate(1.6)`.trim();

          const ghost1Opacity = opacity * (currentDelay / 100) * 0.65;
          const ghost2Opacity = opacity * (currentDelay / 100) * 0.38;

          return (
            <div key={index} style={{ ...masterSlotStyle, opacity }}>
              <video
                ref={el => videoRefs.current[index] = el}
                src={videoSrc}
                autoPlay
                loop
                style={mediaTransformStyle}
              />

              {currentDelay > 1 && (
                <video
                  ref={el => ghost1Refs.current[index] = el}
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  style={{ ...mediaTransformStyle, filter: ghost1Filter, opacity: ghost1Opacity, mixBlendMode: 'screen' }}
                />
              )}

              {currentDelay > 1 && (
                <video
                  ref={el => ghost2Refs.current[index] = el}
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  style={{ ...mediaTransformStyle, filter: ghost2Filter, opacity: ghost2Opacity, mixBlendMode: 'screen' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* КОРОТКАЯ ТЁПЛАЯ ПЛЁНОЧНАЯ ЗАСВЕТКА ПРИ СКЛЕЙКЕ (ПЭД 39) */}
      {hasAnyActiveLayer && flashLevel > 0.01 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          backgroundColor: `rgba(255, 248, 232, ${(flashLevel * 0.32).toFixed(3)})`,
          mixBlendMode: 'screen',
          pointerEvents: 'none'
        }} />
      )}

      {/* ОТДЕЛЬНЫЙ ВЕРХНИЙ СЛОЙ: CREDITS (КАНАЛ 5, КЛАВИША 58) — ВСЕГДА ПОВЕРХ ВСЕГО */}
      {(() => {
        const index = 4;
        const opacity = opacities[index] !== undefined ? opacities[index] : 0;
        const isActive = opacity > 0.01;
        const activeFlash = isActive ? flashLevel : 0;
        const { channelClip } = getMaskAndBlend(index);

        const baseZoom = zoomLevels[index] !== undefined ? zoomLevels[index] : 1;
        const currentZoom = baseZoom * (1 + activeFlash * 0.1);
        const currentPos = positions[index] !== undefined ? positions[index] : { x: 0, y: 0 };

        const isPixelated = pixelLevels && pixelLevels[index] > 1;
        const isThresholded = thresholdLevels && thresholdLevels[index] > 0.5;
        const currentDelay = delayLevels && delayLevels[index] !== undefined ? delayLevels[index] : 0;

        const filterIdx = filterLevels && filterLevels[index] !== undefined ? Math.round(filterLevels[index]) : 0;
        const safeFilterIdx = Math.max(0, Math.min(cssFilters.length - 1, filterIdx));
        const selectedCssFilter = cssFilters[safeFilterIdx];

        const activeFilters = [];
        if (isPixelated) activeFilters.push(`url(#pixelate-${index})`);
        if (isThresholded) activeFilters.push(`url(#threshold-${index})`);
        if (selectedCssFilter !== 'none') activeFilters.push(selectedCssFilter);
        if (activeFlash > 0.01) {
          activeFilters.push(`brightness(${(1 + activeFlash * 0.7).toFixed(2)})`);
        }
        const filterStyle = activeFilters.length > 0 ? activeFilters.join(' ') : 'none';

        const creditsTransformStyle = {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          translate: `${currentPos.x}% ${currentPos.y}%`,
          scale: currentZoom,
          clipPath: channelClip,
          filter: filterStyle,
          imageRendering: isPixelated ? 'pixelated' : 'auto',
          transition: activeFlash > 0.01 ? 'clip-path 0.2s ease-out' : 'scale 0.08s linear, clip-path 0.2s ease-out',
          pointerEvents: 'none'
        };

        const ghost1Filter = `${filterStyle !== 'none' ? filterStyle : ''} hue-rotate(25deg) saturate(1.4)`.trim();
        const ghost2Filter = `${filterStyle !== 'none' ? filterStyle : ''} hue-rotate(-35deg) saturate(1.6)`.trim();

        const ghost1Opacity = opacity * (currentDelay / 100) * 0.65;
        const ghost2Opacity = opacity * (currentDelay / 100) * 0.38;

        return (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            opacity,
            transition: 'opacity 0.1s ease-out',
            pointerEvents: 'none',
            overflow: 'hidden'
          }}>
            <div style={creditsTransformStyle}>
              {renderCreditsList(creditsMainRef)}
            </div>

            {currentDelay > 1 && (
              <div style={{ ...creditsTransformStyle, filter: ghost1Filter, opacity: ghost1Opacity, mixBlendMode: 'screen' }}>
                {renderCreditsList(creditsGhost1Ref)}
              </div>
            )}

            {currentDelay > 1 && (
              <div style={{ ...creditsTransformStyle, filter: ghost2Filter, opacity: ghost2Opacity, mixBlendMode: 'screen' }}>
                {renderCreditsList(creditsGhost2Ref)}
              </div>
            )}
          </div>
        );
      })()}
      
      {videos.length === 0 && opacities[4] === 0 && (
        <div style={{ color: '#555', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <h2>Загрузите видео (до 4 шт.) или включите титры (Ch 58 + Knob 73)</h2>
        </div>
      )}
    </div>
  );
}