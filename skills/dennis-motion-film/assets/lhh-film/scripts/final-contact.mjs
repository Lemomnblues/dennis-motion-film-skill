import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ffmpeg from 'ffmpeg-static';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import '../src/graphic.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),movie=path.join(root,'output/film.mp4'),dir=path.join(root,'previews/final-encoded');fs.mkdirSync(dir,{recursive:true});
const edit=JSON.parse(fs.readFileSync(path.join(root,'analysis/beats.json'),'utf8'));
const times=[.9,3.4,6.5,8.2,9.6,10.6,12.5,16.4,19.6,21.6,22.6,23.6,24.4,25.45,26.5,27.65,28.4,30.8,33.55,34.9,36.5,38.4,40.87,42.67,44.5,48,49.37,50.4,51.5,54.83,55.77,59.8,edit.duration-1.2,edit.duration-.1];
const canvas=createCanvas(1920,Math.ceil(times.length/4)*298),g=canvas.getContext('2d');g.fillStyle='#10141E';g.fillRect(0,0,canvas.width,canvas.height);
for(let i=0;i<times.length;i++){const file=path.join(dir,`${String(i+1).padStart(2,'0')}-${times[i].toFixed(1)}.png`);execFileSync(ffmpeg,['-v','error','-y','-ss',String(times[i]),'-i',movie,'-frames:v','1',file]);const img=await loadImage(file);let x=(i%4)*480,y=Math.floor(i/4)*298;g.drawImage(img,x,y,480,270);g.fillStyle='#B9CAE5';g.font='16px Mono';g.fillText(`${times[i].toFixed(1)} s`,x+12,y+290)}
fs.writeFileSync(path.join(root,'previews/final-contact.jpg'),canvas.toBuffer('image/jpeg'));console.log('Encoded video contact sheet complete.');
