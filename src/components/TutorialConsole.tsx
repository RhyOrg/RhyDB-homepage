import { useSyncExternalStore } from 'react';
import QueryRunner from './QueryRunner';
import { DEFAULT_EDITOR_HEIGHT } from './QueryEditor';
import { getTutorialDatabaseState, subscribeToTutorialDatabase } from '../lib/tutorialDatabase';

const TUTORIAL_PAGE_SIZE = 25;

type TutorialConsoleProps = {
    // Height in pixels the editor starts at. It still grows with the query typed into it.
    editorHeight?: number;
    resultsPageSize?: number;
};

// Queries the tutorial database that TutorialDataLoader builds in this tab.
export default function TutorialConsole({
    editorHeight = DEFAULT_EDITOR_HEIGHT,
    resultsPageSize = TUTORIAL_PAGE_SIZE,
}: TutorialConsoleProps) {
    const state = useSyncExternalStore(subscribeToTutorialDatabase, getTutorialDatabaseState);
    const ready = state.status === 'ready';

    return (
        <div className='my-4'>
            <div className='flex items-center justify-between rounded-t-box border border-b-0 border-base-300 bg-base-200 px-3 py-1.5 text-xs'>
                <span className='font-semibold'>Console</span>
                <span className='text-base-content/55'>{ready ? 'Ready' : 'No data loaded'}</span>
            </div>
            <div className='rounded-b-box border border-base-300 p-3'>
                {ready ? (
                    <QueryRunner
                        target={state.client}
                        addDefaultLimit={false}
                        editorHeight={editorHeight}
                        resultsPageSize={resultsPageSize}
                    />
                ) : (
                    <p
                        className='flex cursor-not-allowed items-center justify-center rounded-field bg-base-200 text-sm text-base-content/45'
                        style={{ height: editorHeight }}
                    >
                        Load the dataset above to run queries here.
                    </p>
                )}
            </div>
        </div>
    );
}
