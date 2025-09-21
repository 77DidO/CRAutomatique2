import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import { createServer } from '../src/server.js';

type ErrorLogEntry = { payload: unknown; message?: string };

type Listener = (...args: unknown[]) => void;

class FakeServer {
  private readonly listeners = new Map<string, Set<Listener>>();

  addListener(event: string, listener: Listener): this {
    const handlers = this.listeners.get(event) ?? new Set<Listener>();
    handlers.add(listener);
    this.listeners.set(event, handlers);
    return this;
  }

  removeListener(event: string, listener: Listener): this {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return this;
    }
    handlers.delete(listener);
    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    for (const handler of [...handlers]) {
      handler(...args);
    }
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  asHttpServer(): Server {
    return this as unknown as Server;
  }
}

test('createServer.start rejects when the port is already in use', async () => {
  const errorLogs: ErrorLogEntry[] = [];

  const fakeLogger = {
    info: () => {},
    error: (payload: unknown, message?: string) => {
      errorLogs.push({ payload, message });
    },
    warn: () => {},
    debug: () => {},
  };

  const fakePipeline = {
    resume: async () => {},
  };

  const listenError = Object.assign(new Error('EADDRINUSE: address already in use'), {
    code: 'EADDRINUSE',
  });

  const fakeServer = new FakeServer();

  const fakeApp = {
    listen: (_port: number, _callback: () => void) => {
      queueMicrotask(() => {
        fakeServer.emit('error', listenError);
      });
      return fakeServer.asHttpServer();
    },
  };

  const overrides: Parameters<typeof createServer>[0] = {
    createLogger: () => fakeLogger,
    ensureDataEnvironment: async () => ({} as never),
    createJobRepository: async () => ({} as never),
    createConfigRepository: async () => ({} as never),
    createTemplateRepository: async () => ({} as never),
    validateEnvironment: async () => {},
    createWhisperService: () => ({} as never),
    createFfmpegService: () => ({} as never),
    createOpenAiService: () => ({} as never),
    createPipelineEngine: () => fakePipeline as never,
    createHttpApp: () => fakeApp as never,
  };

  const server = await createServer(overrides);

  await assert.rejects(server.start(4000), (err: unknown) => {
    assert.strictEqual(err, listenError);
    return true;
  });

  assert.deepStrictEqual(errorLogs, [
    {
      payload: {
        port: 4000,
        error: { code: 'EADDRINUSE', message: listenError.message },
      },
      message: 'HTTP server failed to start',
    },
  ]);

  assert.strictEqual(fakeServer.listenerCount('error'), 0);
});
