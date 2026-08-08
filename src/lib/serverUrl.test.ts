import { describe, expect, it } from 'vitest';
import {
    buildConsoleSelectionHash,
    buildConsoleShareHash,
    buildConsoleShareUrl,
    isLocalDataConsoleHash,
    LOCAL_DATA_CONSOLE_HASH,
    normalizeServerUrl,
} from './serverUrl';

describe('normalizeServerUrl', () => {
    it('trims whitespace and trailing slashes', () => {
        expect(normalizeServerUrl(' https://example.org/rhydb/// ')).toBe('https://example.org/rhydb');
    });

    it('removes query strings and fragments', () => {
        expect(normalizeServerUrl('https://example.org/rhydb?x=1#fragment')).toBe('https://example.org/rhydb');
    });

    it('rejects unsupported protocols and invalid URLs', () => {
        expect(() => normalizeServerUrl('ftp://example.org/rhydb')).toThrow('HTTP or HTTPS');
        expect(() => normalizeServerUrl('example.org/rhydb')).toThrow();
    });
});

describe('buildConsoleShareUrl', () => {
    it('shares the server and query while preserving the deployed path', () => {
        const url = buildConsoleShareUrl(
            'https://example.org/rhydb-console/console?old=value#section',
            'https://rhydb.example.org/api',
            'default.limit(10)',
        );
        expect(url).toBe(
            'https://example.org/rhydb-console/console#server=https%3A%2F%2Frhydb.example.org%2Fapi&query=default.limit%2810%29',
        );
    });

    it('omits an empty query', () => {
        const url = buildConsoleShareUrl('https://example.org/console', 'https://rhydb.example.org', '  ');
        expect(url).toBe('https://example.org/console#server=https%3A%2F%2Frhydb.example.org');
    });
});

describe('buildConsoleShareHash', () => {
    it('encodes a server and query for an in-app console link', () => {
        expect(buildConsoleShareHash('https://rhydb.example.org/api', "default.filter(country = 'Switzerland')")).toBe(
            '#server=https%3A%2F%2Frhydb.example.org%2Fapi&query=default.filter%28country+%3D+%27Switzerland%27%29',
        );
    });
});

describe('buildConsoleSelectionHash', () => {
    it('reflects the selected server without adding a query', () => {
        expect(buildConsoleSelectionHash('https://rhydb.example.org/api')).toBe(
            '#server=https%3A%2F%2Frhydb.example.org%2Fapi',
        );
    });
});

describe('isLocalDataConsoleHash', () => {
    it('recognizes the local-data Console link', () => {
        expect(LOCAL_DATA_CONSOLE_HASH).toBe('#your-data');
        expect(isLocalDataConsoleHash(LOCAL_DATA_CONSOLE_HASH)).toBe(true);
        expect(isLocalDataConsoleHash('#server=https%3A%2F%2Frhydb.example.org')).toBe(false);
        expect(isLocalDataConsoleHash('')).toBe(false);
    });
});
