import type { ReactNode } from 'react';
import { EXERCISE_SERVER } from '../config';

export type PublicInstance = {
    id: string;
    name: string;
    hostedBy: string;
    server: string;
    note?: ReactNode;
};

export const sarsCov2PublicInstance: PublicInstance = {
    id: 'sars-cov-2',
    name: 'SARS-CoV-2',
    hostedBy: 'CoV-Spectrum',
    server: EXERCISE_SERVER,
};

export const wasapSarsCov2PublicInstance: PublicInstance = {
    id: 'wasap-sars-cov-2',
    name: 'SARS-CoV-2 in Swiss Wastewater',
    hostedBy: 'ETH Zurich',
    server: 'https://silo.wasap.genspectrum.org/covid',
};

export const wasapRsvAPublicInstance: PublicInstance = {
    id: 'wasap-rsv-a',
    name: 'RSV-A in Swiss Wastewater',
    hostedBy: 'ETH Zurich',
    server: 'https://silo.wasap.genspectrum.org/rsva',
};

export const wasapRsvBPublicInstance: PublicInstance = {
    id: 'wasap-rsv-b',
    name: 'RSV-B in Swiss Wastewater',
    hostedBy: 'ETH Zurich',
    server: 'https://silo.wasap.genspectrum.org/rsvb',
};

export const pathoplexusPublicInstance: PublicInstance = {
    id: 'pathoplexus-organisms',
    name: 'All Pathoplexus organisms',
    hostedBy: 'GenSpectrum',
    server: 'https://gs-staging-1.int.genspectrum.org/pathoplexus',
    note: (
        <>
            This instance uses data from{' '}
            <a className='link' href='https://pathoplexus.org' target='_blank' rel='noreferrer'>
                Pathoplexus
            </a>{' '}
            including data under the{' '}
            <a
                className='link'
                href='https://pathoplexus.org/about/terms-of-use/data-use-terms'
                target='_blank'
                rel='noreferrer'
            >
                Restricted-Use Term
            </a>
            . Such data may only be used in accordance with the Terms. The Data Use Term of a sequence is stored in the
            columns <code>dataUseTerms</code>, <code>dataUseTermsRestrictedUntil</code> and <code>dataUseTermsUrl</code>
            .
        </>
    ),
};

export const publicInstances: PublicInstance[] = [
    sarsCov2PublicInstance,
    wasapSarsCov2PublicInstance,
    wasapRsvAPublicInstance,
    wasapRsvBPublicInstance,
    pathoplexusPublicInstance,
];
