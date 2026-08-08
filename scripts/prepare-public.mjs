// Assembles the static asset directory Astro publishes: the checked-in files under public/, plus the
// separately supplied RhyDB WASM build when local RhyDB is enabled.

import { copyFile, cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const enabled = process.env.PUBLIC_RHYDB_WASM_ENABLED === 'true';
const projectRoot = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(projectRoot, '.generated-public');
const generatedWasmDirectory = path.join(generatedRoot, 'rhydb-wasm');
const sourceDirectory = path.resolve(projectRoot, process.env.RHYDB_WASM_ASSET_DIR || '.rhydb-wasm');
const files = [
    { extension: '.js', destination: 'rhydb_wasm.js' },
    { extension: '.wasm', destination: 'rhydb_wasm.wasm' },
];

await rm(generatedRoot, { recursive: true, force: true });
await mkdir(generatedRoot, { recursive: true });
await cp(path.join(projectRoot, 'public'), generatedRoot, { recursive: true });

if (!enabled) process.exit(0);

await mkdir(generatedWasmDirectory, { recursive: true });

for (const file of files) {
    let source = path.join(sourceDirectory, file.destination);
    try {
        if (!(await stat(source)).isFile()) throw new Error('not a file');
    } catch {
        const candidates = (await readdir(sourceDirectory, { withFileTypes: true }).catch(() => [])).filter(
            (entry) => entry.isFile() && entry.name.endsWith(file.extension),
        );
        if (candidates.length !== 1) {
            throw new Error(
                `Local RhyDB WASM is enabled, but ${file.destination} could not be resolved in ${sourceDirectory}. ` +
                    'Download the artifact recorded in rhydb-wasm-source.txt or set RHYDB_WASM_ASSET_DIR.',
            );
        }
        source = path.join(sourceDirectory, candidates[0].name);
    }
    await copyFile(source, path.join(generatedWasmDirectory, file.destination));
}
