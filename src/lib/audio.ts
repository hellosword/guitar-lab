/**
 * Web Audio 封装层
 * 负责播放单个指板位置的吉他采样音高。
 */
import { getMidiAtPosition } from './theory';
import type { FretPosition } from '../types/theory';

type BrowserAudioContext = typeof AudioContext;
export type GuitarToneId = 'clean-electric' | 'emilyguitar';

let audioContext: AudioContext | null = null;
const sampleCache = new Map<string, Promise<AudioBuffer>>();
const activePitchPlaybacks = new Set<Promise<void>>();

interface GuitarSampleRegion {
  minMidi: number;
  maxMidi: number;
  rootMidi: number;
  fileName: string;
}

interface GuitarSampleBank {
  baseUrl: string;
  regions: GuitarSampleRegion[];
  gain: number;
  highpassHz: number;
  lowpassHz: number;
  sustainUntilSeconds: number;
  fadeOutAtSeconds: number;
  stopAtSeconds: number;
}

const GUITAR_SAMPLE_BANKS: Record<GuitarToneId, GuitarSampleBank> = {
  'clean-electric': {
    baseUrl: '/audio/samples/guitar/freepats-clean/samples',
    gain: 0.78,
    highpassHz: 82,
    lowpassHz: 4300,
    sustainUntilSeconds: 0.92,
    fadeOutAtSeconds: 1.42,
    stopAtSeconds: 1.5,
    regions: [
      { minMidi: 35, maxMidi: 38, rootMidi: 36, fileName: 'C2_s1_01.wav' },
      { minMidi: 39, maxMidi: 42, rootMidi: 41, fileName: 'F2_s1_01.wav' },
      { minMidi: 43, maxMidi: 46, rootMidi: 45, fileName: 'A2_s2_01.wav' },
      { minMidi: 47, maxMidi: 49, rootMidi: 48, fileName: 'C3_s2_02.wav' },
      { minMidi: 50, maxMidi: 53, rootMidi: 52, fileName: 'E3_s3_01.wav' },
      { minMidi: 54, maxMidi: 56, rootMidi: 55, fileName: 'G3_s4_01.wav' },
      { minMidi: 57, maxMidi: 61, rootMidi: 59, fileName: 'B3_s5_01.wav' },
      { minMidi: 62, maxMidi: 65, rootMidi: 64, fileName: 'E4_s6_01.wav' },
      { minMidi: 66, maxMidi: 69, rootMidi: 67, fileName: 'G4_s6_01.wav' },
      { minMidi: 70, maxMidi: 72, rootMidi: 71, fileName: 'B4_s6_01.wav' },
      { minMidi: 73, maxMidi: 76, rootMidi: 74, fileName: 'D5_s6_01.wav' },
      { minMidi: 77, maxMidi: 82, rootMidi: 80, fileName: 'G#5_s6_03.wav' },
      { minMidi: 83, maxMidi: 86, rootMidi: 85, fileName: 'C#6_s6_01.wav' },
    ],
  },
  emilyguitar: {
    baseUrl: '/audio/samples/guitar/emilyguitar/samples',
    gain: 0.72,
    highpassHz: 70,
    lowpassHz: 5600,
    sustainUntilSeconds: 0.88,
    fadeOutAtSeconds: 1.36,
    stopAtSeconds: 1.45,
    regions: [
      { minMidi: 35, maxMidi: 38, rootMidi: 37, fileName: 'db2_mf_rr1.wav' },
      { minMidi: 39, maxMidi: 41, rootMidi: 40, fileName: 'e2_mf_rr1.wav' },
      { minMidi: 42, maxMidi: 43, rootMidi: 42, fileName: 'gb2_mf_rr1.wav' },
      { minMidi: 44, maxMidi: 46, rootMidi: 45, fileName: 'a2_mf_rr1.wav' },
      { minMidi: 47, maxMidi: 49, rootMidi: 48, fileName: 'c3_mf_rr1.wav' },
      { minMidi: 50, maxMidi: 52, rootMidi: 51, fileName: 'eb3_mf_rr1.wav' },
      { minMidi: 53, maxMidi: 55, rootMidi: 54, fileName: 'gb3_mf_rr1.wav' },
      { minMidi: 56, maxMidi: 58, rootMidi: 57, fileName: 'a3_mf_rr1.wav' },
      { minMidi: 59, maxMidi: 61, rootMidi: 60, fileName: 'c4_mf_rr1.wav' },
      { minMidi: 62, maxMidi: 64, rootMidi: 63, fileName: 'eb4_mf_rr1.wav' },
      { minMidi: 65, maxMidi: 67, rootMidi: 66, fileName: 'gb4_mf_rr1.wav' },
      { minMidi: 68, maxMidi: 70, rootMidi: 69, fileName: 'a4_mf_rr1.wav' },
      { minMidi: 71, maxMidi: 73, rootMidi: 72, fileName: 'c5_mf_rr1.wav' },
      { minMidi: 74, maxMidi: 76, rootMidi: 75, fileName: 'eb5_mf_rr1.wav' },
      { minMidi: 77, maxMidi: 79, rootMidi: 78, fileName: 'gb5_mf_rr1.wav' },
      { minMidi: 80, maxMidi: 82, rootMidi: 81, fileName: 'a5_mf_rr1.wav' },
      { minMidi: 83, maxMidi: 85, rootMidi: 84, fileName: 'c6_mf_rr1.wav' },
      { minMidi: 86, maxMidi: 88, rootMidi: 86, fileName: 'd6_mf_rr1.wav' },
    ],
  },
};

