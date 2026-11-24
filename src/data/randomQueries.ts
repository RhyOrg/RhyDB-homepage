import { sarsCov2PublicInstance, wasapSarsCov2PublicInstance } from './publicInstances';

// Example queries offered by the Console's "Insert random query" button for the
// public instances listed in randomQueriesByInstance.
//
// Every query starts with a one- or two-line `--` comment that explains what it
// does, so the inserted text is self-documenting in the editor. All of them are
// validated against their instance: they run, return a non-empty result, stay
// small, and answer within a few seconds. The SARS-CoV-2 queries deliberately
// differ from the exercise reference answers in src/data/exercises.ts so the two
// sets complement each other.

// The query the landing page shows in its hero panel. The landing page renders it
// without the comment and links to the Console with the comment included.
export const landingPageQuery = `-- Ranks the most common combinations of pango lineage and S protein symbols at
-- positions 69, 70 and 501 among sequences from Europe.
data
  .filter(region = 'Europe')
  .group(by := {pangoLineage, S[69], S[70], S[501]}, aggs := {count := count()})
  .order(by := {count.desc()})
  .limit(10)`;

// Drops the leading `--` description, for places that show a query without it.
export function withoutLeadingComments(query: string) {
    return query.replace(/^(?:--[^\n]*\n)+/, '');
}

export const sarsCov2RandomQueries = [
    landingPageQuery,
    `-- Finds sequence counts by country from 2025 carrying the S:69 deletion.
data
  .filter(
    date.between('2025-01-01'::date, '2025-12-31'::date)
    && aminoAcidEquals(position := 69, symbol := '-', sequenceName := 'S')
  )
  .group(by := {country}, aggs := {count := count()})
  .order(by := {count.desc(), country})
  .limit(20)`,
    `-- Shows the 15 most recent sequences assigned to XEC or one of its sublineages.
data
  .filter(pangoLineage.lineage('XEC', includeSublineages := true))
  .project({date, country, pangoLineage, strain})
  .order(by := {date.desc(), strain})
  .limit(15)`,
    `-- Compares monthly submission volumes from Germany and the USA during 2024.
data
  .filter(dateSubmittedYear = 2024 && country.in({'Germany', 'USA'}))
  .group(by := {country, dateSubmittedMonth}, aggs := {count := count()})
  .order(by := {dateSubmittedMonth, country})
  .limit(30)`,
    `-- Draws a reproducible sample of ten African sequences collected during 2023.
data
  .filter(region = 'Africa' && date.between('2023-01-01'::date, '2023-12-31'::date))
  .randomize(seed := 2025)
  .project({strain, date, country, pangoLineage})
  .limit(10)`,
    `-- Ranks the most common Nextstrain clades among sequences from Japan in 2023.
data
  .filter(
    country = 'Japan'
    && date.between('2023-01-01'::date, '2023-12-31'::date)
    && isNotNull(nextstrainClade)
  )
  .group(by := {nextstrainClade}, aggs := {count := count()})
  .order(by := {count.desc(), nextstrainClade})
  .limit(15)`,
    `-- Locates the Swiss BA.5.1 sequences in the UShER phylogeny by reporting the node
-- that is their most recent common ancestor.
data
  .filter(country = 'Switzerland' && pangoLineage.lineage('BA.5.1', includeSublineages := true))
  .mostRecentCommonAncestor('usherTree')`,
    `-- Summarizes common N-protein changes in US sequences collected in January 2022.
data
  .filter(country = 'USA' && date.between('2022-01-01'::date, '2022-01-31'::date))
  .aminoAcidMutations(minProportion := 0.05, sequenceNames := {N})
  .order(by := {count.desc(), position})
  .limit(15)`,
    `-- Lists the animal hosts other than humans that SARS-CoV-2 sequences were sampled from.
data
  .filter(isNotNull(host) && host <> 'Homo sapiens')
  .group(by := {host}, aggs := {count := count()})
  .order(by := {count.desc(), host})
  .limit(15)`,
    `-- Lists the most common nucleotide insertions among sequences from Switzerland.
data
  .filter(country = 'Switzerland')
  .insertions(sequenceNames := {main})
  .order(by := {count.desc(), position})
  .limit(15)`,
    `-- Counts the near-complete genomes (at least 99% Nextclade coverage) that were
-- submitted in 2025, broken down by region.
data
  .filter(nextcladeCoverage >= 0.99 && dateSubmittedYear = 2025)
  .group(by := {region}, aggs := {count := count()})
  .order(by := {count.desc(), region})
  .limit(10)`,
    `-- Shows, per country in Oceania, how many sequences have a sampling date and
-- the range of those dates.
data
  .filter(region = 'Oceania')
  .group(by := {country}, aggs := {count := count(), withDate := count(date), first := min(date), last := max(date)})
  .order(by := {count.desc(), country})
  .limit(15)`,
    `-- Counts the 2024 UK sequences of the lineages that Denmark sequenced at least
-- 100 times in 2024, using a subquery for the set of lineages.
data
  .filter(
    country = 'United Kingdom'
    && date.between('2024-01-01'::date, '2024-12-31'::date)
    && pangoLineage.in(
      data
        .filter(country = 'Denmark' && date.between('2024-01-01'::date, '2024-12-31'::date))
        .group(by := {pangoLineage}, aggs := {count := count()})
        .filter(count >= 100)
        .project({pangoLineage})
    )
  )
  .group(by := {pangoLineage}, aggs := {count := count()})
  .order(by := {count.desc(), pangoLineage})
  .limit(15)`,
] as const;

