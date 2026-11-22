import { useState, useEffect, useRef } from 'react';
import { useMidi } from './useMidi';
import VideoMixer from './VideoMixer';

const OPACITY_STEP = 0.025;
const MAX_MASTER_OPACITY = 1.0 - OPACITY_STEP; // 0.975 (на шаг ниже 100%)
const round4 = (n) => Math.round(n * 10000) / 10000;
const randRange = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const PRESET_SLOT_KEYS = [62, 64, 65, 67, 69, 71, 72];
const LOCKED_PRESET_KEY = 72;

// НАЧАЛЬНОЕ СОСТОЯНИЕ (используется при старте и для сброса по клавише 63)
const INITIAL_STATE = {
  rawOpacities: [1, null, null, null, null],
  volumes: [1, 1, 1, 1, 1],
  playbackRates: [1, 1, 1, 1, 1],
  zoomLevels: [1, 1, 1, 1, 1],
  pixelLevels: [0, 0, 0, 0, 0],
  thresholdLevels: [0, 0, 0, 0, 0],
  filterLevels: [0, 0, 0, 0, 0],
  delayLevels: [0, 0, 0, 0, 0],
  maskLevels: [0, 0, 0, 0, 0],
  masterMask: 0,
  positions: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
  zIndices: [0, 1, 2, 3, 4],
  savedOpacities: [1, 1, 1, 1, 1]
};

