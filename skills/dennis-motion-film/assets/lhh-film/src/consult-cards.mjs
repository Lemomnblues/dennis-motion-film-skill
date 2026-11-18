/**
 * LHH FESCO consultation cards. The physical rise, touchdown, independent
 * ground shadows and perspective strip projection adapt SME/src/contact-cards.mjs,
 * itself adapted from video-shotcraft / ContactShadowLift.tsx.
 * Copyright 2026 Wei Yihao (reference). Licensed under Apache-2.0.
 * Changes for LHH: new card artwork, projection dimensions, original-audio cue
 * selection, cached card faces and shadow materials. The consultation scene is
 * original artwork based on the LHH mini-program's P0 first-question flow.
 */
import {brand, lockup} from './brand.mjs';
import {createCanvas} from '@napi-rs/canvas';
import {P,txt,ln,box,disc,ring,stamp,lim,smooth} from './graphic.mjs';

const FPS=30;
const cardWidth=504, cardHeight=422;
const worldCenters=[-564,0,564];
const labels=[
  ['打开微信小程序','进入用工问答'],
  ['注册账户','微信快捷登录，完善信息'],
  ['用工问题','直接问']
];
const faceCache=new Map();
const shadowCache=new Map();
const question='试用期能否随意辞退员工？';
const easeOut=p=>1-(1-lim(p))**3;
const mix=(a,b,p)=>a+(b-a)*p;

function check(c,x,y,size,color){
  c.save();c.strokeStyle=color;c.lineCap='round';c.lineJoin='round';c.lineWidth=size*.13;
  c.beginPath();c.moveTo(x-size*.42,y);c.lineTo(x-size*.09,y+size*.27);c.lineTo(x+size*.43,y-size*.31);c.stroke();c.restore();
}
function arrow(c,x,y,size,color){
  ln(c,x-size*.44,y,x+size*.36,y,color,2.8);
  ln(c,x+size*.06,y-size*.30,x+size*.36,y,color,2.8);
  ln(c,x+size*.06,y+size*.30,x+size*.36,y,color,2.8);
}
function beatsOf(env){return env.beats??env.beat??[];}
function beatFrame(env,index,fallback){
  const hit=beatsOf(env).find(beat=>beat.index===index);
  return hit?.frame??fallback;
}
function actualFrame(env,u,start){return (Number.isFinite(env.realT)?env.realT:start+u)*FPS;}

function cardPose(index,frame,peaks,landings,env){
  const peak=peaks[index],riseStart=peak-8;
  const reveal=easeOut((frame-riseStart+2)/6);
  let height=easeOut((frame-riseStart)/8);
  let press=0;
  if(index<2){
    const landing=landings[index];
    if(frame>=landing-8)height=1-lim((frame-landing+8)/8)**3;
    if(frame>=landing)press=1-easeOut((frame-landing-2)/5);
    return {height,reveal,press,checked:frame>=landing,selected:false};
  }
  if(frame>=peak){
    height=1+.045*Math.exp(-(frame-peak)/4)*Math.sin((frame-peak)*.46);
    for(const [idx,fallback] of [[97,1561],[98,1577]]){
      const delta=frame-beatFrame(env,idx,fallback);
      if(delta>=-3&&delta<8)height+=.18*(delta<0?easeOut((delta+3)/3):1-easeOut(delta/8));
    }
  }
  return {height,reveal,press:0,checked:false,selected:frame>=peak};
}

