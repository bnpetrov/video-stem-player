import { useState, useEffect, useRef } from 'react';
import { useMidi } from './useMidi';
import VideoMixer from './VideoMixer';

export default function App() {
  const { midiLog, noteOnEvent, knobEvent, heldChannel } = useMidi();
  const [videos, setVideos] = useState([]);
  
  const [opacities, setOpacities] = useState([1, 0, 0, 0]);
  const [playbackRates, setPlaybackRates] = useState([1, 1, 1, 1]); // Старт с 1x

  const activeChannelRef = useRef(null);
  const lastKnobsRef = useRef({}); // Храним прошлую позицию ручек

  useEffect(() => {
    activeChannelRef.current = heldChannel;
  }, [heldChannel]);

  // ОБРАБОТКА КРУТИЛОК (Скорость)
  useEffect(() => {
    if (!knobEvent) return;
    const { knob, value } = knobEvent;
    const currentChannel = activeChannelRef.current;

    // Крутилка 70 — Скорость воспроизведения
    if (knob === 70) {
      if (currentChannel !== null) {
        // 1. АБСОЛЮТНОЕ УПРАВЛЕНИЕ ДЛЯ ОТДЕЛЬНОГО КАНАЛА
        // Решает аппаратную проблему, когда физическая ручка упиралась в 0 или 127.
        // Теперь положение ручки всегда 1:1 равно скорости для выбранного канала.
        const absoluteRate = value * (2.0 / 127);
        setPlaybackRates(prev => prev.map((r, idx) => (idx === currentChannel ? absoluteRate : r)));
      } else {
        // 2. ОТНОСИТЕЛЬНОЕ УПРАВЛЕНИЕ (ДЕЛЬТА) ДЛЯ МАСТЕРА
        const prevValue = lastKnobsRef.current[knob] !== undefined ? lastKnobsRef.current[knob] : value;
        const deltaValue = value - prevValue;
        
        if (deltaValue !== 0) {
          const deltaRate = deltaValue * (2.0 / 127);
          // Каждый канал обрезается до 0..2 индивидуально. Никто никого больше не блокирует!
          setPlaybackRates(prev => prev.map(r => Math.max(0, Math.min(2, r + deltaRate))));
        }
      }
    }
    
    // Обязательно сохраняем позицию, чтобы при возврате на Мастер дельта считалась корректно
    lastKnobsRef.current[knob] = value;
    
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
        </div>
      </div>
    </div>
  );
}