// ЗАХАРДКОЖЕННЫЙ ПРЕСЕТ НА КЛАВИШЕ 72 (не перезаписывается через Save — замени значения на свои)
const HARDCODED_PRESET_72 = {
  rawOpacities: [0.85, 0.75, 0.6, null, 0.9],
  volumes: [1, 0.8, 0.6, 1, 1],
  playbackRates: [0.75, 1.25, 1.0, 1.0, 1.0],
  zoomLevels: [1.15, 1.4, 1.0, 1.0, 1.0],
  pixelLevels: [0, 16, 0, 0, 0],
  thresholdLevels: [0, 0, 35, 0, 0],
  filterLevels: [3, 6, 1, 0, 0],
  delayLevels: [35, 0, 50, 0, 20],
  maskLevels: [0, 1, 0, 0, 0],
  masterMask: 3,
  positions: [{ x: 0, y: 0 }, { x: -8, y: 5 }, { x: 10, y: -5 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
  zIndices: [10, 11, 12, 9, 20],
  savedOpacities: [0.85, 0.75, 0.6, 1, 0.9]
};

const cloneSnapshot = (s) => ({
  rawOpacities: [...s.rawOpacities],
  volumes: [...s.volumes],
  playbackRates: [...s.playbackRates],
  zoomLevels: [...s.zoomLevels],
  pixelLevels: [...s.pixelLevels],
  thresholdLevels: [...s.thresholdLevels],
  filterLevels: [...s.filterLevels],
  delayLevels: [...s.delayLevels],
  maskLevels: [...s.maskLevels],
  masterMask: s.masterMask,
  positions: s.positions.map(p => ({ x: p.x, y: p.y })),
  zIndices: [...s.zIndices],
  savedOpacities: [...s.savedOpacities]
});

export default function App() {
  const { midiLog, noteOnEvent, knobEvent, stickEvent, heldChannel, heldActionKey, isSaveHeld } = useMidi();
  const [videos, setVideos] = useState([]);
  
  // 5 каналов: 0..3 — видео (49, 51, 54, 56), 4 — титры кинофестиваля (58)
  const [rawOpacities, setRawOpacities] = useState(INITIAL_STATE.rawOpacities);
  const [volumes, setVolumes] = useState(INITIAL_STATE.volumes);
  const [playbackRates, setPlaybackRates] = useState(INITIAL_STATE.playbackRates); 
  const [zoomLevels, setZoomLevels] = useState(INITIAL_STATE.zoomLevels); 
  const [pixelLevels, setPixelLevels] = useState(INITIAL_STATE.pixelLevels); 
  const [thresholdLevels, setThresholdLevels] = useState(INITIAL_STATE.thresholdLevels); 
  const [filterLevels, setFilterLevels] = useState(INITIAL_STATE.filterLevels); 
  const [delayLevels, setDelayLevels] = useState(INITIAL_STATE.delayLevels); 
  const [maskLevels, setMaskLevels] = useState(INITIAL_STATE.maskLevels); 
  const [masterMask, setMasterMask] = useState(INITIAL_STATE.masterMask);
  const [positions, setPositions] = useState(INITIAL_STATE.positions.map(p => ({ ...p }))); 
  const [zIndices, setZIndices] = useState(INITIAL_STATE.zIndices); 

  // Импульс плёночной вспышки + зум-ин (Пэд 39)
  const [flashSignal, setFlashSignal] = useState({ count: 0, intensity: 0 });

  // Слоты пресетов (62, 64, 65, 67, 69, 71 — пользовательские; 72 — захардкоженный)
  const [presetSlots, setPresetSlots] = useState({
    [LOCKED_PRESET_KEY]: cloneSnapshot(HARDCODED_PRESET_72)
  });
  const [presetStatus, setPresetStatus] = useState('init');

  // Визуальные значения прозрачности (0..1) для микшера и дебага
  const opacities = rawOpacities.map(v => (v === null ? 0 : Math.max(0, Math.min(1, v))));

  const activeChannelRef = useRef(null);
  const videosCountRef = useRef(0);
  
  const stickRef = useRef({ x: 0, y: 0 });
  const positionsRef = useRef(INITIAL_STATE.positions.map(p => ({ ...p })));
  const savedOpacitiesRef = useRef([...INITIAL_STATE.savedOpacities]);

  const currentStateRef = useRef(null);
  currentStateRef.current = {
    rawOpacities,
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
    savedOpacities: savedOpacitiesRef.current
  };

  const presetSlotsRef = useRef(presetSlots);
  presetSlotsRef.current = presetSlots;

  const applySnapshot = (snapshot) => {
    const copy = cloneSnapshot(snapshot);
    setRawOpacities(copy.rawOpacities);
    setVolumes(copy.volumes);
    setPlaybackRates(copy.playbackRates);
    setZoomLevels(copy.zoomLevels);
    setPixelLevels(copy.pixelLevels);
    setThresholdLevels(copy.thresholdLevels);
    setFilterLevels(copy.filterLevels);
    setDelayLevels(copy.delayLevels);
    setMaskLevels(copy.maskLevels);
    setMasterMask(copy.masterMask);
    positionsRef.current = copy.positions.map(p => ({ ...p }));
    setPositions(copy.positions);
    setZIndices(copy.zIndices);
    savedOpacitiesRef.current = [...copy.savedOpacities];
  };

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

    const applySmartOpacity = (stepMultiplier) => {
      const deltaVal = deltaStep * stepMultiplier;

      setRawOpacities(prev => {
        if (currentChannel !== null) {
          return prev.map((v, idx) => {
            if (idx !== currentChannel) return v;
            const currentVisual = v === null ? 0 : Math.max(0, v);
            const nextVal = round4(Math.max(0, Math.min(1.0, currentVisual + deltaVal)));
            return nextVal <= 0 ? null : nextVal;
          });
        }

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

    if (knob === 70) applyRelativeEffect(0, 2.0, 0.02, setPlaybackRates);
    if (knob === 71) applyRelativeEffect(0, 100, 1.2, setPixelLevels);
    if (knob === 72) applyRelativeEffect(0, 10, 0.18, setFilterLevels);
    if (knob === 73) applySmartOpacity(OPACITY_STEP);
    if (knob === 74) applyRelativeEffect(0.35, 3.5, 0.035, setZoomLevels);
    if (knob === 75) applyRelativeEffect(0, 100, 1.2, setThresholdLevels);
    if (knob === 76) applyRelativeEffect(0, 100, 1.2, setDelayLevels);
    if (knob === 77) applyMasterLockedVolume(0.02, setVolumes);

  }, [knobEvent]);

  // ОБРАБОТКА ПЭДОВ, МАСОК, МОДИФИКАТОРОВ КАНАЛОВ (66/68/70), СБРОСА (63) И ПРЕСЕТОВ (61 + слоты)
  useEffect(() => {
    if (!noteOnEvent) return;
    const { note, velocity, type, isSaveHeld: saveMode, actionKey, channelIndex } = noteOnEvent;

    // ДЕЙСТВИЯ НАД КАНАЛОМ ПО МОДИФИКАТОРАМ (66 — вытащить наверх; 68, 70 — зарезервированы)
    if (type === 'channelAction') {
      if (actionKey === 66 && channelIndex >= 0 && channelIndex < 4) {
        setZIndices(prev => {
          const maxZ = Math.max(...prev.slice(0, 4));
          return prev.map((z, idx) => {
            if (idx === 4) return maxZ + 2;
            return idx === channelIndex ? maxZ + 1 : z;
          });
        });
      }
      // actionKey === 68 и actionKey === 70 — зарезервированы для будущих манипуляций с каналами
      return;
    }

    if (type === 'noteOn' && velocity > 0) {
      const currentChannel = activeChannelRef.current;

      // КЛАВИША 63: СБРОС ВСЕХ СОСТОЯНИЙ НА ИНИЦИАЛИЗИРОВАННОЕ
      if (note === 63) {
        applySnapshot(INITIAL_STATE);
        setPresetStatus('RESET TO INITIAL');
        return;
      }

      // СЛОТЫ ПРЕСЕТОВ: 62, 64, 65, 67, 69, 71, 72 (72 — только чтение, захардкожен)
      if (PRESET_SLOT_KEYS.includes(note)) {
        if (saveMode) {
          if (note === LOCKED_PRESET_KEY) {
            setPresetStatus(`SLOT ${note} LOCKED (HARDCODED)`);
            return;
          }
          const snapshot = cloneSnapshot(currentStateRef.current);
          setPresetSlots(prev => ({ ...prev, [note]: snapshot }));
          setPresetStatus(`SAVED -> SLOT ${note}`);
        } else {
          const saved = presetSlotsRef.current[note];
          if (saved) {
            applySnapshot(saved);
            setPresetStatus(`LOADED <- SLOT ${note}${note === LOCKED_PRESET_KEY ? ' (LOCKED)' : ''}`);
          } else {
            setPresetStatus(`SLOT ${note} EMPTY`);
          }
        }
        return;
      }

      // НИЖНИЙ РЯД ПЭДОВ (36-38): РАНДОМ ПО КАТЕГОРИЯМ
      // ПЭД 36: РАНДОМ ГЕОМЕТРИИ И КАДРИРОВАНИЯ
      if (note === 36) {
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
        return;
      }

      // ПЭД 37: РАНДОМ ЦВЕТА И ТЕКСТУР
      if (note === 37) {
        const generateFxRecipe = () => {
          const recipe = randInt(0, 3);
          const filter = randInt(0, 10);
          if (recipe === 0) {
            return { filter, pixel: 0, thresh: 0, delay: Math.random() < 0.45 ? randInt(20, 48) : 0 };
          }
          if (recipe === 1) {
            return { filter, pixel: 0, thresh: randInt(22, 58), delay: Math.random() < 0.5 ? randInt(25, 55) : 0 };
          }
          if (recipe === 2) {
            return { filter, pixel: randInt(10, 38), thresh: 0, delay: Math.random() < 0.35 ? randInt(15, 40) : 0 };
          }
          return { filter, pixel: 0, thresh: 0, delay: randInt(45, 88) };
        };

        const targets = currentChannel !== null ? [currentChannel] : [0, 1, 2, 3];
        const nextFx = {};
        targets.forEach(idx => { nextFx[idx] = generateFxRecipe(); });

        setFilterLevels(prev => prev.map((v, idx) => (nextFx[idx] ? nextFx[idx].filter : v)));
        setPixelLevels(prev => prev.map((v, idx) => (nextFx[idx] ? nextFx[idx].pixel : v)));
        setThresholdLevels(prev => prev.map((v, idx) => (nextFx[idx] ? nextFx[idx].thresh : v)));
        setDelayLevels(prev => prev.map((v, idx) => (nextFx[idx] ? nextFx[idx].delay : v)));
        return;
      }

      // ПЭД 38: РАНДОМ МИКСА, СЛОЕВ И РИТМА
      if (note === 38) {
        const speedPalette = [0.35, 0.65, 1.0, 1.0, 1.35, 1.75];

        if (currentChannel !== null) {
          setPlaybackRates(prev => prev.map((r, idx) => (idx === currentChannel ? pickRandom(speedPalette) : r)));
          setRawOpacities(prev => prev.map((op, idx) => {
            if (idx !== currentChannel) return op;
            const steps = randInt(18, 40);
            return round4(steps * OPACITY_STEP);
          }));
        } else {
          const availableCount = videosCountRef.current > 0 ? Math.min(4, videosCountRef.current) : 4;
          const indices = Array.from({ length: availableCount }, (_, i) => i);
          for (let i = indices.length - 1; i > 0; i--) {
            const j = randInt(0, i);
            [indices[i], indices[j]] = [indices[j], indices[i]];
          }

          const activeCount = availableCount === 1 ? 1 : randInt(1, Math.min(3, availableCount));
          const activeSet = new Set(indices.slice(0, activeCount));
          const solidCut = activeCount === 1 || Math.random() < 0.25;

          setRawOpacities(prev => prev.map((op, idx) => {
            if (idx === 4) return op;
            if (!activeSet.has(idx)) return null;
            if (solidCut && idx === indices[0]) return 1;
            const steps = randInt(18, 38);
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
        return;
      }

      // ПЭД 39: КОРОТКАЯ ПЛЁНОЧНАЯ ВСПЫШКА + ЗУМ-ИН АКТИВНЫХ КАНАЛОВ
      if (note === 39) {
        const intensity = Math.max(0.65, Math.min(1, velocity / 127));
        setFlashSignal(prev => ({ count: prev.count + 1, intensity }));
        return;
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
        flashSignal={flashSignal}
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
            {isSaveHeld ? ' | [SAVE 61 HELD]' : ''}
            {heldActionKey !== null ? ` | [MOD ${heldActionKey} HELD]` : ''}
          </p>
          <p style={{ color: '#ffeb3b' }}>
            presets: {PRESET_SLOT_KEYS.map(k => `${k}:${presetSlots[k] ? (k === LOCKED_PRESET_KEY ? 'LOCK' : 'OK') : '--'}`).join(' | ')} ({presetStatus})
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