function makeFace(index,checked,selected){
  const key=`${index}:${checked}:${selected}`;
  if(faceCache.has(key))return faceCache.get(key);
  const image=createCanvas(cardWidth*2,cardHeight*2),c=image.getContext('2d');c.scale(2,2);
  const material=c.createLinearGradient(0,0,cardWidth,cardHeight);
  material.addColorStop(0,selected?'#8544AF':'#FFFFFF');material.addColorStop(1,selected?'#522170':'#F1F4FC');
  box(c,1,1,cardWidth-2,cardHeight-2,19,material,selected?'#AF89D6':'#BCC9DC',1.5);
  ln(c,22,3,cardWidth-22,3,selected?'#CFADDF':'#FFFFFF',2);
  const ink=selected?'#FFFFFF':P.ink;
  txt(c,`0${index+1}`,30,158,163,selected?'#B38AD1':'#B9C6DD','Heavy');
  if(checked){disc(c,441,69,25,P.blue);check(c,441,69,26,'#FFFFFF');}
  else if(index===2){ring(c,441,69,25,selected?'#DCB9F7':'#8595BA',1.6);arrow(c,441,69,29,selected?'#FFFFFF':P.purple);}
  else{ring(c,441,69,25,'#B6BED2',1.3);disc(c,441,69,3.2,P.blue);}
  ln(c,35,186,cardWidth-35,186,selected?'#9D70BA':'#CAD4E5',1.2);
  txt(c,labels[index][0],34,264,index===0?49:54,ink,'CN');
  txt(c,labels[index][1],35,index===2?338:325,index===2?54:28,selected?'#FFFFFF':'#52617C','CN');
  // The stripe sits at the beveled lower edge, outside the copy area.
  box(c,34,376,45,4,2,selected?'#CFABEC':P.blue);
  box(c,83,376,cardWidth-117,4,2,selected?'rgba(215,184,239,.25)':'#E1E7F3');
  faceCache.set(key,image);return image;
}

const lens=3000,centerY=652;
function projection(x,y,z,tilt){
  const cos=Math.cos(tilt),sin=Math.sin(tilt);
  const depth=y*sin+z*cos;
  const q=lens/(lens-depth);
  return {x:960+x*q,y:centerY+(y*cos-z*sin)*q,q};
}
// Perspective-map the photographed surface by horizontal strips. Applying the same
// camera to floor materials keeps contact shadows aligned on both sloping edges.
function projectMaterial(c,image,cx,cy,z,width,height,tilt,stripHeight){
  const top=projection(cx,cy-height/2,z,tilt).y;
  const bottom=projection(cx,cy+height/2,z,tilt).y;
  const sin=Math.sin(tilt),cos=Math.cos(tilt);
  const sourceY=screenY=>{
    const dy=screenY-centerY;
    const floorY=(dy*(lens-z*cos)+lens*z*sin)/(lens*cos+dy*sin);
    return (floorY-cy+height/2)*image.height/height;
  };
  for(let y=Math.max(0,Math.floor(top));y<Math.min(1080,Math.ceil(bottom));y+=stripHeight){
    const y0=Math.max(y,top),y1=Math.min(y+stripHeight,bottom);
    if(y1<=y0)continue;
    const a=Math.max(0,sourceY(y0)),b=Math.min(image.height,sourceY(y1));
    const planeY=cy+((a+b)/(2*image.height)-.5)*height;
    const left=projection(cx-width/2,planeY,z,tilt).x;
    const right=projection(cx+width/2,planeY,z,tilt).x;
    c.drawImage(image,0,a,image.width,b-a,left,y0,right-left,y1-y0);
  }
}
function shadowMaterial(soft){
  if(shadowCache.has(soft))return shadowCache.get(soft);
  const pad=100,image=createCanvas(cardWidth+pad*2,cardHeight+pad*2),c=image.getContext('2d');
  c.filter=`blur(${soft?26:6}px)`;
  box(c,pad,pad,cardWidth,cardHeight,22,soft?'rgba(37,41,74,.21)':'rgba(33,31,60,.26)');
  shadowCache.set(soft,image);return image;
}
function cardShadow(c,x,m,tilt){
  const h=m.height;
  for(const soft of [true,false]){
    const xOffset=(soft?22:7)*h+2,yOffset=(soft?48:14)*h+4;
    const spread=1+(soft?.08:.015)*h;
    const tex=shadowMaterial(soft);
    c.save();c.globalAlpha=m.reveal*(soft?.32+.68*Math.min(1,h):.88-.6*Math.min(h,1));
    projectMaterial(c,tex,x+xOffset,yOffset,0,tex.width*spread,tex.height*spread,tilt,4);c.restore();
  }
}

