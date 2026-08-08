import { useMemo, useSyncExternalStore } from 'react';
import QueryRunner from './QueryRunner';
import { DEFAULT_EDITOR_HEIGHT } from './QueryEditor';
import type { QueryTarget } from '../lib/queryTarget';
import { getTutorialDatabaseState, subscribeToTutorialDatabase } from '../lib/tutorialDatabase';

const TUTORIAL_PAGE_SIZE = 25;

type TutorialConsoleProps = {
    initialQuery?: string;
    // Height in pixels the editor starts at. It still grows with the query typed into it.
    editorHeight?: number;
    resultsPageSize?: number;
};

// Queries the tutorial database that TutorialDataLoader builds in this tab. Until it exists, the
// editor is shown inert so that the reader sees where the answer will appear.
export default function TutorialConsole({
    initialQuery = '',
    editorHeight = DEFAULT_EDITOR_HEIGHT,
    resultsPageSize = TUTORIAL_PAGE_SIZE,
}: TutorialConsoleProps) {
    const state = useSyncExternalStore(subscribeToTutorialDatabase, getTutorialDatabaseState, getTutorialDatabaseState);
    const ready = state.status === 'ready';
    const placeholderTarget = useMemo(unloadedTarget, []);

    return (
        <div className='relative my-4'>
            <div className={ready ? undefined : 'opacity-40 select-none'} inert={!ready}>
                <QueryRunner
                    target={ready ? state.client : placeholderTarget}
                    initialQuery={initialQuery}
                    addDefaultLimit={false}
                    editorHeight={editorHeight}
                    resultsPageSize={resultsPageSize}
                />
            </div>
            {!ready && (
                <div
                    className='absolute inset-x-0 top-0 flex items-center justify-center'
                    style={{ height: editorHeight }}
                >
                    <p className='rounded-box border border-base-300 bg-base-100 px-4 py-2 text-sm shadow-sm'>
                        Load the dataset above to run queries here.
                    </p>
                </div>
            )}
        </div>
    );
}

function unloadedTarget(): QueryTarget {
    return {
        id: 'tutorial-unloaded',
        kind: 'local',
        run: () => Promise.reject(new Error('Load the dataset above before running queries.')),
    };
}
