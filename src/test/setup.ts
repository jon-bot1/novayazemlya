import "@testing-library/jest-dom";

// Mock AudioContext for tests
(globalThis as any).AudioContext = class {
  createGain() { return { gain: { value: 1 }, connect: () => {} }; }
  createOscillator() { return { frequency: { value: 0 }, connect: () => {}, start: () => {}, stop: () => {} }; }
  createBiquadFilter() { return { frequency: { value: 0 }, Q: { value: 0 }, type: '', connect: () => {} }; }
  createBufferSource() { return { buffer: null, connect: () => {}, start: () => {}, stop: () => {} }; }
  createBuffer() { return { getChannelData: () => new Float32Array(1) }; }
  get destination() { return {}; }
  get currentTime() { return 0; }
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
