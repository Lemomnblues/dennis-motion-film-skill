import {brand, lockup} from './brand.mjs';
import {frameOf,frameFor,currentBeat,flashEnvelope,stageRays,bandedWord,commandRow,layerAccent} from './opening-accents.mjs';
import {drawLibraries} from './library-spread.mjs';
import {drawEvidenceFlow} from './evidence-flow.mjs';
import {drawInquiry,drawSignal} from './inquiry-signal.mjs';
import {drawEmployment} from './employment.mjs';
import {P,lim,out,elastic,txt,ln,box,ring,disc,base,lattice,optics,stamp,extrude} from './graphic.mjs';
const TAU=Math.PI*2;
function dial(g,x,y,t,scale=1){g.save();g.translate(x,y);g.scale(scale,scale);optics(g,0,0,170,t,{alpha:.45});for(let i=0;i<8;i++){const a=i*TAU/8+t*.25;disc(g,Math.cos(a)*145,Math.sin(a)*145,i%2?2:4,'#9BAFE8')}ln(g,-200,0,200,0,'#263E6B');ln(g,0,-200,0,200,'#263E6B');g.restore()}
function intro(g,u,e){
  const frame=frameOf(e),beat=currentBeat(e);
  const revealFrame=frameFor(e,3,62),reveal=out((frame-revealFrame+7)/7);
  base(g,u);lattice(g,u,{ground:true,opacity:.23});
  g.save();g.globalAlpha=1-reveal*.82;
  txt(g,'BOOT / LEGAL INTELLIGENCE',106,178,18,'#7292CF','Mono','left',400);
  const command=`${lockup} ${brand.practice}`,typed=Math.floor(lim(u/1.15)*command.length);
  txt(g,command.slice(0,typed),106,240,38,P.paper,'Mono');
  if(u<1.6&&Math.floor(u*8)%2===0){g.fillStyle=P.blue;g.fillRect(106+typed*23,204,18,42);}
  const jobs=['PULLING / KNOWLEDGE','BUILDING / CONTEXT','READY / CONSULTING'];
  for(let j=0;j<3;j++){
    const end=frameFor(e,j,[14,30,46][j]),start=j?frameFor(e,j-1,[14,30][j-1]):0;
    const progress=lim((frame-start)/(end-start)),bounce=flashEnvelope(frame-end,8);
    txt(g,jobs[j],110,300+j*38,16,'#8298BC','Mono','left',400);
    box(g,495,286+j*38,265,5,1,'#19263C');
    if(progress>0)box(g,495,286+j*38,265*progress,5+bounce*5,1,j===2?'#B7CAFF':'#486DDF');
    if(bounce>0){g.save();g.globalAlpha=bounce;ring(g,760,289+j*38,6+(1-bounce)*26,'#97B4FF',2.3);g.restore();}
  }
  g.restore();dial(g,1640,270,u,.62);dial(g,265,805,-u,.46);
  if(reveal>0){
    const impact=flashEnvelope(beat.age,9),launch=flashEnvelope(frame-revealFrame,11);
    g.save();g.globalAlpha=reveal;stageRays(g,beat,u);optics(g,960,540,360+impact*22,u,{alpha:.35});
    const scale=(.76+.24*reveal)*(1+impact*(beat.strong?.073:.036)+launch*.035);
    g.translate(960,497-6*impact);g.scale(scale,scale);g.translate(-960,-497);
    extrude(g,brand.wordmark,960,638,530,28+Math.round(12*impact));
    txt(g,brand.partner,960,815,124,P.paper,'Sans','center');
    txt(g,brand.practice,960,900,22,'#94A6CC','Mono','center',400);g.restore();
  }
  txt(g,`${Math.round(lim(frame/revealFrame)*100)} / SYSTEM ONLINE`,1550,930,18,'#7189B8','Mono','left',400);
  stamp(g,'01  /  BRAND SIGNAL',e.realT);
}
export const phrases=brand.phrases;
function type(g,u,e){
  const switches=e.wordCuts||[0,.53,1.06,2.12,2.65,3.18,3.71,4.24];
  const shotStart=e.realT-e.elapsed,wordFrames=switches.map(t=>Math.round((shotStart+t)*30));
  const frame=frameOf(e),beat=currentBeat(e);
  let idx=0;while(idx<7&&frame+.00001>=wordFrames[idx+1])idx++;
  const age=Math.max(0,frame-wordFrames[idx]);
  const entry=out((age+1)/6),white=idx%2===0||idx===7;
  const insideWord=frame-beat.age>=wordFrames[idx]+6;
  const rebound=insideWord?flashEnvelope(beat.age,7):0;
  base(g,u,white);g.save();g.globalAlpha=.1;lattice(g,u,{white,opacity:.8});g.restore();
  g.save();g.font='800 760px Heavy';g.lineWidth=1.5;g.strokeStyle=white?'#CCD7EE':'#223259';
  g.translate(100-(u*67)%200,880);g.strokeText(idx<2?phrases.slice(0,2).join(' / ').toUpperCase():lockup,0,0);g.restore();
  optics(g,idx%2?1050:870,540,415,u,{white,alpha:.18});
  const size=idx<2?410:idx===2?225:idx===7?260:510;
  const ink=idx===7?P.purple:white?P.ink:P.paper,font=idx<2?'Sans':'CN';
  g.save();g.translate(960,560);
  // Keep each short word readable after six frames of entry motion.
  if(idx===0){const scale=.78+.22*elastic((age+1)/7);g.scale(scale,scale);}
  if(idx===1)g.translate((1-entry)*-430,0);
  if(idx===2)g.translate(0,(1-entry)*185);
  if(idx===3){const scale=1+(1-entry)*.95;g.scale(scale,scale);}
  if(idx===4)g.rotate((1-entry)*-.13);
  if(idx===5)g.transform(1,0,(1-entry)*.62,1,0,0);
  if(idx===6)g.translate((1-entry)*290,0);
  if(idx===7){const scale=.94+.06*elastic((age+1)/7);g.scale(scale,scale);}
  g.scale(1+.04*rebound,1-.035*rebound);
  bandedWord(g,phrases[idx],size,font,ink,idx,age);g.restore();
  if(idx===7)txt(g,phrases[2],960,287,54,P.purple,'CN','center');
  else{txt(g,`0${idx+1}`,90,255,102,white?'#CBD4E5':'#313D5F','Heavy');ln(g,90,290,320,290,white?'#B7C7E2':'#45507F',2);}
  const fraction=lim((age+1)/12),railEnd=68+1784*fraction;
  box(g,68,927,1784*fraction,5,0,idx%2?P.blue:P.purple);
  if(age<12)box(g,railEnd-3,914,6,30,1,white?'#3961E2':'#C8D8FF');
  stamp(g,`02  /  ${brand.promise}`,e.realT,white);
}
function terminal(g,u,e){
  const frame=frameOf(e),readEnd=frameFor(e,28,461),analysisEnd=e.progressFrames?.['analysis-done']??493;
  const questionStart=frameFor(e,25,412)-8,readStart=frameFor(e,26,429);
  const complete=frame+.00001>=analysisEnd,analysisHit=flashEnvelope(frame-analysisEnd,12);
  base(g,u);lattice(g,u,{ground:true,opacity:.38});optics(g,1590,420,340,u,{alpha:.2});
  txt(g,'从问题，到依据。',96,232,96,P.paper,'CN');
  txt(g,'LEGAL INTELLIGENCE / LIVE QUERY',100,291,21,'#859AC7','Mono','left',400);
  const entrance=out(u/.5);g.save();g.translate(0,(1-entrance)*180);g.globalAlpha=entrance;
  g.shadowColor=analysisHit>.05?'#4975F07C':'#2B59D733';g.shadowBlur=38+analysisHit*25;
  box(g,100,360,1720,522,10,'#0B1730EE',complete?'#849BEB':'#5275AA',1.5+analysisHit*2.6);
  g.shadowBlur=0;g.fillStyle='#112342';g.fillRect(101,361,1718,57);
  for(let i=0;i<3;i++)disc(g,132+i*24,389,5,['#3769BF','#9365B8','#C6DAFF'][i]);
  txt(g,`${lockup} / ${brand.practice}`,240,397,18,'#90AAD2','Mono','left',400);
  txt(g,complete?'COMPLETE':'RUNNING',1750,397,17,complete?'#C5DAFF':'#7095E5','Mono','right',400);
  const question='> 试用期能否随意辞退员工？';
  const part=question.slice(0,Math.floor(lim((frame-questionStart)/(readStart-questionStart-1))*question.length));
  txt(g,part,154,508,43,P.paper,'CN');
  if(frame>=questionStart&&frame<readStart-1)box(g,161+g.measureText(part).width,474,10,41,0,P.blue);
  commandRow(g,{message:'读取 《法律库》《法规库》',baseline:636,start:readStart,end:readEnd,frame,primary:false});
  commandRow(g,{message:'分析《劳动合同法》第21、39条',baseline:762,start:readEnd+2,end:analysisEnd,frame,primary:true});
  for(let y=431;y<864;y+=5){g.fillStyle='rgba(150,180,255,.012)';g.fillRect(102,y,1716,1);}
  g.restore();txt(g,'法律库   /   法规库   /   案例库',108,952,26,'#7F96BF','CN');
  stamp(g,'04  /  AI WORKFLOW',e.realT);
}
function layers(g,u,e){
  const frame=frameOf(e),beat=currentBeat(e),cues=[509,524,540,557,572].map((f,i)=>frameFor(e,31+i,f));
  const names=['问题','回答','法律法规库','案例库','人工咨询'];
  let focus=beat.index-31;
  if(focus>4)focus=[3,2,4][(focus-5)%3];
  base(g,u,true);lattice(g,u,{white:true,opacity:.07});if(e.image)g.drawImage(e.image,960,0,960,1080);
  txt(g,'一条答复，',100,320,96,P.ink,'CN');txt(g,'可查依据',100,450,96,P.purple,'CN');
  ln(g,106,503,780,503,'#B9C9DE',2);txt(g,'查看法规条款',108,572,38,'#65718C','CN');txt(g,'对照相关案例',108,631,38,'#65718C','CN');
  for(let i=0;i<5;i++){
    const age=frame-cues[i],entry=out((age+1)/8);if(!entry)continue;
    const active=i===focus,hit=active?flashEnvelope(beat.age,10):0,baseline=702+i*49;
    g.save();g.globalAlpha=entry;g.translate((1-entry)*-44,0);
    if(active){box(g,103,baseline-30,357+hit*32,39,4,'#E1E8FB');box(g,103,baseline-30,4,39,1,P.blue);}
    txt(g,`0${i+1}`,119,baseline,22,active?P.blue:'#7B8AA2','Mono');
    txt(g,names[i],185,baseline,29,active?P.purple:'#566781','CN');
    const left=480,right=570+i*27;
    ln(g,left,baseline-9,right,baseline-9,'#C6D0E1',1.2);
    if(active){const x=left+(right-left)*out((beat.age+1)/7);ln(g,left,baseline-9,x,baseline-9,'#4778C9',2);disc(g,x,baseline-9,4+hit*3,'#577AC5');}
    g.restore();
  }
  layerAccent(g,e.elapsed,focus,beat.age);
  txt(g,'ANSWER  /  SOURCES  /  CONSULTATION',1030,172,22,'#5E6F93','Mono');
  stamp(g,'05  /  EVIDENCE SYSTEM',e.realT,true);
}
function employment(g, u, e) {
  drawEmployment(g, u, e, context => drawLibraries(context, 0, {...e,realT:e.realT-e.elapsed+e.shotDuration}));
}
export const sceneFunctions = [intro, type, drawInquiry, terminal, layers, drawSignal, employment, drawLibraries, drawEvidenceFlow];
