import { describe, expect, it } from 'vitest';
import { buildCurlCommand } from './curlCommand';

describe('buildCurlCommand', () => {
    it('builds the RhyDB query request with the bounded query', () => {
        expect(buildCurlCommand('https://example.test/rhydb/', 'data.group(by:={}, aggs:={count:=count()})')).toBe(
            `curl \\
  -X POST \\
  'https://example.test/rhydb/query' \\
  -H 'Content-Type: text/plain' \\
  -H 'Accept: application/x-ndjson' \\
  --data-binary 'data.group(by:={}, aggs:={count:=count()})
.limit(100)'`,
        );
    });

    it('quotes single quotes in the query safely', () => {
        expect(buildCurlCommand('https://example.test', "data.filter(country = 'Switzerland')")).toContain(
            "country = '\\''Switzerland'\\''",
        );
    });
});
