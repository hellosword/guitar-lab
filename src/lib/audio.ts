/**
 * Web Audio 封装层
 * MVP 阶段只负责播放单个指板位置的音高，后续节拍器再接 Tone.js。
 */
import { getFrequencyAtPosition } from './theory';
import type { FretPosition } from '../types/theory';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (audioContext === null) {
    audioContext = new AudioContext();
  }

  return audioContext;
}

export async function playPositionPitch(position: FretPosition): Promise<void> {
  const context = getAudioContext();

  if (context.state === 'suspended') {
    await context.resume();
  }

  const startAt = context.currentTime;
  const baseFrequency = getFrequencyAtPosition(position);
  const masterGain = context.createGain();
  const filter = context.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2600, startAt);
  filter.frequency.exponentialRampToValueAtTime(900, startAt + 0.65);

  masterGain.gain.setValueAtTime(0.0001, startAt);
  masterGain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.006);
  masterGain.gain.exponentialRampToValueAtTime(0.055, startAt + 0.16);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.1);

  filter.connect(masterGain);
  masterGain.connect(context.destination);

  [
    { ratio: 1, gain: 0.9, detune: 0 },
    { ratio: 2, gain: 0.22, detune: 4 },
    { ratio: 3, gain: 0.11, detune: -5 },
  ].forEach((partial) => {
    const oscillator = context.createOscillator();
    const partialGain = context.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(baseFrequency * partial.ratio, startAt);
    oscillator.detune.setValueAtTime(partial.detune, startAt);

    partialGain.gain.setValueAtTime(partial.gain, startAt);
    partialGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 1);

    oscillator.connect(partialGain);
    partialGain.connect(filter);
    oscillator.start(startAt);
    oscillator.stop(startAt + 1.12);
  });
}