export function drawConsultCards(c,u,env){
  const frame=actualFrame(env,u,48.83333);
  const peaks=[beatFrame(env,92,1481),beatFrame(env,94,1512),beatFrame(env,96,1545)];
  const landings=[env.progressFrames?.['miniapp-open']??beatFrame(env,93,1497),
                  env.progressFrames?.['account-ready']??beatFrame(env,95,1529)];
  const motions=peaks.map((_,i)=>cardPose(i,frame,peaks,landings,env));
  const bg=c.createLinearGradient(0,0,1650,1080);
  bg.addColorStop(0,'#FFFFFF');bg.addColorStop(.54,'#F7F8FC');bg.addColorStop(1,'#E3E9F9');c.fillStyle=bg;c.fillRect(0,0,1920,1080);
  const tilt=mix(.43,.35,smooth((frame-1465)/125));
  for(let x=-1010;x<=1010;x+=65)for(let y=-310;y<425;y+=62){
    const p=projection(x,y,0,tilt);disc(c,p.x,p.y,1.4*p.q,'#CFD9E9');
  }
  const intro=easeOut((frame-1465+1)/12);
  c.save();c.globalAlpha=intro;c.translate((1-intro)*-56,0);
  txt(c,'三步发起用工咨询',98,288,105,P.ink,'CN');c.restore();
  motions.forEach((m,i)=>cardShadow(c,worldCenters[i],m,tilt));
  for(const [i,m] of motions.entries()){
    if(m.reveal<=0)continue;
    const z=4+170*m.height,scale=1+.032*m.height-.017*m.press;
    const im=makeFace(i,m.checked,m.selected);
    c.save();c.globalAlpha=m.reveal;
    // Ground shadows stay fixed as the body and its material edge rise.
    const bottomY=cardHeight*scale/2;
    const left=projection(worldCenters[i]-cardWidth*.47*scale,bottomY,z,tilt);
    const right=projection(worldCenters[i]+cardWidth*.47*scale,bottomY,z,tilt);
    ln(c,left.x,left.y+1,right.x,right.y+1,m.selected?'#462058':'#B6C2D6',4);
    projectMaterial(c,im,worldCenters[i],0,z,cardWidth*scale,cardHeight*scale,tilt,2);c.restore();
  }
  // The just-landed tile passes a travelling stroke to the next tile.
  // Its height is projected onto the same desk as the contact shadows.
  for (let i=0; i<2; i++) {
    const age=frame-landings[i];
    if(age<0 || age>13) continue;
    const p=lim(age/13), x=worldCenters[i];
    const center=projection(x,cardHeight/2+26,0,tilt);
    const next=projection(worldCenters[i+1],cardHeight/2+26,0,tilt);
    const progress=smooth(p);
    const head=mix(center.x,next.x,progress), tail=mix(center.x,next.x,smooth(lim((p-.30)/.7)));
    c.save();c.globalAlpha=(1-p)*.9;
    ln(c,tail,center.y,head,center.y,i===0?P.blue:P.purple,4);
    disc(c,head,center.y,6-2*p,i===0?P.blue:P.purple);
    // Check ring pings on the same sample as the bell; it lives on the card face.
    const tile=motions[i], size=1+.032*tile.height-.017*tile.press;
    const badge=projection(x+(441-cardWidth/2)*size,(69-cardHeight/2)*size,4+170*tile.height,tilt);
    c.beginPath();c.ellipse(badge.x,badge.y,(29+27*easeOut(p))*badge.q,(26+22*easeOut(p))*badge.q,0,0,2*Math.PI);
    c.strokeStyle=i===0?P.blue:P.purple;c.lineWidth=3.8*(1-p)+.5;c.stroke();c.restore();
  }
  stamp(c,'11  /  GET STARTED',Number.isFinite(env.realT)?env.realT:49+u,true);
}

