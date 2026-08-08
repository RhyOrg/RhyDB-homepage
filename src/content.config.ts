import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const docs = defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/docs' }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        lead: z.string(),
        section: z.enum(['Concepts', 'Tutorials', 'Reference']),
        order: z.number().int().nonnegative(),
    }),
});

export const collections = { docs };
