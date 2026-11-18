import fs from 'node:fs';
import {brand} from '../src/brand.mjs';
import {cuts, duration} from '../src/compositor.mjs';

const file = name => new URL('../' + name, import.meta.url);
const plan = JSON.parse(fs.readFileSync(file('analysis/render-plan.json'), 'utf8'));
if (plan.length !== cuts.length-1) throw Error('Chapter count differs from the edit');
const chapters = plan.map(({title}, index) => [title, cuts[index]]);
const escape = value => String(value).replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[c]);
const tokens = {
  wordmark: escape(brand.wordmark),
  partner: escape(brand.partner),
  tagline: escape(brand.tagline),
  duration: duration.toFixed(2),
  chapters: JSON.stringify(chapters).replace(/</g,'\\u003c')
};
const template = fs.readFileSync(file('scripts/viewer-template.html'), 'utf8');
fs.writeFileSync(file('index.html'), template.replace(/\{\{(\w+)\}\}/g, (_, key) => tokens[key]));
