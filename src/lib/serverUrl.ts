export const LOCAL_DATA_CONSOLE_HASH = '#your-data';

export type ConsoleConnectionMode = 'public' | 'custom' | 'local';

export function normalizeServerUrl(value: string) {
    const trimmed = value.trim().replace(/\/+$/, '');
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('The server URL must use HTTP or HTTPS.');
    }
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/+$/, '');
}

export function buildConsoleShareUrl(currentUrl: string, server: string, query: string) {
    const url = new URL(currentUrl);
    url.search = '';
    url.hash = '';
    url.hash = buildConsoleShareHash(server, query);
    return url.toString();
}

export function buildConsoleShareHash(server: string, query: string) {
    const fragment = new URLSearchParams({ server });
    if (query.trim()) fragment.set('query', query);
    return `#${fragment.toString()}`;
}

export function buildConsoleSelectionHash(server: string) {
    return buildConsoleShareHash(server, '');
}

export function isLocalDataConsoleHash(hash: string) {
    return hash === LOCAL_DATA_CONSOLE_HASH;
}

export function connectionModeForLocalData(
    localDataRequested: boolean,
    currentMode: ConsoleConnectionMode,
): ConsoleConnectionMode {
    if (localDataRequested) return 'local';
    return currentMode === 'local' ? 'public' : currentMode;
}
