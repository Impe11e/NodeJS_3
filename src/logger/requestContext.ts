import { AsyncLocalStorage } from 'node:async_hooks';

export interface AppLogger {
    debug(obj: object, msg?: string): void;
    info(obj: object, msg?: string): void;
    warn(obj: object, msg?: string): void;
    error(obj: object, msg?: string): void;
}

const silentLogger: AppLogger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
};

const storage = new AsyncLocalStorage<AppLogger>();
let baseLogger: AppLogger = silentLogger;

export function setBaseLogger(logger: AppLogger): void {
    baseLogger = logger;
}

export function runWithLogger<T>(logger: AppLogger, fn: () => T): T {
    return storage.run(logger, fn);
}

export function getLogger(): AppLogger {
    return storage.getStore() ?? baseLogger;
}
