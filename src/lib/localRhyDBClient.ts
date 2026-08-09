import type { QueryTarget } from './queryTarget';
import type { LocalRhyDBCommand, LocalRhyDBEvent, LocalRhyDBRequest, LocalRhyDBResponse } from './localRhyDBProtocol';
import type { RhyDBInfo } from './rhydbInfo';
import type { QueryResult } from './types';

type PendingRequest = {
    resolve(value: unknown): void;
    reject(error: Error): void;
};

let nextClientId = 1;

export class LocalRhyDBClient implements QueryTarget {
    readonly id = `local-rhydb-${nextClientId++}`;
    readonly kind = 'local' as const;
    private worker: Worker;
    private nextRequestId = 1;
    private pending = new Map<number, PendingRequest>();
    private eventListener: ((event: LocalRhyDBEvent) => void) | null = null;

    constructor() {
        this.worker = this.createWorker();
    }

    preprocess(config: string, files: File[], onEvent?: (event: LocalRhyDBEvent) => void) {
        this.eventListener = onEvent ?? null;
        return this.request<RhyDBInfo>({ type: 'preprocess', config, files });
    }

    loadState(file: File, onEvent: (event: LocalRhyDBEvent) => void) {
        this.eventListener = onEvent;
        return this.request<RhyDBInfo>({ type: 'load-state', file });
    }

    run(query: string) {
        return this.request<QueryResult>({ type: 'query', query });
    }

    saveState(onEvent: (event: LocalRhyDBEvent) => void) {
        this.eventListener = onEvent;
        return this.request<Blob>({ type: 'save-state' });
    }

    cancel() {
        this.worker.terminate();
        const error = new DOMException('Local RhyDB operation was cancelled.', 'AbortError');
        for (const pending of this.pending.values()) pending.reject(error);
        this.pending.clear();
        this.eventListener = null;
        this.worker = this.createWorker();
    }

    dispose() {
        this.worker.terminate();
        for (const pending of this.pending.values()) pending.reject(new Error('Local RhyDB was closed.'));
        this.pending.clear();
        this.eventListener = null;
    }

    private request<T>(request: LocalRhyDBCommand): Promise<T> {
        const id = this.nextRequestId++;
        return new Promise<T>((resolve, reject) => {
            this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
            this.worker.postMessage({ ...request, id } as LocalRhyDBRequest);
        });
    }

    private createWorker() {
        const worker = new Worker(new URL('./localRhyDB.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<LocalRhyDBResponse>) => {
            const response = event.data;
            if ('event' in response) {
                this.eventListener?.(response.event);
                return;
            }
            const pending = this.pending.get(response.id);
            if (!pending) return;
            this.pending.delete(response.id);
            if (response.ok) {
                pending.resolve(response.value);
            } else {
                const error = new Error(response.error) as Error & { rhydbMessage?: string };
                error.rhydbMessage = response.rhydbMessage;
                pending.reject(error);
            }
        };
        worker.onerror = (event) => {
            const error = new Error(
                event.message || 'Local RhyDB stopped unexpectedly. The dataset may exceed available browser memory.',
            );
            for (const pending of this.pending.values()) pending.reject(error);
            this.pending.clear();
        };
        return worker;
    }
}
