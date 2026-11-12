import { useState, useEffect, useRef } from 'react';
import { useMidi } from './useMidi';
import VideoMixer from './VideoMixer';

export default function App() {
  const { midiLog, noteOnEvent, knobEvent, stickEvent, heldChannel } = useMidi();
  const [videos, setVideos] = useState([]);
  
  const [opacities, setOpacities] = useState([1, 0, 0, 0]);
  const [playbackRates, setPlaybackRates] = useState([1, 1, 1, 1]); 
  const [zoomLevels, setZoomLevels] = useState([1, 1, 1, 1]); 
  const [pixelLevels, setPixelLevels] = useState([0, 0, 0, 0]); 
  const [thresholdLevels, setThresholdLevels] = useState([0, 0, 0, 0]); 
  const [filterLevels, setFilterLevels] = useState([0, 0, 0, 0]); 
  const [delayLevels, setDelayLevels] = useState([0, 0, 0, 0]); 
  const [positions, setPositions] = useState([{x:0, y:0}, {x:0, y:0}, {x:0, y:0}, {x:0, y:0}]); 

  const activeChannelRef = useRef(null);
  
  const stickRef = useRef({ x: 0, y: 0 });
  const positionsRef = useRef([{x:0, y:0}, {x:0, y:0}, {x:0, y:0}, {x:0, y:0}]);

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
        const speed = 0.7; 
        let newX = positionsRef.current[currentChannel].x + (sx * speed);
        let newY = positionsRef.current[currentChannel].y - (sy * speed); 

        newX = Math.max(-50, Math.min(50, newX));
        newY = Math.max(-50, Math.min(50, newY));

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

    // Раскодируем Relative значение от AKAI
    let deltaStep = 0;
    if (value > 0 && value < 64) {
      deltaStep = value; // Крутим вправо
    } else if (value > 64 && value <= 127) {
      deltaStep = value - 128; // Крутим влево (127 превращается в -1)
    }

    if (deltaStep === 0) return;

    // Универсальная функция применения эффекта
    const applyRelativeEffect = (minVal, maxVal, stepMultiplier, setter) => {
      const deltaVal = deltaStep * stepMultiplier;
      
      setter(prev => {
        if (currentChannel !== null) {
          // ИНДИВИДУАЛЬНЫЙ КАНАЛ
          return prev.map((v, idx) => 
            idx === currentChannel ? Math.max(minVal, Math.min(maxVal, v + deltaVal)) : v
          );
        } else {
          // МАСТЕР: Каждый канал движется независимо, обрезаясь об свои лимиты
          return prev.map(v => Math.max(minVal, Math.min(maxVal, v + deltaVal)));
        }
      });
    };

    // Применяем эффекты со своими множителями скорости (чувствительностью)
    if (knob === 70) applyRelativeEffect(0, 2.0, 0.02, setPlaybackRates);    // Скорость
    if (knob === 71) applyRelativeEffect(0, 100, 1.0, setPixelLevels);       // Пикселизация
    if (knob === 72) applyRelativeEffect(0, 10, 0.2, setFilterLevels);       // Фильтры (0.2 чтобы менять не слишком резко)
    if (knob === 74) applyRelativeEffect(0.25, 4.0, 0.04, setZoomLevels);    // Зум
    if (knob === 75) applyRelativeEffect(0, 100, 1.0, setThresholdLevels);   // Срез
    if (knob === 76) applyRelativeEffect(0, 100, 1.0, setDelayLevels);       // Эхо

  }, [knobEvent]);

  // ОБРАБОТКА ПЭДОВ
  useEffect(() => {
    if (!noteOnEvent) return;
    const { note, velocity } = noteOnEvent;

    if (note >= 40 && note <= 43) {
      const trackIndex = note - 40;
      const MIN_THRESHOLD = 40;   
      const SOLO_THRESHOLD = 127; 

      if (velocity >= SOLO_THRESHOLD) {
        setOpacities([0, 0, 0, 0].map((_, idx) => (idx === trackIndex ? 1 : 0)));
      } else if (velocity <= MIN_THRESHOLD) {
        setOpacities(prev => prev.map((op, idx) => (idx === trackIndex ? 0 : op)));
      } else {
        const mappedOpacity = (velocity - MIN_THRESHOLD) / (SOLO_THRESHOLD - MIN_THRESHOLD);
        setOpacities(prev => prev.map((op, idx) => (idx === trackIndex ? mappedOpacity : op)));
      }
    }
  }, [noteOnEvent]);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files).slice(0, 4);
    setVideos(files.map(file => URL.createObjectURL(file)));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>LAB52</h1>
      
      <VideoMixer 
        videos={videos} 
        opacities={opacities}
        playbackRates={playbackRates}
        zoomLevels={zoomLevels}
        pixelLevels={pixelLevels}
        thresholdLevels={thresholdLevels}
        filterLevels={filterLevels}
        delayLevels={delayLevels}
        positions={positions}
      />

      <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
        <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px', flex: 1 }}>
          <h3>media</h3>
          <input type="file" accept="video/*" multiple onChange={handleFileUpload} />
        </div>

        <div style={{ padding: '20px', background: '#222', color: '#0f0', borderRadius: '8px', fontFamily: 'monospace', flex: 1.5 }}>
          <h3>inf (debug)</h3>
          
          <p style={{ color: '#ff9800', fontWeight: 'bold' }}>
            target mode: {heldChannel !== null ? `TRACK ${heldChannel + 1} ONLY` : 'MASTER ALL'}
          </p>
          <hr style={{ borderColor: '#444' }}/>
          <p style={{ color: '#4caf50' }}>
            levels: {opacities.map((op, i) => `T${i + 1}: ${Math.round(op * 100)}%`).join(' | ')}
          </p>
          <p style={{ color: '#03a9f4' }}>
            speed: {playbackRates.map((r, i) => `T${i + 1}: ${r.toFixed(2)}x`).join(' | ')}
          </p>
          <p style={{ color: '#e91e63' }}>
            zoom: {zoomLevels.map((z, i) => `T${i + 1}: ${z.toFixed(2)}x`).join(' | ')}
          </p>
          <p style={{ color: '#ffeb3b' }}>
            pos: {positions.map((p, i) => `T${i + 1}: [${Math.round(p.x)}, ${Math.round(p.y)}]`).join(' | ')}
          </p>
          
          <hr style={{ borderColor: '#444' }}/>
          <p style={{ color: '#9c27b0' }}>
            pixel: {pixelLevels.map((p, i) => `T${i + 1}: ${Math.round(p)}`).join(' | ')}
          </p>
          <p style={{ color: '#00bcd4' }}>
            thresh: {thresholdLevels.map((t, i) => `T${i + 1}: ${Math.round(t)}`).join(' | ')}
          </p>
          <p style={{ color: '#ff5722' }}>
            filter: {filterLevels.map((f, i) => `T${i + 1}: fx-${Math.round(f)}`).join(' | ')}
          </p>
          <p style={{ color: '#8bc34a' }}>
            delay: {delayLevels.map((d, i) => `T${i + 1}: ${Math.round(d)}`).join(' | ')}
          </p>
        </div>
      </div>
    </div>
  );
}