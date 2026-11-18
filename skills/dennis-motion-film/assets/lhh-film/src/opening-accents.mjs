import {PerspectiveCamera,Vector3} from 'three';
import {P,lim,out,txt,ln,box,ring,disc,polygon} from './graphic.mjs';

export const frameOf=e=>e.realT*30;
export const frameFor=(e,index,fallback)=>e.beats?.find(beat=>beat.index===index)?.frame??fallback;
export function currentBeat(e){
  const current=frameOf(e);
  let beat;
  for(const item of e.beats||[]){if(item.frame>current+.00001)break;beat=item;}
  return {index:beat?.index??-1,age:beat?Math.max(0,current-beat.frame):Infinity,strong:!!beat?.downbeat};
}
export function flashEnvelope(age,duration){return age<0||age>=duration?0:(1-age/duration)**2;}

export function stageRays(g,beat,t){
  const motion=lim(beat.age/12),energy=flashEnvelope(beat.age,12);
  const centerX=960,centerY=505;
  const group=((beat.index+1)%4)*2;
  for(let i=0;i<32;i++){
    const angle=(i+.5)*Math.PI/16+t*.017;
    const x=Math.cos(angle),y=Math.sin(angle)*.78;
    const active=((i-group+32)%8)<2;
    const left=active?340+motion*540:410;
    const length=active?Math.max(28,(1-motion)*290):118;
    ln(g,centerX+x*365,centerY+y*365,centerX+x*1170,centerY+y*1170,i%4===0?'#3D477C':'#202740',i%4===0?2:1);
    if(active&&energy>0){
      g.save();g.globalAlpha=(.25+.75*energy)*(y>.59?.3:1);
      ln(g,centerX+x*left,centerY+y*left,centerX+x*(left+length),centerY+y*(left+length),i%2?'#EEF2FF':'#5D87FF',i%2?4:8);
      g.restore();
    }
  }
  if(energy>0){
    g.save();g.translate(centerX,790);g.scale(1,.21);g.globalAlpha=energy*.8;
    ring(g,0,0,390+out(motion)*470,'#719BFF',9-5*motion);g.restore();
  }
}

// Isolate the letter face into moving horizontal pieces only on the impact.
// Positions of all bands are exactly zero again for the stable reading hold.
export function bandedWord(g,word,size,font,ink,index,age){
  const bandCount=4;
  const jump=[1,-.5,.74,-1];
  const kick=age<6?(1-lim(age/6))**2*Math.cos(age*.94):0;
  if(!kick){txt(g,word,0,70,size,ink,font,'center');return;}
  const top=70-size*1.22,extent=size*1.60;
  for(let i=0;i<bandCount;i++){
    const y=top+i*extent/bandCount;
    const dx=(index%2?-1:1)*jump[i]*kick*(index===4?118:79);
    g.save();g.beginPath();g.rect(-1350,y,2700,extent/bandCount+.25);g.clip();
    if(index===4||index===5)txt(g,word,dx+6*kick,70,size,'#6D82EF',font,'center');
    txt(g,word,dx,70,size,ink,font,'center');g.restore();
  }
}

export function commandRow(g,{message,baseline,start,end,frame,primary}){
  if(frame<start)return;
  const age=frame-end,done=age>=-.00001;
  const part=message.slice(0,Math.floor(lim((frame-start)/Math.max(1,end-start-2))*message.length));
  const lift=flashEnvelope(age,primary?13:9);
  const left=131,right=1786,top=baseline-58,height=86;
  if(done){
    const wash=g.createLinearGradient(left,0,right,0);
    wash.addColorStop(0,`rgba(73,110,224,${.16+.28*lift})`);
    wash.addColorStop(1,`rgba(80,93,172,${.04+.13*lift})`);
    box(g,left,top,right-left,height,6,wash);
    box(g,left,top,4+(primary?5:2)*lift,height,0,primary?'#A9C7FF':'#7A98D5');
    if(lift>0){
      const scan=left+out(age/11)*(right-left);
      const shine=g.createLinearGradient(scan-85,0,scan,0);
      shine.addColorStop(0,'rgba(155,199,255,0)');shine.addColorStop(1,`rgba(155,199,255,${.32*lift})`);
      g.fillStyle=shine;g.fillRect(Math.max(left,scan-85),top,Math.min(85,Math.max(0,scan-left)),height);
    }
  }
  txt(g,done?'[OK]':'[··]',154,baseline,42,done?'#C1D8FF':'#697FA7','Mono');
  txt(g,part,284,baseline,43,done?'#EDF4FF':'#ADC0E1','CN');
  if(!done&&frame<end-2){
    const w=g.measureText(part).width;
    box(g,291+w,baseline-34,9,38,0,'#779DFF');
  }
  if(done){
    const cx=1703,cy=baseline-15;
    const scale=1+lift*(primary?.67:.34);
    g.save();g.translate(cx,cy);g.scale(scale,scale);
    disc(g,0,0,primary?24:17,primary?'#5275F0':'#334F8A');
    ln(g,-10,0,-2,7,'#FFFFFF',3.7);ln(g,-2,7,12,-9,'#FFFFFF',3.7);
    if(lift>0){g.globalAlpha=lift;ring(g,0,0,30+out(age/10)*37,'#9EBBFF',2.8);}
    g.restore();
  }
}

// Use the same camera and deck transforms as the existing 3D source so that
// the accents stay attached to the actual moving glass edge.
const plateCamera=new PerspectiveCamera(36,960/1080,.1,120);
const up=new Vector3(0,1,0);
function projectDeck(t,index,x,z){
  const expansion=1-(1-lim((t-.12*index)/1.5))**4;
  const deckAngle=(1-expansion)*(.16-index*.02);
  const rigAngle=-.12+Math.sin(t*.35)*.025;
  const point=new Vector3(x,-1.65+index*(.11+.69*expansion)+.039,z);
  point.applyAxisAngle(up,deckAngle+rigAngle).project(plateCamera);
  return [960+(point.x+1)*480,(1-point.y)*540];
}
export function layerAccent(g,t,index,age){
  if(index<0||index>4)return;
  const modelTime=Math.min(119,Math.max(0,Math.floor(t*30)))/30;
  plateCamera.position.set(7.4-.25*Math.sin(modelTime*.4),7.1,10.2);
  plateCamera.lookAt(0,.15,0);plateCamera.updateMatrixWorld();
  const right=projectDeck(modelTime,index,1.79,-1.79);
  const front=projectDeck(modelTime,index,1.79,1.79);
  const left=projectDeck(modelTime,index,-1.79,1.79);
  const back=projectDeck(modelTime,index,-1.79,-1.79);
  const attack=flashEnvelope(age,13),fade=age<13?1:1-lim((age-13)/4);
  if(fade<=0)return;
  g.save();g.globalAlpha=fade;
  polygon(g,[right,front,left,back],`rgba(205,234,255,${.06+attack*.25})`);
  g.lineJoin='round';
  ln(g,...right,...front,'#E2F1FF',2.8+attack*3.2);ln(g,...front,...left,'#A3CEFF',2.2+attack*2.2);
  const endX=1830,reveal=out((age+1)/6),shoulder=right[0]+26;
  ln(g,...right,shoulder,right[1]-16,'#3558AE',1.8);
  ln(g,shoulder,right[1]-16,shoulder+(endX-shoulder)*reveal,right[1]-16,'#3558AE',1.8);
  disc(g,right[0],right[1],4.5+attack*4,'#3864DF');
  if(reveal>.7)txt(g,`0${index+1}`,endX,right[1]-25,22,'#38539B','Mono','right');
  g.restore();
}
