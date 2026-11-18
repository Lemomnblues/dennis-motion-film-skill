import {brand, lockup} from './brand.mjs';
import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const [file,name] of [['CJK.otf','CN'],['Heavy.woff','Heavy'],['Sans.woff','Sans'],['Mono.woff','Mono']])GlobalFonts.registerFromPath(path.join(ROOT,'assets/fonts',file),name);
const {duration:filmDuration}=JSON.parse(fs.readFileSync(path.join(ROOT,'analysis/ending.json'),'utf8'));
const filmFrames=Math.round(filmDuration*30);
const hudEnd=String(Math.floor(filmFrames/30)).padStart(2,'0')+' : '+String(filmFrames%30).padStart(2,'0');
export const P={black:'#03050A',paper:'#F5F7FD',ink:'#0A1020',blue:'#244EFF',purple:brand.accent,lilac:'#A19BDD',steel:'#7889AF'};
export const lim=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const out=x=>1-(1-lim(x))**5;
export const smooth=x=>{x=lim(x);return x*x*(3-2*x)};
export const elastic=x=>x<=0?0:x>=1?1:1-Math.exp(-8*x)*Math.cos(11*x);
export function txt(g,s,x,y,n,col=P.paper,font='Sans',align='left',weight=700){g.font=`${weight} ${n}px "${font}"`;g.textAlign=align;g.textBaseline='alphabetic';g.fillStyle=col;g.fillText(s,x,y);}
export function fit(g,s,x,y,n,w,col=P.paper,font='CN',align='left'){g.font=`700 ${n}px "${font}"`;txt(g,s,x,y,Math.min(n,n*w/g.measureText(s).width),col,font,align);}
export function ln(g,a,b,c,d,color='#34405F',width=1){g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.lineWidth=width;g.strokeStyle=color;g.stroke();}
export function box(g,x,y,w,h,r,fill,stroke=null,lineWidth=1){g.beginPath();g.roundRect(x,y,w,h,r);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=lineWidth;g.stroke()}}
export function ring(g,x,y,r,color,width=1,start=0,end=Math.PI*2){g.beginPath();g.arc(x,y,r,start,end);g.strokeStyle=color;g.lineWidth=width;g.stroke()}
export function disc(g,x,y,r,color){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=color;g.fill()}
export function polygon(g,points,col,stroke=null){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();if(col){g.fillStyle=col;g.fill()}if(stroke){g.strokeStyle=stroke;g.stroke()}}
export function haze(g,x,y,r,col,opacity=.2){g.save();g.globalAlpha=opacity;let q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,col);q.addColorStop(1,'transparent');g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2);g.restore()}
export function seed(n){return()=>{n=Math.imul(n^n>>>15,1|n);n+=0x6D2B79F5;return((n^n>>>14)>>>0)/4294967296}}
export function base(g,t,white=false){g.fillStyle=white?P.paper:P.black;g.fillRect(0,0,1920,1080);if(white){let q=g.createLinearGradient(0,1080,1700,0);q.addColorStop(0,'#E1EAFE');q.addColorStop(.6,'#F5F7FD');q.addColorStop(1,'#FFF');g.fillStyle=q;g.fillRect(0,0,1920,1080)}else{haze(g,1200+Math.sin(t*.3)*90,450,1000,P.purple,.42);haze(g,580,750,780,'#103BAD',.25)}}
export function lattice(g,t,{white=false,ground=false,opacity=.15}={}){g.save();g.globalAlpha*=opacity;let col=white?'#496288':'#6C8AC0';if(ground){const vanY=560;for(let i=-16;i<=16;i++)ln(g,960+i*18,vanY,960+i*240,1080,col);for(let i=0;i<23;i++){let z=(i/23+t*.018)%1;let y=vanY+520*z*z;ln(g,0,y,1920,y,col)}}else{for(let x=0;x<=1920;x+=96)ln(g,x,0,x,1080,col);for(let y=0;y<=1080;y+=96)ln(g,0,y,1920,y,col)}g.restore()}
export function optics(g,x,y,r,t,{white=false,alpha=.3}={}){g.save();g.globalAlpha=alpha;let col=white?'#436197':'#6E8CE8';for(let k=0;k<3;k++){g.setLineDash(k===1?[4,15]:[]);ring(g,x,y,r+k*18,col,k?1:2,t*(k%2?-.2:.12),t*(k%2?-.2:.12)+Math.PI*(k===2?1.4:2))}g.setLineDash([]);for(let k=0;k<60;k++){let a=k*Math.PI/30+t*.08,rr=r+50;ln(g,x+Math.cos(a)*rr,y+Math.sin(a)*rr,x+Math.cos(a)*(rr+(k%5?5:16)),y+Math.sin(a)*(rr+(k%5?5:16)),col,1)}g.restore()}
export function stamp(g,scene,t,white=false){let col=white?'#596780':'#8191B3';box(g,66,55,12,12,1,P.blue);txt(g,lockup,92,70,20,white?P.purple:P.paper,'Mono','left',400);txt(g,scene,1854,70,16,col,'Mono','right',400);txt(g,brand.practice,66,1026,17,col,'Mono','left',400);txt(g,`${String(Math.floor(t)).padStart(2,'0')} : ${String(Math.floor(t*30)%30).padStart(2,'0')} / ${hudEnd}`,1854,1026,17,col,'Mono','right',400);for(const [x,y,s]of[[36,36,1],[1884,36,-1],[36,1044,1],[1884,1044,-1]]){ln(g,x,y,x+s*18,y,col);ln(g,x,y,x,y+(y>1000?-18:18),col)}}
export function extrude(g,s,x,y,n,depth=20,font='Sans'){for(let k=depth;k>0;k-=2)txt(g,s,x+k*.8,y+k*.6,n,k<5?'#9165AF':P.purple,font,'center');txt(g,s,x,y,n,P.paper,font,'center')}
const noise=createCanvas(240,135),ng=noise.getContext('2d'),pixels=ng.createImageData(240,135),rng=seed(17487);for(let i=0;i<pixels.data.length;i+=4){let v=rng()*255;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=18}ng.putImageData(pixels,0,0);
export function finish(g,t,white=false){g.save();g.globalAlpha=.11;g.globalCompositeOperation=white?'multiply':'screen';g.drawImage(noise,-((Math.floor(t*30)%4)*8),0,1960,1080);g.restore();if(!white){let q=g.createRadialGradient(960,540,550,960,540,1160);q.addColorStop(0,'transparent');q.addColorStop(1,'rgba(0,0,0,.25)');g.fillStyle=q;g.fillRect(0,0,1920,1080)}}
