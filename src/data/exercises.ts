// Practice exercises. Each has a natural-language question and a reference
// answer. When the user runs their query, it is compared against the result of
// the reference answer (see QueryRunner) to produce a Correct!/Wrong! verdict.
//
// All reference answers are validated against the default staging server
// (https://gs-staging-1.int.genspectrum.org/open/v2/silo): they run, return a
// non-empty / non-zero result, and stay well under 3 MB. The schema there uses
// columns such as `country`, `region`, `division`, `date`, `pangoLineage`,
// `strain`, `sex`, the nucleotide sequence `main`, and amino acid sequences like
// `S`. (There is no `age` data for many countries, so exercises avoid it.)
//
// Note: questions deliberately ask for a small "top N" (e.g. 20, not 100) so
// users must write their own `.limit(20)` rather than rely on the `.limit(100)`
// the runner appends automatically (which would otherwise produce 100 rows and a
// "Wrong!" verdict).
export type Exercise = {
    slug: string;
    title: string;
    question: string;
    outputExample: string;
    answer: string;
    explanation: string;
    documentation: { label: string; to: string }[];
};

export const exercises: Exercise[] = [
    {
        slug: 'count-switzerland',
        title: 'Count sequences from Switzerland',
        question: 'Count all sequences from Switzerland.',
        outputExample: `count
-----
1234`,
        explanation:
            'Filter the table to sequences from Switzerland. Then, use group with the empty set of grouping columns to count all remaining rows.',
        documentation: [
            { label: 'Query pipelines', to: '/docs/concepts/query-language#pipeline-operators' },
            { label: 'filter and group', to: '/docs/reference/query-language#pipeline-operations' },
        ],
        answer: `data
  .filter(country = 'Switzerland')
  .group(by:={}, aggs:={count:=count()})`,
    },
    {
        slug: 'retrieve-basel-sequences',
        title: 'Retrieve Basel sequences',
        question:
            'Retrieve the 20 most recent sequences from Basel-Stadt, Switzerland, showing the GenBank accession, date, unaligned nucleotide sequence, aligned nucleotide sequence and S amino acid sequence.',
        outputExample: `genbankAccession | date       | unaligned_main | main    | S
---------------- | ---------- | -------------- | ------- | ------
AB123456         | 2024-05-10 | ACGT...        | ACGT... | MFV...`,
        explanation:
            'Filter the table to sequences from Switzerland and Basel-Stadt. Order the rows by date descending, project the requested columns and keep the first 20.',
        documentation: [
            { label: 'filter', to: '/docs/reference/query-language#filter' },
            { label: 'project, order, and limit', to: '/docs/reference/query-language#pipeline-operations' },
        ],
        answer: `data
  .filter(country = 'Switzerland' && division = 'Basel-Stadt')
  .order(by:={date.desc()})
  .project({genbankAccession, date, unaligned_main, main, S})
  .limit(20)`,
    },
    {
        slug: 'lineage-counts-2021h1',
        title: 'Lineage counts in early 2021',
        question:
            'For sequences collected between 1 January 2021 and 30 June 2021, count the sequences per pangoLineage and return the 20 most frequent lineages, most frequent first.',
        outputExample: `pangoLineage | count
------------ | -----
B.1.1.7      | 1234
B.1.351      | 987`,
        explanation:
            'Filter the table to dates between 1 January and 30 June 2021. Then, use group to count the sequences for each lineage, order the rows by their counts and keep the first 20.',
        documentation: [
            { label: 'between', to: '/docs/reference/functions#between' },
            { label: 'group and order', to: '/docs/reference/query-language#pipeline-operations' },
        ],
        answer: `data
  .filter(date.between('2021-01-01'::date, '2021-06-30'::date))
  .group(by:={pangoLineage}, aggs:={count:=count()})
  .order(by:={count.desc()})
  .limit(20)`,
    },
    {
        slug: 'worldwide-spain-lineage-counts',
        title: 'Compare worldwide and Spanish lineage counts',
        question:
            'Identify the most common 50 pango lineages worldwide and return their worldwide sequence count and their sequence count from Spain. Sort by the worldwide count, highest first.',
        outputExample: `pangoLineage | countWorld | countSpain
------------ | ---------- | ----------
BA.2         | 1234       | 42
XBB          | 987        | null`,
        explanation:
            'Get a table of worldwide sequence counts for each lineage using group. Build the same table for Spain and rename its lineage column, then use a left join to retain worldwide lineages without a match from Spain. Project the requested columns, order the rows by their worldwide counts and keep the first 50.',
        documentation: [
            { label: 'join', to: '/docs/reference/query-language#join' },
            { label: 'group', to: '/docs/reference/query-language#group' },
        ],
        answer: `data
  .group(by:={pangoLineage}, aggs:={countWorld:=count()})
  .join(
    data
      .filter(country = 'Spain')
      .group(by:={pangoLineage}, aggs:={countSpain:=count()})
      .map({pangoLineage2 := pangoLineage})
      .project({pangoLineage2, countSpain}),
    pangoLineage = pangoLineage2,
    type := left
  )
  .project({pangoLineage, countWorld, countSpain})
  .order(by:={countWorld.desc()})
  .limit(50)`,
    },
    {
        slug: 'submissions-by-iso-week',
        title: 'Submissions by ISO week',
        question:
            'Summarize sequences collected in 2024 by ISO calendar week. Return the ISO week and sequence count, ordered chronologically.',
        outputExample: `week     | count
-------- | -----
2024-W01 | 1234
2024-W02 | 987`,
        explanation:
            'Filter the table to dates in 2024. Use map with isoWeek to add the ISO week, then use group to count the sequences for each week. Order the rows by week — the ISO week strings sort chronologically.',
        documentation: [
            { label: 'isoWeek', to: '/docs/reference/functions#iso-week' },
            { label: 'map and group', to: '/docs/reference/query-language#pipeline-operations' },
        ],
        answer: `data
  .filter(date.between('2024-01-01'::date, '2024-12-31'::date))
  .map({week:=date.isoWeek()})
  .group(by:={week}, aggs:={count:=count()})
  .order(by:={week})`,
    },
    {
        slug: 'mutation-details',
        title: 'Sequences with a mutation',
        question:
            'For sequences that carry a mutation at nucleotide position 23403, show the strain, country, date and pangoLineage. Order by strain and return the first 20 rows.',
        outputExample: `strain     | country     | date       | pangoLineage
---------- | ----------- | ---------- | ------------
sample-001 | Switzerland | 2021-01-15 | B.1.1.7
sample-002 | Germany     | 2021-01-16 | B.1.1.7`,
        explanation:
            'Filter the table with hasMutation to keep sequences that differ from the nucleotide reference at position 23403. Project the requested columns, order the rows by strain and keep the first 20.',
        documentation: [
            { label: 'Reference coordinates', to: '/docs/reference/functions#sequence-functions' },
            { label: 'hasMutation', to: '/docs/reference/functions#has-mutation' },
        ],
        answer: `data
  .filter(hasMutation(position:=23403, sequenceName:='main'))
  .project({strain, country, date, pangoLineage})
  .order(by:={strain})
  .limit(20)`,
    },
    {
        slug: 'lineage-mutations',
        title: 'Mutations within a lineage',
        question:
            "List the nucleotide mutations (on the 'main' sequence) that occur in at least 5% of sequences belonging to lineage B.1.1.7 including its sublineages. Return at most 20 rows.",
        outputExample: `mutationFrom | mutationTo | position | sequenceName | proportion | coverage | count
------------ | ---------- | -------- | ------------ | ---------- | -------- | -----
A            | G          | 23403    | main         | 0.42       | 1200     | 504`,
        explanation:
            'Filter the table to lineage B.1.1.7 and its sublineages. Then, use mutations to get changes on the main nucleotide sequence with a minimum proportion of 5% and keep the first 20.',
        documentation: [
            { label: 'lineage', to: '/docs/reference/functions#lineage-function' },
            { label: 'mutations aggregation', to: '/docs/reference/query-language#mutations' },
        ],
        answer: `data
  .filter(pangoLineage.lineage('B.1.1.7', includeSublineages:=true))
  .mutations(minProportion:=0.05, sequenceNames:={main})
  .limit(20)`,
    },
    {
        slug: 'complex-filter',
        title: 'Combine multiple conditions',
        question:
            'Count the sequences from Germany that belong to B.1.1.7 (including sublineages) and carry at least 2 of these three nucleotide mutations: T at position 241, T at position 3037, G at position 23403.',
        outputExample: `count
-----
1234`,
        explanation:
            'Filter the table to sequences from Germany in lineage B.1.1.7 or its sublineages. Use nOf to require at least two of the three nucleotide changes, then use group with the empty set of grouping columns to count the remaining rows.',
        documentation: [
            { label: 'Boolean operators', to: '/docs/reference/query-language#operators' },
            { label: 'nOf', to: '/docs/reference/functions#n-of' },
        ],
        answer: `data
  .filter(
    country = 'Germany'
    && pangoLineage.lineage('B.1.1.7', includeSublineages:=true)
    && nOf(2, {
         nucleotideEquals(position:=241, symbol:='T', sequenceName:='main'),
         nucleotideEquals(position:=3037, symbol:='T', sequenceName:='main'),
         nucleotideEquals(position:=23403, symbol:='G', sequenceName:='main')
       })
  )
  .group(by:={}, aggs:={count:=count()})`,
    },
    {
        slug: 'pagination',
        title: 'Paginated results',
        question:
            'Order the sequences by strain, skip the first 50 and return the next 25, showing only the strain, country and date.',
        outputExample: `strain     | country | date
---------- | ------- | ----------
sample-051 | Germany | 2021-01-15
sample-052 | France  | 2021-01-16`,
        explanation:
            'Order the table by strain to give the rows a stable order. Use offset to skip the first 50 rows, keep the next 25 and project the requested columns.',
        documentation: [
            { label: 'order', to: '/docs/reference/query-language#order' },
            { label: 'offset and limit', to: '/docs/reference/query-language#offset' },
        ],
        answer: `data
  .order(by:={strain})
  .offset(50)
  .limit(25)
  .project({strain, country, date})`,
    },
    {
        slug: 'aa-insertions',
        title: 'Amino acid insertions',
        question:
            'List the 20 most common amino acid insertions in the S protein. For each insertion, show its position, inserted symbols and the number of sequences carrying it, with the most common first.',
        outputExample: `position | insertedSymbols | count
-------- | --------------- | -----
214      | EPE             | 1234
215      | R               | 987`,
        explanation:
            'Use aminoAcidInsertions to count insertions in the S protein. Project the requested columns, order the rows by count and use the inserted symbols and position to order ties, then keep the first 20.',
        documentation: [
            { label: 'Sequence insertions', to: '/docs/reference/query-language#insertions' },
            { label: 'aminoAcidInsertions', to: '/docs/reference/query-language#amino-acid-insertions' },
        ],
        answer: `data
  .aminoAcidInsertions(sequenceNames:={S})
  .project({position, insertedSymbols, count})
  .order(by:={count.desc(), insertedSymbols, position})
  .limit(20)`,
    },
    {
        slug: 'countries-in',
        title: 'Filter with a set of values',
        question: 'Count the sequences from Germany, France and Italy, broken down by country, most frequent first.',
        outputExample: `country | count
------- | -----
Germany | 1234
France  | 987
Italy   | 654`,
        explanation:
            'Filter the table with in to keep sequences from Germany, France and Italy. Then, use group to count the sequences for each country and order the rows by their counts.',
        documentation: [
            { label: 'in', to: '/docs/reference/functions#in' },
            { label: 'group', to: '/docs/reference/query-language#group' },
        ],
        answer: `data
  .filter(country.in({'Germany', 'France', 'Italy'}))
  .group(by:={country}, aggs:={count:=count()})
  .order(by:={count.desc()})`,
    },
    {
        slug: 'division-regex',
        title: 'Regex filter and a computed column',
        question:
            "For sequences whose division matches the regular expression 'Basel.*', return the strain together with an added column 'area' set to the constant 'Basel'. Order by strain and return the first 10 rows.",
        outputExample: `strain     | area
---------- | -----
sample-001 | Basel
sample-002 | Basel`,
        explanation:
            "Filter the table with like to keep divisions that match 'Basel.*'. Use map to add the constant area value, project the requested columns, order the rows by strain and keep the first 10.",
        documentation: [
            { label: 'like', to: '/docs/reference/functions#like' },
            { label: 'map', to: '/docs/reference/query-language#map' },
        ],
        answer: `data
  .filter(division.like('Basel.*'))
  .map({area := 'Basel'})
  .project({strain, area})
  .order(by := {strain})
  .limit(10)`,
    },
    {
        slug: 's-mutations-by-target',
        title: 'Amino acid mutations grouped by target',
        question:
            'Among sequences from Switzerland, take the amino acid mutations on the S gene that occur in at least 10% of sequences, then count how many of those mutations lead to each resulting symbol (mutationTo). Most frequent first.',
        outputExample: `mutationTo | count
---------- | -----
Y          | 12
G          | 8`,
        explanation:
            'Filter the table to sequences from Switzerland. Use aminoAcidMutations to get changes on the S protein with a minimum proportion of 10%, then use group to count the mutation rows for each resulting symbol. Order the rows by their counts.',
        documentation: [
            { label: 'Pipeline schemas', to: '/docs/concepts/query-language#pipeline-operators' },
            { label: 'aminoAcidMutations', to: '/docs/reference/query-language#amino-acid-mutations' },
        ],
        answer: `data
  .filter(country = 'Switzerland')
  .aminoAcidMutations(minProportion:=0.1, sequenceNames:={S})
  .group(by:={mutationTo}, aggs:={count:=count()})
  .order(by:={count.desc()})`,
    },
    {
        slug: 's-mutation-profile',
        title: 'Mutation profile distance',
        question:
            'Count the sequences whose S gene is within 2 amino acid differences of a profile that has Y at position 501 and R at position 452.',
        outputExample: `count
-----
1234`,
        explanation:
            'Filter the table with aminoAcidMutationProfile to keep S sequences within two differences of the specified symbols at positions 501 and 452. Then, use group with the empty set of grouping columns to count the remaining rows.',
        documentation: [
            { label: 'Mutation profiles', to: '/docs/reference/functions#mutation-profile' },
            { label: 'Sequence coordinates', to: '/docs/reference/functions#sequence-functions' },
        ],
        answer: `data
  .filter(aminoAcidMutationProfile(distance:=2, sequenceName:='S', mutations:={
    {position:=501, symbol:='Y'},
    {position:=452, symbol:='R'}
  }))
  .group(by:={}, aggs:={count:=count()})`,
    },
    {
        slug: 's-position-symbols',
        title: 'Co-occurring S protein changes',
        question:
            'In the sequences from Switzerland, investigate the co-occurrence patterns at S protein positions 69, 70 and 501. Return one row for each combination together with the count. Order the combinations by count descending so the most common S-position pattern appears first.',
        outputExample: `pos_69 | pos_70 | pos_501 | count
------ | ------ | ------- | -----
H      | V      | N       | 1234
-      | -      | Y       | 987`,
        explanation:
            'Filter the table to sequences from Switzerland. Use map with at to add the S symbols at positions 69, 70 and 501, then use group to count the sequences for each combination. Order the rows by their counts.',
        documentation: [
            { label: 'at', to: '/docs/reference/functions#at' },
            { label: 'map and group', to: '/docs/reference/query-language#pipeline-operations' },
        ],
        answer: `data
  .filter(country = 'Switzerland')
  .map({pos_69 := S.at(69), pos_70 := S.at(70), pos_501 := S.at(501)})
  .group(by := {pos_69, pos_70, pos_501}, aggs := {count := count()})
  .order(by := {count.desc()})`,
    },
    {
        slug: 'combine-germany-usa',
        title: 'Compare recent German and US submissions',
        question: `Build one harmonized table for recent SARS-CoV-2 submissions from Germany and the USA. Include the strain name, collection date, pango lineage and a place column.

For Germany, place should identify the country (i.e. always just be "Germany"). For the USA, place should identify the division. Use the 100 most recent German rows and the 100 most recent US rows, then sort the combined 200-row table by date descending.`,
        outputExample: `strain        | date       | pangoLineage | place
------------- | ---------- | ------------ | ----------
sample-DE-001 | 2024-05-10 | JN.1         | Germany
sample-US-001 | 2024-05-09 | JN.1.4       | California`,
        explanation:
            'Build a table of the 100 most recent German sequences and use map to copy the country into the place column. Build the same table for the USA with the division in the place column, then combine both tables with unionall. Order the combined rows by date descending.',
        documentation: [
            { label: 'Pipeline schemas', to: '/docs/concepts/query-language#pipeline-operators' },
            { label: 'unionall', to: '/docs/reference/query-language#unionall' },
        ],
        answer: `data
  .filter(country = 'Germany')
  .map({place := country})
  .project({strain, date, pangoLineage, place})
  .order(by := {date.desc()})
  .limit(100)
  .unionall(
    data
      .filter(country = 'USA')
      .map({place := division})
      .project({strain, date, pangoLineage, place})
      .order(by := {date.desc()})
      .limit(100)
  )
  .order(by := {date.desc()})`,
    },
    {
        slug: 'swiss-lineages-absent-argentina',
        title: 'Find Swiss lineages absent from Argentina',
        question:
            'Which Pango lineages were observed in Switzerland but never in Argentina? Return the 20 lineages with the largest Swiss sequence count, highest first.',
        outputExample: `pangoLineage | countSwitzerland
------------ | ----------------
AY.43.4      | 2776
B.1.177      | 2661`,
        explanation:
            'Get a distinct table of lineages for each country using group. Then, use a left anti join to keep the lineages from Switzerland without a match from Argentina. Order the remaining rows by their counts and keep the first 20.',
        documentation: [
            { label: 'join', to: '/docs/reference/query-language#join' },
            { label: 'null checks', to: '/docs/reference/functions#null' },
        ],
        answer: `data
  .filter(country = 'Switzerland' && isNotNull(pangoLineage))
  .group(by:={pangoLineage}, aggs:={countSwitzerland:=count()})
  .join(
    data
      .filter(country = 'Argentina')
      .group(by:={pangoLineage}, aggs:={countArgentina:=count()})
      .map({pangoLineageArgentina:=pangoLineage})
      .project({pangoLineageArgentina}),
    pangoLineage = pangoLineageArgentina,
    type := leftAnti
  )
  .order(by:={countSwitzerland.desc()})
  .limit(20)`,
    },
];

export function getExercise(slug: string | undefined) {
    return exercises.find((e) => e.slug === slug);
}
