import settings from '../brand.json' with {type: 'json'};

if (settings.phrases.length !== 8 || settings.phrases.some(text => !text.trim())) {
  throw Error('The kinetic title expects eight nonempty phrases in brand.json');
}
export const brand = settings;
export const lockup = [brand.wordmark, brand.partner].filter(Boolean).join(' ');
