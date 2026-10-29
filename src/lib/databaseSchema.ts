import type { QueryTarget } from './queryTarget';
import type { QueryRow } from './types';

// Tables that every RhyDB database contains, as listed in the matching release's query documentation.
export const BUILTIN_TABLES = new Set(['lineage_definitions', 'reference_genomes']);

export type TableField = { name: string; type: string };

export type TableSchema =
    | { name: string; builtin: boolean; status: 'ready'; fields: TableField[] }
    | { name: string; builtin: boolean; status: 'error'; error: string };

export function tableReference(name: string) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `"${name.replace(/(["\\])/g, '\\$1')}"`;
}

// User tables first with `data` leading, then the built-in tables, each group alphabetical.
export function sortTableNames(names: string[]) {
    const rank = (name: string) => (BUILTIN_TABLES.has(name) ? 2 : name === 'data' ? 0 : 1);
    return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export async function loadDatabaseSchema(target: QueryTarget): Promise<TableSchema[]> {
    const { rows } = await target.run('tables()');
    const names = sortTableNames(rows.map((row) => String(row.tableName)));
    return Promise.all(
        names.map(async (name): Promise<TableSchema> => {
            const builtin = BUILTIN_TABLES.has(name);
            try {
                const result = await target.run(`${tableReference(name)}.schema()`);
                return { name, builtin, status: 'ready', fields: result.rows.map(toField) };
            } catch (error) {
                return {
                    name,
                    builtin,
                    status: 'error',
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        }),
    );
}

function toField(row: QueryRow): TableField {
    return { name: String(row.fieldName), type: String(row.type) };
}
