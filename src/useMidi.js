import { useState, useEffect, useRef } from 'react';

export function useMidi() {
  const [midiLog, setMidiLog] = useState(null);
  const [noteOnEvent, setNoteOnEvent] = useState(null);
  
  // НОВЫЕ СОБЫТИЯ
  const [knobEvent, setKnobEvent] = useState(null); 
  const [heldChannel, setHeldChannel] = useState(null); // Какой канал зажат (0-3)

  const [heldPads, setHeldPads] = useState({});
  const pressureTrackRef = useRef({});

  // Клавиши-модификаторы для 4-х каналов
  const CHANNEL_KEYS = [51, 54, 56, 58]; 

  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(onMIDISuccess, () => console.log('MIDI error'));
    }

    function onMIDISuccess(midiAccess) {
      for (let input of midiAccess.inputs.values()) {
        input.onmidimessage = getMIDIMessage;
      }
    }

    function getMIDIMessage(message) {
      const [command, note, velocity] = message.data;
      if (command === 254) return;

      const now = performance.now();
      setMidiLog({ command, note, velocity });

      const isNoteOn = command >= 144 && command <= 159 && velocity > 0;
      const isNoteOff = (command >= 144 && command <= 159 && velocity === 0) || (command >= 128 && command <= 143);
      const isPolyAftertouch = command >= 160 && command <= 175;
      const isChannelAftertouch = command >= 208 && command <= 223;
      
      // Control Change - Крутилки
      const isControlChange = command >= 176 && command <= 191; 

      if (isControlChange) {
        setKnobEvent({ knob: note, value: velocity, time: now });
        return; 
      }

      // 1. ОТСЛЕЖИВАНИЕ КЛАВИШ-МОДИФИКАТОРОВ ДЛЯ КАНАЛОВ
      if (CHANNEL_KEYS.includes(note)) {
        const channelIndex = CHANNEL_KEYS.indexOf(note);
        if (isNoteOn) {
          setHeldChannel(channelIndex);
        } else if (isNoteOff) {
          setHeldChannel(prev => (prev === channelIndex ? null : prev));
        }
      }

      // 2. СТАБИЛЬНАЯ ЛОГИКА ДЛЯ ПЭДОВ 40-43
      if (isNoteOn && note >= 40 && note <= 43) {
        pressureTrackRef.current[note] = { val: velocity, time: now, releasing: false };
        setHeldPads(prev => ({ ...prev, [note]: velocity }));
        setNoteOnEvent({ note, velocity, type: 'noteOn', time: now });
      } 
      else if ((isPolyAftertouch || isChannelAftertouch) && (note >= 40 && note <= 43 || isChannelAftertouch)) {
        const targetNote = isPolyAftertouch ? note : Number(Object.keys(pressureTrackRef.current)[0]);
        const newPressure = isPolyAftertouch ? velocity : note;

        if (!targetNote || !pressureTrackRef.current[targetNote]) return;

        const prev = pressureTrackRef.current[targetNote];
        const dt = Math.max(1, now - prev.time);
        const delta = newPressure - prev.val; 
        const dropSpeed = Math.abs(delta) / dt; 

        if (delta < 0 && (dropSpeed > 0.2 || (prev.val > 35 && newPressure < 10))) {
          pressureTrackRef.current[targetNote].releasing = true;
          return;
        }

        if (prev.releasing && delta <= 0) return;

        pressureTrackRef.current[targetNote] = { val: newPressure, time: now, releasing: false };
        setHeldPads(p => (p[targetNote] !== undefined ? { ...p, [targetNote]: newPressure } : p));
        setNoteOnEvent({ note: targetNote, velocity: newPressure, type: 'aftertouch', time: now });
      } 
      else if (isNoteOff && note >= 40 && note <= 43) {
        delete pressureTrackRef.current[note];
        setHeldPads(prev => {
          const next = { ...prev };
          delete next[note];
          return next;
        });
      }
    }
  }, []);

  return { midiLog, noteOnEvent, knobEvent, heldChannel, heldPads };
}