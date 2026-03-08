import "@testing-library/jest-dom";

// Mock AudioContext for tests
const mockParam = (): any => new Proxy({ value: 0 }, { get: (t, p) => p === 'value' ? t.value : typeof p === 'string' ? () => {} : undefined, set: (t, p, v) => { if (p === 'value') t.value = v; return true; } });
const mockNode = (): any => { const n: any = new Proxy({}, { get: (_, p) => p === 'connect' || p === 'disconnect' ? () => n : p === 'start' || p === 'stop' ? () => {} : typeof p === 'string' && (p === 'type' || p === 'buffer' || p === 'curve' || p === 'oversample') ? '' : mockParam() }); return n; };
(globalThis as any).AudioContext = class {
  get destination() { return mockNode(); }
  get currentTime() { return 0; }
  get sampleRate() { return 44100; }
  createBuffer() { return { getChannelData: () => new Float32Array(1024), length: 1024, sampleRate: 44100 }; }
  // Catch-all for any create* method
  [key: string]: any;
};
// Proxy to handle any createX method
const origClass = (globalThis as any).AudioContext;
(globalThis as any).AudioContext = new Proxy(origClass, {
  construct(target: any, args: any[]) {
    const instance = new target(...args);
    return new Proxy(instance, {
      get(t: any, p: string) {
        if (p in t) return t[p];
        if (typeof p === 'string' && p.startsWith('create')) return () => mockNode();
        if (p === 'destination') return mockNode();
        if (p === 'currentTime') return 0;
        if (p === 'sampleRate') return 44100;
        return undefined;
      }
    });
  }
});

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
