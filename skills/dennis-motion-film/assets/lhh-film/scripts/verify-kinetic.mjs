import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import ffmpeg from 'ffmpeg-static';
import {ROOT} from '../src/graphic.mjs';
import {words,cuts} from '../src/compositor.mjs';
import {phrases} from '../src/scenes.mjs';
if (words.length !== phrases.length) throw Error('Missing beat for a kinetic title');
const cues=words.map((offset,i)=>({text:phrases[i],startFrame:Math.round((cuts[1]+offset)*30),endFrame:Math.round((i+1<words.length?cuts[1]+words[i+1]:cuts[2])*30)}));
for(const cue of cues){cue.frames=cue.endFrame-cue.startFrame;if(cue.frames<14)throw Error('Word missing or too brief: '+cue.text);cue.proofFrame=cue.startFrame+Math.floor(cue.frames*.66)}
fs.writeFileSync(path.join(ROOT,'analysis/kinetic-cues.json'),JSON.stringify(cues,null,2));
const dir=path.join(ROOT,'previews/kinetic-encoded');fs.mkdirSync(dir,{recursive:true});
const sheet=createCanvas(1920,1192),g=sheet.getContext('2d');g.fillStyle='#101520';g.fillRect(0,0,1920,1192);
for(let i=0;i<cues.length;i++){
 const cue=cues[i],file=path.join(dir,`${String(i+1).padStart(2,'0')}.png`);
 execFileSync(ffmpeg,['-v','error','-y','-ss',String(cue.proofFrame/30),'-i',path.join(ROOT,'output/film.mp4'),'-frames:v','1',file]);
 const img=await loadImage(file),x=(i%2)*960,y=Math.floor(i/2)*298;g.drawImage(img,x,y,480,270);
 g.font='700 40px CN';g.fillStyle='#F1F5FF';g.fillText(cue.text,x+510,y+115);
 g.font='400 18px Mono';g.fillStyle='#A4B6D7';g.fillText(`${(cue.startFrame/30).toFixed(3)}–${(cue.endFrame/30).toFixed(3)}s`,x+510,y+160);g.fillText(`${cue.frames} FRAMES`,x+510,y+195);
}
fs.writeFileSync(path.join(ROOT,'previews/kinetic-proof.jpg'),sheet.toBuffer('image/jpeg'));
console.log(JSON.stringify(cues,null,2));
