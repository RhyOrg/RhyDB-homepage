// Builds the tutorial dataset that the browser-local RhyDB preprocesses, from the SARS-CoV-2 dump in
// data/sars-cov-2-1000/. Run it with `npm run example-data` after changing the dump, the reference
// genomes or the rules below; the generated files are committed so that a build only copies them.
//
// Inputs (committed, not generated):
//   data/sars-cov-2-1000/source.ndjson.zst  the dump, one record per line
//   reference_genomes.json                  Wuhan-Hu-1 (NC_045512.2) and its gene translations
//
// Generated into public/example-data/sars-cov-2-1000/:
//   data.ndjson.zst          the dump reduced to the tutorial columns, in RhyDB's NDJSON input shape
//   database_config.yaml     column types, indexes and the primary key
//   lineage_definitions.yaml pango lineage hierarchy covering every value in the dump
//   preprocessing_config.yaml  ties the four files together

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { constants, zstdCompressSync, zstdDecompressSync } from 'node:zlib';
import { stringify } from 'yaml';

const projectRoot = path.resolve(import.meta.dirname, '..');
const sourceFile = path.join(projectRoot, 'data/sars-cov-2-1000/source.ndjson.zst');
const datasetDirectory = path.join(projectRoot, 'public/example-data/sars-cov-2-1000');
const NDJSON_FILENAME = 'data.ndjson.zst';
const REFERENCE_GENOME_FILENAME = 'reference_genomes.json';
const DATABASE_CONFIG_FILENAME = 'database_config.yaml';
const LINEAGE_DEFINITIONS_FILENAME = 'lineage_definitions.yaml';
const PREPROCESSING_CONFIG_FILENAME = 'preprocessing_config.yaml';

const PRIMARY_KEY = 'strain';
const LINEAGE_COLUMN = 'pango_lineage';
const DEFAULT_NUCLEOTIDE_SEQUENCE = 'main';

// Nextclade contributes one column the tutorial uses; its remaining columns describe how Nextclade
// itself ran and would only distract from learning the query language.
const RENAMED_COLUMNS = { nextcladeCoverage: 'coverage' };
const DROPPED_COLUMNS = new Set(['gisaidClade', 'gisaidEpiIsl', 'hospitalized', 'immuneEscape', 'usherTree']);
const DROPPED_COLUMN_PREFIX = 'nextclade';

// Columns that hold few distinct values get a RhyDB index, which is what makes filters on them fast.
const INDEXED_COLUMNS = new Set([
    'country',
    'country_exposure',
    'database',
    'division',
    'division_exposure',
    'host',
    'nextstrain_clade',
    'pango_lineage',
    'region',
    'region_exposure',
    'sampling_strategy',
    'sex',
    'who_clade',
]);

// Columns holding a calendar date. The remaining `date*` columns are either its parts, which are
// plain integers, or the original text a date was parsed from.
const DATE_COLUMNS = new Set(['date', 'date_submitted', 'date_updated']);

// Columns that carry no value in this dump, so their type cannot be inferred from it.
const UNTYPED_COLUMNS = {
    ace2_binding: 'float',
    died: 'boolean',
    fully_vaccinated: 'boolean',
};

const { records: sourceRecords, fractionalColumns: sourceFractionalColumns } = readRecords(await readFile(sourceFile));
const fractionalColumns = new Set([...sourceFractionalColumns].map(tutorialColumnName));
const referenceGenomes = JSON.parse(await readFile(path.join(datasetDirectory, REFERENCE_GENOME_FILENAME), 'utf8'));

const sequenceNames = new Set([
    ...referenceGenomes.nucleotideSequences.map((sequence) => sequence.name),
    ...referenceGenomes.nucleotideSequences.map((sequence) => `unaligned_${sequence.name}`),
    ...referenceGenomes.genes.map((gene) => gene.name),
]);

const records = sourceRecords.map((record) => toTutorialRecord(record, sequenceNames));

checkPrimaryKey(records);
checkSequenceLengths(records, referenceGenomes);

const metadata = describeMetadata(records, sequenceNames);
const lineages = collectLineages(records, LINEAGE_COLUMN);

// The dataset is downloaded by every reader who starts the tutorial, so it is worth compressing hard.
await writeFile(
    path.join(datasetDirectory, NDJSON_FILENAME),
    zstdCompressSync(Buffer.from(records.map((record) => JSON.stringify(record)).join('\n') + '\n'), {
        params: { [constants.ZSTD_c_compressionLevel]: 19 },
    }),
);

await writeGenerated(
    DATABASE_CONFIG_FILENAME,
    stringify({
        schema: {
            instanceName: 'sars-cov-2-1000',
            metadata,
            primaryKey: PRIMARY_KEY,
        },
        defaultNucleotideSequence: DEFAULT_NUCLEOTIDE_SEQUENCE,
    }),
);

await writeGenerated(LINEAGE_DEFINITIONS_FILENAME, stringify(buildLineageDefinitions(lineages)));

await writeGenerated(
    PREPROCESSING_CONFIG_FILENAME,
    stringify({
        ndjsonInputFilename: NDJSON_FILENAME,
        databaseConfig: DATABASE_CONFIG_FILENAME,
        referenceGenomeFilename: REFERENCE_GENOME_FILENAME,
        lineageDefinitionFilenames: [LINEAGE_DEFINITIONS_FILENAME],
    }),
);

