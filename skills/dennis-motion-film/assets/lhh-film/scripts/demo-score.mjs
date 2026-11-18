// Make a stereo sketch track from the edit's beat frames. No samples or recordings.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'assets/soundtrack.wav');
if (fs.existsSync(destination)) {
  console.log('Using the existing assets/soundtrack.wav');
  process.exit(0);
}
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'analysis', name), 'utf8'));
const grid = read('beats.json');
const edit = read('ending.json');
const rate = 48000;
const length = Math.round(edit.duration * rate);
const mono = new Float32Array(length);
const tau = 2 * Math.PI;
let seed = 8173;
function noise() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
}
function play(start, seconds, voice) {
  const first = Math.max(0, Math.round(start * rate));
  const count = Math.min(Math.round(seconds * rate), length - first);
  for (let n = 0; n < count; n++) {
    const envelope = Math.min(1, n / 96, (count - 1 - n) / 320);
    mono[first + n] += envelope * voice(n / rate);
  }
}
const roots = [130.8128, 103.8262, 155.5635, 116.5409];
for (const [index, beat] of grid.beats.entries()) {
  const time = beat.frame / grid.fps;
  if (time > edit.lockTime - 0.4) break;
  const pitch = roots[Math.floor(index / 8) % roots.length];
  const gain = beat.downbeat ? 0.23 : 0.16;
  play(time, 0.24, t => gain * Math.exp(-19*t) * Math.sin(tau*(46*t + 1.8*(1-Math.exp(-32*t)))));
  play(time, 0.43, t => 0.13 * Math.exp(-8*t) * Math.sin(tau*pitch*t));
  play(time + grid.beatPeriod / 2, 0.075, t => 0.048 * Math.exp(-54*t) * noise());
  if (index % 2 === 1) {
    play(time, 0.13, t => 0.085 * Math.exp(-25*t) * noise());
    play(time, 0.68, t => 0.075 * Math.exp(-6*t) * Math.sin(tau*pitch*(index%4 === 1 ? 3 : 4)*t));
  }
}
const wav = Buffer.alloc(44 + length * 4);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate*4, 28);
wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
wav.writeUInt32LE(length*4, 40);
for (let i = 0; i < length; i++) {
  const echo = i >= 6720 ? mono[i-6720] * 0.15 : 0;
  wav.writeInt16LE(Math.round(32767 * mono[i]), 44 + 4*i);
  wav.writeInt16LE(Math.round(32767 * (0.93*mono[i] + echo)), 46 + 4*i);
}
fs.writeFileSync(destination, wav, {flag:'wx'});
console.log('Generated beat-aligned demo music at assets/soundtrack.wav');
