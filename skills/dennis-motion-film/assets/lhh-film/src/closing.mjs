import {brand, lockup} from './brand.mjs';
import {drawAdviserPortrait, drawAdviserAvatar, roster} from './adviser-photo.mjs';
import {drawConsultCards, drawConsultAction} from './consult-cards.mjs';
// Original closing sequence, authored from scratch for the unretimed soundtrack.
// Canvas coordinates: 1920 x 1080. Fonts supplied by the host: Heavy, Sans, Mono, CN.
const P={ink:'#050609',paper:'#F6F8FF',blue:'#2B4FFF',purple:brand.accent,violet:'#713BC0'};
const cap=(x)=>Math.max(0,Math.min(1,x));
const rise=(x)=>1-Math.pow(1-cap(x),5);
const blend=(x)=>{x=cap(x);return x*x*(3-2*x);};
const pi=Math.PI;

function type(c,s,x,y,size=30,color=P.paper,font='CN',align='left'){
  c.font=`${font==='Mono'?400:700} ${size}px "${font}"`;c.fillStyle=color;
  c.textBaseline='alphabetic';c.textAlign=align;c.fillText(s,x,y);
}
function rule(c,x,y,a,b,color,width=1){c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.lineWidth=width;c.strokeStyle=color;c.stroke();}
function disk(c,x,y,r,fill,stroke,width=1){c.beginPath();c.arc(x,y,r,0,2*pi);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function box(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function withAlpha(c,a,f){c.save();c.globalAlpha*=cap(a);f();c.restore();}
function crosshair(c,x,y,col='#717DAD',s=7){rule(c,x-s,y,x+s,y,col);rule(c,x,y-s,x,y+s,col);}
function wash(c,x,y,r,col,a=1){c.save();c.globalAlpha=a;const rgb=[1,3,5].map(i=>parseInt(col.slice(i,i+2),16));const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,`rgba(${rgb.join(',')},0)`);c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
function tick(c,x,y,size,col){c.save();c.lineWidth=size*.105;c.lineCap='round';c.lineJoin='round';c.strokeStyle=col;c.beginPath();c.moveTo(x-size*.35,y);c.lineTo(x-size*.06,y+size*.25);c.lineTo(x+size*.38,y-size*.32);c.stroke();c.restore();}
function smallMeta(c,section,white=false){
  const color=white?'#77708B':'#9A96B2';
  type(c,lockup,88,65,20,color,'Mono');
  type(c,section,1832,65,18,color,'Mono','right');
  rule(c,88,90,1832,90,white?'#D7D9E5':'#2E2941');
  type(c,brand.practice,88,1021,18,color,'Mono');
  type(c,brand.promise,1832,1021,18,color,'Mono','right');
  for(const [x,y]of [[57,126],[1863,126],[57,962],[1863,962]])crosshair(c,x,y,white?'#C8C5D4':'#4B4266',5);
}
function teamScene(c,u,env){
  const entry=rise(u/.72),pulse=cap(env.pulse||0);
  const frame=(env.realT??(43+u))*30;
  const rosterBeats=[81,83,85,87].map((index,i)=>env.beats?.find(b=>b.index===index)?.frame??[1306,1337,1369,1401][i]);
  c.fillStyle=P.ink;c.fillRect(0,0,1920,1080);
  wash(c,1440,410,1060,'#23152D',.9);wash(c,1160,860,810,'#12266E',.55);
  // A slow perspective field puts the software index in a tangible space.
  for(let i=-11;i<=17;i++)rule(c,1265,330,70+i*154,1080,'rgba(89,90,161,.15)');
  for(let i=0;i<11;i++){const z=(i/11+u*.015)%1,y=330+780*z*z;rule(c,0,y,1920,y,'rgba(91,89,152,.12)');}
  for(let i=0;i<6;i++){const x=100+i*325;rule(c,x,115,x,935,'rgba(132,112,164,.04)');}
  smallMeta(c,'10 / ADVISORY TEAM');
  c.save();c.translate((1-entry)*-130,0);c.globalAlpha=entry;
  type(c,'法律及咨询',90,280,70,P.paper);
  type(c,'顾问团队',88,389,96,P.paper);
  rule(c,92,433,512,433,'#79558B',2);
  type(c,'LEGAL',94,491,39,'#A69BB9','Heavy');type(c,'EXPERT DIRECTORY',94,530,21,'#786B93','Mono');
  drawAdviserPortrait(c,frame,rosterBeats);
  c.restore();

  // Glass roster: a distinct index with a header rail, four spacious rows, and live selection.
  c.save();c.translate(1240,548+(1-entry)*90);c.rotate((1-entry)*-.06);c.translate(-1240,-548);c.globalAlpha=entry;
  c.shadowColor='rgba(0,0,0,.5)';c.shadowBlur=55;c.shadowOffsetY=35;
  box(c,653,176,1167,720,26,'#11131F');c.shadowBlur=0;c.shadowOffsetY=0;
  const body=c.createLinearGradient(660,180,1810,900);body.addColorStop(0,'#1B1B2D');body.addColorStop(.55,'#101421');body.addColorStop(1,'#17112A');
  box(c,653,176,1167,720,26,body,'#514160');
  rule(c,682,251,1787,251,'#383346');
  type(c,'CONSULTING / PEOPLE',692,222,20,'#BAB0CC','Mono');
  for(let i=0;i<4;i++)disk(c,1693+i*24,215,4.2,i===3?'#9E72E2':'#544A6C');
  const selection=rise((frame-rosterBeats[3]+1)/6);
  for(let i=0;i<4;i++){
    const age=frame-rosterBeats[i], p=blend((age+6)/6), y=273+i*143;
    if(p===0)continue;
    c.save();c.globalAlpha*=p;
    const bounce=age<0?0:13*Math.sin(age*.57)*Math.exp(-age*.30);
    c.translate((1-p)*152-bounce,0);
    const chosen=i===3?selection:0;
    if(chosen){withAlpha(c,chosen,()=>{const g=c.createLinearGradient(677,y,1797,y);g.addColorStop(0,'#632C79');g.addColorStop(1,'#262552');box(c,676,y,1122,124,15,g,'#76579A');});}
    else box(c,677,y,1121,124,15,i%2?'rgba(40,40,62,.32)':'rgba(24,29,44,.4)');
    if(age>=0 && age<12){
      const travel=cap(age/11);
      c.save();c.globalAlpha=(1-travel)*.9;
      const x=682+1104*(1-(1-travel)**2);
      rule(c,Math.max(682,x-197),y+119,x,y+119,'#BDB6FF',3);
      c.fillStyle='#CCD7FF';c.fillRect(677,y+12,4,99*(1-travel));
      c.restore();
    }
    const cy=y+62;
    disk(c,749,cy,37,chosen?'#B396DC':'#252A40',chosen?'#D8C6EB':'#51506C',1.3);
    drawAdviserAvatar(c,i,749,cy);
    type(c,roster[i].name,815,cy+15,i===3?49:45,P.paper,'CN');
    type(c,roster[i].role,1250,cy+13,32,chosen?'#F5E9FF':'#B8B7CB');
    if(chosen>.4){tick(c,1742,cy,29,'#E6D3FF');}
    else{rule(c,1730,cy,1751,cy,'#8D83A5',1.6);rule(c,1744,cy-7,1751,cy,'#8D83A5',1.6);rule(c,1744,cy+7,1751,cy,'#8D83A5',1.6);}
    c.restore();
  }
  c.restore();
  // Foreground passes sit below reading areas and establish depth without hiding copy.
  const frontY=955+Math.sin(u*.45)*5;rule(c,577,frontY,1832,frontY,'#66558C',1.5);
  c.fillStyle='#A699CE';c.fillRect(577+(u*155)%1180,frontY-2,70+20*pulse,3);
  type(c,`${lockup} / ${brand.product}`,663,947,18,'#7E7596','Mono');
}

function roundLetters(c,s,r,angle){
  const chars=[...s],spacing=2*pi/chars.length;
  for(let i=0;i<chars.length;i++){c.save();c.rotate(angle+i*spacing);type(c,chars[i],0,-r,20,P.purple,'Mono','center');c.restore();}
}
function finalScene(c,u,env){
  const real=Number.isFinite(env.realT)?env.realT:57+u;
  const lock=env.lockTime??(1784/30);
  const v=Math.max(0,Math.min(real,lock)-57);
  const enter=rise(v/.84),copy=rise((v-.16)/.95);
  c.fillStyle='#FBFCFF';c.fillRect(0,0,1920,1080);
  wash(c,320,540,670,'#F0ECF8',.7);wash(c,1760,160,620,'#EEF3FF',.55);
  for(let i=0;i<8;i++)rule(c,112+i*240,103,112+i*240,977,'rgba(105,93,140,.035)');
  smallMeta(c,'13 / LEGAL ASSISTANT',true);
  c.save();c.globalAlpha=enter;c.translate(420-(1-enter)*140,542);c.scale(.76+.24*enter,.76+.24*enter);
  c.shadowColor='rgba(62,29,80,.13)';c.shadowBlur=40;c.shadowOffsetY=18;disk(c,0,0,250,'#FFFFFF');c.shadowBlur=0;c.shadowOffsetY=0;
  disk(c,0,0,250,null,'#E0D7E9',1.2);disk(c,0,0,184,null,'#DDD4E7',1);
  // Integrate positive angular velocity in elapsed seconds. Entry decelerates
  // into a constant drift. The final four beats soften it before the beat stop.
  const spinDuration=Math.max(1/30,lock-57);
  const finalBar=Math.min(spinDuration,240/(env.bpm??112.898));
  const barProgress=cap((v-(spinDuration-finalBar))/finalBar);
  const cruise=.28,landing=.115;
  const entranceTravel=1.45/1.7*(1-Math.exp(-1.7*v));
  const brakeTravel=(cruise-landing)*finalBar*(barProgress**3-.5*barProgress**4);
  const spin=1.69-entranceTravel-cruise*v+brakeTravel;
  roundLetters(c,`${lockup} · ${brand.product} · `,216,-.52+spin);
  const diskFill=c.createLinearGradient(-120,-130,150,160);diskFill.addColorStop(0,'#622774');diskFill.addColorStop(1,P.purple);disk(c,0,0,150,diskFill);
  type(c,brand.wordmark,0,19,100,'#FFFFFF','Sans','center');type(c,brand.partner,0,66,27,'#D9C7E6','Mono','center');
  c.restore();
  const x=786+(1-copy)*130;
  c.save();c.globalAlpha=copy;
  type(c,brand.wordmark,x,516,275,P.purple,'Sans');
  type(c,brand.product,x+1,638,84,'#12141C','Heavy');
  rule(c,x+3,684,1798,684,'#CEC6D9',1.5);
  type(c,brand.tagline,x+3,771,54,P.purple);
  type(c,`${lockup} / ${brand.practice}`,x+5,827,19,'#80728D','Mono');
  c.restore();
  // This foreground brand tick also stops at the last strong beat.
  const settle=blend((v-1.65)/Math.max(1/30,spinDuration-1.65));rule(c,788,873,788+1010*settle,873,'#DED9E7');
  disk(c,788+1010*settle,873,3.2,P.purple);
}

export function drawClosing(ctx,t,env={}){
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
  if(t<49)teamScene(ctx,Math.max(0,t-43),env);
  else if(t<53)drawConsultCards(ctx,t-49,env);
  else if(t<57)drawConsultAction(ctx,t-53,env);
  else finalScene(ctx,t-57,env);
  ctx.restore();
}