console.log(
    `Prepared ${records.length} records: ${metadata.length} metadata columns, ${lineages.size} observed lineages.`,
);

// A JSON number such as `0.0` parses into the same value as `0`, so the written form decides whether
// a column is a float or an integer.
function readRecords(compressed) {
    const fractionalColumns = new Set();
    const records = zstdDecompressSync(compressed)
        .toString('utf8')
        .split('\n')
        .filter((line) => line.trim())
        .map((line) =>
            JSON.parse(line, (key, value, context) => {
                if (typeof value === 'number' && /[.eE]/.test(context.source)) fractionalColumns.add(key);
                return value;
            }),
        );
    return { records, fractionalColumns };
}

// Keeps the columns a tutorial reader benefits from and gives them snake_case names. Sequence columns
// keep the segment and gene names that the reference genomes define.
function toTutorialRecord(record, sequenceNames) {
    const tutorialRecord = {};
    for (const [column, value] of Object.entries(record)) {
        if (sequenceNames.has(column)) {
            tutorialRecord[column] = value;
        } else if (!isDroppedColumn(column)) {
            tutorialRecord[tutorialColumnName(column)] = value;
        }
    }
    return tutorialRecord;
}

function isDroppedColumn(column) {
    if (column in RENAMED_COLUMNS) return false;
    return DROPPED_COLUMNS.has(column) || column.startsWith(DROPPED_COLUMN_PREFIX);
}

function tutorialColumnName(column) {
    return (RENAMED_COLUMNS[column] ?? column).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function checkPrimaryKey(records) {
    const values = new Set();
    for (const record of records) {
        const value = record[PRIMARY_KEY];
        if (typeof value !== 'string' || !value) {
            throw new Error(`Every record needs a '${PRIMARY_KEY}' value to serve as the primary key.`);
        }
        if (values.has(value)) throw new Error(`The primary key '${PRIMARY_KEY}' repeats the value '${value}'.`);
        values.add(value);
    }
}

// The aligned sequences must have exactly the length of the sequence they were aligned against,
// otherwise the dump and the reference genomes belong to different datasets.
function checkSequenceLengths(records, referenceGenomes) {
    const expectedLengths = new Map(
        [...referenceGenomes.nucleotideSequences, ...referenceGenomes.genes].map((sequence) => [
            sequence.name,
            sequence.sequence.length,
        ]),
    );
    for (const record of records) {
        for (const [name, expectedLength] of expectedLengths) {
            const aligned = record[name];
            if (aligned?.sequence !== undefined && aligned.sequence.length !== expectedLength) {
                throw new Error(
                    `Record '${record[PRIMARY_KEY]}' has a ${aligned.sequence.length} character '${name}' sequence, ` +
                        `but the reference is ${expectedLength} characters long.`,
                );
            }
        }
    }
}

function describeMetadata(records, sequenceNames) {
    const types = new Map();
    for (const record of records) {
        for (const [column, value] of Object.entries(record)) {
            if (sequenceNames.has(column) || value === null) continue;
            const type = valueType(column, value);
            const known = types.get(column);
            if (known && known !== type) {
                throw new Error(`Column '${column}' mixes the types '${known}' and '${type}'.`);
            }
            types.set(column, type);
        }
    }

    const columns = new Set([...types.keys(), ...Object.keys(UNTYPED_COLUMNS)]);
    return [...columns].sort().map((column) => {
        const entry = { name: column, type: types.get(column) ?? UNTYPED_COLUMNS[column] };
        if (INDEXED_COLUMNS.has(column)) entry.generateIndex = true;
        if (column === LINEAGE_COLUMN) entry.generateLineageIndex = LINEAGE_DEFINITIONS_FILENAME;
        return entry;
    });
}

function valueType(column, value) {
    if (DATE_COLUMNS.has(column)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            throw new Error(`Column '${column}' holds '${value}', which is not a YYYY-MM-DD date.`);
        }
        return 'date';
    }
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return fractionalColumns.has(column) ? 'float' : 'int';
    if (typeof value === 'string') return 'string';
    throw new Error(`Column '${column}' holds a value that no RhyDB type covers: ${JSON.stringify(value)}`);
}

function collectLineages(records, column) {
    const lineages = new Set();
    for (const record of records) {
        if (record[column]) lineages.add(record[column]);
    }
    return lineages;
}

// Builds the lineage hierarchy from the lineage names themselves: 'AY.4.2' descends from 'AY.4',
// which descends from 'AY'. Intermediate levels are added even when the dump holds no record for
// them, so that a query for a lineage including its sublineages reaches every descendant.
function buildLineageDefinitions(lineages) {
    const parents = new Map();
    const pending = [...lineages];
    while (pending.length) {
        const lineage = pending.pop();
        if (parents.has(lineage)) continue;
        const lastDot = lineage.lastIndexOf('.');
        const parent = lastDot === -1 ? null : lineage.slice(0, lastDot);
        parents.set(lineage, parent);
        if (parent) pending.push(parent);
    }

    return Object.fromEntries(
        [...parents.keys()]
            .sort()
            .map((lineage) => [lineage, parents.get(lineage) ? { parents: [parents.get(lineage)] } : {}]),
    );
}

async function writeGenerated(filename, content) {
    await writeFile(
        path.join(datasetDirectory, filename),
        `# Generated by scripts/prepare-example-data.mjs\n${content}`,
    );
}
