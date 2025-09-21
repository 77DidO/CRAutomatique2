declare module 'express' {
  export interface Request extends Record<string, unknown> {
    params: Record<string, string>;
    body: Record<string, unknown>;
    file?: unknown;
  }
  export interface Response extends Record<string, unknown> {
    json(body: unknown): void;
    status(code: number): Response;
    end(): void;
    sendFile(path: string): void;
  }
  export type NextFunction = (...args: unknown[]) => void;
  export interface Router {
    use(...args: unknown[]): Router;
    get(...args: unknown[]): Router;
    post(...args: unknown[]): Router;
    put(...args: unknown[]): Router;
    delete(...args: unknown[]): Router;
    listen(port: number, callback: () => void): unknown;
  }
  export type Application = Router;
  export interface ExpressFactory {
    (): Application;
    static(path: string): unknown;
  }
  export function Router(): Router;
  const express: ExpressFactory;
  export default express;
}

declare module 'cors' {
  const cors: (...args: unknown[]) => unknown;
  export default cors;
}

declare module 'body-parser' {
  const bodyParser: {
    json(options?: unknown): unknown;
  };
  export default bodyParser;
}

declare module 'multer' {
  interface MulterInstance {
    single(field: string): unknown;
  }
  function multer(options?: unknown): MulterInstance;
  export default multer;
}

declare module 'fluent-ffmpeg' {
  type FluentCommand = {
    audioChannels(channels: number): FluentCommand;
    audioFrequency(frequency: number): FluentCommand;
    format(format: string): FluentCommand;
    on(event: string, handler: (...args: unknown[]) => void): FluentCommand;
    save(path: string): FluentCommand;
  };
  interface FfmpegStatic {
    (input: string): FluentCommand;
    setFfmpegPath(path: string): void;
  }
  const ffmpeg: FfmpegStatic;
  export default ffmpeg;
}

declare module '@ffmpeg-installer/ffmpeg' {
  const installer: { path?: string };
  export default installer;
}

declare module 'openai' {
  const OpenAI: any;
  export default OpenAI;
}

declare module 'node:path' {
  const path: any;
  export default path;
}

declare module 'node:fs' {
  const fs: any;
  export default fs;
}

declare module 'node:crypto' {
  export function randomUUID(): string;
}

declare module 'node:child_process' {
  export function spawn(command: string, args?: readonly string[], options?: any): any;
}

declare module 'node:os' {
  const os: any;
  export default os;
}

declare module 'node:http' {
  export interface Server {}
}

declare module 'node:assert/strict' {
  const assert: any;
  export default assert;
}

declare module 'node:test' {
  const test: any;
  export default test;
}

declare const process: any;
declare const console: any;
declare function setTimeout(handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]): any;
declare function setImmediate(handler: (...args: unknown[]) => void, ...args: unknown[]): any;
declare const Buffer: any;
declare function structuredClone<T>(value: T): T;
