/**
 * Compatibility re-export from src/domain/
 */
export * from '../domain/events';
export { DOMAIN_EVENTS as RANDOM_EVENTS } from '../domain/events';
export { rollDomainEvent as rollRandomEvent } from '../domain/events';
export type { EventPrimitive as RandomEvent, EventChoicePrimitive as EventChoice } from '../domain/types';
