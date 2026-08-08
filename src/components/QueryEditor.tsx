import { useEffect, useMemo, useRef } from 'react';
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror';
import { setDiagnostics } from '@codemirror/lint';
import { toggleLineComment } from '@codemirror/commands';
import type { EditorView } from '@codemirror/view';
import { rhydbQueryLanguage } from '../lib/rhydbQueryLanguage';
import { diagnosticFor } from '../lib/diagnostic';
import type { ErrorPosition } from '../lib/types';

// Editor heights are given in pixels.
export const DEFAULT_EDITOR_HEIGHT = 160;

type QueryEditorProps = {
    value: string;
    onChange: (value: string) => void;
    onRun: () => void;
    status?: 'correct' | 'wrong' | 'unknown';
    errorPosition?: ErrorPosition;
    errorMessage?: string;
    minHeight?: number;
};

// CodeMirror editor for RhyDB's query language. Ctrl/Cmd+Enter runs the query, Ctrl/Cmd+/ toggles comments, and an
// `errorPosition` highlights the offending character with `errorMessage` on hover.
export default function QueryEditor({
    value,
    onChange,
    onRun,
    status,
    errorPosition,
    errorMessage,
    minHeight = DEFAULT_EDITOR_HEIGHT,
}: QueryEditorProps) {
    const viewRef = useRef<EditorView | null>(null);

    const extensions = useMemo(
        () => [
            rhydbQueryLanguage(),
            // Prec.highest beats basicSetup's default Mod-Enter binding (insert blank line).
            Prec.highest(
                keymap.of([
                    {
                        key: 'Mod-Enter',
                        preventDefault: true,
                        run: () => {
                            onRun();
                            return true;
                        },
                    },
                    { key: 'Mod-/', preventDefault: true, run: toggleLineComment },
                ]),
            ),
        ],
        [onRun],
    );

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        const diagnostics = errorPosition
            ? [diagnosticFor(view.state, errorPosition, errorMessage || 'Parse error')]
            : [];
        view.dispatch(setDiagnostics(view.state, diagnostics));
    }, [errorPosition, errorMessage]);

    return (
        <div
            className={
                status === 'correct'
                    ? 'overflow-hidden rounded-field border border-success ring-1 ring-success'
                    : 'overflow-hidden rounded-field border border-base-300'
            }
        >
            <CodeMirror
                value={value}
                onChange={onChange}
                onCreateEditor={(view) => {
                    viewRef.current = view;
                }}
                extensions={extensions}
                minHeight={`${minHeight}px`}
                basicSetup={{
                    lineNumbers: true,
                    highlightActiveLine: false,
                    foldGutter: false,
                    autocompletion: false,
                }}
                placeholder='Type a RhyDB query — Ctrl/Cmd+Enter to run'
            />
        </div>
    );
}
