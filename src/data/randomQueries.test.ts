import { describe, expect, it } from 'vitest';
import { exercises } from './exercises';
import {
    getRandomSarsCov2Query,
    landingPageQuery,
    sarsCov2RandomQueries,
    withoutLeadingComments,
} from './randomQueries';

describe('sarsCov2RandomQueries', () => {
    it('contains thirteen unique queries with one or two leading comments', () => {
        expect(sarsCov2RandomQueries).toHaveLength(13);
        expect(new Set(sarsCov2RandomQueries).size).toBe(13);

        for (const query of sarsCov2RandomQueries) {
            const lines = query.split('\n');
            const commentCount = lines.findIndex((line) => !line.startsWith('--'));
            expect(commentCount).toBeGreaterThanOrEqual(1);
            expect(commentCount).toBeLessThanOrEqual(2);
            expect(lines[commentCount]).toBe('data');
        }
    });

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
        expect(getRandomSarsCov2Query(current, () => 0)).toBe(sarsCov2RandomQueries[1]);
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
