import { PLAYABLE_ACTIONS, DOMAIN_EVENTS, MEME_ACTIONS, MEME_EVENTS, INTRUSION_ACTIONS } from '../../../packages/domain/src/index';
const a = [...PLAYABLE_ACTIONS, ...INTRUSION_ACTIONS].filter((x) => x.category !== 'travel').map((x) => x.id).filter((id) => !MEME_ACTIONS[id]);
const e = DOMAIN_EVENTS.map((x) => x.id).filter((id) => !MEME_EVENTS[id]);
console.log('missing actions:', a, 'missing events:', e);
