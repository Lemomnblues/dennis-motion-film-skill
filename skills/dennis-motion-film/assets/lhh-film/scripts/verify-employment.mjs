import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import ffmpeg from 'ffmpeg-static';
import {ROOT} from '../src/graphic.mjs';
import {render,setPreviewMode,cuts,employmentCuts} from '../src/compositor.mjs';
import {employmentTitles} from '../src/employment.mjs';
const source=process.argv.includes('--source');
const expected=['试用期管理','薪酬与加班','劳动关系解除','有据可循'];
if(JSON.stringify(expected)!==JSON.stringify(employmentTitles))throw Error('Unexpected employment scenario copy');
const cues=employmentCuts.map((t,i)=>({title:employmentTitles[i],startFrame:Math.round((cuts[6]+t)*30),endFrame:Math.round((i===3?cuts[7]:cuts[6]+employmentCuts[i+1])*30)}));
for(const cue of cues)if(cue.endFrame-cue.startFrame<28)throw Error('Employment cue too short');
fs.writeFileSync(path.join(ROOT,'analysis/employment-cues.json'),JSON.stringify(cues,null,2));
const times=[25.45,26.5,27.65,28.4,28.8,29.05,29.1333333333,29.1666666667];
const dir=path.join(ROOT,'previews',source?'employment-source':'employment-encoded');fs.mkdirSync(dir,{recursive:true});
const canvas=createCanvas(1920,1080),g=canvas.getContext('2d'),sheet=createCanvas(1920,596),s=sheet.getContext('2d');s.fillStyle='#101520';s.fillRect(0,0,1920,596);if(source)setPreviewMode(true);
for(let i=0;i<times.length;i++){
 const time=times[i],file=path.join(dir,`${String(i+1).padStart(2,'0')}-${time.toFixed(3)}.png`);
 if(source){await render(g,time,{blur:false});fs.writeFileSync(file,canvas.toBuffer('image/png'));}
 else execFileSync(ffmpeg,['-v','error','-y','-ss',String(time),'-i',path.join(ROOT,'output/film.mp4'),'-frames:v','1',file]);
 const image=await loadImage(file),x=(i%4)*480,y=Math.floor(i/4)*298;s.drawImage(image,x,y,480,270);s.font='17px Mono';s.fillStyle='#B6C7E1';s.fillText(time.toFixed(3)+' s',x+10,y+290);
}
fs.writeFileSync(path.join(ROOT,'previews',source?'employment-preview.jpg':'employment-proof.jpg'),sheet.toBuffer('image/jpeg'));
console.log(JSON.stringify(cues,null,2));
