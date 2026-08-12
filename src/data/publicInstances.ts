import { EXERCISE_SERVER } from '../config';

export type PublicInstance = {
    id: string;
    name: string;
    hostedBy: string;
    server: string;
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

export const publicInstances: PublicInstance[] = [
    sarsCov2PublicInstance,
    wasapSarsCov2PublicInstance,
    wasapRsvAPublicInstance,
    wasapRsvBPublicInstance,
];
