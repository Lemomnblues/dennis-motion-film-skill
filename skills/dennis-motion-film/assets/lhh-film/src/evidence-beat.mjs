// Sample the measured music grid at the actual frame time (including shutter samples).
// Keep the wind-up separate from the transient so the last pre-beat frame can
// recoil, and so secondary beats produce a smaller physical response than bar 1.
import {lim, smooth} from './graphic.mjs';

export function beatAt(e, time = e.realT) {
  const beats = e.beats || [];
  let lo = 0, hi = beats.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (beats[mid].frame / 30 <= time + 1e-7) lo = mid + 1;
    else hi = mid;
  }
  const fallbackIndex = Math.floor(time * 1.88);
  const prev = beats[Math.max(0,lo-1)] || {index:fallbackIndex, frame:fallbackIndex*30/1.88};
  const next = beats[lo] || {index:prev.index+1,frame:prev.frame+30/1.88};
  const start = prev.frame/30, end = next.frame/30;
  const age = Math.max(0,time-start), remaining = Math.max(0,end-time);
  const weight = beat => beat.downbeat ? 1 : .45 + .24 * (beat.strength ?? .75);
  return {
    index:prev.index, age, phase:lim(age/Math.max(1/30,end-start)),
    hit:weight(prev)*Math.exp(-age*12),
    spring:weight(prev)*Math.exp(-age*10)*Math.cos(age*25),
    prepare:weight(next)*smooth(1-remaining/.13),
    strong:!!prev.downbeat
  };
}
