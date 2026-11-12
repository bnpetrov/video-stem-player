import { useState, useEffect, useRef } from 'react';

export function useMidi() {
  const [midiLog, setMidiLog] = useState(null);
  const [noteOnEvent, setNoteOnEvent] = useState(null);
  const [knobEvent, setKnobEvent] = useState(null); 
  const [stickEvent, setStickEvent] = useState(null); 
  
  const [heldChannel, setHeldChannel] = useState(null); 
  const [heldPads, setHeldPads] = useState({});
  const pressureTrackRef = useRef({});

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
      const isControlChange = command >= 176 && command <= 191; 
      
      const isPitchBend = command >= 224 && command <= 239;

      if (isPitchBend) {
        const pbValue = (velocity << 7) + note;
        const normalizedX = (pbValue - 8192) / 8192;
        setStickEvent({ axis: 'x', value: normalizedX, time: now });
        return;
      }

      if (isControlChange) {
        if (note === 1) {
          setStickEvent({ axis: 'y', value: velocity / 127, time: now });
        } else if (note === 2) {
          setStickEvent({ axis: 'y', value: -velocity / 127, time: now });
        }
        setKnobEvent({ knob: note, value: velocity, time: now });
        return; 
      }

      if (CHANNEL_KEYS.includes(note)) {
        const channelIndex = CHANNEL_KEYS.indexOf(note);
        if (isNoteOn) {
          setHeldChannel(channelIndex);
        } else if (isNoteOff) {
          setHeldChannel(prev => (prev === channelIndex ? null : prev));
        }
      }

      // СМЕСТИЛИ ДИАПАЗОН НА 36-43
      if (isNoteOn && note >= 36 && note <= 43) {
        pressureTrackRef.current[note] = { val: velocity, time: now, releasing: false };
        setHeldPads(prev => ({ ...prev, [note]: velocity }));
        setNoteOnEvent({ note, velocity, type: 'noteOn', time: now });
      } 
      else if ((isPolyAftertouch || isChannelAftertouch) && (note >= 36 && note <= 43 || isChannelAftertouch)) {
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
      else if (isNoteOff && note >= 36 && note <= 43) {
        delete pressureTrackRef.current[note];
        setHeldPads(prev => {
          const next = { ...prev };
          delete next[note];
          return next;
        });
      }
    }
  }, []);

  return { midiLog, noteOnEvent, knobEvent, stickEvent, heldChannel, heldPads };
}