function consultationBackground(c,t){
  const bg=c.createLinearGradient(0,0,1920,1080);
  bg.addColorStop(0,'#07080E');bg.addColorStop(.52,'#1B1126');bg.addColorStop(1,'#0D1425');
  c.fillStyle=bg;c.fillRect(0,0,1920,1080);
  c.save();c.translate(1450,610);c.rotate(-.22+t*.018);c.scale(1,.63);
  for(let i=0;i<5;i++)ring(c,0,0,404+i*70,`rgba(158,121,191,${.2-i*.026})`,i===1?2:1);
  for(let i=0;i<60;i++){
    const angle=i*Math.PI/30,dist=i%5===0?763:751;
    ln(c,Math.cos(angle)*741,Math.sin(angle)*741,Math.cos(angle)*dist,Math.sin(angle)*dist,'#4B405D',1.2);
  }
  c.restore();
}
function promptSurface(c,progress,age){
  const typing=lim(progress),text=question.slice(0,Math.floor(typing*question.length));
  txt(c,'问答',45,127,46,P.purple,'CN');
  ln(c,45,150,733,150,'#D8CFDE',1.4);
  txt(c,'请输入用工问题',45,208,29,'#625672','CN');
  box(c,45,239,688,151,12,'#FFFFFF','#CABDD8',1.5);
  txt(c,text,69,305,39,P.ink,'CN');
  if(typing<1||Math.floor(age*4)%2===0){
    const width=c.measureText(text).width;
    ln(c,73+width,269,73+width,316,P.purple,2.5);
  }
  const active=typing>.04;
  box(c,45,435,688,79,11,active?P.purple:'#8B7299');
  txt(c,'开始提问',389,487,34,'#FFFFFF','CN','center');
}
function sentSurface(c,t){
  txt(c,'会话',45,127,46,P.purple,'CN');
  ln(c,45,150,733,150,'#D8CFDE',1.4);
  txt(c,'我的问题',727,203,25,'#635771','CN','right');
  box(c,136,228,597,90,14,'#EEE4F4','#DDCAE6',1);
  txt(c,question,705,286,37,P.purple,'CN','right');
  const enter=easeOut(t/.28);
  c.save();c.globalAlpha=enter;c.translate(0,(1-enter)*19);
  disc(c,67,391,21,P.purple);txt(c,'L',67,400,24,'#FFFFFF','Sans','center');
  txt(c,'智能助理',104,402,30,P.ink,'CN');
  box(c,45,431,435,79,13,'#FFFFFF','#D4CCD9',1);
  txt(c,'正在整理参考答复',67,482,31,'#4D4058','CN');
  for(let i=0;i<3;i++){
    const phase=.5+.5*Math.cos(t*7-i*1.1);
    disc(c,350+i*23,472,4+phase*1.4,`rgba(94,40,114,${.35+.55*phase})`);
  }
  c.restore();
}
function consultSurface(c,frame,submit,local,typedFraction){
  const appear=easeOut(local/.45),age=(frame-submit)/FPS,send=smooth((age+.01)/.27);
  const lift=1-appear;
  c.save();c.globalAlpha=appear;c.translate(1365+lift*80,561+lift*65);
  const pressAge=frame-submit;
  const press=pressAge>=0 && pressAge<8 ? Math.cos(pressAge*.65)*Math.exp(-pressAge*.48) : 0;
  c.rotate(-.034+.012*send+lift*.06);c.scale(.96+.04*appear-.033*press,.96+.04*appear-.033*press);c.translate(-389,-306);
  const shadow=c.createLinearGradient(0,0,778,613);
  shadow.addColorStop(0,'#785195');shadow.addColorStop(.5,'#3D3F90');shadow.addColorStop(1,'#242342');
  for(let d=12;d>=3;d-=3)box(c,d*.65,d,778,612,25,shadow);
  c.save();c.shadowColor='rgba(10,5,18,.42)';c.shadowBlur=34;c.shadowOffsetY=10;
  box(c,0,0,778,612,25,'#F9F7FC','#C6B5D8',1.8);c.restore();
  c.save();c.beginPath();c.roundRect(0,0,778,612,25);c.clip();
  const top=c.createLinearGradient(0,0,778,60);top.addColorStop(0,'#4D1B5A');top.addColorStop(1,'#6B3477');c.fillStyle=top;c.fillRect(0,0,778,57);
  txt(c,lockup,34,38,23,'#FFFFFF','Sans');
  ln(c,184,16,184,40,'#B691C4',1);txt(c,'用工合规智能助理',203,39,21,'#F7EDFC','CN');
  box(c,677,11,66,34,18,'rgba(255,255,255,.14)','rgba(255,255,255,.38)');
  for(let i=0;i<3;i++)disc(c,691+i*6,28,i===1?2.3:1.6,'#F5EEFC');
  ln(c,711,20,711,36,'#BBA0BE');ring(c,727,28,6,'#F5EEFC',1.4);
  c.save();c.beginPath();c.rect(0,61,778,470);c.clip();
  if(send<1){c.save();c.translate(-send*795,0);promptSurface(c,typedFraction,local);c.restore();}
  if(send>0){c.save();c.translate((1-send)*795,0);sentSurface(c,Math.max(0,age));c.restore();}
  c.restore();
  ruleFooter(c,send);
  // On the real drum transient a touch ripple confirms the first-question action.
  if(age>=0&&age<.26){
    const p=lim(age/.26);c.save();c.globalAlpha=(1-p)*.92;
    ring(c,645-795*send,474,14+easeOut(p)*42,'#D8C7FF',4.4-3*p);c.restore();
  }
  c.restore();c.restore();
}
function ruleFooter(c,progress){
  ln(c,32,543,746,543,'#E0D9E8',1);
  if(progress<1){c.save();c.globalAlpha=1-progress;
    ['问答','资料','我的'].forEach((label,i)=>txt(c,label,155+i*234,585,23,i===0?P.purple:'#91879B','CN','center'));
    c.restore();}
  if(progress>0){c.save();c.globalAlpha=progress;
    txt(c,lockup,43,584,18,'#968CA3','Mono');c.restore();}
}

