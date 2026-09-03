// Assembles the static asset directory Astro publishes: the checked-in files under public/, plus the
// RhyDB WASM build from the @rhydb/rhydb-wasm package when local RhyDB is enabled.

import { copyFile, cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const enabled = process.env.PUBLIC_RHYDB_WASM_ENABLED === 'true';
const projectRoot = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(projectRoot, '.generated-public');
const generatedWasmDirectory = path.join(generatedRoot, 'rhydb-wasm');

// The Emscripten loader spawns its pthread workers from `new URL('rhydb_wasm.js', import.meta.url)`,
// so both files are served as static assets under their published names rather than bundled.
const files = ['@rhydb/rhydb-wasm', '@rhydb/rhydb-wasm/rhydb_wasm.wasm'];

await rm(generatedRoot, { recursive: true, force: true });
await mkdir(generatedRoot, { recursive: true });
await cp(path.join(projectRoot, 'public'), generatedRoot, { recursive: true });

if (!enabled) process.exit(0);

await mkdir(generatedWasmDirectory, { recursive: true });

for (const specifier of files) {
    const source = fileURLToPath(import.meta.resolve(specifier));
    await copyFile(source, path.join(generatedWasmDirectory, path.basename(source)));
}
