/* ===== DATA MODEL + RULES ===== */
const NS='NS', NG='NG';
// S(date, present[], homework[], [planCreatedUTC, lastEditUTC], movedFrom)
function S(d,pres,hw,ts,mv,st){
  const taught=pres.some(p=>p);
  return {d:'2026-'+d,pres,hw,pc:ts?ts[0]:null,sm:ts?ts[1]:null,mv:mv||null,
    status:st||(taught?'taught':'noshow')};
}
/* No school data ships with this site. Teachers, classes, registers and timestamps
   are filled in by Sync from Drive, with the signed-in user's own Google account. */
const TEACHERS={};
const CLASSES=[];
const MLR={};
const MONTHS=(function(){const N=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const out=[],now=new Date();for(let k=5;k>=0;k--){const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-k,1));
  out.push([d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0'),N[d.getUTCMonth()]+' '+d.getUTCFullYear()]);}return out;})();
const RATES={'1:1':6,'pair':8,'group':8};

/* ===== RULES ENGINE ===== */
const dms=d=>{const[y,m,x]=d.split('-').map(Number);return Date.UTC(y,m-1,x);};
const tsms=s=>Date.parse((s.length>11?s:'2026-'+s)+':00Z')+3*36e5; // UTC -> Istanbul local, kept as "local-as-UTC"
const DAY=864e5;
const fmtD=ms=>{const d=new Date(ms);return String(d.getUTCDate()).padStart(2,'0')+'-'+String(d.getUTCMonth()+1).padStart(2,'0');};
function classType(c){if(S0.ct&&S0.ct[c.id])return S0.ct[c.id];const n=c.students.length;return n===1?'1:1':n===2?'pair':'group';}
function rateOf(c){return RATES[classType(c)];}
function lessonsIn(c,m){return c.L.filter(l=>l.d.startsWith(m));}
const paid=l=>l.status==='taught';
function planDeadline(d){const t=dms(d);const dow=new Date(t).getUTCDay();return t-((dow+6)%7)*DAY;} // Monday 00:00 = Sunday midnight
function nextLesson(c,l){return c.L.find(x=>x.d>l.d&&(x.status==='taught'||x.status==='noshow'))||null;}
function perWeek(c,m){const w={};lessonsIn(c,m).filter(l=>l.status!=='cancel'&&l.status!=='demo').forEach(l=>{
  const t=dms(l.d);const k=t-((new Date(t).getUTCDay()+6)%7)*DAY;w[k]=(w[k]||0)+1;});
  const v=Object.values(w).sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:0;}
function packageOf(c,m){const f=perWeek(c,m);return f>=3?{name:'Standard',n:12}:{name:'Starter',n:8};}

function itemsFor(tid,m){ // compliance items from timestamps and register
  const out=[];
  CLASSES.filter(c=>c.teacher===tid).forEach(c=>{
    lessonsIn(c,m).forEach(l=>{
      const id=c.id+'|'+l.d;
      if(l.status!=='taught')return;
      const ap=(typeof appPlan==='function')?appPlan(c.id,l.d):null;
      const pcs=ap?(ap.submittedAt?stampOf(ap.submittedAt):null):l.pc,sms=ap?(ap.summaryAt?stampOf(ap.summaryAt):null):l.sm;
      if(pcs){out.push({id:id+'|plan',type:'plan',c,l,late:tsms(pcs)>=planDeadline(l.d),at:pcs});}
      if(sms){const nx=nextLesson(c,l);
        out.push({id:id+'|sum',type:'sum',c,l,late:!!nx&&tsms(sms)>=dms(nx.d),at:sms,next:nx?nx.d:null});}
      if(l.hw.includes(NG))out.push({id:id+'|nohw',type:'nohw',c,l,late:true});
      if(l.mv)out.push({id:id+'|move',type:'move',c,l,late:true});
    });
  });
  return out;
}
function payroll(tid,m){const K=S0.cfg;
  const cls=CLASSES.filter(c=>c.teacher===tid);
  const lines=cls.map(c=>{const ls=lessonsIn(c,m);const n=ls.filter(paid).length;const r=rateOf(c);
    return {c,n,r,sub:n*r,slots:ls.filter(l=>l.status!=='demo').length,type:classType(c),
      unpaid:ls.filter(l=>!paid(l))};});
  const gross=lines.reduce((a,x)=>a+x.sub,0);
  const items=itemsFor(tid,m);
  const fines=[];
  const latePlans=items.filter(i=>i.type==='plan'&&i.late);
  const lateSums=items.filter(i=>i.type==='sum'&&i.late);
  const per=n=>n>K.lateMax?K.late2:K.late1;
  latePlans.forEach(i=>fines.push({id:i.id,rule:'Rule 1',label:'Late plan, '+i.c.name+' '+fmtD(dms(i.l.d)),tl:per(latePlans.length),esc:latePlans.length>K.lateMax,cand:true}));
  lateSums.forEach(i=>fines.push({id:i.id,rule:'Rule 2',label:'Late attendance and homework form, '+i.c.name+' '+fmtD(dms(i.l.d)),tl:per(lateSums.length),esc:lateSums.length>K.lateMax,cand:true}));
  items.filter(i=>i.type==='nohw').forEach(i=>fines.push({id:i.id,rule:'Rule 4',label:'No homework given, '+i.c.name+' '+fmtD(dms(i.l.d)),tl:K.nohw}));
  const pls=(typeof plansFor==='function')?plansFor(tid,m).filter(p=>p.status==='submitted'):[];
  pls.forEach(p=>{const bl=planBlanks(p);if(bl.length)fines.push({id:'imp|'+p.id,rule:'Rule 3',label:'Improperly filled plan, '+(clsOf(p.classId)?clsOf(p.classId).name:p.classId)+' '+fmtD(dms(p.date))+' (blank: '+bl.join(', ')+')',tl:K.improper});});
  const mlrW=(S0.mlr[tid+'|'+m]||0);const ladder=[0,K.mlr1,K.mlr2,K.mlr2*2,K.mlr2*4];
  if(mlrW>0)fines.push({id:'mlr|'+tid+'|'+m,rule:'Rule 5',label:'MLR overdue, week '+mlrW,tl:ladder[Math.min(mlrW,4)]});
  const mt=S0.meet[tid+'|'+m]||{missed:0,late:0};
  if(mt.late>0)fines.push({id:'meetlate|'+tid+'|'+m,rule:'Rule 8',label:'Meeting lateness, '+mt.late+' min after the first 5',tl:mt.late});
  fines.forEach(f=>{f.waived=!!S0.waive[f.id];});
  const tl=fines.filter(f=>!f.waived&&(!f.cand||S0.useTs)).reduce((a,f)=>a+f.tl,0);
  // day changes beyond 2 a month: 30% of hourly wage each, unless admin approved
  const moves=items.filter(i=>i.type==='move').sort((a,b)=>a.l.d<b.l.d?-1:1);
  const usd=[];const open=moves.filter(i=>!S0.waive['mv|'+i.id]);
  moves.forEach(i=>{i.counted=open.includes(i);});
  const cnt={};open.forEach(i=>{const k=cnt[i.c.id]=(cnt[i.c.id]||0)+1;if(k>K.moveMax)usd.push({id:i.id,label:'Teaching day change beyond '+K.moveMax+', '+i.c.name+' '+fmtD(dms(i.l.d))+' ('+K.movePct+'% of '+rateOf(i.c)+' USD)',usd:+(K.movePct/100*rateOf(i.c)).toFixed(2)});});
  if(mt.missed>0)usd.push({id:'meetmiss',label:mt.missed+' missed meeting'+(mt.missed>1?'s':'')+' at '+K.miss+' USD',usd:mt.missed*K.miss});
  const usdDed=usd.reduce((a,x)=>a+x.usd,0);
  const fineUsd=tl/S0.rate;
  return {tid,m,lines,gross,fines,tl,fineUsd,usd,usdDed,moves,items,net:gross-fineUsd-usdDed,
    delivered:lines.reduce((a,x)=>a+x.n,0),slots:lines.reduce((a,x)=>a+x.slots,0),
    captured:items.filter(i=>i.type==='plan').length>0};
}
function hwStats(tid,m){let given=0,sub=0,sum=0,sc=0;
  CLASSES.filter(c=>c.teacher===tid).forEach(c=>lessonsIn(c,m).filter(paid).forEach(l=>l.hw.forEach(v=>{
    if(v===null||v===NG)return;given++;if(v!==NS){sub++;sum+=v;sc++;}})));
  return {given,sub,avg:sc?sum/sc:null};}
function perf(tid,m){const p=payroll(tid,m);const it=p.items;
  const pl=it.filter(i=>i.type==='plan'),sm=it.filter(i=>i.type==='sum');
  const hw=hwStats(tid,m);
  return {delivered:p.delivered,slots:p.slots,
    planOn:pl.length?(pl.length-pl.filter(i=>i.late).length)/pl.length:null,planN:pl.length,
    sumOn:sm.length?(sm.length-sm.filter(i=>i.late).length)/sm.length:null,sumN:sm.length,
    hwRate:hw.given?hw.sub/hw.given:null,hwAvg:hw.avg,hwGiven:hw.given,mlr:MLR[tid+'|'+m]};}

/* ===== PLANS: data layer ===== */
const TODAY=new Date().toISOString().slice(0,10);
const PL_KEY='tevfik-plans-v1',DRAFT_KEY='tevfik-plan-draft-v1';
const STAGES=[
 ['warmup','Warm-up','Recap, review, engage students with the topic'],
 ['presentation','Presentation','Introduce the topic through a video, picture or activity'],
 ['practice','Practice','Controlled practice: book exercises, external links, interactive games'],
 ['production','Production','Speaking or writing activity that uses the new content. Delayed feedback'],
 ['review','Review / Exit task','Close the lesson and set homework']];
const SEED_PLANS=[];
let PLANS=[];
const clone=o=>JSON.parse(JSON.stringify(o));
const filled=v=>v!=null&&String(v).trim()!=='';
function loadPlans(){
  try{const raw=localStorage.getItem(PL_KEY);if(raw){const o=JSON.parse(raw);if(o&&o.v===1&&Array.isArray(o.plans)){PLANS=o.plans;return;}}}catch(e){}
  PLANS=clone(SEED_PLANS);
}
function savePlans(){try{localStorage.setItem(PL_KEY,JSON.stringify({v:1,plans:PLANS}));}catch(e){}}
function resetPlans(){PLANS=clone(SEED_PLANS);try{localStorage.removeItem(PL_KEY);}catch(e){}}
const newId=()=>'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const emptyStage=()=>({procedure:'',interaction:'',timing:''});
function blankPlan(c){
  const st={};STAGES.forEach(s=>st[s[0]]=emptyStage());
  return {id:null,src:'app',classId:c?c.id:'',tid:c?c.teacher:'',date:'',time:'',students:c?String(c.students.length):'',
    curriculum:'Family & Friends',lessonTitle:'',mainAim:'',languageSkills:'',materials:'',difficulties:'',stages:st,
    startedTime:'',homework:'',wentWell:'',outstanding:'',status:'draft',createdAt:null,submittedAt:null,summaryAt:null,updatedAt:null,
    review:{state:'pending',note:'',by:'',at:null}};
}
function planBlanks(p){
  if(p.format&&p.format!=='classic')return []; // older Plan and Summary template: not checked against the standard form
  const b=[];
  [['time','Time'],['students','Number of students'],['lessonTitle','Lesson title'],['mainAim','Main aim'],['languageSkills','Language and skills'],
   ['materials','Materials'],['difficulties','Anticipated difficulties']].forEach(([k,l])=>{if(!filled(p[k]))b.push(l);});
  STAGES.forEach(([k,l])=>{if(!filled(p.stages&&p.stages[k]&&p.stages[k].procedure))b.push(l+' procedure');});
  if(p.date<TODAY)[['startedTime','Started time'],['homework','Homework assigned'],['wentWell','What went well'],['outstanding','Outstanding issues']]
    .forEach(([k,l])=>{if(!filled(p[k]))b.push(l);});
  return b;
}
function plansFor(tid,m){return PLANS.filter(p=>p.tid===tid&&p.date.startsWith(m));}
function appPlan(classId,date){return PLANS.find(p=>p.src==='app'&&p.status==='submitted'&&p.classId===classId&&p.date===date)||null;}
const stampOf=iso=>iso.slice(0,16);
function nextDeadline(){ // plans for the coming Monday-Sunday week are due Sunday midnight before it
  const t=dms(TODAY);const dow=new Date(t).getUTCDay();const toMon=((8-dow)%7)||7;
  const mon=t+toMon*DAY,sun=mon-DAY,end=mon+6*DAY;
  const f=ms=>{const d=new Date(ms);return d.getUTCDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];};
  return {week:f(mon)+' to '+f(end),due:'Sunday '+f(sun)};
}

/* ===== register and homework statistics ===== */
function desc(a){
  const n=a.length;if(!n)return null;
  const s=[...a].sort((x,y)=>x-y),mean=a.reduce((x,y)=>x+y,0)/n;
  const med=n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;
  const sd=n>1?Math.sqrt(a.reduce((x,y)=>x+(y-mean)*(y-mean),0)/(n-1)):0;
  return {n,mean,median:med,sd,min:s[0],max:s[n-1]};
}
const BINS=[['0-49',0,50],['50-59',50,60],['60-69',60,70],['70-79',70,80],['80-89',80,90],['90-100',90,101]];
function histOf(a){return BINS.map(b=>({label:b[0],n:a.filter(v=>v>=b[1]&&v<b[2]).length}));}
function classStats(c,m){
  const ls=lessonsIn(c,m);
  const per=c.students.map(n=>({name:n,scores:[],ns:0,ng:0,present:0,late:0,absent:0}));
  const all=[],byLesson=[];
  ls.forEach(l=>{
    if(l.status==='taught'||l.status==='noshow')c.students.forEach((n,i)=>{
      const p=l.pres[i];if(p===undefined)return;
      if(l.status==='noshow'||p===0)per[i].absent++;else if(p==='L')per[i].late++;else per[i].present++;});
    if(l.status==='taught'){
      const sc=[];
      l.hw.forEach((v,i)=>{if(!per[i])return;
        if(typeof v==='number'){per[i].scores.push(v);all.push(v);sc.push(v);}
        else if(v===NS)per[i].ns++;else if(v===NG)per[i].ng++;});
      byLesson.push({d:l.d,mean:sc.length?sc.reduce((a,b)=>a+b,0)/sc.length:null});
    }
  });
  return finishStats(c,ls,per,all,byLesson);
}
function finishStats(c,ls,per,all,byLesson){
  const sum=k=>per.reduce((a,p)=>a+p[k],0);
  const present=sum('present'),late=sum('late'),absent=sum('absent'),ns=sum('ns'),ng=sum('ng');
  const slots=present+late+absent;
  return {c,ls,per,all,byLesson,
    held:ls.filter(l=>l.status==='taught').length,noshow:ls.filter(l=>l.status==='noshow').length,
    cancelled:ls.filter(l=>l.status==='cancel'||l.status==='nocl'||l.status==='demo').length,
    present,late,absent,attRate:slots?(present+late)/slots:null,
    submitted:all.length,notSubmitted:ns,notGiven:ng,subRate:(all.length+ns)?all.length/(all.length+ns):null,
    d:desc(all),hist:histOf(all)};
}
function aggregateStats(list){
  const all=[].concat(...list.map(s=>s.all));
  const per=[].concat(...list.map(s=>s.per));
  const r=finishStats(null,[].concat(...list.map(s=>s.ls)),per,all,[]);
  r.held=list.reduce((a,s)=>a+s.held,0);r.noshow=list.reduce((a,s)=>a+s.noshow,0);
  r.cancelled=list.reduce((a,s)=>a+s.cancelled,0);
  return r;
}
