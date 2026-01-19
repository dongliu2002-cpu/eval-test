
export const playCorrectSound = (audioContext: AudioContext | null, mainGainNode: GainNode | null) => {
  if (!audioContext || !mainGainNode) return;

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800, now);
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05); // Quick attack
  gainNode.gain.linearRampToValueAtTime(0, now + 0.2);   // Decay

  oscillator.connect(gainNode);
  gainNode.connect(mainGainNode); // Connect to the main gain node to respect volume settings

  oscillator.start(now);
  oscillator.stop(now + 0.2);
};

export const playIncorrectSound = (audioContext: AudioContext | null, mainGainNode: GainNode | null) => {
  if (!audioContext || !mainGainNode) return;

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(200, now);
  oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2); // Drop in frequency
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02); // Quick attack
  gainNode.gain.linearRampToValueAtTime(0, now + 0.2);    // Decay

  oscillator.connect(gainNode);
  gainNode.connect(mainGainNode); // Connect to the main gain node

  oscillator.start(now);
  oscillator.stop(now + 0.2);
};
