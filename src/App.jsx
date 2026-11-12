import { useState, useEffect, useRef } from 'react';
import { useMidi } from './useMidi';
import VideoMixer from './VideoMixer';

export default function App() {
  const { midiLog, noteOnEvent, knobEvent, stickEvent, heldChannel } = useMidi();
  const [videos, setVideos] = useState([]);
  
  const [opacities, setOpacities] = useState([1, 0, 0, 0]);
  const [playbackRates, setPlaybackRates] = useState([1, 1, 1, 1]); 
  const [zoomLevels, setZoomLevels] = useState([1, 1, 1, 1]); 
  const [positions, setPositions] = useState([{x:0, y:0}, {x:0, y:0}, {x:0, y:0}, {x:0, y:0}]); 

  const activeChannelRef = useRef(null);
  const lastKnobsRef = useRef({}); 
  
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
        // УМЕНЬШИЛИ СКОРОСТЬ НА 20% (было 1.2, стало 0.95)
        const speed = 0.7; 
        
        let newX = positionsRef.current[currentChannel].x + (sx * speed);
        let newY = positionsRef.current[currentChannel].y - (sy * speed); 

        // ОГРАНИЧИТЕЛЬ: центр видео не уходит за край холста (-50% ... 50%)
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

  // ОБРАБОТКА КРУТИЛОК (ABSOLUTE РЕЖИМ 0-127)
  useEffect(() => {
    if (!knobEvent) return;
    const { knob, value } = knobEvent;
    const currentChannel = activeChannelRef.current;

    const prevValue = lastKnobsRef.current[knob] !== undefined ? lastKnobsRef.current[knob] : value;
    const deltaValue = value - prevValue;
    lastKnobsRef.current[knob] = value;

    // 70 — СКОРОСТЬ
    if (knob === 70) {
      if (currentChannel !== null) {
        const absoluteRate = value * (2.0 / 127);
        setPlaybackRates(prev => prev.map((r, idx) => (idx === currentChannel ? absoluteRate : r)));
      } else if (deltaValue !== 0) {
        const deltaRate = deltaValue * (2.0 / 127);
        setPlaybackRates(prev => prev.map(r => Math.max(0, Math.min(2, r + deltaRate))));
      }
    }

    // 74 — ЗУМ
    if (knob === 74) {
      const minZoom = 0.25;
      const maxZoom = 4.0;
      const zoomRange = maxZoom - minZoom;

      if (currentChannel !== null) {
        const absoluteZoom = minZoom + (value / 127) * zoomRange;
        setZoomLevels(prev => prev.map((z, idx) => (idx === currentChannel ? absoluteZoom : z)));
      } else if (deltaValue !== 0) {
        const deltaZoom = deltaValue * (zoomRange / 127);
        setZoomLevels(prev => prev.map(z => Math.max(minZoom, Math.min(maxZoom, z + deltaZoom))));
      }
    }
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
          {midiLog ? (
            <p>Com: {midiLog.command} | Note: {midiLog.note} | Vel: {midiLog.velocity}</p>
          ) : (
            <p>waiting MIDI...</p>
          )}
        </div>
      </div>
    </div>
  );
}