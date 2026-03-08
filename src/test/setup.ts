import "@testing-library/jest-dom";

// Mock AudioContext for tests
const mockParam = () => new Proxy({ value: 0 }, { get: (t, p) => p === 'value' ? t.value : typeof p === 'string' ? () => {} : undefined, set: (t, p, v) => { if (p === 'value') t.value = v; return true; } });
const mockNode = (): any => { const n: any = new Proxy({}, { get: (_, p) => p === 'connect' || p === 'disconnect' ? () => n : p === 'start' || p === 'stop' ? () => {} : typeof p === 'string' && (p === 'type' || p === 'buffer') ? '' : mockParam() }); return n; };
(globalThis as any).AudioContext = class {
  get destination() { return {}; }
  get currentTime() { return 0; }
  get sampleRate() { return 44100; }
  createGain() { return mockNode(); }
  createOscillator() { return mockNode(); }
  createBiquadFilter() { return mockNode(); }
  createBufferSource() { return mockNode(); }
  createDynamicsCompressor() { return mockNode(); }
  createStereoPanner() { return mockNode(); }
  createBuffer() { return { getChannelData: () => new Float32Array(1024) }; }
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
