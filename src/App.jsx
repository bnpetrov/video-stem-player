import { useState, useEffect, useRef } from 'react';
import { useMidi } from './useMidi';
import VideoMixer from './VideoMixer';

const OPACITY_STEP = 0.025;
const MAX_MASTER_OPACITY = 1.0 - OPACITY_STEP; // 0.975 (на шаг ниже 100%)
const round4 = (n) => Math.round(n * 10000) / 10000;
const randRange = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function App() {
  const { midiLog, noteOnEvent, knobEvent, stickEvent, heldChannel } = useMidi();
  const [videos, setVideos] = useState([]);
  
  // 5 каналов: 0..3 — видео (49, 51, 54, 56), 4 — титры кинофестиваля (58)
  // null = нулевой канал (мастер его не трогает); число <= 0 = активный канал, уведенный мастером в фейдаут
  const [rawOpacities, setRawOpacities] = useState([1, null, null, null, null]);
  const [volumes, setVolumes] = useState([1, 1, 1, 1, 1]);
  const [playbackRates, setPlaybackRates] = useState([1, 1, 1, 1, 1]); 
  const [zoomLevels, setZoomLevels] = useState([1, 1, 1, 1, 1]); 
  const [pixelLevels, setPixelLevels] = useState([0, 0, 0, 0, 0]); 
  const [thresholdLevels, setThresholdLevels] = useState([0, 0, 0, 0, 0]); 
  const [filterLevels, setFilterLevels] = useState([0, 0, 0, 0, 0]); 
  const [delayLevels, setDelayLevels] = useState([0, 0, 0, 0, 0]); 
  const [maskLevels, setMaskLevels] = useState([0, 0, 0, 0, 0]); 
  const [masterMask, setMasterMask] = useState(0); // 0 = Free Mix, 1..8 = Выставочные сплит-композиции
  const [positions, setPositions] = useState([{x:0, y:0}, {x:0, y:0}, {x:0, y:0}, {x:0, y:0}, {x:0, y:0}]); 
  const [zIndices, setZIndices] = useState([0, 1, 2, 3, 4]); 

  // Визуальные значения прозрачности (0..1) для микшера и дебага
  const opacities = rawOpacities.map(v => (v === null ? 0 : Math.max(0, Math.min(1, v))));

  const activeChannelRef = useRef(null);
  const videosCountRef = useRef(0);
  
  const stickRef = useRef({ x: 0, y: 0 });
  const positionsRef = useRef([{x:0, y:0}, {x:0, y:0}, {x:0, y:0}, {x:0, y:0}, {x:0, y:0}]);
  const savedOpacitiesRef = useRef([1, 1, 1, 1, 1]);

  useEffect(() => {
    activeChannelRef.current = heldChannel;
  }, [heldChannel]);

  useEffect(() => {
    videosCountRef.current = videos.length;
  }, [videos]);

  // ОБРАБОТКА ДЖОЙСТИКА
  useEffect(() => {
    if (!stickEvent) return;
    const { axis, value } = stickEvent;
    stickRef.current[axis] = Math.abs(value) > 0.05 ? value : 0;
  }, [stickEvent]);

  // АНИМАЦИОННЫЙ ЦИКЛ ПЕРЕМЕЩЕНИЯ (60 FPS)
  useEffect(() => {
    let reqId;
    const loop = () => {
      const sx = stickRef.current.x;
      const sy = stickRef.current.y;
      const currentChannel = activeChannelRef.current;

      if ((sx !== 0 || sy !== 0) && currentChannel !== null) {
        const speed = 0.65; 
        let newX = positionsRef.current[currentChannel].x + (sx * speed);
        let newY = positionsRef.current[currentChannel].y - (sy * speed); 

        newX = Math.max(-45, Math.min(45, newX));
        newY = Math.max(-45, Math.min(45, newY));

        positionsRef.current[currentChannel] = { x: newX, y: newY };
        setPositions([...positionsRef.current]);
      }
      reqId = requestAnimationFrame(loop);
    };
    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, []);

  // ОБРАБОТКА КРУТИЛОК (БЕСКОНЕЧНЫЙ RELATIVE РЕЖИМ)
  useEffect(() => {
    if (!knobEvent) return;
    const { knob, value } = knobEvent;
    const currentChannel = activeChannelRef.current;

    let deltaStep = 0;
    if (value > 0 && value < 64) {
      deltaStep = value; 
    } else if (value > 64 && value <= 127) {
      deltaStep = value - 128; 
    }

    if (deltaStep === 0) return;

    const applyRelativeEffect = (minVal, maxVal, stepMultiplier, setter) => {
      const deltaVal = deltaStep * stepMultiplier;
      
      setter(prev => {
        if (currentChannel !== null) {
          return prev.map((v, idx) => 
            idx === currentChannel ? Math.max(minVal, Math.min(maxVal, v + deltaVal)) : v
          );
        } else {
          return prev.map(v => Math.max(minVal, Math.min(maxVal, v + deltaVal)));
        }
      });
    };

    // СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ ПРОЗРАЧНОСТИ (Кноб 73)
    const applySmartOpacity = (stepMultiplier) => {
      const deltaVal = deltaStep * stepMultiplier;

      setRawOpacities(prev => {
        // ПОКАНАЛЬНЫЙ РЕЖИМ: полный диапазон 0..100%
        if (currentChannel !== null) {
          return prev.map((v, idx) => {
            if (idx !== currentChannel) return v;
            const currentVisual = v === null ? 0 : Math.max(0, v);
            const nextVal = round4(Math.max(0, Math.min(1.0, currentVisual + deltaVal)));
            return nextVal <= 0 ? null : nextVal;
          });
        }

        // МАСТЕР-РЕЖИМ: сохраняем баланс, не трогаем null-каналы, упираемся в 97.5% сверху и в полный фейдаут снизу
        const activeValues = prev.filter(v => v !== null);
        if (activeValues.length === 0) return prev;

        const maxActive = Math.max(...activeValues);
        let appliedDelta = deltaVal;

        if (deltaVal > 0) {
          if (maxActive >= MAX_MASTER_OPACITY) return prev;
          appliedDelta = Math.min(deltaVal, MAX_MASTER_OPACITY - maxActive);
        } else {
          if (maxActive <= 0) return prev;
          appliedDelta = Math.max(deltaVal, -maxActive);
        }

        if (appliedDelta === 0) return prev;

        return prev.map(v => (v === null ? null : round4(v + appliedDelta)));
      });
    };

    const applyMasterLockedVolume = (stepMultiplier, setter) => {
      const deltaVal = deltaStep * stepMultiplier;

      setter(prev => {
        if (currentChannel !== null) {
          return prev.map((v, idx) => 
            idx === currentChannel ? Math.max(0, Math.min(1.0, v + deltaVal)) : v
          );
        } else {
          const hitsLimit = prev.some((v, idx) => idx < 4 && ((deltaVal > 0 && v >= 1.0) || (deltaVal < 0 && v <= 0)));
          if (hitsLimit) {
            return prev;
          }
          return prev.map(v => Math.max(0, Math.min(1.0, v + deltaVal)));
        }
      });
    };

    if (knob === 70) applyRelativeEffect(0, 2.0, 0.02, setPlaybackRates);    // Скорость и фриз
    if (knob === 71) applyRelativeEffect(0, 100, 1.2, setPixelLevels);       // Мозаика / Пикселизация
    if (knob === 72) applyRelativeEffect(0, 10, 0.18, setFilterLevels);      // Кино-колористика (11 пресетов)
    if (knob === 73) applySmartOpacity(OPACITY_STEP);                        // Умная непрозрачность с сохранением микса
    if (knob === 74) applyRelativeEffect(0.35, 3.5, 0.035, setZoomLevels);   // Кадрированный зум
    if (knob === 75) applyRelativeEffect(0, 100, 1.2, setThresholdLevels);   // Графический постеризатор (Threshold)
    if (knob === 76) applyRelativeEffect(0, 100, 1.2, setDelayLevels);       // Хроматическое эхо (Delay)
    if (knob === 77) applyMasterLockedVolume(0.02, setVolumes);              // Балансная громкость

  }, [knobEvent]);

  // ОБРАБОТКА ПЭДОВ, МАСОК И РАНДОМ-КЛАВИШ (66, 68, 70)
  useEffect(() => {
    if (!noteOnEvent) return;
    const { note, velocity, type } = noteOnEvent;

    if (type === 'noteOn' && velocity > 0) {
      const currentChannel = activeChannelRef.current;

      // Нижний ряд пэдов (36-39): Вывод канала на верхний план
      if (note >= 36 && note <= 39) {
        const trackIndex = note - 36;
        setZIndices(prev => {
          const maxZ = Math.max(...prev.slice(0, 4));
          return prev.map((z, idx) => {
            if (idx === 4) return maxZ + 2;
            return idx === trackIndex ? maxZ + 1 : z;
          });
        });
      }
      
      // Верхний ряд пэдов (40-43): Toggle Mute с запоминанием последней непрозрачности
      if (note >= 40 && note <= 43) {
        const trackIndex = note - 40;
        setRawOpacities(prev => prev.map((op, idx) => {
          if (idx !== trackIndex) return op;

          if (op !== null && op > 0) {
            savedOpacitiesRef.current[trackIndex] = op;
            return null;
          }

          return savedOpacitiesRef.current[trackIndex] || 1;
        }));
      }

      // Белые клавиши (48..60): Маски каналов (с Shift) или Мастер-пресеты (без Shift)
      const MASK_KEYS = [48, 50, 52, 53, 55, 57, 59, 60];
      if (MASK_KEYS.includes(note)) {
        const maskIndex = MASK_KEYS.indexOf(note) + 1; 

        if (currentChannel !== null) {
          setMaskLevels(prev => prev.map((m, idx) => (idx === currentChannel ? (m === maskIndex ? 0 : maskIndex) : m)));
        } else {
          setMasterMask(prev => (prev === maskIndex ? 0 : maskIndex));
        }
      }

      // КЛАВИША 66: РАНДОМ ГЕОМЕТРИИ И КАДРИРОВАНИЯ (Маски, сплиты, зум, позиция)
      if (note === 66) {
        if (currentChannel !== null) {
          setMaskLevels(prev => prev.map((m, idx) => {
            if (idx !== currentChannel) return m;
            let next = randInt(0, 8);
            if (next === m) next = (m + randInt(1, 7)) % 9;
            return next;
          }));
          setZoomLevels(prev => prev.map((z, idx) => (idx === currentChannel ? round4(randRange(0.8, 2.2)) : z)));
          const centered = Math.random() < 0.3;
          positionsRef.current[currentChannel] = centered
            ? { x: 0, y: 0 }
            : { x: randRange(-18, 18), y: randRange(-18, 18) };
          setPositions([...positionsRef.current]);
        } else {
          const useMasterSplit = Math.random() < 0.65;
          if (useMasterSplit) {
            setMasterMask(prev => {
              let next = randInt(1, 8);
              if (next === prev) next = (prev % 8) + 1;
              return next;
            });
            setMaskLevels(prev => prev.map((m, idx) => (idx < 4 ? 0 : m)));
          } else {
            setMasterMask(0);
            setMaskLevels(prev => prev.map((m, idx) => {
              if (idx >= 4) return m;
              return Math.random() < 0.55 ? randInt(1, 8) : 0;
            }));
          }

          setZoomLevels(prev => prev.map((z, idx) => (idx < 4 ? round4(randRange(0.95, 1.85)) : z)));
          positionsRef.current = positionsRef.current.map((pos, idx) => {
            if (idx >= 4) return pos;
            return Math.random() < 0.45
              ? { x: 0, y: 0 }
              : { x: randRange(-14, 14), y: randRange(-14, 14) };
          });
          setPositions([...positionsRef.current]);
        }
      }

      // КЛАВИША 68: РАНДОМ ЦВЕТА И ТЕКСТУР (Кино-фильтры, порог, пикселизация, эхо)
      if (note === 68) {
        const generateFxRecipe = () => {
          const recipe = randInt(0, 3);
          const filter = randInt(0, 10);
          if (recipe === 0) {
            // Чистая кино-колористика + легкий шлейф
            return { filter, pixel: 0, thresh: 0, delay: Math.random() < 0.45 ? randInt(20, 48) : 0 };
          }
          if (recipe === 1) {
            // Графический постеризатор в читаемом диапазоне
            return { filter, pixel: 0, thresh: randInt(22, 58), delay: Math.random() < 0.5 ? randInt(25, 55) : 0 };
          }
          if (recipe === 2) {
            // Ретро-мозаика без перегруза
            return { filter, pixel: randInt(10, 38), thresh: 0, delay: Math.random() < 0.35 ? randInt(15, 40) : 0 };
          }
          // Хроматический Delay-шлейф
          return { filter, pixel: 0, thresh: 0, delay: randInt(45, 88) };
        };

        const targets = currentChannel !== null ? [currentChannel] : [0, 1, 2, 3];
        const nextFx = {};
        targets.forEach(idx => { nextFx[idx] = generateFxRecipe(); });

        setFilterLevels(prev => prev.map((v, idx) => (nextFx[idx] ? nextFx[idx].filter : v)));
        setPixelLevels(prev => prev.map((v, idx) => (nextFx[idx] ? nextFx[idx].pixel : v)));
        setThresholdLevels(prev => prev.map((v, idx) => (nextFx[idx] ? nextFx[idx].thresh : v)));
        setDelayLevels(prev => prev.map((v, idx) => (nextFx[idx] ? nextFx[idx].delay : v)));
      }

      // КЛАВИША 70: РАНДОМ МИКСА, СЛОЕВ И РИТМА (Прозрачность, z-order, скорость)
      if (note === 70) {
        const speedPalette = [0.35, 0.65, 1.0, 1.0, 1.35, 1.75];

        if (currentChannel !== null) {
          setPlaybackRates(prev => prev.map((r, idx) => (idx === currentChannel ? pickRandom(speedPalette) : r)));
          setRawOpacities(prev => prev.map((op, idx) => {
            if (idx !== currentChannel) return op;
            const steps = randInt(18, 40); // 45% .. 100%
            return round4(steps * OPACITY_STEP);
          }));
        } else {
          const availableCount = videosCountRef.current > 0 ? Math.min(4, videosCountRef.current) : 4;
          const indices = Array.from({ length: availableCount }, (_, i) => i);
          // Перемешиваем каналы
          for (let i = indices.length - 1; i > 0; i--) {
            const j = randInt(0, i);
            [indices[i], indices[j]] = [indices[j], indices[i]];
          }

          const activeCount = availableCount === 1 ? 1 : randInt(1, Math.min(3, availableCount));
          const activeSet = new Set(indices.slice(0, activeCount));
          const solidCut = activeCount === 1 || Math.random() < 0.25;

          setRawOpacities(prev => prev.map((op, idx) => {
            if (idx === 4) return op; // Титры не трогаем
            if (!activeSet.has(idx)) return null;
            if (solidCut && idx === indices[0]) return 1;
            const steps = randInt(18, 38); // 45% .. 95% (чтобы работали режимы наложения)
            return round4(steps * OPACITY_STEP);
          }));

          setZIndices(prev => {
            const baseZ = Math.max(...prev.slice(0, 4)) + 1;
            const orderMap = {};
            indices.forEach((chIdx, pos) => { orderMap[chIdx] = baseZ + pos; });
            return prev.map((z, idx) => {
              if (idx === 4) return baseZ + 10;
              return orderMap[idx] !== undefined ? orderMap[idx] : z;
            });
          });

          setPlaybackRates(prev => prev.map((r, idx) => (idx < 4 ? pickRandom(speedPalette) : r)));
        }
      }
    }
  }, [noteOnEvent]);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files).slice(0, 4);
    setVideos(files.map(file => URL.createObjectURL(file)));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px', letterSpacing: '2px' }}>LAB52</h1>
      
      <VideoMixer 
        videos={videos} 
        opacities={opacities}
        volumes={volumes}
        playbackRates={playbackRates}
        zoomLevels={zoomLevels}
        pixelLevels={pixelLevels}
        thresholdLevels={thresholdLevels}
        filterLevels={filterLevels}
        delayLevels={delayLevels}
        maskLevels={maskLevels}
        masterMask={masterMask}
        positions={positions}
        zIndices={zIndices}
      />

      <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
        <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px', flex: 1 }}>
          <h3>media</h3>
          <input type="file" accept="video/*" multiple onChange={handleFileUpload} />
        </div>

        <div style={{ padding: '20px', background: '#222', color: '#0f0', borderRadius: '8px', fontFamily: 'monospace', flex: 1.5 }}>
          <h3>inf (debug)</h3>
          
          <p style={{ color: '#ff9800', fontWeight: 'bold' }}>
            target mode: {heldChannel !== null ? (heldChannel === 4 ? 'TRACK 5 (CREDITS)' : `TRACK ${heldChannel + 1} ONLY`) : 'MASTER ALL'}
          </p>
          <hr style={{ borderColor: '#444' }}/>
          <p style={{ color: '#4caf50' }}>
            opacity (73 / pads): {opacities.map((op, i) => `T${i + 1}: ${Math.round(op * 100)}%`).join(' | ')}
          </p>
          <p style={{ color: '#ff5722' }}>
            volume (77): {volumes.map((v, i) => `T${i + 1}: ${Math.round(v * 100)}%`).join(' | ')}
          </p>
          <p style={{ color: '#03a9f4' }}>
            speed (70): {playbackRates.map((r, i) => `T${i + 1}: ${r.toFixed(2)}x`).join(' | ')}
          </p>
          <p style={{ color: '#e91e63' }}>
            zoom (74): {zoomLevels.map((z, i) => `T${i + 1}: ${z.toFixed(2)}x`).join(' | ')}
          </p>
          <p style={{ color: '#ffeb3b' }}>
            pos (xy): {positions.map((p, i) => `T${i + 1}: [${Math.round(p.x)}, ${Math.round(p.y)}]`).join(' | ')}
          </p>
          <p style={{ color: '#fff' }}>
            z-order: {zIndices.map((z, i) => `T${i + 1}: ${z}`).join(' | ')}
          </p>
          <p style={{ color: '#00e676' }}>
            ch mask: {maskLevels.map((m, i) => `T${i + 1}: ${m === 0 ? 'off' : 'M-' + m}`).join(' | ')}
          </p>
          <p style={{ color: '#ff00ff', fontWeight: 'bold' }}>
            master preset: {masterMask === 0 ? 'OFF (Free Mix)' : `SPLIT-${masterMask}`}
          </p>
          
          <hr style={{ borderColor: '#444' }}/>
          <p style={{ color: '#9c27b0' }}>
            pixel (71): {pixelLevels.map((p, i) => `T${i + 1}: ${Math.round(p)}`).join(' | ')}
          </p>
          <p style={{ color: '#00bcd4' }}>
            thresh (75): {thresholdLevels.map((t, i) => `T${i + 1}: ${Math.round(t)}`).join(' | ')}
          </p>
          <p style={{ color: '#ff5722' }}>
            filter (72): {filterLevels.map((f, i) => `T${i + 1}: fx-${Math.round(f)}`).join(' | ')}
          </p>
          <p style={{ color: '#8bc34a' }}>
            delay (76): {delayLevels.map((d, i) => `T${i + 1}: ${Math.round(d)}`).join(' | ')}
          </p>

          <hr style={{ borderColor: '#444' }}/>
          {midiLog ? (
            <p style={{ color: '#ccc' }}>MIDI IN: Cmd {midiLog.command} | Note {midiLog.note} | Vel {midiLog.velocity}</p>
          ) : (
            <p style={{ color: '#777' }}>waiting MIDI...</p>
          )}
        </div>
      </div>
    </div>
  );
}