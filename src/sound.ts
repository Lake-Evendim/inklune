let audio: AudioContext | undefined;
export function mechanicalSound(kind: 'key' | 'return' | 'paper' | 'space' | 'delete' = 'key') {
  try {
    audio ??= new AudioContext(); if (audio.state === 'suspended') void audio.resume();
    const time = audio.currentTime; const length = kind === 'paper' ? .2 : kind === 'return' ? .12 : .035;
    const buffer = audio.createBuffer(1, Math.round(audio.sampleRate * length), audio.sampleRate);
    const wave = buffer.getChannelData(0); for (let i = 0; i < wave.length; i++) wave[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / wave.length, kind === 'paper' ? 1 : 4);
    const source = audio.createBufferSource(); source.buffer = buffer; const gain = audio.createGain(); gain.gain.setValueAtTime(kind === 'key' ? .055 : kind === 'space' || kind === 'delete' ? .025 : .04, time);
    const filter = audio.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = kind === 'paper' ? 400 : 1300; source.connect(filter).connect(gain).connect(audio.destination); source.start(time);
    if (kind === 'key' || kind === 'return') { const tone = audio.createOscillator(); const envelope = audio.createGain(); tone.type = 'triangle'; tone.frequency.setValueAtTime(kind === 'return' ? 1350 : 170 + Math.random() * 50, time); envelope.gain.setValueAtTime(kind === 'return' ? .012 : .035, time); envelope.gain.exponentialRampToValueAtTime(.0001, time + (kind === 'return' ? .18 : .055)); tone.connect(envelope).connect(audio.destination); tone.start(time); tone.stop(time + .2); }
  } catch { /* Audio is an optional enhancement. */ }
}