function getAudioContext(): AudioContext {
  if (audioContext === null) {
    const AudioContextConstructor = (window.AudioContext
      ?? (window as Window & { webkitAudioContext?: BrowserAudioContext }).webkitAudioContext);

    audioContext = new AudioContextConstructor();
  }

  return audioContext;
}

function getSampleBank(toneId: GuitarToneId): GuitarSampleBank {
  return GUITAR_SAMPLE_BANKS[toneId];
}

function getSampleRegion(position: FretPosition, bank: GuitarSampleBank): GuitarSampleRegion {
  const midi = getMidiAtPosition(position);
  const region = bank.regions.find((sample) => midi >= sample.minMidi && midi <= sample.maxMidi);

  if (region !== undefined) {
    return region;
  }

  return bank.regions.reduce((nearest, candidate) => (
    Math.abs(candidate.rootMidi - midi) < Math.abs(nearest.rootMidi - midi) ? candidate : nearest
  ));
}

function getSampleUrl(region: GuitarSampleRegion, bank: GuitarSampleBank): string {
  return `${bank.baseUrl}/${region.fileName}`;
}

function getSamplePlaybackRate(position: FretPosition, region: GuitarSampleRegion): number {
  return 2 ** ((getMidiAtPosition(position) - region.rootMidi) / 12);
}

async function loadSample(context: AudioContext, position: FretPosition, toneId: GuitarToneId): Promise<AudioBuffer> {
  const bank = getSampleBank(toneId);
  const region = getSampleRegion(position, bank);
  const url = getSampleUrl(region, bank);
  const cached = sampleCache.get(url);

  if (cached !== undefined) {
    return cached;
  }

  const bufferPromise = fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`吉他采样加载失败：${url}`);
      }

      return response.arrayBuffer();
    })
    .then((data) => context.decodeAudioData(data));

  sampleCache.set(url, bufferPromise);
  return bufferPromise;
}

async function playPositionPitchInternal(position: FretPosition, toneId: GuitarToneId): Promise<void> {
  const context = getAudioContext();

  if (context.state === 'suspended') {
    await context.resume();
  }

  const bank = getSampleBank(toneId);
  const region = getSampleRegion(position, bank);
  const sampleBuffer = await loadSample(context, position, toneId);
  const startAt = context.currentTime + 0.004;
  const source = context.createBufferSource();
  const gain = context.createGain();
  const highpass = context.createBiquadFilter();
  const filter = context.createBiquadFilter();
  const playbackRate = getSamplePlaybackRate(position, region);
  const ended = new Promise<void>((resolve) => {
    source.onended = () => {
      source.disconnect();
      highpass.disconnect();
      filter.disconnect();
      gain.disconnect();
      resolve();
    };
  });

  source.buffer = sampleBuffer;
  source.playbackRate.setValueAtTime(playbackRate, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(bank.gain, startAt + 0.006);
  gain.gain.setValueAtTime(bank.gain, startAt + bank.sustainUntilSeconds);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + bank.fadeOutAtSeconds);

  highpass.type = 'highpass';
  highpass.frequency.setValueAtTime(bank.highpassHz, startAt);
  highpass.Q.setValueAtTime(0.55, startAt);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(bank.lowpassHz, startAt);
  filter.Q.setValueAtTime(0.35, startAt);

  source.connect(highpass);
  highpass.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  source.start(startAt);
  source.stop(startAt + Math.min(bank.stopAtSeconds, sampleBuffer.duration / playbackRate));

  await ended;
}

export function playPositionPitch(position: FretPosition, toneId: GuitarToneId): Promise<void> {
  const playback = playPositionPitchInternal(position, toneId);
  activePitchPlaybacks.add(playback);
  playback.then(
    () => activePitchPlaybacks.delete(playback),
    () => activePitchPlaybacks.delete(playback),
  );

  return playback;
}

export async function waitForActivePitchPlayback(): Promise<void> {
  await Promise.allSettled([...activePitchPlaybacks]);
}

export async function preloadPositionPitch(position: FretPosition, toneId: GuitarToneId): Promise<void> {
  const context = getAudioContext();
  await loadSample(context, position, toneId);
}
