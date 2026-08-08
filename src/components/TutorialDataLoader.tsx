import { useSyncExternalStore } from 'react';
import { getTutorialDatabaseState, loadTutorialDatabase, subscribeToTutorialDatabase } from '../lib/tutorialDatabase';

// Indexes the tutorial dataset into a RhyDB database that lives in this browser tab. Every tutorial
// console on the page queries the database this button creates.
export default function TutorialDataLoader() {
    const state = useSyncExternalStore(subscribeToTutorialDatabase, getTutorialDatabaseState, getTutorialDatabaseState);

    return (
        <div className='my-4'>
            {state.status === 'unavailable' && (
                <p className='mb-3 alert border-warning/30 bg-warning/10 text-sm' role='status'>
                    The WebAssembly version of RhyDB is not available on this version of the website, so the dataset
                    cannot be loaded here. If you see this on the official website, please contact the team.
                </p>
            )}

            <button
                className='btn btn-primary'
                type='button'
                disabled={state.status !== 'idle' && state.status !== 'error'}
                onClick={() => void loadTutorialDatabase()}
            >
                {state.status === 'loading' && <span className='loading loading-sm loading-spinner' />}
                {buttonLabel(state.status)}
            </button>

            {state.status === 'loading' && (
                <p className='mt-2 text-sm text-base-content/60' role='status'>
                    {state.message}
                </p>
            )}
            {state.status === 'ready' && (
                <p className='mt-2 text-sm text-base-content/60'>
                    {state.info.sequenceCount.toLocaleString()} sequences are ready to query in this tab. Reloading the
                    page clears them.
                </p>
            )}
            {state.status === 'error' && (
                <p className='mt-2 alert border-error/25 bg-error/8 text-sm text-error' role='alert'>
                    {state.message}
                </p>
            )}
        </div>
    );
}

function buttonLabel(status: ReturnType<typeof getTutorialDatabaseState>['status']) {
    if (status === 'loading') return 'Loading…';
    if (status === 'ready') return 'Loaded';
    if (status === 'error') return 'Try again';
    return 'Load the dataset';
}