// The W-ASAP instance holds individual sequencing reads from Swiss wastewater
// treatment plants rather than genomes. Each row is a read with its plant
// (locationName), sample, sequencing batch and the amino acid sequence of every
// gene it covers. With several hundred million reads, the queries filter by
// plant, sample or a recent sampling period before grouping.
export const wasapSarsCov2RandomQueries = [
    `-- Lists the ten most recent sequencing batches and how many reads each one
-- contributed.
data
  .group(by := {batchId}, aggs := {reads := count()})
  .order(by := {batchId.desc()})
  .limit(10)`,
    `-- Counts the reads per sampling date from the Lugano treatment plant since
-- June 2026.
data
  .filter(locationName = 'Lugano (TI)' && samplingDate >= '2026-06-01'::date)
  .group(by := {samplingDate}, aggs := {reads := count()})
  .order(by := {samplingDate})
  .limit(100)`,
    `-- Follows the competing S:445R and S:445P variants in Zürich wastewater by
-- counting the reads with each symbol per sampling date.
data
  .filter(
    locationName = 'Zürich (ZH)'
    && samplingDate >= '2026-09-01'::date
    && (aminoAcidEquals(position := 445, symbol := 'R', sequenceName := 'S')
      || aminoAcidEquals(position := 445, symbol := 'P', sequenceName := 'S'))
  )
  .map({s445 := S[445]})
  .group(by := {samplingDate, s445}, aggs := {reads := count()})
  .order(by := {samplingDate, s445})`,
    `-- Finds spike mutations that only part of the reads from Geneva carry since
-- October 2026, a sign of several variants circulating at once.
data
  .filter(locationName = 'Genève (GE)' && samplingDate >= '2026-10-01'::date)
  .aminoAcidMutations(minProportion := 0.05, sequenceNames := {S})
  .filter(proportion < 0.8 && coverage >= 1000)
  .order(by := {proportion.desc()})
  .limit(20)`,
    `-- Lists the most common nucleotide insertions in reads from the Basel
-- treatment plant since October 2026.
data
  .filter(locationName = 'Basel (BS)' && samplingDate >= '2026-10-01'::date)
  .insertions(sequenceNames := {main})
  .order(by := {count.desc()})
  .limit(15)`,
    `-- Shows which plants and sampling dates the most recent sequencing batch
-- covers, using a subquery to find that batch.
data
  .filter(
    batchId.in(
      data
        .group(by := {batchId}, aggs := {reads := count()})
        .order(by := {batchId.desc()})
        .limit(1)
        .project({batchId})
    )
  )
  .group(by := {locationName, samplingDate}, aggs := {reads := count()})
  .order(by := {locationName, samplingDate})`,
    `-- Reads keep neighbouring mutations together: counts which S:444-446
-- combinations occur on the same read in Geneva since October 2026.
data
  .filter(
    locationName = 'Genève (GE)'
    && samplingDate >= '2026-10-01'::date
    && (aminoAcidEquals(position := 445, symbol := 'R', sequenceName := 'S')
      || aminoAcidEquals(position := 445, symbol := 'P', sequenceName := 'S'))
  )
  .group(by := {S[444], S[445], S[446]}, aggs := {reads := count()})
  .order(by := {reads.desc()})
  .limit(10)`,
    `-- Lists the nucleotide mutations that at least half of the covering reads
-- carried in October 2026, across all plants.
data
  .filter(samplingDate.between('2026-10-01'::date, '2026-10-31'::date))
  .mutations(minProportion := 0.5, sequenceNames := {main})
  .order(by := {position})
  .limit(30)`,
    `-- Compares, per treatment plant, the reads with S:478K to those with the
-- reference symbol T since October 2026.
data
  .filter(
    samplingDate >= '2026-10-01'::date
    && (aminoAcidEquals(position := 478, symbol := 'K', sequenceName := 'S')
      || aminoAcidEquals(position := 478, symbol := '.', sequenceName := 'S'))
  )
  .map({s478 := S[478]})
  .group(by := {locationName, s478}, aggs := {reads := count()})
  .order(by := {locationName, s478})`,
    `-- Puts the S:445R and S:445P read counts per plant since October 2026 side by
-- side with a join.
data
  .filter(samplingDate >= '2026-10-01'::date && aminoAcidEquals(position := 445, symbol := 'R', sequenceName := 'S'))
  .group(by := {locationName}, aggs := {v445r := count()})
  .join(
    data
      .filter(samplingDate >= '2026-10-01'::date && aminoAcidEquals(position := 445, symbol := 'P', sequenceName := 'S'))
      .map({location := locationName})
      .group(by := {location}, aggs := {v445p := count()}),
    locationName = location
  )
  .project({locationName, v445r, v445p})
  .order(by := {locationName})`,
    `-- Draws a reproducible sample of ten reads with S:501Y from one Lugano sample
-- and shows the neighbouring positions 493 and 498 on the same read.
data
  .filter(sampleId = 'A1_05_2026_10_07' && aminoAcidEquals(position := 501, symbol := 'Y', sequenceName := 'S'))
  .randomize(seed := 2026)
  .map({s493 := S[493], s498 := S[498], s501 := S[501]})
  .project({readId, samplingDate, locationName, s493, s498, s501})
  .limit(10)`,
    `-- Counts, per plant, the reads since October 2026 that carry at least two of
-- S:444R, S:445R and S:446S.
data
  .filter(
    samplingDate >= '2026-10-01'::date
    && nOf(2, {
      aminoAcidEquals(position := 444, symbol := 'R', sequenceName := 'S'),
      aminoAcidEquals(position := 445, symbol := 'R', sequenceName := 'S'),
      aminoAcidEquals(position := 446, symbol := 'S', sequenceName := 'S')
    })
  )
  .group(by := {locationName}, aggs := {reads := count()})
  .order(by := {reads.desc()})`,
] as const;

// The example queries offered for each public instance, keyed by its id.
export const randomQueriesByInstance: Readonly<Record<string, readonly string[]>> = {
    [sarsCov2PublicInstance.id]: sarsCov2RandomQueries,
    [wasapSarsCov2PublicInstance.id]: wasapSarsCov2RandomQueries,
};

// Picks one of the example queries at random, skipping `currentQuery` so that
// pressing the button repeatedly always changes the editor content.
export function getRandomQuery(queries: readonly string[], currentQuery = '', random = Math.random) {
    const candidates = queries.filter((query) => query !== currentQuery);
    const index = Math.min(Math.floor(random() * candidates.length), candidates.length - 1);
    return candidates[index];
}