export function drawConsultAction(c,u,env){
  const frame=actualFrame(env,u,53.06667),local=(frame-beatFrame(env,99,1592))/FPS;
  const submit=env.progressFrames?.['question-sent']??beatFrame(env,103,1656),age=(frame-submit)/FPS;
  consultationBackground(c,Math.max(0,local));
  const appear=easeOut((local+.04)/.44);
  c.save();c.globalAlpha=appear;c.translate((1-appear)*-95,0);
  // An outlined wordmark leaves the Chinese action as the highest-contrast line.
  c.font='700 170px "Sans"';c.textAlign='left';c.textBaseline='alphabetic';
  c.lineWidth=2.2;c.strokeStyle='#9D8AAE';c.strokeText(brand.wordmark,103,400);
  txt(c,'立即咨询',98,600,153,'#FFFFFF','CN');
  ln(c,108,655,777,655,'#56405F',1.4);
  txt(c,'用工 · 合规 · 一键咨询',106,746,43,'#DDCDE5','CN');
  c.restore();
  // The transport line goes from the CTA to the product exactly as the draft sends.
  const pulse=age<0?0:Math.exp(-age*6);
  ln(c,106,812,786,812,'#44324C',1);
  const run=lim((frame-1608)/(submit-1608));
  if(run>0){ln(c,106,812,106+680*run,812,age<0?'#9B73B0':'#7851C3',2);
    disc(c,106+680*run,812,4+pulse*5,pulse>.25?'#CADDFF':'#BD9ED7');}
  const typeFrames=[beatFrame(env,100,1608),beatFrame(env,101,1624),beatFrame(env,102,1641)];
  const typedFraction=typeFrames.reduce((sum,onset,i)=>sum+easeOut((frame-onset+1)/6)*[4,4,5][i],0)/13;
  consultSurface(c,frame,submit,Math.max(0,local),typedFraction);
  stamp(c,'12  /  CONSULTATION',Number.isFinite(env.realT)?env.realT:53+u);
}
