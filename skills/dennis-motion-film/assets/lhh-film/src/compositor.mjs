import fs from 'node:fs';
import path from 'node:path';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {ROOT,P,lim,out,finish} from './graphic.mjs';
import {sceneFunctions} from './scenes.mjs';
import {drawClosing} from './closing.mjs';
import {employmentState} from './employment.mjs';
export const audio=JSON.parse(fs.readFileSync(path.join(ROOT,'analysis/beats.json'),'utf8'));
export const {duration,lockTime}=JSON.parse(fs.readFileSync(path.join(ROOT,'analysis/ending.json'),'utf8'));
const cueSheet=JSON.parse(fs.readFileSync(path.join(ROOT,'analysis/progress-cues.json'),'utf8'));
const progressFrames=Object.fromEntries(cueSheet.events.map(event=>[event.id,event.frame]));
export const cuts=[...audio.sceneCuts.slice(0,-1),duration];
const nominal=[0,5,10,13,17,21,25,29,33,43,49,53,57,duration];
const images=new Map(),previous=new Map();let previewMode=false;
export function setPreviewMode(v){previewMode=v}
async function world(name,time){const number=Math.max(0,Math.min(119,Math.floor(time*30))),key=`${name}/${String(number).padStart(4,'0')}.png`;if(images.has(key))return images.get(key);let file=path.join(ROOT,'render3d',key);if(previewMode&&!fs.existsSync(file))file=path.join(ROOT,'assets',name+'-preview.png');let im=await loadImage(file);images.set(key,im);if(images.size>18)images.delete(images.keys().next().value);return im}
function snapSequence(start,offsets){
 // Every word/effect owns a distinct musical beat; independent nearest-point
 // snapping can map two adjacent cues to one frame and silently skip a word.
 let previousFrame=Math.round(start*30);
 return offsets.map((offset,i)=>{
  if(i===0)return 0;
  const available=audio.beats.filter(beat=>beat.frame>previousFrame);
  if(!available.length)throw new Error('No unused beat for timeline cue');
  const target=start+offset;
  const chosen=available.reduce((a,b)=>Math.abs(b.time-target)<Math.abs(a.time-target)?b:a);
  previousFrame=chosen.frame;
  return chosen.frame/30-start;
 });
}
export const words=snapSequence(cuts[1],[0,.53,1.06,2.12,2.65,3.18,3.71,4.24]);
export const employmentCuts=snapSequence(cuts[6],[0,1.062,2.124,3.186]);
export function locate(t){let i=0;while(i<12&&t>=cuts[i+1]-.000001)i++;return i}
function environment(t,i){let closest=audio.beats[0];for(const b of audio.beats){if(b.frame/30<=t+.00001)closest=b;else break}const d=Math.max(0,t-closest.frame/30),pulse=Math.exp(-d*15),elapsed=t-cuts[i];return{realT:t,progressFrames,lockTime,elapsed,shotDuration:cuts[i+1]-cuts[i],pulse:pulse*closest.strength,strongPulse:closest.downbeat?pulse:0,beats:audio.beats,beat:audio.beats,bpm:audio.bpm,wave:audio.waveform,wordCuts:words,employmentCuts}}
async function raw(g,t){const i=locate(t),p=lim((t-cuts[i])/(cuts[i+1]-cuts[i])),time=nominal[i]+(nominal[i+1]-nominal[i])*p,e=environment(t,i);g.resetTransform();g.globalAlpha=1;g.globalCompositeOperation='source-over';g.shadowBlur=0;g.shadowOffsetX=g.shadowOffsetY=0;g.setLineDash([]);
 if (i === 4) e.image = await world('layers', e.elapsed);
 if (i < 9) {
   // Legacy 3D layer and wordmark cues use nominal shot-local time; new
   // effects read the actual quantized frame time through the environment.
   sceneFunctions[i](g, [2,5,7,8].includes(i) ? e.elapsed : time - nominal[i], e);
 } else {
   drawClosing(g, time, e);
 }
 let typeIndex = 0;
 while (typeIndex < 7 && e.elapsed >= words[typeIndex + 1]) typeIndex++;
 const employment = i === 6 ? employmentState(e) : null;
 const white = [2,4,7,10,12].includes(i)
   || (employment && (employment.state === 1 || (employment.state === 3 && employment.local > .48)))
   || (i === 1 && (typeIndex % 2 === 0 || typeIndex === 7));
 return {i, e, white};
}
const shutter=createCanvas(1920,1080),sg=shutter.getContext('2d');
export async function render(g,t,{blur=true,transitions=true}={}){t=Math.min(t,duration-1/30);const i=locate(t);let state;if(blur&&[1,6].includes(i)){await raw(sg,Math.max(cuts[i],t-1/60));state=await raw(g,t);g.save();g.globalAlpha=.22;g.drawImage(shutter,0,0);g.restore()}else state=await raw(g,t);
 const dt=t-cuts[i];if(transitions&&[3,4,9,10,11,12].includes(i)&&dt<.23){let snap=previous.get(i);if(!snap){snap=createCanvas(1920,1080);await raw(snap.getContext('2d'),cuts[i]-1/30);previous.set(i,snap)}const p=out(dt/.23);g.save();
 if(i===3||i===10){for(let row=0;row<9;row++){const q=lim(p*1.2-row*.025);g.drawImage(snap,0,row*120,1920,120,(row%2?-1:1)*q*2080,row*120,1920,121)}}
 else if(i===4||i===12){for(let col=0;col<8;col++){let q=lim(p*1.3-col*.04);g.drawImage(snap,col*240,0,240,1080,col*240,(col%2?1:-1)*q*1200,241,1080)}}
 else if(i===9){const z=1-p;g.translate(960,540);g.scale(z,z);g.drawImage(snap,-960,-540)}
 else if(i===11){const w=960*(1-p);if(w>0){g.drawImage(snap,0,0,960,1080,-960*p,0,960,1080);g.drawImage(snap,960,0,960,1080,960+960*p,0,960,1080)}}
 else{for(let row=0;row<6;row++){g.drawImage(snap,0,row*180,1920,180,0,row*180-1080*p,1920,181)}}g.restore()}
 finish(g,Math.min(t,lockTime),state.white);
 if([1,6].includes(i)&&state.e.strongPulse>.72){g.save();g.globalCompositeOperation='screen';g.globalAlpha=.06*state.e.strongPulse;g.fillStyle='#688CFF';g.fillRect(0,0,1920,1080);g.restore()}
}
