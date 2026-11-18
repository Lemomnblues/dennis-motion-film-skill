import {lockup} from './brand.mjs';
import {beatAt} from './evidence-beat.mjs';
import {createCanvas} from '@napi-rs/canvas';
import {P,lim,out,smooth,elastic,txt,ln,box,ring,disc,polygon,haze,base,lattice,optics,stamp} from './graphic.mjs';
const TAU=Math.PI*2;
const mix=(a,b,t)=>a+(b-a)*t;
export const employmentTitles=['试用期管理','薪酬与加班','劳动关系解除','有据可循'];
const portalCanvas=createCanvas(1920,1080),portalContext=portalCanvas.getContext('2d');

function wordmark(g,line1,line2,local,{white=false,size=145,wide=false}={}){
 const enter=out(local/.17),ink=white?P.ink:P.paper;
 g.save();g.translate(112-(1-enter)*170,0);g.globalAlpha=enter;
 txt(g,line1,0,390,size,ink,'CN');txt(g,line2,0,570,size,white?P.purple:P.paper,'CN');
 g.restore();
 const length=wide?710:610;
 ln(g,118,646,118+length,646,white?'#B2C1DB':'#3C4D73',1.5);
}
function cornerIndex(g,id,white=false){
 txt(g,`0${id+1}`,118,234,102,white?'#BBC8E3':'#2C3550','Heavy');
 txt(g,'高频用工场景',282,224,30,white?'#6A7490':'#98A9CB','CN');
}
function contract(g,x,y,w,h,t,{highlight=1,paper=false}={}){
 g.save();g.translate(x,y);g.rotate(Math.sin(t*.8)*.025-.045);
 g.shadowColor=paper?'rgba(9,22,60,.18)':'rgba(23,58,160,.27)';g.shadowBlur=34;
 box(g,-w/2,-h/2,w,h,10,paper?'#F1F4FD':'#0C1730',paper?'#B9C8E1':'#526DA3',1.5);g.shadowBlur=0;
 txt(g,'劳动合同',-w/2+37,-h/2+71,37,paper?P.purple:'#D9E7FF','CN');
 txt(g,'EMPLOYMENT / CONTRACT',-w/2+39,-h/2+110,15,paper?'#73829C':'#617CA8','Mono');
 ln(g,-w/2+37,-h/2+136,w/2-37,-h/2+136,paper?'#C4D0E2':'#2B426C');
 ['合同期限','试用约定','岗位要求'].forEach((title,i)=>{
  let yy=-h/2+182+i*100;
  if(i===highlight){box(g,-w/2+25,yy-32,w-50,79,4,paper?'#E6DDED':'#452257');box(g,-w/2+25,yy-32,4,79,0,paper?P.purple:'#A27AE6')}
  txt(g,title,-w/2+42,yy,27,paper?'#465675':'#B4C9EC','CN');
  ln(g,-w/2+43,yy+25,w/2-59,yy+25,paper?'#AFBDD4':'#4D5C7D',3);
 });
 const y2=h/2-53;ln(g,-w/2+42,y2,w/2-42,y2,paper?'#C5CEDF':'#31466C');
 txt(g,lockup,-w/2+42,h/2-23,16,paper?'#8E7D9C':'#7190BE','Mono');g.restore();
}
function probation(g,local,e){
 base(g,e.realT);lattice(g,e.realT,{ground:true,opacity:.23});haze(g,1430,440,670,'#183DB9',.25);
 cornerIndex(g,0);wordmark(g,'试用期','管理',local);
 txt(g,'合同条目 · 期限刻度',120,716,31,'#A4B5D5','CN');
 txt(g,'PROBATION / EMPLOYMENT TERMS',120,875,20,'#647EA9','Mono');
 const beat=beatAt(e), entrance=elastic(local/.37);
 const compression=.032*beat.prepare, kick=.082*beat.spring;
 g.save();g.translate(1392,534+12*beat.prepare-15*beat.spring);
 const scale=.78+.22*entrance;
 g.scale(scale*(1+kick-compression),scale*(1+kick*.83-compression*.66));
 optics(g,0,0,292,e.realT,{alpha:.48});
 const sweep=-Math.PI/2+local*1.48+.18*beat.spring-.085*beat.prepare;
 g.shadowColor='#4D7AFF';g.shadowBlur=18;ring(g,0,0,322,'#5785FF',4,sweep,sweep+1.24);g.shadowBlur=0;
 for(let j=0;j<48;j++){const a=j*TAU/48;ln(g,Math.cos(a)*350,Math.sin(a)*350,Math.cos(a)*(j%4?357:370),Math.sin(a)*(j%4?357:370),j%4?'#2B426C':'#849ED6',j%4?1:2)}
 g.save();g.rotate(-.038*beat.prepare+.026*beat.spring);
 contract(g,0,0,422,554,local,{highlight:1});
 // A clamp on the active probation row travels on the same plane as the paper.
 g.rotate(Math.sin(local*.8)*.025-.045);
 if(beat.age<.32){const scan=smooth(beat.age/.32);g.globalAlpha=.74*(1-scan);
  ln(g,-187+370*scan,-27,-187+370*scan,48,'#DCD2FF',3);}
 g.restore();
 const ax=Math.cos(sweep)*338,ay=Math.sin(sweep)*338;disc(g,ax,ay,7,P.paper);g.restore();
 // The front scan is a physical plane, not a full-frame glow.
 const sy=265+(local*205)%490;ln(g,1095,sy,1686,sy,'#4B7CD936',1);
 stamp(g,'07 / EMPLOYMENT SCENARIOS',e.realT);
}
function worktime(g,local,e){
 base(g,e.realT,true);lattice(g,e.realT,{white:true,opacity:.045});
 polygon(g,[[1025,95],[1920,95],[1920,664],[1245,664]],'#E8EEFF');
 cornerIndex(g,1,true);wordmark(g,'薪酬','与加班',local,{white:true});
 txt(g,'工时记录 · 薪酬核对',119,706,31,'#637491','CN');
 const beat=beatAt(e),entry=beatAt(e,e.realT-local),cx=1460,cy=370,r=207;
 g.save();g.translate(cx,cy);const clockScale=1+.047*beat.spring-.028*beat.prepare;
 g.scale(clockScale,clockScale);g.translate(-cx,-cy);optics(g,cx,cy,r,local*.9,{white:true,alpha:.3});
 for(let j=0;j<60;j++){let a=j*TAU/60-Math.PI/2;ln(g,cx+Math.cos(a)*(r-11),cy+Math.sin(a)*(r-11),cx+Math.cos(a)*(r+(j%5?0:14)),cy+Math.sin(a)*(r+(j%5?0:14)),j%5?'#B8C9EB':P.blue,j%5?1:3)}
 const ticks=beat.index-entry.index+out(beat.age/.16)-1;
 const a=-Math.PI/2+(ticks-.15*beat.prepare)*Math.PI/3+.06*beat.spring;ln(g,cx,cy,cx+Math.cos(a)*149,cy+Math.sin(a)*149,P.blue,7);ln(g,cx,cy,cx+Math.cos(a*.36+.7)*100,cy+Math.sin(a*.36+.7)*100,P.purple,9);disc(g,cx,cy,12,P.purple);
 txt(g,'TIME',cx,cy+99,30,'#7890B9','Mono','center');
 if(beat.age<.31){g.save();g.globalAlpha=.72*(1-smooth(beat.age/.31));ring(g,cx,cy,r+30+49*smooth(beat.age/.31),P.blue,4,a-.48,a+.48);g.restore();}
 g.restore();
 const x=117,y=809,w=1686,fill=lim(local/.53),head=x+fill*w;
 for(let j=0;j<45;j++){let xx=x+j*w/44;ln(g,xx,y-28,xx,y-13-(j%4?0:11),'#95ABD1',1)}
 box(g,x,y,w,60,5,'#DCE5F7');
 for(let k=0;k<3;k++){const xx=x+k*(w/3+1),ww=lim(head-xx,0,w/3-7);if(ww>0)box(g,xx,y,ww,60,3,[P.blue,'#4475F4',P.purple][k]);}
 ['工时记录','加班申请','薪酬核对'].forEach((s,j)=>{let xx=x+j*w/3;txt(g,s,xx,920,27,j===2?P.purple:'#53698B','CN')});
 const pulseX=x+(Math.min(2,Math.max(0,beat.index-entry.index))+beat.phase)*w/3;
 ln(g,pulseX,y-9,pulseX,y+69,P.paper,3+5*beat.hit);
 stamp(g,'07 / EMPLOYMENT SCENARIOS',e.realT,true);
}
function separation(g,local,e){
 base(g,e.realT);haze(g,1290,520,1000,P.purple,.5);lattice(g,e.realT,{ground:true,opacity:.16});
 cornerIndex(g,2);wordmark(g,'劳动关系','解除',local,{size:139,wide:true});
 txt(g,'关键条款 · 程序核查',120,720,31,'#B2A6CC','CN');
 txt(g,'EMPLOYMENT / CONTRACT REVIEW',120,875,19,'#8B78A9','Mono');
 const beat=beatAt(e),explode=out(local/.52),cx=1450,cy=540;
 const pull=1+.22*beat.spring-.18*beat.prepare;
 // Three documents separate along a signed perspective axis.
 for(let k=0;k<3;k++){
  const depth=2-k;g.save();g.translate(cx+depth*54*explode*pull-11*beat.spring,cy-depth*59*explode*pull-12*beat.spring);
  const lift=1+.029*beat.spring-.018*beat.prepare;
  g.scale(lift,lift);g.transform(1,-.08,-.12,1,0,0);g.rotate(-.06+local*.055+.018*(depth-1)*beat.spring);
  g.globalAlpha=k===2?1:.4+depth*.12;
  if(k<2){box(g,-234,-297,468,594,8,k===0?'#2F1D47':'#422558','#8665B2',1.4);for(let j=0;j<7;j++)ln(g,-187,-205+j*65,177,-205+j*65,'#B899D347',2)}
  else{
   g.shadowColor='#02040A';g.shadowBlur=40;box(g,-234,-297,468,594,9,'#EFF3FC','#B8CBE9',1.5);g.shadowBlur=0;
   txt(g,'劳动合同',-190,-222,41,P.purple,'CN');txt(g,'TERMS / REVIEW',-186,-182,17,'#7C85A4','Mono');
   ['合同条款','程序核查','材料留存'].forEach((s,j)=>{const y=-93+j*124;box(g,-198,y-36,396,90,4,j===1?P.purple:'#E0E7F4');txt(g,s,-174,y+4,31,j===1?P.paper:'#546889','CN');ln(g,-173,y+30,156,y+30,j===1?'#AD91C0':'#B2BED4',3)});
  }g.restore();
 }
 const sy=250+(local*260)%560;ln(g,1120,sy,1770,sy,'#B587DE33',1);
 stamp(g,'07 / EMPLOYMENT SCENARIOS',e.realT);
}
function evidence(g,local,e,drawNext){
 base(g,e.realT);optics(g,960,490,390,e.realT,{alpha:.16});
 const beat=beatAt(e),enter=out(local/.17);
 const opening=smooth((local-.50)/.4),tabRecoil=beat.prepare*(1-opening);
 g.save();g.translate(960,395-opening*220);g.scale(.86+.14*enter,.86+.14*enter);g.globalAlpha=1-opening;
 txt(g,'有据可循',0,0,172,P.paper,'CN','center');g.restore();
 const chips=['试用期管理','薪酬与加班','劳动关系解除'];
 for(let j=0;j<3;j++){const convergence=smooth((local-.30)/.22),x=mix(465+j*495,960,convergence),y=mix(513,624,convergence),z=1-convergence*.7;
  g.save();g.translate(x,y);g.scale(z,z);g.globalAlpha=(1-convergence)*enter;box(g,-214,-34,428,68,34,'#111B32','#3B4A6A');txt(g,chips[j],0,12,31,'#B4C8ED','CN','center');g.restore();}
 stamp(g,'07 / EMPLOYMENT SCENARIOS',e.realT);
 // Paint the exact first frame of the next scene, then reveal it through
 // expanding entry rectangles. The final pixels match the receiving scene.
 portalContext.resetTransform();portalContext.clearRect(0,0,1920,1080);drawNext(portalContext);
 for(let side=0;side<2;side++){
  const sx=side?1030:110,x=mix(sx,side*960,opening),y=mix(675,0,opening)+8*tabRecoil,w=mix(780,960,opening),h=mix(232,1080,opening)-8*tabRecoil;
  g.save();g.beginPath();g.roundRect(x,y,w,h,12*(1-opening));g.clip();
  g.fillStyle=side?P.black:P.paper;g.fillRect(x,y,w,h);
  // As the tab opens, the document starts below its moving title.
  const bodyTop=mix(y+h+2,360,opening);
  const scale=w/960;
  if(opening>0)g.drawImage(portalCanvas,side*960,360,960,720,x,bodyTop,w,720*scale);
  if(opening<.85){
    g.save();g.globalAlpha=1-opening;
    const ax=x+w-88,ay=y+91;
    ln(g,ax-16,ay+16,ax+16,ay-16,side?'#a5b6ff':P.purple,4);
    ln(g,ax-2,ay-16,ax+16,ay-16,side?'#a5b6ff':P.purple,4);
    ln(g,ax+16,ay-16,ax+16,ay+2,side?'#a5b6ff':P.purple,4);g.restore();
  }
  const tx=mix(sx+46,side?1051:92,opening),ty=mix(812,260,opening),size=mix(56,105,opening);
  txt(g,side?'案例库':'法律法规库',tx,ty,size,side?P.paper:P.purple,'CN');
  g.globalAlpha=1-opening;txt(g,side?'CASE LIBRARY':'LEGAL LIBRARY',sx+49,867,18,side?'#8CA5CE':'#7683A1','Mono');g.restore();
  if(opening<.999)box(g,x,y,w,h,12*(1-opening),null,side?'#4167B6':'#CEDAF0',1.5);
 }
 ln(g,960,675*(1-opening),960,1080,'#84AEFF',3*opening);
 if(opening>.999)g.drawImage(portalCanvas,0,0);
}
export function employmentState(e){const edges=e.employmentCuts||[0,31/30,63/30,96/30];let state=0;while(state<3&&e.elapsed>=edges[state+1]-1e-7)state++;return{state,local:e.elapsed-edges[state]}}
export function drawEmployment(g,u,e,drawNext){
 const {state,local}=employmentState(e);
 if(state===0)probation(g,local,e);else if(state===1)worktime(g,local,e);else if(state===2)separation(g,local,e);else evidence(g,local,e,drawNext);
}
