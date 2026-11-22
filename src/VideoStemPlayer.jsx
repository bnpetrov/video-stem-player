import { useState, useEffect, useRef } from 'react';
import { useMidi } from './useMidi';
import VideoMixer, { BLEND_MODES } from './VideoMixer';

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
  invertedMasks: [false, false, false, false, false],
  blendModes: [0, 0, 2, 6, -1], // -1 для титров = normal, 0..7 = индексы BLEND_MODES
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
  invertedMasks: [false, false, false, false, false],
  blendModes: [0, 0, 2, 6, -1],
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
  invertedMasks: s.invertedMasks ? [...s.invertedMasks] : [false, false, false, false, false],
  blendModes: s.blendModes ? [...s.blendModes] : [0, 0, 2, 6, -1],
  masterMask: s.masterMask,
  positions: s.positions.map(p => ({ x: p.x, y: p.y })),
  zIndices: [...s.zIndices],
  savedOpacities: [...s.savedOpacities]
});

export default function VideoStemPlayer() {
  const { midiLog, noteOnEvent, knobEvent, stickEvent, heldChannel, heldActionKey, isSaveHeld, heldPads } = useMidi();
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
  const [invertedMasks, setInvertedMasks] = useState(INITIAL_STATE.invertedMasks);
  const [blendModes, setBlendModes] = useState(INITIAL_STATE.blendModes);
  const [masterMask, setMasterMask] = useState(INITIAL_STATE.masterMask);
  const [positions, setPositions] = useState(INITIAL_STATE.positions.map(p => ({ ...p }))); 
  const [zIndices, setZIndices] = useState(INITIAL_STATE.zIndices); 

  // Слоты пресетов (62, 64, 65, 67, 69, 71 — пользовательские; 72 — захардкоженный)
  const [presetSlots, setPresetSlots] = useState({
    [LOCKED_PRESET_KEY]: cloneSnapshot(HARDCODED_PRESET_72)
  });
  const [presetStatus, setPresetStatus] = useState('init');

  // Пэд 39: Jump-Cut + Beat Repeat (сила нажатия / aftertouch задаёт длину лупа 0.3–1.0 сек)
  const pad39Velocity = heldPads[39] || 0;
  const beatRepeat = {
    active: pad39Velocity > 0,
    velocity: pad39Velocity,
    targetChannel: heldChannel
  };
  const beatRepeatMs = pad39Velocity > 0
    ? Math.round((0.3 + ((pad39Velocity - 1) / 126) * 0.7) * 1000)
    : 0;

  // Визуальные значения прозрачности (0..1) для микшера и дебага
  const opacities = rawOpacities.map(v => (v === null ? 0 : Math.max(0, Math.min(1, v))));

  // Определяем нижний видимый видеоканал (подложка — её режим наложения менять нельзя)
  const visibleVideoIndices = [0, 1, 2, 3].filter(i => videos[i] && (opacities[i] || 0) > 0.01);
  let bottomVisibleChannel = null;
  if (visibleVideoIndices.length > 0) {
    bottomVisibleChannel = visibleVideoIndices.reduce((lowestIdx, currIdx) => {
      const zLow = zIndices[lowestIdx] !== undefined ? zIndices[lowestIdx] : lowestIdx;
      const zCurr = zIndices[currIdx] !== undefined ? zIndices[currIdx] : currIdx;
      return zCurr < zLow ? currIdx : lowestIdx;
    }, visibleVideoIndices[0]);
  }

  const activeChannelRef = useRef(null);
  const videosCountRef = useRef(0);
  const bottomVisibleChannelRef = useRef(null);
  bottomVisibleChannelRef.current = bottomVisibleChannel;
  
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
    invertedMasks,
    blendModes,
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
    setInvertedMasks(copy.invertedMasks);
    setBlendModes(copy.blendModes);
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

    // ДЕЙСТВИЯ НАД КАНАЛОМ ПО МОДИФИКАТОРАМ (66 — наверх, 68 — режим наложения, 70 — инверсия маски)
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

      if (actionKey === 68 && channelIndex >= 0 && channelIndex <= 4) {
        if (channelIndex < 4 && channelIndex === bottomVisibleChannelRef.current) {
          return;
        }
        setBlendModes(prev => prev.map((modeIdx, idx) => {
          if (idx !== channelIndex) return modeIdx;
          if (idx === 4) {
            return modeIdx >= BLEND_MODES.length - 1 ? -1 : modeIdx + 1;
          }
          return (modeIdx + 1) % BLEND_MODES.length;
        }));
      }

      if (actionKey === 70 && channelIndex >= 0 && channelIndex <= 4) {
        setInvertedMasks(prev => prev.map((inv, idx) => (idx === channelIndex ? !inv : inv)));
      }
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

  const STAGE_WIDTH = 'min(92vw, calc(88vh * 4 / 3))';

  return (
    <div style={{ fontFamily: 'inherit', width: '100%', margin: 0, padding: 0 }}>
      {/* ПЕРВЫЙ ЭКРАН: ЧЁРНЫЙ ФОН НА ВСЮ ВИДИМУЮ ОБЛАСТЬ + ХОЛСТ 4:3 ПО ЦЕНТРУ */}
      <section style={{
        width: '100%',
        height: '100vh',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: STAGE_WIDTH,
          maxWidth: '100%',
          aspectRatio: '4 / 3'
        }}>
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
            invertedMasks={invertedMasks}
            blendModes={blendModes}
            masterMask={masterMask}
            positions={positions}
            zIndices={zIndices}
            beatRepeat={beatRepeat}
          />
        </div>
      </section>

      {/* НИЖНЯЯ СЕКЦИЯ ЗА ПРЕДЕЛАМИ ЭКРАНА: БЕЛЫЙ ФОН */}
      <section style={{
        width: '100%',
        backgroundColor: '#ffffff',
        color: '#000000',
        padding: '24px 24px 64px',
        boxSizing: 'border-box'
      }}>
        {/* 1. ЗАГРУЗКА ВИДЕО — ВЫРОВНЕНА ПО ПРАВОМУ КРАЮ ВИДЕО */}
        <div style={{
          width: STAGE_WIDTH,
          maxWidth: '100%',
          margin: '0 auto 48px',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <label style={{ cursor: 'pointer', color: '#000000', fontSize: '0.9rem', letterSpacing: '0.04em', userSelect: 'none', padding: 0 }}>
            [ <span style={{ textDecoration: 'underline', textUnderlineOffset: '4px' }}>upload media</span> ]
            <input type="file" accept="video/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {/* 2. DEBUG PANEL — В САМОМ НИЗУ (СКРЫТЬ, КОГДА ВСЁ БУДЕТ ГОТОВО) */}
        <div style={{
          width: STAGE_WIDTH,
          maxWidth: '100%',
          margin: '0 auto',
          padding: '20px 24px',
          backgroundColor: '#ffffff',
          color: '#000000',
          border: '1px solid #000000',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          lineHeight: '1.65',
          textAlign: 'left',
          boxSizing: 'border-box'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: '8px',
            borderBottom: '1px solid #000000',
            paddingBottom: '10px',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            <span style={{ fontWeight: 'bold' }}>inf (debug)</span>
            <span style={{ fontWeight: 'bold' }}>
              {heldChannel !== null ? (heldChannel === 4 ? 'TRACK 5 (CREDITS)' : `TRACK ${heldChannel + 1} ONLY`) : 'MASTER ALL'}
              {isSaveHeld ? ' / SAVE 61' : ''}
              {heldActionKey !== null ? ` / MOD ${heldActionKey}` : ''}
              {beatRepeat.active ? ` / LOOP 39: ${beatRepeatMs}ms` : ''}
            </span>
          </div>

          <p style={{ margin: '0 0 10px 0' }}>
            <strong>presets:</strong> {PRESET_SLOT_KEYS.map(k => `${k}:${presetSlots[k] ? (k === LOCKED_PRESET_KEY ? 'LOCK' : 'OK') : '--'}`).join(' | ')} ({presetStatus})
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #d9d9d9', margin: '10px 0' }} />

          <p style={{ margin: '2px 0' }}>
            opacity (73 / pads): {opacities.map((op, i) => `T${i + 1}: ${Math.round(op * 100)}%`).join(' | ')}
          </p>
          <p style={{ margin: '2px 0' }}>
            volume (77): {volumes.map((v, i) => `T${i + 1}: ${Math.round(v * 100)}%`).join(' | ')}
          </p>
          <p style={{ margin: '2px 0' }}>
            speed (70): {playbackRates.map((r, i) => `T${i + 1}: ${r.toFixed(2)}x`).join(' | ')}
          </p>
          <p style={{ margin: '2px 0' }}>
            zoom (74): {zoomLevels.map((z, i) => `T${i + 1}: ${z.toFixed(2)}x`).join(' | ')}
          </p>
          <p style={{ margin: '2px 0' }}>
            pos (xy): {positions.map((p, i) => `T${i + 1}: [${Math.round(p.x)}, ${Math.round(p.y)}]`).join(' | ')}
          </p>
          <p style={{ margin: '2px 0' }}>
            z-order: {zIndices.map((z, i) => `T${i + 1}: ${z}`).join(' | ')}
          </p>
          <p style={{ margin: '2px 0' }}>
            blend (68): {blendModes.map((b, i) => {
              if (i < 4 && i === bottomVisibleChannel) return `T${i + 1}: BASE`;
              const name = b < 0 ? 'normal' : (BLEND_MODES[b] || 'screen');
              return `T${i + 1}: ${name}`;
            }).join(' | ')}
          </p>
          <p style={{ margin: '2px 0' }}>
            ch mask (70 inv): {maskLevels.map((m, i) => `T${i + 1}: ${m === 0 ? 'off' : `M-${m}${invertedMasks[i] ? '(inv)' : ''}`}`).join(' | ')}
          </p>
          <p style={{ margin: '2px 0', fontWeight: 'bold' }}>
            master preset: {masterMask === 0 ? 'OFF (Free Mix)' : `SPLIT-${masterMask}`}
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #d9d9d9', margin: '10px 0' }} />

          <p style={{ margin: '2px 0' }}>
            pixel (71): {pixelLevels.map((p, i) => `T${i + 1}: ${Math.round(p)}`).join(' | ')}
          </p>
          <p style={{ margin: '2px 0' }}>
            thresh (75): {thresholdLevels.map((t, i) => `T${i + 1}: ${Math.round(t)}`).join(' | ')}
          </p>
          <p style={{ margin: '2px 0' }}>
            filter (72): {filterLevels.map((f, i) => `T${i + 1}: fx-${Math.round(f)}`).join(' | ')}
          </p>
          <p style={{ margin: '2px 0' }}>
            delay (76): {delayLevels.map((d, i) => `T${i + 1}: ${Math.round(d)}`).join(' | ')}
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #d9d9d9', margin: '10px 0' }} />

          {midiLog ? (
            <p style={{ margin: 0 }}>MIDI IN: Cmd {midiLog.command} | Note {midiLog.note} | Vel {midiLog.velocity}</p>
          ) : (
            <p style={{ margin: 0, color: '#777777' }}>waiting MIDI...</p>
          )}
        </div>
      </section>
    </div>
  );
}