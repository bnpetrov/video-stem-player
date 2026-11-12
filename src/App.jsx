import { useState, useEffect, useRef } from 'react';
import { useMidi } from './useMidi';
import VideoMixer from './VideoMixer';

export default function App() {
  const { midiLog, noteOnEvent, knobEvent, heldChannel } = useMidi();
  const [videos, setVideos] = useState([]);
  
  const [opacities, setOpacities] = useState([1, 0, 0, 0]);
  const [playbackRates, setPlaybackRates] = useState([1, 1, 1, 1]); 
  const [zoomLevels, setZoomLevels] = useState([1, 1, 1, 1]); // Старт с 1x

  const activeChannelRef = useRef(null);
  const lastKnobsRef = useRef({}); // Возвращаем хранилище прошлых позиций

  useEffect(() => {
    activeChannelRef.current = heldChannel;
  }, [heldChannel]);

  // ОБРАБОТКА КРУТИЛОК (ABSOLUTE РЕЖИМ 0-127)
  useEffect(() => {
    if (!knobEvent) return;
    const { knob, value } = knobEvent;
    const currentChannel = activeChannelRef.current;

    const prevValue = lastKnobsRef.current[knob] !== undefined ? lastKnobsRef.current[knob] : value;
    const deltaValue = value - prevValue;
    
    // Сохраняем позицию на будущее
    lastKnobsRef.current[knob] = value;

    // Крутилка 70 — СКОРОСТЬ ВОСПРОИЗВЕДЕНИЯ (0.0 - 2.0)
    if (knob === 70) {
      if (currentChannel !== null) {
        // АБСОЛЮТНОЕ управление для канала
        const absoluteRate = value * (2.0 / 127);
        setPlaybackRates(prev => prev.map((r, idx) => (idx === currentChannel ? absoluteRate : r)));
      } else if (deltaValue !== 0) {
        // ОТНОСИТЕЛЬНОЕ (дельта) управление для мастера
        const deltaRate = deltaValue * (2.0 / 127);
        setPlaybackRates(prev => prev.map(r => Math.max(0, Math.min(2, r + deltaRate))));
      }
    }

    // Крутилка 71 — ЗУМ / МАСШТАБ (0.25 - 4.0)
    if (knob === 74) {
      const minZoom = 0.25;
      const maxZoom = 4.0;
      const zoomRange = maxZoom - minZoom; // 3.75

      if (currentChannel !== null) {
        // АБСОЛЮТНОЕ: 0 -> 0.25, 127 -> 4.0
        const absoluteZoom = minZoom + (value / 127) * zoomRange;
        setZoomLevels(prev => prev.map((z, idx) => (idx === currentChannel ? absoluteZoom : z)));
      } else if (deltaValue !== 0) {
        // ОТНОСИТЕЛЬНОЕ: Мастер сдвигает все каналы плавно
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
      />

      <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
        <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px', flex: 1 }}>
          <h3>media</h3>
          <input type="file" accept="video/*" multiple onChange={handleFileUpload} />
        </div>

        <div style={{ padding: '20px', background: '#222', color: '#0f0', borderRadius: '8px', fontFamily: 'monospace', flex: 1 }}>
          <h3>inf</h3>
          
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