import { describe, expect, it } from 'vitest';
import { loadDatabaseSchema, sortTableNames, tableReference } from './databaseSchema';
import type { QueryTarget } from './queryTarget';
import type { QueryRow } from './types';

function fakeTarget(responses: Record<string, QueryRow[] | Error>): QueryTarget {
    return {
        id: 'fake',
        kind: 'remote',
        run: async (query) => {
            const response = responses[query];
            if (response === undefined) throw new Error(`unexpected query ${query}`);
            if (response instanceof Error) throw response;
            return { rows: response, dataVersion: '1', executionMs: 0, downloadMs: 0, elapsedMs: 0 };
        },
    };
}

describe('sortTableNames', () => {
    it('puts data first and built-in tables last', () => {
        expect(sortTableNames(['reference_genomes', 'zika', 'lineage_definitions', 'data', 'lineages'])).toEqual([
            'data',
            'lineages',
            'zika',
            'lineage_definitions',
            'reference_genomes',
        ]);
    });
});

describe('tableReference', () => {
    it('keeps plain identifiers and quotes the rest', () => {
        expect(tableReference('rsv_a')).toBe('rsv_a');
        expect(tableReference('my-table')).toBe('"my-table"');
    });
});

describe('loadDatabaseSchema', () => {
    it('loads the schema of every table and marks built-in tables', async () => {
        const target = fakeTarget({
            'tables()': [{ tableName: 'reference_genomes' }, { tableName: 'data' }, { tableName: 'broken' }],
            'data.schema()': [{ fieldName: 'country', type: 'STRING' }],
            'reference_genomes.schema()': [{ fieldName: 'name', type: 'STRING' }],
            'broken.schema()': new Error('boom'),
        });
        expect(await loadDatabaseSchema(target)).toEqual([
            { name: 'data', builtin: false, status: 'ready', fields: [{ name: 'country', type: 'STRING' }] },
            { name: 'broken', builtin: false, status: 'error', error: 'boom' },
            { name: 'reference_genomes', builtin: true, status: 'ready', fields: [{ name: 'name', type: 'STRING' }] },
        ]);
    });
});
