import {createCanvas, loadImage} from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT, lim, out, txt, ln} from './graphic.mjs';

// Replace any of the four numbered plates with a project image via assets/team.json.
export const roster = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/team.json'), 'utf8'));
if (roster.length !== 4) throw Error('The four-slot team scene expects four entries in team.json');
function numberPlate(item, index) {
  const canvas = createCanvas(640, 480);
  const g = canvas.getContext('2d');
  const gradient = g.createLinearGradient(0, 0, 640, 480);
  gradient.addColorStop(0, item.color);
  gradient.addColorStop(1, '#151425');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 640, 480);
  for (let ring = 0; ring < 5; ring++) {
    g.beginPath();
    g.arc(320, 210, 100 + 35 * ring, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(255,255,255,.14)';
    g.stroke();
  }
  txt(g, String(index + 1).padStart(2, '0'), 320, 247, 110, '#ffffff', 'Heavy', 'center');
  return canvas;
}
const photos = await Promise.all(roster.map((item, index) => item.image
  ? loadImage(path.resolve(ROOT, 'assets', item.image))
  : numberPlate(item, index)));
const WIDTH = 464, HEIGHT = 290, X = 94, Y = 580;
function portraitCrop(g, i, punch=0) {
  const img = photos[i], spec = roster[i];
  const w = img.width * (spec.span ?? .94) / (1+punch), h = w * HEIGHT / WIDTH;
  const x = lim(img.width * (spec.cx ?? .5) - w/2, 0, img.width - w);
  g.drawImage(img, x, img.height * (spec.top ?? .04), w, h, X, Y, WIDTH, HEIGHT);
}

export function drawAdviserPortrait(g, frame, cues) {
  let index=0;
  while(index<3 && frame>=cues[index+1]-4) index++;
  const age=frame-cues[index];
  const p=lim((age+4)/7);
  const reveal=out(p);
  const punch=age>=0 ? .085*Math.exp(-age/5.5) : 0;
  g.save();
  g.globalAlpha *= out((frame-cues[0]+4)/5);
  g.save();g.beginPath();g.rect(X,Y,WIDTH,HEIGHT);g.clip();
  if(index>0 && reveal<1){
    g.save();g.translate(-WIDTH*reveal,0);portraitCrop(g,index-1);g.restore();
  }
  g.translate(WIDTH*(1-reveal),0);
  portraitCrop(g,index,punch);
  g.restore();
  g.strokeStyle='#89759b';g.lineWidth=1;g.strokeRect(X+.5,Y+.5,WIDTH-1,HEIGHT-1);
  if(p>0 && p<1) ln(g,X+(1-reveal)*WIDTH,Y,X+(1-reveal)*WIDTH,Y+HEIGHT,'#dbc4f3',5);
  const caption=age<0 && index>0 ? index-1 : index;
  txt(g,roster[caption].name,X,Y+HEIGHT+42,32,'#f0eaf7','CN');
  txt(g,'0'+(caption+1)+' / 04',X+WIDTH,Y+HEIGHT+40,18,'#a49ab8','Mono','right',400);
  g.restore();
}

export function drawAdviserAvatar(g, i, x, y) {
  const img=photos[i], spec=roster[i], side=img.width*(i===3?.42:.52);
  const sx=lim(img.width*(spec.cx ?? .5)-side/2,0,img.width-side);
  const sy=lim(img.height*(spec.faceY ?? .44)-side*.42,0,img.height-side);
  g.save();g.beginPath();g.arc(x,y,34,0,2*Math.PI);g.clip();
  g.drawImage(img,sx,sy,side,side,x-34,y-34,68,68);
  g.restore();
}
