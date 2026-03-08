import "@testing-library/jest-dom";

// Mock AudioContext for tests
(globalThis as any).AudioContext = class {
  createGain() { return { gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, connect: () => {} }; }
  createOscillator() { return { frequency: { value: 0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {}, type: '' }; }
  createBiquadFilter() { return { frequency: { value: 0 }, Q: { value: 0 }, type: '', connect: () => {} }; }
  createBufferSource() { return { buffer: null, connect: () => {}, start: () => {}, stop: () => {}, playbackRate: { value: 1 } }; }
  createBuffer() { return { getChannelData: () => new Float32Array(1) }; }
  createDynamicsCompressor() { return { threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 }, connect: () => {} }; }
  createStereoPanner() { return { pan: { value: 0 }, connect: () => {} }; }
  get destination() { return {}; }
  get currentTime() { return 0; }
  get sampleRate() { return 44100; }
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
