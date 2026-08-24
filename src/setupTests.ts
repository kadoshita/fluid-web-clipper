import '@testing-library/jest-dom/vitest';

// @types/chrome only provides types, not a runtime implementation, so tests
// need this stub for `chrome` to exist under jsdom. Only the APIs App.tsx
// actually calls are stubbed.
global.chrome = {
  storage: {
    sync: {
      get: vi.fn((_defaults, callback) => callback({ apiEndpointUrl: '', apiToken: '' })),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([{ id: 1 }]),
  },
  scripting: {
    executeScript: vi.fn((_opts, callback) => callback([{ result: { title: '', url: '' } }])),
  },
} as unknown as typeof chrome;
