import { describe, expect, it } from 'vitest';
import { exercises } from './exercises';
import { sarsCov2PublicInstance, wasapPublicInstance } from './publicInstances';
import {
    getRandomQuery,
    landingPageQuery,
    randomQueriesByInstance,
    sarsCov2RandomQueries,
    wasapSarsCov2RandomQueries,
    withoutLeadingComments,
} from './randomQueries';

describe.each([
    { name: 'sarsCov2RandomQueries', queries: sarsCov2RandomQueries, length: 13 },
    { name: 'wasapSarsCov2RandomQueries', queries: wasapSarsCov2RandomQueries, length: 12 },
])('$name', ({ queries, length }) => {
    it('contains unique queries with one or two leading comments', () => {
        expect(queries).toHaveLength(length);
        expect(new Set(queries).size).toBe(length);

        for (const query of queries) {
            const lines = query.split('\n');
            const commentCount = lines.findIndex((line) => !line.startsWith('--'));
            expect(commentCount).toBeGreaterThanOrEqual(1);
            expect(commentCount).toBeLessThanOrEqual(2);
            expect(lines[commentCount]).toBe('data');
        }
    });
});

describe('randomQueriesByInstance', () => {
    it('offers the example queries for the SARS-CoV-2 and Swiss wastewater instances', () => {
        expect(randomQueriesByInstance[sarsCov2PublicInstance.id]).toBe(sarsCov2RandomQueries);
        expect(randomQueriesByInstance[wasapPublicInstance.id]).toBe(wasapSarsCov2RandomQueries);
    });
});

describe('sarsCov2RandomQueries', () => {
    it('does not duplicate an exercise answer', () => {
        const exerciseAnswers = new Set(exercises.map((exercise) => normalizeQuery(exercise.answer)));
        for (const query of sarsCov2RandomQueries) expect(exerciseAnswers.has(normalizeQuery(query))).toBe(false);
    });

    it('offers the landing page query as an example', () => {
        expect(sarsCov2RandomQueries).toContain(landingPageQuery);
    });

    it('keeps the landing page hero query unchanged once its comment is dropped', () => {
        expect(withoutLeadingComments(landingPageQuery)).toBe(`data
  .filter(region = 'Europe')
  .group(by := {pangoLineage, S[69], S[70], S[501]}, aggs := {count := count()})
  .order(by := {count.desc()})
  .limit(10)`);
    });

    it('can avoid immediately selecting the current query again', () => {
        const current = sarsCov2RandomQueries[0];
        expect(getRandomQuery(sarsCov2RandomQueries, current, () => 0)).toBe(sarsCov2RandomQueries[1]);
    });
});

function normalizeQuery(query: string) {
    return query
        .split('\n')
        .filter((line) => !line.startsWith('--'))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}
