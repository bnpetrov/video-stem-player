import { useState, useEffect, useRef } from 'react';
import { useMidi } from './useMidi';
import VideoMixer from './VideoMixer';

export default function App() {
  const { midiLog, noteOnEvent, knobEvent, stickEvent, heldChannel } = useMidi();
  const [videos, setVideos] = useState([]);
  
  // 5 каналов: 0..3 — видео, 4 — титры кинофестиваля (клавиша 49)
  const [opacities, setOpacities] = useState([1, 0, 0, 0, 0]);
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

  const activeChannelRef = useRef(null);
  
  const stickRef = useRef({ x: 0, y: 0 });
  const positionsRef = useRef([{x:0, y:0}, {x:0, y:0}, {x:0, y:0}, {x:0, y:0}, {x:0, y:0}]);

  useEffect(() => {
    activeChannelRef.current = heldChannel;
  }, [heldChannel]);

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
    if (knob === 73) applyRelativeEffect(0, 1.0, 0.025, setOpacities);       // Плавная непрозрачность
    if (knob === 74) applyRelativeEffect(0.35, 3.5, 0.035, setZoomLevels);   // Кадрированный зум
    if (knob === 75) applyRelativeEffect(0, 100, 1.2, setThresholdLevels);   // Графический постеризатор (Threshold)
    if (knob === 76) applyRelativeEffect(0, 100, 1.2, setDelayLevels);       // Хроматическое эхо (Delay)
    if (knob === 77) applyMasterLockedVolume(0.02, setVolumes);              // Балансная громкость

  }, [knobEvent]);

  // ОБРАБОТКА ПЭДОВ И МАСОК (БЕЛЫЕ КЛАВИШИ)
  useEffect(() => {
    if (!noteOnEvent) return;
    const { note, velocity, type } = noteOnEvent;

    if (type === 'noteOn' && velocity > 0) {
      // Нижний ряд пэдов (36-39): Вывод канала на верхний план
      if (note >= 36 && note <= 39) {
        const trackIndex = note - 36;
        setZIndices(prev => {
          const maxZ = Math.max(...prev.slice(0, 4));
          return prev.map((z, idx) => {
            if (idx === 4) return maxZ + 2; // Титры всегда остаются самым верхним слоем
            return idx === trackIndex ? maxZ + 1 : z;
          });
        });
      }
      
      // Верхний ряд пэдов (40-43): Мгновенный Toggle Mute канала
      if (note >= 40 && note <= 43) {
        const trackIndex = note - 40;
        setOpacities(prev => prev.map((op, idx) => {
          if (idx === trackIndex) {
            return op > 0 ? 0 : 1; 
          }
          return op;
        }));
      }

      // Белые клавиши (48..60): Маски каналов (с Shift) или Мастер-пресеты (без Shift)
      const MASK_KEYS = [48, 50, 52, 53, 55, 57, 59, 60];
      if (MASK_KEYS.includes(note)) {
        const maskIndex = MASK_KEYS.indexOf(note) + 1; 
        const currentChannel = activeChannelRef.current;

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