import React, { useRef, useEffect } from 'react';

// 8 режимов наложения с чередованием: светлый/графический <-> тёмный/контрастный
export const BLEND_MODES = [
  'screen',      // 0: светлый (безопасный на ч/б)
  'multiply',    // 1: тёмный
  'lighten',     // 2: светлый (безопасный на ч/б)
  'darken',      // 3: тёмный
  'difference',  // 4: инверсная графика (безопасный на ч/б)
  'hard-light',  // 5: жёсткий контраст
  'exclusion',   // 6: мягкая инверсия (безопасный на ч/б)
  'overlay'      // 7: контраст
];

const MOVIE_TITLES = [
  "JIM QUEEN",
  "NUNKUI",
  "WHISPERS IN MAY",
  "ZUSAMMEN IST MAN WENIGER GETRENNT",
  "THE UNCERTAINTY PRINCIPLE",
  "THEY COME OUT OF MARGO",
  "BETTER GO MAD IN THE WILD",
  "ON THE SILVER GLOBE",
  "ANCESTRAL VISIONS OF FUTURE",
  "UCHRONIA",
  "BEGOTTEN",
  "SERMON TO THE VOID",
  "HABIBI HUSSEIN",
  "THOSE WHO DO NOT DROWN",
  "FACELESS",
  "THE LONELIEST MAN IN TOWN",
  "LIGHT PILLAR",
  "I LOST SIGHT OF THE LANDSCAPE",
  "SCHWANENSEE",
  "FILMFARSI",
  "HUMAN RESOURCE",
  "DER TOTE WINKEL DER WAHRNEHMUNG",
  "TOXIC",
  "ANDY WARHOL'S FLESH FOR FRANKENSTEIN (IN 3D)",
  "SCHAU MICH NICHT SO BÖSE AN",
  "UNTER EINEM DACH",
  "MAL SEHEN WAS DRAUS WIRD",
  "STARS (1963)",
  "DER TRAUM DES VATERS",
  "AMORE (1990)",
  "EINE ZUFÄLLIGE BEGEGNUNG",
  "BARBARA UND FENJA",
  "GLÜCK ALLEIN MACHT AUCH NICHT WAHNSINNIG WEISE",
  "STICHPUNKT HERZ (1993)",
  "GHOST IN THE CELL",
  "KINKI",
  "LET'S SCARE JESSICA TO DEATH",
  "HOTSPRING SHARKATTACK II",
  "I AM CHOSEN",
  "BLUEPRINT",
  "TUMPENGAN",
  "ANDRO",
  "HAIR(MONY)",
  "OPTISCHE SCHREIE",
  "SUNSET IN PARIS",
  "FATHERS",
  "RADU",
  "DIRTY TALKS",
  "THE APPLE DOESN'T FALL…",
  "SUPER AFGHAN GYM",
  "YOU SAY THAT YOU'RE STAYING AT THE PARTY BECAUSE YOU'RE HAVING FUN",
  "SHOT REVERSE SHOT",
  "DAILY MOVEMENT",
  "FLY ALONG",
  "WE CHOOSE TO BLOOM",
  "FLOW",
  "METANOIA",
  "SNOVA",
  "SWIM SISTERS",
  "WAS WÄRE ÜBRIG?",
  "DROP",
  "SPIRALING OUT",
  "EINE KRANKHEIT WIE EIN GEDICHT",
  "NOAH",
  "NINJA MOTHERF*CKING DESTRUCTION",
  "HOLY ELECTRICITY",
  "FIXING THE RARE: BREEDER A",
  "DIY LOOP"
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

// ИНВЕРТИРОВАННЫЕ ВЕРСИИ КАНАЛЬНЫХ МАСОК (Клавиша 70 + канал)
const invertedClipMasks = [
  'none',
  'none', // 1: Обрабатывается через radial-gradient
  'polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 33% 12%, 67% 12%, 67% 88%, 33% 88%, 33% 12%)',
  'polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 8%, 76% 50%, 50% 92%, 24% 50%, 50% 8%)',
  'polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 8% 28%, 92% 28%, 92% 72%, 8% 72%, 8% 28%)',
  'polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 36% 8%, 64% 8%, 64% 92%, 36% 92%, 36% 8%)',
  'inset(33% 0% 33% 0%)',
  'inset(18% 18% 18% 18%)',
  'polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 42% 10%, 58% 10%, 58% 36%, 73% 36%, 73% 64%, 58% 64%, 58% 90%, 42% 90%, 42% 64%, 27% 64%, 27% 36%, 42% 36%, 42% 10%)'
];

const INVERTED_CIRCLE_MASK_IMAGE = 'radial-gradient(circle at 50% 50%, transparent 24vh, black calc(24vh + 0.5px))';

// SPLIT-3: 8 ИДЕАЛЬНО РОВНЫХ ВЕРТИКАЛЬНЫХ ПОЛОС
const slicer8Combo = [
  'polygon(0% 0%, 0% 100%, 12.5% 100%, 12.5% 0%, 37.5% 0%, 37.5% 100%, 62.5% 100%, 62.5% 0%, 75% 0%, 75% 100%, 87.5% 100%, 87.5% 0%)',
  'polygon(0% 0%, 0% 100%, 25% 100%, 25% 0%, 62.5% 0%, 62.5% 100%, 87.5% 100%, 87.5% 0%)',
  'polygon(12.5% 0%, 12.5% 100%, 37.5% 100%, 37.5% 0%, 50% 0%, 50% 100%, 62.5% 100%, 62.5% 0%, 87.5% 0%, 87.5% 100%, 100% 100%, 100% 0%)',
  'polygon(25% 0%, 25% 100%, 50% 100%, 50% 0%, 62.5% 0%, 62.5% 100%, 75% 100%, 75% 0%, 87.5% 0%, 87.5% 100%, 100% 100%, 100% 0%)'
];

// SPLIT-4: ЧИСТЫЕ ПЕРЕКРЫВАЮЩИЕСЯ КОЛОННЫ
const wideOverlapColumns = [
  'inset(0% 62% 0% 0%)',
  'inset(0% 38% 0% 22%)',
  'inset(0% 22% 0% 38%)',
  'inset(0% 0% 0% 62%)'
];

// Диапазон длины лупа (сек) от силы нажатия пэда 39
const MIN_LOOP_SEC = 0.3;
const MAX_LOOP_SEC = 1;
const MIN_TAP_HOLD_MS = 160;
const velocityToLoopSec = (vel) => {
  const norm = Math.max(0, Math.min(1, (vel - 1) / 126));
  return MIN_LOOP_SEC + norm * (MAX_LOOP_SEC - MIN_LOOP_SEC);
};

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
  invertedMasks = [false, false, false, false, false],
  blendModes = [0, 0, 2, 6, -1],
  masterMask,
  positions,
  zIndices,
  beatRepeat = { active: false, velocity: 0, targetChannel: null }
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
  const opacitiesRef = useRef(opacities);

  // Рефы для Jump-Cut + Beat Repeat (Пэд 39)
  const repeatTargetsRef = useRef([]);
  const repeatDurationRef = useRef(0.25);
  const repeatRafRef = useRef(null);
  const repeatStartTimeRef = useRef(0);
  const releaseTimeoutRef = useRef(null);
  const beatRepeatTargetChannelRef = useRef(null);

  useEffect(() => {
    delayLevelsRef.current = delayLevels;
    playbackRatesRef.current = playbackRates;
    opacitiesRef.current = opacities;
  }, [delayLevels, playbackRates, opacities]);

  useEffect(() => {
    beatRepeatTargetChannelRef.current = beatRepeat.targetChannel;
    if (beatRepeat.velocity > 0) {
      repeatDurationRef.current = velocityToLoopSec(beatRepeat.velocity);
    }
  }, [beatRepeat.velocity, beatRepeat.targetChannel]);

  // JUMP-CUT + BEAT REPEAT (ПЭД 39): прыжок, луп на удержании, возврат с минимальной выдержкой кадра
  useEffect(() => {
    const revertVideos = () => {
      if (repeatTargetsRef.current.length > 0) {
        repeatTargetsRef.current.forEach(({ index, originalTime }) => {
          const videoEl = videoRefs.current[index];
          if (videoEl && Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
            videoEl.currentTime = Math.max(0, Math.min(videoEl.duration - 0.02, originalTime));
          }
        });
        repeatTargetsRef.current = [];
      }
    };

    if (beatRepeat.active) {
      if (releaseTimeoutRef.current) {
        clearTimeout(releaseTimeoutRef.current);
        releaseTimeoutRef.current = null;
      }

      repeatStartTimeRef.current = performance.now();

      const prevOriginals = new Map(
        repeatTargetsRef.current.map(({ index, originalTime }) => [index, originalTime])
      );

      const targetCh = beatRepeatTargetChannelRef.current;
      const targetIndices = (targetCh !== null && targetCh >= 0 && targetCh < 4)
        ? [targetCh]
        : [0, 1, 2, 3].filter(i => videoRefs.current[i] && (opacitiesRef.current[i] || 0) > 0.01);

      const snapshots = [];

      targetIndices.forEach((index) => {
        const videoEl = videoRefs.current[index];
        if (!videoEl || !Number.isFinite(videoEl.duration) || videoEl.duration <= 0.3) return;

        const dur = videoEl.duration;
        const originalTime = prevOriginals.has(index) ? prevOriginals.get(index) : videoEl.currentTime;
        const maxStart = Math.max(0, dur - MAX_LOOP_SEC - 0.05);

        let loopStart = Math.random() * maxStart;
        if (maxStart > 1.5 && Math.abs(loopStart - originalTime) < 0.8) {
          loopStart = (originalTime + maxStart * (0.25 + Math.random() * 0.5)) % maxStart;
        }

        snapshots.push({ index, originalTime, loopStart });
        videoEl.currentTime = loopStart;
      });

      repeatTargetsRef.current = snapshots;

      const tickLoop = () => {
        const loopLen = repeatDurationRef.current;

        repeatTargetsRef.current.forEach(({ index, loopStart }) => {
          const videoEl = videoRefs.current[index];
          if (!videoEl || videoEl.paused || videoEl.seeking) return;

          const loopEnd = Math.min(videoEl.duration || loopStart + loopLen, loopStart + loopLen);
          if (videoEl.currentTime >= loopEnd || videoEl.currentTime < loopStart - 0.05) {
            videoEl.currentTime = loopStart;
          }
        });

        repeatRafRef.current = requestAnimationFrame(tickLoop);
      };

      repeatRafRef.current = requestAnimationFrame(tickLoop);
    } else {
      if (repeatRafRef.current) {
        cancelAnimationFrame(repeatRafRef.current);
        repeatRafRef.current = null;
      }

      if (repeatTargetsRef.current.length > 0) {
        const elapsed = performance.now() - repeatStartTimeRef.current;
        const remaining = Math.max(0, MIN_TAP_HOLD_MS - elapsed);

        if (remaining > 0) {
          releaseTimeoutRef.current = setTimeout(() => {
            releaseTimeoutRef.current = null;
            revertVideos();
          }, remaining);
        } else {
          revertVideos();
        }
      }
    }

    return () => {
      if (repeatRafRef.current) {
        cancelAnimationFrame(repeatRafRef.current);
        repeatRafRef.current = null;
      }
      if (releaseTimeoutRef.current) {
        clearTimeout(releaseTimeoutRef.current);
        releaseTimeoutRef.current = null;
      }
    };
  }, [beatRepeat.active]);

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

      const rawRate = playbackRatesRef.current[4] !== undefined ? playbackRatesRef.current[4] : 1;
      // Замедление 0..1 линейное, ускорение 1..2 разгоняется до 5x
      const effectiveRate = rawRate > 1 ? 1 + (rawRate - 1) * 4 : rawRate;
      const delay = delayLevelsRef.current[4] || 0;
      const baseSpeed = 90;

      const singleListHeight = creditsMainRef.current ? creditsMainRef.current.scrollHeight / 2 : 1800;

      if (rawRate > 0.05 && singleListHeight > 0) {
        creditsPosRef.current = (creditsPosRef.current + (baseSpeed * effectiveRate * dt) / 1000) % singleListHeight;
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

  const getPairBlend = (idxA, idxB, currentIdx, upperBlend = 'screen') => {
    const visA = videos[idxA] && (opacities[idxA] || 0) > 0.01;
    const visB = videos[idxB] && (opacities[idxB] || 0) > 0.01;
    if (!visA || !visB) return 'normal';
    const zA = zIndices ? zIndices[idxA] : idxA;
    const zB = zIndices ? zIndices[idxB] : idxB;
    const lowerIdx = zA <= zB ? idxA : idxB;
    return currentIdx === lowerIdx ? 'normal' : upperBlend;
  };

  // ВЫЧИСЛЕНИЕ МАСКИ (С УЧЁТОМ ИНВЕРСИИ) И РЕЖИМА НАЛОЖЕНИЯ (С УЧЁТОМ КЛАВИШИ 68)
  const getMaskAndBlend = (index) => {
    const individualMaskIdx = maskLevels && maskLevels[index] !== undefined ? maskLevels[index] : 0;
    const isInverted = Boolean(invertedMasks && invertedMasks[index]);

    const useCircleInvertMask = isInverted && individualMaskIdx === 1;
    const channelClip = useCircleInvertMask
      ? 'none'
      : (isInverted ? (invertedClipMasks[individualMaskIdx] || 'none') : (clipMasks[individualMaskIdx] || 'none'));
    const channelMaskImage = useCircleInvertMask ? INVERTED_CIRCLE_MASK_IMAGE : 'none';

    const modeIdx = blendModes && blendModes[index] !== undefined ? blendModes[index] : 0;
    const userBlend = modeIdx < 0 ? 'normal' : (BLEND_MODES[modeIdx % BLEND_MODES.length] || 'screen');

    if (index === 4) {
      return {
        masterClip: 'none',
        channelClip,
        channelMaskImage,
        blend: userBlend
      };
    }

    const dynamicFreeBlend = (visibleVideoIndices.length <= 1 || index === bottomVisibleChannel)
      ? 'normal'
      : userBlend;

    if (!masterMask || masterMask === 0) {
      return {
        masterClip: 'none',
        channelClip,
        channelMaskImage,
        blend: dynamicFreeBlend
      };
    }

    if (masterMask === 1) {
      return {
        masterClip: index < 2 ? 'inset(0% 0% 50% 0%)' : 'inset(50% 0% 0% 0%)',
        channelClip,
        channelMaskImage,
        blend: index < 2 ? getPairBlend(0, 1, index, userBlend) : getPairBlend(2, 3, index, userBlend)
      };
    }

    if (masterMask === 2) {
      return {
        masterClip: index < 2 ? 'inset(0% 50% 0% 0%)' : 'inset(0% 0% 0% 50%)',
        channelClip,
        channelMaskImage,
        blend: index < 2 ? getPairBlend(0, 1, index, userBlend) : getPairBlend(2, 3, index, userBlend)
      };
    }

    if (masterMask === 3) {
      return {
        masterClip: slicer8Combo[index],
        channelClip,
        channelMaskImage,
        blend: index === bottomVisibleChannel ? 'normal' : userBlend
      };
    }

    if (masterMask === 4) {
      return {
        masterClip: wideOverlapColumns[index],
        channelClip,
        channelMaskImage,
        blend: index === bottomVisibleChannel ? 'normal' : userBlend
      };
    }

    if (masterMask === 5) {
      const grid2x2 = [
        'inset(0% 50% 50% 0%)',
        'inset(0% 0% 50% 50%)',
        'inset(50% 50% 0% 0%)',
        'inset(50% 0% 0% 50%)'
      ];
      return { masterClip: grid2x2[index], channelClip, channelMaskImage, blend: 'normal' };
    }

    if (masterMask === 6) {
      if (index < 2) {
        return {
          masterClip: 'circle(24vh at 50% 50%)',
          channelClip,
          channelMaskImage,
          blend: getPairBlend(0, 1, index, userBlend)
        };
      }
      return {
        masterClip: 'inset(0% 0% 0% 0%)',
        channelClip,
        channelMaskImage,
        blend: getPairBlend(2, 3, index, userBlend)
      };
    }

    if (masterMask === 7) {
      const horizontalStrips = [
        'inset(0% 0% 75% 0%)',
        'inset(25% 0% 50% 0%)',
        'inset(50% 0% 25% 0%)',
        'inset(75% 0% 0% 0%)'
      ];
      return { masterClip: horizontalStrips[index], channelClip, channelMaskImage, blend: 'normal' };
    }

    if (masterMask === 8) {
      if (index < 2) {
        return {
          masterClip: 'inset(0% 25% 0% 25%)',
          channelClip,
          channelMaskImage,
          blend: getPairBlend(0, 1, index, userBlend)
        };
      }
      if (index === 2) return { masterClip: 'inset(0% 75% 0% 0%)', channelClip, channelMaskImage, blend: 'normal' };
      return { masterClip: 'inset(0% 0% 0% 75%)', channelClip, channelMaskImage, blend: 'normal' };
    }

    return { masterClip: 'none', channelClip, channelMaskImage, blend: dynamicFreeBlend };
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
        fontFamily: 'inherit', // Подхватит шрифт сайта при интеграции
        fontSize: '2.2rem',
        fontWeight: 'bold',
        letterSpacing: '3px',
        textShadow: '0 2px 14px rgba(0,0,0,0.95)',
        willChange: 'transform'
      }}
    >
      {[...MOVIE_TITLES, ...MOVIE_TITLES].map((title, i) => (
        <div
          key={i}
          style={{
            maxWidth: '65%',
            margin: '0 auto',
            padding: '24px 16px',
            lineHeight: '1.15',
            textWrap: 'balance',
            whiteSpace: 'pre-line',
            overflowWrap: 'break-word'
          }}
        >
          {title}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      backgroundColor: '#050505',
      overflow: 'hidden',
      borderRadius: '24px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.7)'
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
          const { masterClip, channelClip, channelMaskImage, blend: rawBlendMode } = getMaskAndBlend(index);
          const currentBlendMode = opacity >= 0.999 ? 'normal' : rawBlendMode;

          const currentZoom = zoomLevels[index] !== undefined ? zoomLevels[index] : 1;
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
            maskImage: channelMaskImage,
            WebkitMaskImage: channelMaskImage,
            filter: filterStyle,
            imageRendering: isPixelated ? 'pixelated' : 'auto',
            transition: 'scale 0.08s linear, clip-path 0.2s ease-out',
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

      {/* ОТДЕЛЬНЫЙ ВЕРХНИЙ СЛОЙ: CREDITS (КАНАЛ 5, КЛАВИША 58) — ВСЕГДА ПОВЕРХ ВСЕГО */}
      {(() => {
        const index = 4;
        const opacity = opacities[index] !== undefined ? opacities[index] : 0;
        const { channelClip, channelMaskImage, blend: creditsBlendMode } = getMaskAndBlend(index);

        const currentZoom = zoomLevels[index] !== undefined ? zoomLevels[index] : 1;
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
          maskImage: channelMaskImage,
          WebkitMaskImage: channelMaskImage,
          filter: filterStyle,
          imageRendering: isPixelated ? 'pixelated' : 'auto',
          transition: 'scale 0.08s linear, clip-path 0.2s ease-out',
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
            mixBlendMode: creditsBlendMode,
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
        <div style={{ color: '#555', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          scroll down to load media
        </div>
      )}
    </div>
  );
}