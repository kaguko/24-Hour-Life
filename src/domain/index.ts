/**
 * DOMAIN ENTRYPOINT & CLEAN FACADE
 * Rule 1: NO React, NO UI, NO localStorage imports.
 * Rule 2: Pure primitive shapes & deterministic functions.
 * Rule 3: Adapters plug into this facade.
 */

export * from './types';
export * from './stats';
export * from './actions';
export * from './availability';
export * from './dopamine';
export * from './consequence';
export * from './events';
export * from './simulate';
export * from './quotes';
export * from './ending';
export * from './journey';
export * from './circadian';
export * from './dayRecap';
