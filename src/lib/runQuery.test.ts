import { afterEach, describe, expect, it, vi } from 'vitest';
import { runBounded } from './runQuery';

function response({
    ok,
    status = 200,
    body = '',
    dataVersion = '',
}: {
    ok: boolean;
    status?: number;
    body?: string;
    dataVersion?: string;
}) {
    return {
        ok,
        status,
        statusText: ok ? 'OK' : 'Bad Request',
        text: async () => body,
        headers: { get: (key: string) => (key === 'data-version' ? dataVersion : null) },
    };
}

afterEach(() => vi.unstubAllGlobals());

describe('runBounded', () => {
    it('parses NDJSON rows and the data-version on success', async () => {
        const fetchMock = vi.fn(async () => response({ ok: true, body: '{"count":5}\n', dataVersion: '42' }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await runBounded('http://rhydb', 'data.project({strain}).limit(20)');

        expect(result.rows).toEqual([{ count: 5 }]);
        expect(result.dataVersion).toBe('42');
        expect(result.elapsedMs).toBe(result.executionMs + result.downloadMs);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not retry a rejected bounded query without its limit', async () => {
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
            response({
                ok: false,
                status: 400,
                body: JSON.stringify({ message: 'query rejected' }),
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const raw = 'data.group(by:={}, aggs:={count:=count()})';
        await expect(runBounded('http://rhydb', raw)).rejects.toThrow('HTTP 400');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]?.[1]?.body).toContain('.limit(100)');
    });
});
