import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { runBoundedTarget, type QueryTarget } from '../lib/queryTarget';
import { resultsMatch } from '../lib/compareResults';
import { celebrate } from '../lib/celebrate';
import { parseErrorPosition } from '../lib/parseError';
import QueryEditor from './QueryEditor';
import ResultsTable from './ResultsTable';
import type { ErrorPosition, QueryResult, QueryRow } from '../lib/types';
import type { RhyDBQueryError } from '../lib/runQuery';

// Caches reference-answer results by `${base}\n${query}` so re-running an
// exercise doesn't repeatedly re-query the server for the same answer.
const referenceCache = new Map<string, QueryRow[]>();

async function getReferenceRows(target: QueryTarget, referenceQuery: string) {
    const key = target.id + '\n' + referenceQuery;
    const cached = referenceCache.get(key);
    if (cached) return cached;
    const res = await runBoundedTarget(target, referenceQuery);
    referenceCache.set(key, res.rows);
    return res.rows;
}

type Verdict = {
    status: 'correct' | 'wrong' | 'unknown';
    message: string;
};

const VERDICT_CLASSES: Record<Verdict['status'], string> = {
    correct: 'alert border-success/30 bg-success/10 text-success',
    wrong: 'alert border-error/30 bg-error/10 text-error',
    unknown: 'alert border-base-300 bg-base-200 text-base-content/70',
};

type ErrorMark = {
    position: ErrorPosition;
    message: string;
};

type QueryRunnerProps = {
    target: QueryTarget;
    initialQuery?: string;
    referenceQuery?: string;
    onQueryChange?: (query: string) => void;
    autoRun?: boolean;
    onAutoRun?: () => void;
    // Adds `.limit(100)` to queries that set no limit. Turn it off only where the data is small
    // enough that an unbounded result cannot overwhelm the browser.
    addDefaultLimit?: boolean;
    editorHeight?: number;
    resultsPageSize?: number;
};

// Lets a parent replace the editor content, as if the user had typed it.
export type QueryRunnerHandle = {
    setQuery: (query: string) => void;
};

// Reusable query widget: editor + Run button + status/meta/error + results table.
// When `referenceQuery` is provided (exercise mode), the user's result is
// compared against the reference answer and a Correct!/Wrong! verdict is shown.
function QueryRunner(
    {
        target,
        initialQuery = '',
        referenceQuery,
        onQueryChange,
        autoRun = false,
        onAutoRun,
        addDefaultLimit = true,
        editorHeight,
        resultsPageSize,
    }: QueryRunnerProps,
    ref: React.Ref<QueryRunnerHandle>,
) {
    const [query, setQuery] = useState(initialQuery);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorMark, setErrorMark] = useState<ErrorMark | null>(null);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [verdict, setVerdict] = useState<Verdict | null>(null);
    const [showCurl, setShowCurl] = useState(false);
    const [curlCopied, setCurlCopied] = useState(false);
    const autoRunStarted = useRef(false);

    const handleChange = useCallback(
        (value: string) => {
            setQuery(value);
            setErrorMark(null);
            setCurlCopied(false);
            onQueryChange?.(value);
        },
        [onQueryChange],
    );

    useImperativeHandle(ref, () => ({ setQuery: handleChange }), [handleChange]);

    useEffect(() => {
        if (verdict?.status === 'correct') celebrate();
    }, [verdict]);

    const run = useCallback(async () => {
        setError(null);
        setErrorMark(null);
        setResult(null);
        setVerdict(null);
        if (!query.trim()) return;

        setRunning(true);
        try {
            const res = addDefaultLimit ? await runBoundedTarget(target, query) : await target.run(query);
            setResult(res);

            if (referenceQuery) {
                try {
                    const referenceRows = await getReferenceRows(target, referenceQuery);
                    setVerdict(
                        resultsMatch(res.rows, referenceRows)
                            ? { status: 'correct', message: 'Correct!' }
                            : { status: 'wrong', message: 'Wrong!' },
                    );
                } catch {
                    setVerdict({
                        status: 'unknown',
                        message: 'Could not verify (the reference answer failed to run).',
                    });
                }
            }
        } catch (err) {
            const queryError = err as RhyDBQueryError;
            setError(queryError.message);
            const position = parseErrorPosition(queryError.rhydbMessage);
            if (position) setErrorMark({ position, message: queryError.rhydbMessage || queryError.message });
        } finally {
            setRunning(false);
        }
    }, [addDefaultLimit, query, referenceQuery, target]);

    useEffect(() => {
        if (!autoRun || autoRunStarted.current || !query.trim()) return;
        autoRunStarted.current = true;
        onAutoRun?.();
        void run();
    }, [autoRun, onAutoRun, query, run]);

    const curlCommand = target.curlCommand?.(query) || '';

    const copyCurlCommand = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(curlCommand);
            setCurlCopied(true);
        } catch {
            setCurlCopied(false);
        }
    }, [curlCommand]);

    const toggleCurlCommand = useCallback(() => {
        setShowCurl((value) => !value);
        setCurlCopied(false);
    }, []);

    return (
        <div>
            <QueryEditor
                value={query}
                onChange={handleChange}
                onRun={run}
                status={verdict?.status}
                errorPosition={errorMark?.position}
                errorMessage={errorMark?.message}
                minHeight={editorHeight}
            />
            <div className='mt-3 flex flex-wrap items-center gap-2'>
                <button type='button' className='btn btn-primary btn-sm' onClick={run} disabled={running}>
                    Run (Ctrl/Cmd+Enter)
                </button>
                {target.curlCommand && (
                    <button type='button' className='btn btn-ghost btn-sm' onClick={toggleCurlCommand}>
                        cURL
                    </button>
                )}
                {running && (
                    <span className='flex items-center gap-2 text-xs text-base-content/60' role='status'>
                        <span className='loading loading-xs loading-spinner' />
                        Running…
                    </span>
                )}
            </div>

            {showCurl && target.curlCommand && (
                <div className='mt-3 flex items-start gap-3 rounded-box border border-base-300 bg-base-200 p-3'>
                    <pre className='min-w-0 flex-1 overflow-x-auto font-mono text-xs break-all whitespace-pre-wrap'>
                        {curlCommand}
                    </pre>
                    <button type='button' className='btn shrink-0 btn-outline btn-xs' onClick={copyCurlCommand}>
                        {curlCopied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            )}

            {verdict && (
                <div className={`${VERDICT_CLASSES[verdict.status]} mt-3 py-2 text-sm font-semibold`} role='status'>
                    {verdict.message}
                </div>
            )}

            {error && (
                <div
                    className='mt-3 alert border-error/30 bg-error/10 py-2 font-mono text-xs whitespace-pre-wrap text-error'
                    role='alert'
                >
                    {error}
                </div>
            )}

            {result && (
                <>
                    <div className='mt-3 text-xs text-base-content/60'>
                        {result.rows.length} row{result.rows.length === 1 ? '' : 's'} ·{' '}
                        {result.source === 'local' ? (
                            <>{result.elapsedMs} ms in this browser</>
                        ) : (
                            <>
                                {result.executionMs} ms until first content download + {result.downloadMs} ms download
                                (= {result.elapsedMs} ms total)
                            </>
                        )}
                        {result.dataVersion ? ` · data-version ${result.dataVersion}` : ''}
                    </div>
                    <ResultsTable rows={result.rows} pageSize={resultsPageSize} />
                </>
            )}
        </div>
    );
}

export default forwardRef(QueryRunner);
