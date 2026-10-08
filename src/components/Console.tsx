import { lazy, Suspense, type SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';
import QueryRunner, { type QueryRunnerHandle } from './QueryRunner';
import { DEFAULT_CONSOLE_SERVER, RHYDB_WASM_ENABLED, RHYDB_WASM_VERSION } from '../config';
import { fetchRhyDBInfo, type RhyDBInfo } from '../lib/rhydbInfo';
import {
    buildConsoleSelectionHash,
    buildConsoleShareUrl,
    connectionModeForLocalData,
    isLocalDataConsoleHash,
    LOCAL_DATA_CONSOLE_HASH,
    normalizeServerUrl,
    type ConsoleConnectionMode,
} from '../lib/serverUrl';
import type { QueryRow } from '../lib/types';
import { publicInstances, sarsCov2PublicInstance, type PublicInstance } from '../data/publicInstances';
import { getRandomSarsCov2Query } from '../data/randomQueries';
import { remoteQueryTarget, type QueryTarget } from '../lib/queryTarget';
import type { LocalRhyDBClient } from '../lib/localRhyDBClient';
import type { LocalRhyDBEvent, LocalRhyDBProgress } from '../lib/localRhyDBProtocol';

const STORAGE_KEY = 'rhydb-console-server';
const LocalDataSetup =
    import.meta.env.PUBLIC_RHYDB_WASM_ENABLED === 'true' ? lazy(() => import('./LocalDataSetup')) : null;

type RemoteConnection = {
    kind: 'remote';
    server: string;
    info: RhyDBInfo;
    target: QueryTarget;
    publicInstance?: PublicInstance;
};

type LocalConnection = {
    kind: 'local';
    info: RhyDBInfo;
    target: LocalRhyDBClient;
    canDownloadState: boolean;
};

type Connection = RemoteConnection | LocalConnection;

type SchemaState =
    | { status: 'idle' | 'loading'; rows: QueryRow[]; error: null }
    | { status: 'ready'; rows: QueryRow[]; error: null }
    | { status: 'error'; rows: QueryRow[]; error: string };

export default function Console() {
    const { location, navigate } = useConsoleLocation();
    const sharedParams = new URLSearchParams(location.hash.slice(1));
    const sharedServer = sharedParams.get('server');
    const initialQuery = sharedParams.get('query') || '';
    const localDataRequested = isLocalDataConsoleHash(location.hash);
    const [serverInput, setServerInput] = useState(() => sharedServer || storedServer() || DEFAULT_CONSOLE_SERVER);
    const [connectionMode, setConnectionMode] = useState<ConsoleConnectionMode>(
        connectionModeForLocalData(localDataRequested, sharedServer ? 'custom' : 'public'),
    );
    const [selectedPublicId, setSelectedPublicId] = useState(publicInstances[0].id);
    const [connection, setConnection] = useState<Connection | null>(null);
    const [connecting, setConnecting] = useState(Boolean(sharedServer));
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [schema, setSchema] = useState<SchemaState>({ status: 'idle', rows: [], error: null });
    const [query, setQuery] = useState(initialQuery);
    const [linkCopied, setLinkCopied] = useState(false);
    const [autoRunSharedQuery, setAutoRunSharedQuery] = useState(Boolean(sharedServer && initialQuery.trim()));
    const [exportingState, setExportingState] = useState(false);
    const [exportProgress, setExportProgress] = useState<LocalRhyDBProgress | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const queryRunner = useRef<QueryRunnerHandle>(null);
    const remoteConnectionRequest = useRef(0);
    const schemaRequest = useRef(0);
    const activeLocalClient = useRef<LocalRhyDBClient | null>(null);

    useEffect(
        () => () => {
            remoteConnectionRequest.current += 1;
            schemaRequest.current += 1;
            activeLocalClient.current?.dispose();
        },
        [],
    );

    useEffect(() => {
        if (!linkCopied) return undefined;
        const timeout = window.setTimeout(() => setLinkCopied(false), 1800);
        return () => window.clearTimeout(timeout);
    }, [linkCopied]);

    const loadSchema = useCallback(async (target: QueryTarget) => {
        const request = ++schemaRequest.current;
        setSchema({ status: 'loading', rows: [], error: null });
        try {
            const result = await target.run('data.schema()');
            if (request !== schemaRequest.current) return;
            setSchema({ status: 'ready', rows: result.rows, error: null });
        } catch (error) {
            if (request !== schemaRequest.current) return;
            setSchema({
                status: 'error',
                rows: [],
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }, []);

    const connectTo = useCallback(
        async (serverValue: string) => {
            const request = ++remoteConnectionRequest.current;
            schemaRequest.current += 1;
            setConnecting(true);
            setConnectionError(null);
            setLinkCopied(false);
            setSchema({ status: 'idle', rows: [], error: null });
            try {
                const server = normalizeServerUrl(serverValue);
                const publicInstance = publicInstances.find(
                    (instance) => normalizeServerUrl(instance.server) === server,
                );
                setServerInput(server);
                setConnectionMode(publicInstance ? 'public' : 'custom');
                if (publicInstance) setSelectedPublicId(publicInstance.id);
                const info = await fetchRhyDBInfo(server);
                if (request !== remoteConnectionRequest.current) return;
                const target = remoteQueryTarget(server);
                setConnection({ kind: 'remote', server, info, target, publicInstance });
                localStorage.setItem(STORAGE_KEY, server);
                void loadSchema(target);
            } catch (error) {
                if (request !== remoteConnectionRequest.current) return;
                setConnection(null);
                setSchema({ status: 'idle', rows: [], error: null });
                setConnectionError(error instanceof Error ? error.message : String(error));
            } finally {
                if (request === remoteConnectionRequest.current) setConnecting(false);
            }
        },
        [loadSchema],
    );

    useEffect(() => {
        if (sharedServer) {
            void connectTo(sharedServer);
            return;
        }

        setConnectionMode((currentMode) => connectionModeForLocalData(localDataRequested, currentMode));
        remoteConnectionRequest.current += 1;
        schemaRequest.current += 1;
        setConnecting(false);
        setConnection((current) => (current?.kind === 'remote' ? null : current));
        setSchema({ status: 'idle', rows: [], error: null });
        setConnectionError(null);
        setLinkCopied(false);
    }, [connectTo, localDataRequested, sharedServer]);

    useEffect(() => {
        setQuery(initialQuery);
        setAutoRunSharedQuery(Boolean(sharedServer && initialQuery.trim()));
    }, [initialQuery, sharedServer]);

    const selectRemoteServer = (serverValue: string) => {
        try {
            const server = normalizeServerUrl(serverValue);
            const hash = buildConsoleSelectionHash(server);
            setConnecting(true);
            setConnectionError(null);
            if (location.hash === hash) {
                void connectTo(server);
                return;
            }
            navigate({ pathname: location.pathname, search: '', hash });
        } catch (error) {
            setConnecting(false);
            setConnectionError(error instanceof Error ? error.message : String(error));
        }
    };

    const connectPublic = (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        const instance = publicInstances.find((item) => item.id === selectedPublicId) || publicInstances[0];
        selectRemoteServer(instance.server);
    };

    const connectCustom = (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        selectRemoteServer(serverInput);
    };

    const selectMode = (mode: ConsoleConnectionMode) => {
        setConnectionMode(mode);
        setConnectionError(null);
        if (mode === 'local' && location.hash !== LOCAL_DATA_CONSOLE_HASH) {
            navigate({ pathname: location.pathname, hash: LOCAL_DATA_CONSOLE_HASH });
        } else if (mode !== 'local' && localDataRequested) {
            navigate({ pathname: location.pathname, hash: '' });
        }
    };

    const changeTarget = () => {
        if (
            connection?.kind === 'local' &&
            !window.confirm('Change data and clear the local RhyDB database from this tab?')
        ) {
            return;
        }
        if (connection?.kind === 'remote') {
            navigate({ pathname: location.pathname, search: '', hash: '' });
            return;
        }
        activeLocalClient.current?.dispose();
        activeLocalClient.current = null;
        setConnection(null);
        setSchema({ status: 'idle', rows: [], error: null });
        setConnectionError(null);
        setLinkCopied(false);
        setExportError(null);
        setExportProgress(null);
    };

    const connectLocal = (client: LocalRhyDBClient, info: RhyDBInfo, canDownloadState: boolean) => {
        remoteConnectionRequest.current += 1;
        schemaRequest.current += 1;
        activeLocalClient.current?.dispose();
        activeLocalClient.current = client;
        setConnection({
            kind: 'local',
            info: { ...info, version: RHYDB_WASM_VERSION },
            target: client,
            canDownloadState,
        });
        setConnectionError(null);
        setExportError(null);
        void loadSchema(client);
    };

    const copyShareLink = async () => {
        if (!connection || connection.kind !== 'remote') return;
        const url = buildConsoleShareUrl(window.location.href, connection.server, query);
        try {
            await navigator.clipboard.writeText(url);
            setLinkCopied(true);
        } catch {
            setLinkCopied(false);
        }
    };

    const insertRandomQuery = () => {
        queryRunner.current?.setQuery(getRandomSarsCov2Query(query));
    };

    const downloadProcessedState = async () => {
        if (!connection || connection.kind !== 'local' || exportingState) return;
        setExportingState(true);
        setExportError(null);
        try {
            const blob = await connection.target.saveState((event: LocalRhyDBEvent) => {
                if (event.type === 'progress') setExportProgress(event.value);
            });
            downloadBlob(blob, `rhydb-state-${RHYDB_WASM_VERSION}.zip`);
        } catch (error) {
            setExportError(error instanceof Error ? error.message : String(error));
        } finally {
            setExportingState(false);
            setExportProgress(null);
        }
    };

    return (
        <div>
            {!connection && (
                <div className='mt-4 alert border-info/25 bg-info/8 px-3 py-2 text-sm'>
                    <p className='text-base-content/65'>
                        {RHYDB_WASM_ENABLED ? (
                            <>
                                <span className='font-semibold text-base-content'>Runs in your browser.</span> Remote
                                queries go directly to the selected RhyDB instance. Local files and processing stay on
                                this device.
                            </>
                        ) : (
                            'Queries and results go only between your browser and the selected RhyDB instance. If you connect to your own instance, nothing will go to us.'
                        )}
                    </p>
                </div>
            )}

            {!connection ? (
                <section className='card mt-4 max-w-3xl border border-base-300 bg-base-100'>
                    <div className='card-body'>
                        <h2 className='card-title'>Choose where to query</h2>
                        <div
                            className={`tabs-box mt-2 tabs grid w-full ${RHYDB_WASM_ENABLED ? 'grid-cols-3' : 'grid-cols-2'} sm:w-fit`}
                            role='tablist'
                            aria-label='Connection method'
                        >
                            <button
                                className={`tab ${connectionMode === 'public' ? 'tab-active' : ''}`}
                                type='button'
                                role='tab'
                                aria-selected={connectionMode === 'public'}
                                disabled={connecting}
                                onClick={() => selectMode('public')}
                            >
                                Public instances
                            </button>
                            <button
                                className={`tab ${connectionMode === 'custom' ? 'tab-active' : ''}`}
                                type='button'
                                role='tab'
                                aria-selected={connectionMode === 'custom'}
                                disabled={connecting}
                                onClick={() => selectMode('custom')}
                            >
                                Custom URL
                            </button>
                            {RHYDB_WASM_ENABLED && (
                                <button
                                    className={`tab ${connectionMode === 'local' ? 'tab-active' : ''}`}
                                    type='button'
                                    role='tab'
                                    aria-selected={connectionMode === 'local'}
                                    disabled={connecting}
                                    onClick={() => selectMode('local')}
                                >
                                    Your data
                                </button>
                            )}
                        </div>

                        {connectionMode === 'public' ? (
                            <PublicInstanceForm
                                selectedId={selectedPublicId}
                                connecting={connecting}
                                onSelect={setSelectedPublicId}
                                onSubmit={connectPublic}
                            />
                        ) : connectionMode === 'custom' ? (
                            <CustomServerForm
                                server={serverInput}
                                connecting={connecting}
                                onServerChange={setServerInput}
                                onSubmit={connectCustom}
                            />
                        ) : LocalDataSetup ? (
                            <Suspense
                                fallback={
                                    <div className='mt-4 flex items-center gap-2 text-sm text-base-content/60'>
                                        <span className='loading loading-sm loading-spinner' /> Loading local RhyDB…
                                    </div>
                                }
                            >
                                <LocalDataSetup onReady={connectLocal} />
                            </Suspense>
                        ) : (
                            <div className='mt-4 alert border-error/25 bg-error/8 text-sm text-error'>
                                Local RhyDB is unavailable in this build.
                            </div>
                        )}

                        {connectionError && (
                            <div className='mt-2 alert border-error/25 bg-error/8 text-sm text-error' role='alert'>
                                {connectionError}
                            </div>
                        )}
                    </div>
                </section>
            ) : (
                <>
                    <section className='mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-box border border-success/25 bg-success/8 px-3 py-2'>
                        <div className='flex w-full min-w-0 flex-none flex-col items-start gap-x-3 gap-y-1 sm:w-auto sm:flex-1 sm:flex-row sm:items-center'>
                            <div className='flex shrink-0 items-center gap-2 font-semibold text-success'>
                                <span className='status status-success' />
                                {connection.kind === 'local' ? 'Local data ready' : 'Connected'}
                            </div>
                            <div className='w-full min-w-0 flex-1 truncate text-sm text-base-content/65'>
                                {connection.kind === 'local' ? (
                                    'Files and queries stay in this tab'
                                ) : connection.publicInstance ? (
                                    <>
                                        {connection.publicInstance.name} · hosted by{' '}
                                        {connection.publicInstance.hostedBy}
                                    </>
                                ) : (
                                    connection.server
                                )}
                            </div>
                        </div>
                        <dl className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs'>
                            <div className='flex items-baseline gap-1.5'>
                                <dt className='text-base-content/50'>Sequences</dt>
                                <dd className='font-semibold'>{connection.info.sequenceCount.toLocaleString()}</dd>
                            </div>
                            <div className='flex items-baseline gap-1.5'>
                                <dt className='text-base-content/50'>Version</dt>
                                <dd className='font-mono font-semibold' title={connection.info.version}>
                                    {shortVersion(connection.info.version)}
                                </dd>
                            </div>
                        </dl>
                        {connection.kind === 'local' && connection.canDownloadState && (
                            <button
                                className='btn btn-primary btn-sm'
                                type='button'
                                disabled={exportingState}
                                onClick={downloadProcessedState}
                            >
                                {exportingState && <span className='loading loading-xs loading-spinner' />}
                                {exportingState ? 'Preparing ZIP…' : 'Download processed state'}
                            </button>
                        )}
                        <button
                            className='btn btn-outline btn-sm'
                            type='button'
                            disabled={exportingState}
                            onClick={changeTarget}
                        >
                            {connection.kind === 'local' ? 'Change data' : 'Change server'}
                        </button>
                    </section>

                    {exportProgress && (
                        <div className='mt-3 alert border-info/25 bg-info/8 text-sm' role='status'>
                            <span className='loading loading-sm loading-spinner' /> {exportProgress.message}
                        </div>
                    )}
                    {exportError && (
                        <div className='mt-3 alert border-error/25 bg-error/8 text-sm text-error' role='alert'>
                            {exportError}
                        </div>
                    )}

                    <details className='collapse mt-3 border border-base-300 bg-base-100'>
                        <summary className='collapse-title font-semibold'>Data schema</summary>
                        <div className='collapse-content'>
                            {schema.status === 'loading' && (
                                <div
                                    className='flex items-center gap-2 py-3 text-sm text-base-content/60'
                                    role='status'
                                >
                                    <span className='loading loading-sm loading-spinner' /> Loading schema…
                                </div>
                            )}
                            {schema.status === 'error' && (
                                <div className='alert border-error/25 bg-error/8 text-sm text-error' role='alert'>
                                    The data is ready, but its schema could not be loaded. {schema.error}
                                </div>
                            )}
                            {schema.status === 'ready' && <SchemaTable rows={schema.rows} />}
                        </div>
                    </details>

                    <section className='mt-5'>
                        <div className='mb-3 flex flex-wrap items-end justify-between gap-3'>
                            <div>
                                <h2 className='text-2xl font-bold tracking-tight'>Query</h2>
                                <p className='mt-1 text-sm text-base-content/60'>
                                    A <code>.limit(100)</code> is added when the query does not set a limit.
                                </p>
                            </div>
                            <div className='flex flex-wrap gap-2'>
                                {connection.kind === 'remote' &&
                                    connection.publicInstance?.id === sarsCov2PublicInstance.id && (
                                        <button
                                            className='btn btn-outline btn-sm'
                                            type='button'
                                            onClick={insertRandomQuery}
                                        >
                                            Insert random query
                                        </button>
                                    )}
                                {connection.kind === 'remote' && (
                                    <div
                                        className='tooltip tooltip-bottom tooltip-end'
                                        data-tip='The link includes the server URL and query in its browser-only fragment'
                                    >
                                        <button
                                            className='btn btn-outline btn-sm'
                                            type='button'
                                            onClick={copyShareLink}
                                        >
                                            {linkCopied ? 'Link copied' : 'Copy share link'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <QueryRunner
                            ref={queryRunner}
                            key={`${connection.target.id}-${location.key}`}
                            target={connection.target}
                            initialQuery={initialQuery}
                            onQueryChange={setQuery}
                            autoRun={autoRunSharedQuery}
                            onAutoRun={() => setAutoRunSharedQuery(false)}
                        />
                    </section>
                </>
            )}
        </div>
    );
}

function PublicInstanceForm({
    selectedId,
    connecting,
    onSelect,
    onSubmit,
}: {
    selectedId: string;
    connecting: boolean;
    onSelect: (id: string) => void;
    onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
}) {
    return (
        <form className='mt-4' onSubmit={onSubmit}>
            <fieldset className='min-w-0'>
                <legend className='mb-2 text-sm font-medium'>Public RhyDB instances</legend>
                <div className='overflow-hidden rounded-box border border-base-300'>
                    {publicInstances.map((instance) => (
                        <label
                            className='flex cursor-pointer items-start gap-3 border-b border-base-300 p-4 last:border-b-0 hover:bg-base-200/60'
                            key={instance.id}
                        >
                            <input
                                className='radio mt-0.5 radio-sm radio-primary'
                                type='radio'
                                name='public-instance'
                                value={instance.id}
                                checked={selectedId === instance.id}
                                onChange={() => onSelect(instance.id)}
                            />
                            <span className='min-w-0'>
                                <span className='block font-semibold'>{instance.name}</span>
                                <span className='block text-sm text-base-content/60'>
                                    Hosted by {instance.hostedBy}
                                </span>
                                <span className='mt-1 block truncate font-mono text-xs text-base-content/45'>
                                    {instance.server}
                                </span>
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>
            <ConnectButton connecting={connecting} />
        </form>
    );
}

function CustomServerForm({
    server,
    connecting,
    onServerChange,
    onSubmit,
}: {
    server: string;
    connecting: boolean;
    onServerChange: (server: string) => void;
    onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
}) {
    return (
        <form className='mt-4' onSubmit={onSubmit}>
            <p className='text-sm text-base-content/65'>
                Enter the base URL immediately before the <code>/info</code> and <code>/query</code> endpoints. The
                instance must allow requests from this site through its CORS policy.
            </p>
            <label className='form-control mt-4 w-full'>
                <span className='label-text mb-2 font-medium'>RhyDB server URL</span>
                <input
                    className='input w-full'
                    type='url'
                    required
                    spellCheck={false}
                    value={server}
                    placeholder='https://rhydb.example.org'
                    onChange={(event) => onServerChange(event.target.value)}
                />
            </label>
            <ConnectButton connecting={connecting} />
        </form>
    );
}

function ConnectButton({ connecting }: { connecting: boolean }) {
    return (
        <div className='mt-4 card-actions justify-start'>
            <button className='btn btn-primary' type='submit' disabled={connecting}>
                {connecting && <span className='loading loading-sm loading-spinner' />}
                {connecting ? 'Connecting…' : 'Connect'}
            </button>
        </div>
    );
}

function SchemaTable({ rows }: { rows: QueryRow[] }) {
    return (
        <div className='max-h-96 overflow-auto rounded-box border border-base-300'>
            <table className='table-pin-rows table table-sm'>
                <thead>
                    <tr>
                        <th className='bg-base-200'>Field</th>
                        <th className='bg-base-200'>Type</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={`${String(row.fieldName)}-${index}`}>
                            <td>
                                <code>{String(row.fieldName)}</code>
                            </td>
                            <td>
                                <code>{String(row.type)}</code>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function storedServer() {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
}

type BrowserLocation = {
    pathname: string;
    hash: string;
    key: string;
};

function readBrowserLocation(): BrowserLocation {
    return {
        pathname: window.location.pathname,
        hash: window.location.hash,
        key: `${window.location.pathname}${window.location.hash}`,
    };
}

function useConsoleLocation() {
    const [location, setLocation] = useState(readBrowserLocation);

    useEffect(() => {
        const update = () => setLocation(readBrowserLocation());
        window.addEventListener('hashchange', update);
        window.addEventListener('popstate', update);
        return () => {
            window.removeEventListener('hashchange', update);
            window.removeEventListener('popstate', update);
        };
    }, []);

    const navigate = useCallback(({ pathname, hash }: { pathname: string; search?: string; hash: string }) => {
        window.history.pushState(null, '', `${pathname}${hash}`);
        setLocation(readBrowserLocation());
    }, []);

    return { location, navigate };
}

function shortVersion(version: string) {
    return version.length > 12 ? version.slice(0, 10) : version;
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
