import { version } from '@rhydb/rhydb-wasm/package.json';

// Default Console server, configurable at build time.
export const DEFAULT_CONSOLE_SERVER =
    import.meta.env.PUBLIC_RHYDB_DEFAULT_SERVER || 'https://gs-staging-1.int.genspectrum.org/open/v2/silo';

// Exercises always use this build-time target. It is never editable in the UI.
export const EXERCISE_SERVER =
    import.meta.env.PUBLIC_RHYDB_EXERCISE_SERVER || 'https://gs-staging-1.int.genspectrum.org/open/v2/silo';

// Browser-local RhyDB is an opt-in deployment capability because its pthread WASM build requires
// cross-origin-isolation response headers.
export const RHYDB_WASM_ENABLED = import.meta.env.PUBLIC_RHYDB_WASM_ENABLED === 'true';

// @rhydb/rhydb-wasm is versioned in lockstep with RhyDB itself.
export const RHYDB_WASM_VERSION = version;
