import { HighlightStyle, LanguageSupport, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const FUNCTIONS = new Set([
    'filter',
    'schema',
    'tables',
    'groupBy',
    'project',
    'projectout',
    'map',
    'orderBy',
    'limit',
    'offset',
    'randomize',
    'join',
    'unionAll',
    'transitiveClosure',
    'insertInto',
    'mutations',
    'aminoAcidMutations',
    'insertions',
    'aminoAcidInsertions',
    'mostRecentCommonAncestor',
    'phyloSubtree',
    'between',
    'at',
    'isoWeek',
    'in',
    'isNull',
    'isNotNull',
    'like',
    'lineage',
    'phyloDescendantOf',
    'nucleotideEquals',
    'aminoAcidEquals',
    'hasMutation',
    'hasAAMutation',
    'insertionContains',
    'aminoAcidInsertionContains',
    'maybe',
    'exact',
    'nOf',
    'nucleotideMutationProfile',
    'aminoAcidMutationProfile',
    'count',
    'asc',
    'desc',
]);

const KEYWORDS = new Set(['default', 'true', 'false', 'null']);

const tagMap = {
    comment: t.comment,
    string: t.string,
    number: t.number,
    operator: t.operator,
    keyword: t.keyword,
    function: t.function(t.variableName),
    variableName: t.variableName,
};

const parser = StreamLanguage.define({
    tokenTable: tagMap,
    languageData: { commentTokens: { line: '--' } },
    token(stream) {
        if (stream.eatSpace()) return null;

        if (stream.match('--')) {
            stream.skipToEnd();
            return 'comment';
        }

        if (stream.peek() === "'") {
            stream.next();
            let escaped = false;
            let ch;
            while ((ch = stream.next()) != null) {
                if (ch === "'" && !escaped) break;
                escaped = ch === '\\' && !escaped;
            }
            return 'string';
        }

        if (stream.match(/^\d+(\.\d+)?/)) return 'number';

        if (stream.match(':=') || stream.match('::') || stream.match(/^(&&|\|\||<=|>=|<>|[=<>!-])/)) {
            return 'operator';
        }

        if (stream.match(/^[A-Za-z_][A-Za-z0-9_]*/)) {
            const word = stream.current();
            if (KEYWORDS.has(word)) return 'keyword';
            const isCall = stream.peek() === '(' || /^\s*\(/.test(stream.string.slice(stream.pos));
            if (FUNCTIONS.has(word) && isCall) return 'function';
            return 'variableName';
        }

        stream.next();
        return null;
    },
});

const highlightStyle = HighlightStyle.define([
    { tag: t.comment, color: '#6b7280', fontStyle: 'italic' },
    { tag: t.string, color: '#0a7d22' },
    { tag: t.number, color: '#9333ea' },
    { tag: t.operator, color: '#b91c1c' },
    { tag: t.keyword, color: '#2563eb', fontWeight: '600' },
    { tag: t.function(t.variableName), color: '#7c3aed', fontWeight: '600' },
    { tag: t.variableName, color: '#1d1d1f' },
]);

export function rhydbQueryLanguage() {
    return new LanguageSupport(parser, [syntaxHighlighting(highlightStyle)]);
}
