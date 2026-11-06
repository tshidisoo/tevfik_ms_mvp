const KEY='tevfik-web-v1';
const DEF={role:'admin',tab:'dash',tid:'',m:MONTHS[MONTHS.length-2][0],rate:45,useTs:true,lang:'en',ct:{},mlr:{},meet:{},waive:{},perm:[],rep:{},synced:null,
 cfg:{late1:10,late2:20,lateMax:3,nohw:30,mlr1:20,mlr2:50,movePct:30,moveMax:2,miss:8,improper:5}};
let S0;
try{S0=Object.assign({},DEF,JSON.parse(localStorage.getItem(KEY)||'{}'));S0.cfg=Object.assign({},DEF.cfg,S0.cfg||{});}catch(e){S0=JSON.parse(JSON.stringify(DEF));}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S0));}catch(e){}}
const $=s=>document.querySelector(s);
const usd=x=>'$'+x.toFixed(2);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mname=m=>(MONTHS.find(x=>x[0]===m)||[m,m])[1];
const dd=d=>d.slice(8)+'-'+d.slice(5,7);
const tsY=t=>t&&t.length>11?t.slice(5):t;
const tsfmt=t=>{t=tsY(t);return t?t.slice(3,5)+'-'+t.slice(0,2):'—';}; // MM-DDTHH:MM -> DD-MM
const tsfull=t=>{t=tsY(t);return t?t.slice(3,5)+'-'+t.slice(0,2)+' '+t.slice(6):'—';};
const TABS=[['dash','Dashboard'],['pay','Payroll'],['rep','Submission reports'],['plans','Lesson plans'],['reg','Registers & homework'],['cls','Classes & students'],['perf','Teacher performance'],['inp','Admin inputs']];
const TTABS=[['home','My classes'],['plans','Lesson plans'],['reg','Registers & homework']];
let doc=null; // {kind:'report'|'slip', ...}

function chrome(){
  $('#roleSeg').innerHTML=['admin','teacher'].map(r=>`<button class="${S0.role===r?'on':''}" data-r="${r}">${r==='admin'?'Admin':'Teacher'}</button>`).join('');
  $('#teacherSel').innerHTML=Object.values(TEACHERS).map(t=>`<option value="${t.id}" ${S0.tid===t.id?'selected':''}>${esc(t.name)}</option>`).join('');
  $('#teacherSel').hidden=S0.role!=='teacher'&&!['pay','rep','inp'].includes(S0.tab);
  $('#monthSel').innerHTML=MONTHS.map(m=>`<option value="${m[0]}" ${S0.m===m[0]?'selected':''}>${m[1]}</option>`).join('');
  $('#tabs').innerHTML=(S0.role==='admin'?TABS:TTABS).map(t=>`<button data-t="${t[0]}" class="${S0.tab===t[0]?'on':''}">${t[1]}</button>`).join('');
  $('#syncBtn').hidden=S0.role!=='admin';
}
function render(){
  chrome();
  const v=$('#view');
  if(doc){v.innerHTML=docView();return;}
  v.innerHTML=S0.role==='teacher'?teacherView():({dash,pay,rep,cls,perf,inp}[S0.tab])();
}
const allT=()=>Object.keys(TEACHERS);
const pr=(t,m)=>payroll(t,m||S0.m);

/* ---------- Dashboard ---------- */
function dash(){
  const P=allT().map(t=>pr(t));
  const del=P.reduce((a,p)=>a+p.delivered,0),gross=P.reduce((a,p)=>a+p.gross,0);
  const net=P.reduce((a,p)=>a+p.net,0),fin=P.reduce((a,p)=>a+p.fineUsd+p.usdDed,0);
  const cand=P.reduce((a,p)=>a+p.fines.filter(f=>f.cand&&!f.waived).length,0);
  const pend=CLASSES.filter(c=>lessonsIn(c,S0.m).length&&S0.rep[c.id+'|'+S0.m]!=='approved').length;
  const ns=CLASSES.flatMap(c=>lessonsIn(c,S0.m).filter(l=>l.status==='noshow').map(l=>c.name+' '+dd(l.d)));
  return `<div class="grid">
   <div class="card kpi"><div class="l">Lessons delivered</div><div class="v">${del}</div><div class="mut small">${mname(S0.m)}</div></div>
   <div class="card kpi"><div class="l">Gross teaching pay</div><div class="v">${usd(gross)}</div></div>
   <div class="card kpi"><div class="l">Fines and deductions</div><div class="v">${usd(fin)}</div><div class="mut small">at ${S0.rate} TL per USD</div></div>
   <div class="card kpi"><div class="l">Net payable</div><div class="v">${usd(net)}</div></div></div>
  <div class="card"><h3>Needs attention</h3><ul class="clean">
   <li>${pend} class report${pend===1?'':'s'} awaiting approval by Perzane. <a href="#" data-go="rep">Open reports</a></li>
   <li>${cand} late-form fine${cand===1?' is a candidate':'s are candidates'} based on unverified Drive stamps. They are ${S0.useTs?'included in':'not counted in'} net pay. <a href="#" data-go="pay">Review in payroll</a></li>
   <li>${PLANS.filter(p=>p.status==='submitted'&&p.review.state==='pending').length} lesson plans are awaiting review. <a href="#" data-go="plans">Open plans</a></li>
   <li>${ns.length?ns.length+' no-show lesson'+(ns.length>1?'s':'')+' paid at $0: '+esc(ns.join(', ')):'No no-show lessons this month.'}</li>
   <li>Meetings, schedule permissions and MLR status are not filled in for this month. <a href="#" data-go="inp">Admin inputs</a></li></ul></div>
  <div class="grid">${P.map(p=>`<div class="card"><div class="row between"><h3>${esc(TEACHERS[p.tid].name)}</h3><span class="pill">${p.delivered} of ${p.slots} lessons</span></div>
    <div class="bar" style="margin:10px 0"><i style="width:${p.slots?100*p.delivered/p.slots:0}%"></i></div>
    <div class="row between"><span class="mut">Gross</span><b>${usd(p.gross)}</b></div>
    <div class="row between"><span class="mut">Fines</span><b>${usd(p.fineUsd+p.usdDed)}</b></div>
    <div class="row between"><span class="mut">Net</span><b>${usd(p.net)}</b></div>
    <p class="small mut">${esc(TEACHERS[p.tid].note)}</p></div>`).join('')}</div>
  <div class="banner">${S0.synced?'Last sync: '+esc(S0.synced)+'.':'Not synced yet.'}</div>`;
}

/* ---------- Payroll ---------- */
function pay(){
  const p=pr(S0.tid);const T=TEACHERS[S0.tid];
  const lt=p.lines.map(l=>`<tr><td>${esc(l.c.name)}</td><td>${l.type}${S0.ct[l.c.id]?' <span class="pill">override</span>':''}</td><td class="n">${l.n}</td><td class="n">${usd(l.r)}</td><td class="n">${usd(l.sub)}</td><td class="small mut">${l.unpaid.length?l.unpaid.map(u=>dd(u.d)+' '+({noshow:'no-show $0',cancel:'cancelled',demo:'demo',nocl:'no class'}[u.status])).join(', '):''}</td></tr>`).join('');
  const ft=p.fines.length?p.fines.map(f=>`<tr class="${f.waived?'mut':''}"><td>${f.rule}</td><td>${esc(f.label)}${f.esc?' <span class="pill warn">escalated</span>':''}${f.cand?' <span class="pill warn">unverified stamp</span>':''}</td><td class="n">${f.tl} TL</td><td class="n">${usd(f.tl/S0.rate)}</td><td><label><input type="checkbox" data-w="${esc(f.id)}" ${f.waived?'checked':''}> permission</label></td></tr>`).join(''):'<tr><td colspan="5" class="mut">No fines recorded.</td></tr>';
  const ut=p.usd.map(u=>`<tr><td colspan="3">${esc(u.label)}</td><td class="n">${usd(u.usd)}</td><td></td></tr>`).join('');
  const mv=p.moves.length?`<p class="small mut">Teaching day changes this month: ${p.moves.length} (${p.moves.map(i=>i.c.name+' '+dd(i.l.d)).join(', ')}). Only changes beyond ${S0.cfg.moveMax} are deducted.</p>`:'';
  return `<div class="row between"><h2>Payroll, ${esc(T.name)}, ${mname(S0.m)}</h2><button class="pri" data-slip="${p.tid}">Open salary slip</button></div>
  ${p.captured?'':'<div class="note small">No plan timestamps have been captured for this teacher yet, so late-form fines cannot be detected. Register-based rules still apply.</div>'}
  <div class="card tw"><h3>Lessons</h3><table><thead><tr><th>Class</th><th>Type</th><th class="n">Paid lessons</th><th class="n">Rate</th><th class="n">Subtotal</th><th>Not paid</th></tr></thead><tbody>${lt}</tbody><tfoot><tr><td colspan="4">Gross</td><td class="n">${usd(p.gross)}</td><td></td></tr></tfoot></table></div>
  <div class="card tw"><h3>Fines and deductions</h3>
   <div class="row"><label><input type="checkbox" id="useTs" ${S0.useTs?'checked':''}> Count late plan and late summary fines from Drive stamps</label></div>
   <p class="small mut">Plan lateness uses the doc's created time and summary lateness uses its last-edited time, as agreed for this model. Last-edited can overstate lateness when a doc is touched again later. Tick "permission" on any fine the admin has already approved.</p>
   <table><thead><tr><th>Rule</th><th>Reason</th><th class="n">TL</th><th class="n">USD</th><th></th></tr></thead><tbody>${ft}${ut}</tbody>
   <tfoot><tr><td colspan="2">Total counted</td><td class="n">${p.tl} TL</td><td class="n">${usd(p.fineUsd+p.usdDed)}</td><td></td></tr></tfoot></table>${mv}</div>
  <div class="card kpi"><div class="l">Net payable</div><div class="v">${usd(p.net)}</div><div class="mut small">${usd(p.gross)} gross, minus ${p.tl} TL (${usd(p.fineUsd)}), minus ${usd(p.usdDed)} deductions</div></div>`;
}

/* ---------- Reports ---------- */
function repKey(c){return c.id+'|'+S0.m;}
function rep(){
  const cs=CLASSES.filter(c=>c.teacher===S0.tid&&lessonsIn(c,S0.m).length);
  return `<h2>Submission reports, ${esc(TEACHERS[S0.tid].name)}, ${mname(S0.m)}</h2>
  <p class="mut">Filled from the registers and Drive stamps in the same layout the admin uses today. Draft, then approved by the reviewer, then locked into the salary run.</p>
  <div class="grid">${cs.map(c=>{const st=S0.rep[repKey(c)]||'draft';const r=reportData(c);
   return `<div class="card"><div class="row between"><h3>${esc(c.name)}</h3><span class="pill ${st==='approved'?'ok':'warn'}">${st==='approved'?'Approved, locked':'Draft'}</span></div>
   <p class="small mut">${r.total} taught, ${r.latePlan} late plan, ${r.lateSum} late summary (unverified stamps)</p>
   <div class="row"><button data-rep="${c.id}">Open report</button>${st==='approved'?`<button data-unlock="${c.id}">Unlock</button>`:`<button class="pri" data-approve="${c.id}">Approve as Perzane</button>`}</div></div>`}).join('')||'<p class="mut">No lessons this month.</p>'}</div>`;
}
function reportData(c){
  const items=itemsFor(c.teacher,S0.m).filter(i=>i.c===c);
  const ls=lessonsIn(c,S0.m).filter(l=>l.status==='taught');
  const get=(l,t)=>items.find(i=>i.l===l&&i.type===t);
  const rows=ls.map(l=>{const p=get(l,'plan'),s=get(l,'sum');
    return {l,p,s,planLate:p&&p.late,sumLate:s&&s.late,hw:l.hw.some(v=>typeof v==='number')};});
  return {rows,total:ls.length,latePlan:rows.filter(r=>r.planLate).length,lateSum:rows.filter(r=>r.sumLate).length,
    submitted:rows.filter(r=>r.p).length,planned:lessonsIn(c,S0.m).filter(l=>l.status!=='demo'&&l.status!=='cancel').length};
}
function reportHTML(c){
  const R=reportData(c);const T=TEACHERS[c.teacher];const st=S0.rep[repKey(c)]==='approved';
  let wk=0,lastW=null;
  const body=R.rows.map((r,i)=>{const t=dms(r.l.d);const w=t-((new Date(t).getUTCDay()+6)%7)*DAY;
    const lab=w!==lastW?(++wk):'';lastW=w;
    const fine=[r.planLate?'Late plan':'',r.sumLate?'Late summary':''].filter(Boolean).join(', ');
    return `<tr><td>${lab}</td><td class="${r.planLate?'lt':''}">${r.p?tsfmt(r.p.at):'—'}</td><td>${dd(r.l.d)}</td><td class="${r.sumLate?'lt':''}">${r.s?tsfmt(r.s.at):'—'}</td><td>${r.hw?dd(r.l.d):'—'}</td><td>${esc(fine)}</td><td></td></tr>`}).join('');
  const has=R.rows.some(r=>r.p);
  return `<div class="doc"><h2>${esc(c.subject)} Teachers Weekly Plan and Summary Submission Report</h2>
  <table><tr><td><b>Teacher</b></td><td>${esc(T.name)}</td><td><b>Class</b></td><td>${esc(c.name)}</td><td><b>Month</b></td><td>${mname(S0.m).split(' ')[0]}</td></tr></table>
  <div class="ph"></div><div class="tw"><table><thead><tr><th>Week</th><th>Date of plan submission</th><th>Teaching dates</th><th>Date of summary submission</th><th>Date of homework check</th><th>Problems in submission of plan and summary</th><th>Fine</th></tr></thead><tbody>${body}</tbody></table></div>
  <div class="ph"></div>
  <table><tr><td>Planned teaching hours</td><td>${R.planned}</td><td>Total teaching hours</td><td>${R.total}</td></tr>
  <tr><td>Total submitted plan</td><td>${has?R.submitted:'—'}</td><td>Late submitted plan</td><td>${has?R.latePlan:'—'}</td></tr>
  <tr><td>Total submitted summary</td><td>${has?R.rows.filter(r=>r.s).length:'—'}</td><td>Late submitted summary</td><td>${has?R.lateSum:'—'}</td></tr>
  <tr><td>Total student attendance checked days</td><td>${R.total}</td><td>Not checked student homework</td><td>${R.rows.filter(r=>!r.hw).length||'—'}</td></tr>
  <tr><td><b>MLR for ${mname(S0.m).split(' ')[0]}</b></td><td colspan="3">${esc((MLR[c.teacher+'|'+S0.m]||{state:'Not captured'}).state)}</td></tr>
  <tr><td>Reviewer</td><td>Perzane</td><td>Date of review</td><td>${st?dd(TODAY):'Pending'}</td></tr></table>
  <p class="small" style="font-family:Inter,sans-serif;color:#555">Plan and summary dates come from Drive file stamps (created and last edited), which can overstate lateness. Confirm before the report is approved.</p></div>`;
}

/* ---------- Classes ---------- */
function cls(){
  return `<h2>Classes and students, ${mname(S0.m)}</h2><div class="grid">`+CLASSES.filter(c=>lessonsIn(c,S0.m).length).map(c=>{
   const pk=packageOf(c,S0.m);const ls=lessonsIn(c,S0.m);const used=ls.filter(paid).length;const left=Math.max(0,pk.n-used);
   return `<div class="card"><div class="row between"><h3>${esc(c.name)}</h3><span class="pill">${esc(TEACHERS[c.teacher].name)}</span></div>
   <p class="small mut">${esc(c.students.join(', '))} (${c.students.length})</p>
   <div class="row"><label class="f">Class type<select data-ct="${c.id}">${['1:1','pair','group'].map(t=>`<option value="${t}" ${classType(c)===t?'selected':''}>${t}</option>`).join('')}</select></label>
   <div><div class="small mut">Package</div><b>${pk.name}, ${pk.n} a month</b></div></div>
   <div class="bar" style="margin:10px 0"><i style="width:${Math.min(100,100*used/pk.n)}%"></i></div>
   <div class="row between"><span>${used} used</span><span class="mut">${left} remaining of ${pk.n}${used>pk.n?', '+(used-pk.n)+' over package':''}</span></div>
   <details><summary class="small">Lesson register</summary><div class="tw"><table><thead><tr><th>Date</th><th>Status</th><th>Homework</th></tr></thead><tbody>${ls.map(l=>`<tr><td>${dd(l.d)}${l.mv?' <span class="pill warn">moved from '+dd('2026-'+l.mv)+'</span>':''}</td><td>${({taught:'Taught',noshow:'No-show',cancel:'Cancelled by teacher',demo:'Demo',nocl:'No class (test)'})[l.status]}</td><td class="small">${l.hw.map((v,i)=>esc(c.students[i]||'')+': '+(v===null?'–':v===NS?'not submitted':v===NG?'not given':v+'%')).join('; ')}</td></tr>`).join('')}</tbody></table></div></details></div>`}).join('')+'</div>';
}

/* ---------- Performance ---------- */
const pc=x=>x==null?'—':Math.round(x*100)+'%';
function perf_(t){return perf(t,S0.m);}
function perfView(){
  const rows=allT().map(t=>({t,p:perf_(t)}));
  const g=(f)=>rows.map(r=>`<td class="n">${f(r.p)}</td>`).join('');
  return `<h2>Teacher performance, ${mname(S0.m)}</h2><div class="card tw"><table><thead><tr><th>Metric</th>${rows.map(r=>`<th class="n">${esc(TEACHERS[r.t].name)}</th>`).join('')}</tr></thead><tbody>
  <tr><td>Lessons delivered vs scheduled</td>${g(p=>p.delivered+' of '+p.slots+' ('+pc(p.slots?p.delivered/p.slots:null)+')')}</tr>
  <tr><td>Plans on time (Drive stamps, unverified)</td>${g(p=>p.planN?pc(p.planOn)+' of '+p.planN:'not captured')}</tr>
  <tr><td>Summaries on time (Drive stamps, unverified)</td>${g(p=>p.sumN?pc(p.sumOn)+' of '+p.sumN:'not captured')}</tr>
  <tr><td>Homework submitted by students</td>${g(p=>p.hwGiven?pc(p.hwRate)+' of '+p.hwGiven:'—')}</tr>
  <tr><td>Average homework score</td>${g(p=>p.hwAvg==null?'—':p.hwAvg.toFixed(1)+'%')}</tr>
  <tr><td>Plans filled completely</td>${rows.map(r=>{const L=plansFor(r.t,S0.m).filter(p=>p.status==='submitted');const ok=L.filter(p=>!planBlanks(p).length).length;return `<td class="n">${L.length?ok+' of '+L.length:'—'}</td>`;}).join('')}</tr>
  <tr><td>Punctuality (start vs scheduled)</td>${g(()=>'needs plan Started Time')}</tr>
  <tr><td>MLR on time</td>${g(p=>p.mlr?p.mlr.state:'—')}</tr></tbody></table></div>
  <div class="note small">Punctuality reads the Started Time field of each lesson plan against the scheduled time. That field has not been bulk-read yet, so the column is a placeholder. Plan and summary timeliness use the same unverified Drive stamps as the payroll candidates.</div>`;
}

/* ---------- Admin inputs ---------- */
function inp(){
  const k=S0.tid+'|'+S0.m;const mt=S0.meet[k]||{missed:0,late:0};const C=S0.cfg;
  const cf=(key,lab)=>`<label class="f">${lab}<input type="number" data-cfg="${key}" value="${C[key]}" style="width:100px"></label>`;
  return `<h2>Admin inputs</h2>
  <div class="card"><h3>Exchange rate, ${mname(S0.m)}</h3><div class="row"><label class="f">TL per 1 USD<input type="number" step="0.1" id="rateIn" value="${S0.rate}" style="width:120px"></label></div>
   <p class="small mut">One rate per payroll month. Placeholder value until the admin sets it.</p></div>
  <div class="card"><h3>${esc(TEACHERS[S0.tid].name)}, ${mname(S0.m)}</h3><div class="row">
   <label class="f">Minutes late to meetings, beyond the first 5<input type="number" min="0" data-meet="late" value="${mt.late}" style="width:140px"></label>
   <label class="f">Missed meetings<input type="number" min="0" data-meet="missed" value="${mt.missed}" style="width:140px"></label>
   <label class="f">MLR weeks overdue<input type="number" min="0" max="4" data-mlrw value="${S0.mlr[k]||0}" style="width:140px"></label></div>
   <p class="small mut">Meeting lateness is 1 TL a minute. A missed meeting is ${C.miss} USD. MLR ladder is ${C.mlr1} TL, then ${C.mlr2} TL, doubling weekly.</p></div>
  <div class="card"><h3>Schedule permissions</h3><div class="row"><input type="text" id="permTxt" placeholder="Teacher, date, reason" style="flex:1;min-width:200px"><button id="permAdd">Add</button></div>
   <ul class="clean">${S0.perm.map((p,i)=>`<li><span data-notr>${esc(p)}</span> <a href="#" data-pdel="${i}">remove</a></li>`).join('')||'<li class="mut">None logged.</li>'}</ul>
   <p class="small mut">Approved permissions are not fined. Tick "permission" on the matching line in Payroll.</p></div>
  <div class="card"><h3>Rule settings</h3><div class="row">${cf('late1','Late form, TL')}${cf('late2','Late form after limit, TL')}${cf('lateMax','Late forms allowed')}${cf('nohw','No homework, TL')}${cf('mlr1','MLR late, TL')}${cf('mlr2','MLR still late, TL')}${cf('movePct','Day change deduction %')}${cf('moveMax','Day changes allowed')}${cf('miss','Missed meeting, USD')}${cf('improper','Improperly filled plan, TL')}</div>
   <p class="small mut">From the Rules and Regulations. Changing a value recalculates every screen.</p></div>
  <div class="row"><button id="resetBtn">Reset all saved inputs</button><button data-pl-reset="1">Restore imported October plans</button></div>`;
}

/* ---------- Teacher view ---------- */
function teacherView(){
  const p=pr(S0.tid);const T=TEACHERS[S0.tid];
  const cs=CLASSES.filter(c=>c.teacher===S0.tid&&lessonsIn(c,S0.m).length);
  return `<div class="row between"><h2>Hello, ${esc(T.name)}</h2><span class="pill">Read-only view</span></div>
  <div class="grid"><div class="card"><div class="l mut small">UPCOMING DEADLINE</div><h3>Weekly plans for ${nextDeadline().week}</h3><p><b>Submit by ${nextDeadline().due}, midnight, your local time.</b> <a href="#" data-go="plans">Open lesson plans</a></p></div>
  <div class="card"><div class="l mut small">MLR</div><h3>${esc((MLR[S0.tid+'|'+S0.m]||{state:'—'}).state)}</h3><p class="small mut">MLRs for ${mname(S0.m)} are due before the 7th of the next month.</p></div>
  <div class="card kpi"><div class="l">Estimated pay, ${mname(S0.m)}</div><div class="v">${usd(p.net)}</div><div class="small mut">${usd(p.gross)} gross, ${p.tl} TL fines counted, ${usd(p.usdDed)} other deductions</div></div></div>
  <div class="card tw"><h3>My classes</h3><table><thead><tr><th>Class</th><th>Type</th><th class="n">Lessons</th><th>Report</th></tr></thead><tbody>${p.lines.filter(l=>l.slots).map(l=>`<tr><td>${esc(l.c.name)}</td><td>${l.type}</td><td class="n">${l.n}</td><td><span class="pill ${S0.rep[l.c.id+'|'+S0.m]==='approved'?'ok':'warn'}">${S0.rep[l.c.id+'|'+S0.m]==='approved'?'Approved':'Draft'}</span></td></tr>`).join('')}</tbody></table></div>
  <div class="card tw"><h3>My fines</h3><table><tbody>${p.fines.filter(f=>!f.waived&&(!f.cand||S0.useTs)).map(f=>`<tr><td>${esc(f.label)}</td><td class="n">${f.tl} TL</td></tr>`).join('')||'<tr><td class="mut">None this month.</td></tr>'}</tbody></table></div>`;
}

/* ---------- Document view ---------- */
function docView(){
  const back='<div class="noprint row" style="margin-bottom:12px"><button data-back>Back</button><span class="mut small">Use your browser\'s print or save as PDF on this page.</span></div>';
  if(doc.kind==='report')return back+reportHTML(CLASSES.find(c=>c.id===doc.id));
  const p=pr(doc.id);const T=TEACHERS[doc.id];
  return back+`<div class="doc"><h2>Salary Slip, ${mname(S0.m)}</h2><table><tr><td><b>Teacher</b></td><td>${esc(T.full)}</td><td><b>Rate</b></td><td>${S0.rate} TL per USD</td></tr></table><div class="ph"></div>
  <table><thead><tr><th>Class</th><th>Type</th><th>Lessons</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${p.lines.filter(l=>l.n).map(l=>`<tr><td>${esc(l.c.name)}</td><td>${l.type}</td><td>${l.n}</td><td>${usd(l.r)}</td><td>${usd(l.sub)}</td></tr>`).join('')}<tr><td colspan="4"><b>Gross (USD)</b></td><td><b>${usd(p.gross)}</b></td></tr></tbody></table><div class="ph"></div>
  <table><thead><tr><th>Deduction</th><th>TL</th><th>USD</th></tr></thead><tbody>${p.fines.filter(f=>!f.waived&&(!f.cand||S0.useTs)).map(f=>`<tr><td>${esc(f.rule+': '+f.label)}</td><td>${f.tl}</td><td>${usd(f.tl/S0.rate)}</td></tr>`).join('')}${p.usd.map(u=>`<tr><td>${esc(u.label)}</td><td></td><td>${usd(u.usd)}</td></tr>`).join('')}
  <tr><td><b>Total deductions</b></td><td><b>${p.tl}</b></td><td><b>${usd(p.fineUsd+p.usdDed)}</b></td></tr></tbody></table><div class="ph"></div>
  <table><tr><td><b>Net payable (USD)</b></td><td><b>${usd(p.net)}</b></td></tr></table>
  <p class="small" style="font-family:Inter,sans-serif;color:#555">Model output from the MVP. Not a payment instruction.</p></div>`;
}

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('button,a');if(!t)return;
  const d=t.dataset;let ch=true;
  if(d.r){S0.role=d.r;S0.tab=d.r==='admin'?'dash':'home';doc=null;PS.view='list';PS.form=null;PS.msg='';}
  else if(d.t){S0.tab=d.t;doc=null;PS.view='list';PS.form=null;PS.msg='';PS.arm=null;}
  else if(d.go!==undefined){e.preventDefault();S0.tab=d.go;}
  else if(d.slip){doc={kind:'slip',id:d.slip};}
  else if(d.rep){doc={kind:'report',id:d.rep};}
  else if(d.back!==undefined){doc=null;}
  else if(d.approve){S0.rep[d.approve+'|'+S0.m]='approved';}
  else if(d.unlock){delete S0.rep[d.unlock+'|'+S0.m];}
  else if(d.pdel!==undefined){e.preventDefault();S0.perm.splice(+d.pdel,1);}
  else if(t.id==='permAdd'){const v=$('#permTxt').value.trim();if(v)S0.perm.push(v);}
  else if(t.id==='resetBtn'){const w=t.dataset.sure;if(!w){t.textContent='Click again to confirm';t.dataset.sure=1;return;}S0=Object.assign(JSON.parse(JSON.stringify(DEF)),{lang:S0.lang});}
  else if(t.id==='syncBtn'){return;}
  else if(t.id==='themeBtn'){const r=document.documentElement;const dk=r.dataset.theme==='dark'||(!r.dataset.theme&&matchMedia('(prefers-color-scheme:dark)').matches);r.dataset.theme=dk?'light':'dark';return;}
  else ch=false;
  if(ch){save();render();}
});
document.addEventListener('change',e=>{
  const t=e.target,d=t.dataset;
  if(t.id==='teacherSel'){S0.tid=t.value;PS.view='list';PS.form=null;PS.msg='';PS.f.cls='all';RS.cls='all';}
  else if(t.id==='monthSel')S0.m=t.value;
  else if(t.id==='useTs')S0.useTs=t.checked;
  else if(t.id==='rateIn')S0.rate=Math.max(1,+t.value||45);
  else if(d.w){S0.waive[d.w]=t.checked;}
  else if(d.ct){S0.ct[d.ct]=t.value;}
  else if(d.meet){const k=S0.tid+'|'+S0.m;S0.meet[k]=Object.assign({missed:0,late:0},S0.meet[k]);S0.meet[k][d.meet]=Math.max(0,+t.value||0);}
  else if(d.mlrw!==undefined){S0.mlr[S0.tid+'|'+S0.m]=Math.max(0,Math.min(4,+t.value||0));}
  else if(d.cfg){S0.cfg[d.cfg]=Math.max(0,+t.value||0);}
  else return;
  save();render();
});
/* ===== PLANS + REGISTERS: views and events ===== */
loadPlans();
const E=v=>v==null?'':esc(v);
const EB=v=>E(v).replace(/\n/g,'<br>');
const PS={view:'list',id:null,f:{tid:'all',cls:'all',st:'all',rv:'all',m:'all'},form:null,msg:'',arm:null,resume:false};
const RS={tid:'all',cls:'all'};
const clsOf=id=>CLASSES.find(c=>c.id===id);
const clsName=id=>{const c=clsOf(id);return c?c.name:id;};
const STAT={draft:['Draft','warn'],submitted:['Submitted','ok']};
const RV={pending:['Awaiting review',''],approved:['Reviewed','ok'],flagged:['Needs changes','bad']};
const pill=(t,k)=>`<span class="pill ${k||''}">${E(t)}</span>`;
const fmt1=x=>x==null?'—':x.toFixed(1);
const pc1=x=>x==null?'—':x.toFixed(1)+'%';
const rate=x=>x==null?'—':Math.round(x*100)+'%';
function readDraft(){try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');}catch(e){return null;}}
function writeDraft(v){try{if(v)localStorage.setItem(DRAFT_KEY,JSON.stringify(v));else localStorage.removeItem(DRAFT_KEY);}catch(e){}}
function myClasses(){return CLASSES.filter(c=>c.teacher===S0.tid);}

/* ---------- Plans list ---------- */
function planList(){
  const adm=S0.role==='admin';
  let L=PLANS.filter(p=>adm||p.tid===S0.tid);
  const F=PS.f;
  if(adm&&F.tid!=='all')L=L.filter(p=>p.tid===F.tid);
  if(F.cls!=='all')L=L.filter(p=>p.classId===F.cls);
  if(F.st!=='all')L=L.filter(p=>p.status===F.st);
  if(adm&&F.rv!=='all')L=L.filter(p=>p.review.state===F.rv);
  if(F.m!=='all')L=L.filter(p=>p.date.startsWith(F.m));
  L.sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0);
  const scopeAll=PLANS.filter(p=>adm||p.tid===S0.tid);
  const withBlank=scopeAll.filter(p=>p.status==='submitted'&&planBlanks(p).length).length;
  const pend=scopeAll.filter(p=>p.status==='submitted'&&p.review.state==='pending').length;
  const cOpts=CLASSES.filter(c=>(adm?(F.tid==='all'||c.teacher===F.tid):c.teacher===S0.tid));
  const sel=(key,opts)=>`<select data-plf-filter="${key}">${opts.map(o=>`<option value="${o[0]}" ${String(F[key])===String(o[0])?'selected':''}>${E(o[1])}</option>`).join('')}</select>`;
  const rows=L.map(p=>{
    const bl=planBlanks(p);const st=STAT[p.status];const rv=RV[p.review.state];
    return `<tr><td>${dd(p.date)}</td><td>${E(clsName(p.classId))}</td>${adm?`<td>${E(TEACHERS[p.tid].name)}</td>`:''}
     <td data-notr>${E(p.lessonTitle||'—')}</td>
     <td>${p.status==='draft'?'':(bl.length?pill(bl.length+' blank','warn'):pill('Complete','ok'))}</td>
     <td>${pill(st[0],st[1])}</td>${adm?`<td>${p.status==='submitted'?pill(rv[0],rv[1]):''}</td>`:`<td>${p.status==='submitted'&&p.review.state!=='pending'?pill(rv[0],rv[1]):''}</td>`}
     <td class="n"><button data-pl-view="${p.id}">Open</button>${adm?'':` <button data-pl-edit="${p.id}">Edit</button> ${PS.arm===p.id?`<button class="pri" data-pl-delyes="${p.id}">Confirm delete</button>`:`<button data-pl-del="${p.id}">Delete</button>`}`}</td></tr>`;}).join('');
  return `<div class="row between"><h2>Lesson plans${adm?'':', '+E(TEACHERS[S0.tid].name)}</h2>
    ${adm?'':'<button class="pri" data-pl-new="1">New plan</button>'}</div>
  ${PS.msg?`<div class="note small">${E(PS.msg)}</div>`:''}
  <div class="grid">
   <div class="card kpi"><div class="l">${adm?'All plans':'My plans'}</div><div class="v">${scopeAll.length}</div></div>
   <div class="card kpi"><div class="l">With blank fields</div><div class="v">${withBlank}</div><div class="mut small">Each is a 5 TL fine unless waived</div></div>
   <div class="card kpi"><div class="l">${adm?'Awaiting review':'Reviewed'}</div><div class="v">${adm?pend:scopeAll.filter(p=>p.review.state==='approved').length}</div></div></div>
  <div class="row">
   ${adm?sel('tid',[['all','All teachers'],...allT().map(t=>[t,TEACHERS[t].name])]):''}
   ${sel('cls',[['all','All classes'],...cOpts.map(c=>[c.id,c.name])])}
   ${sel('m',[['all','All months'],...MONTHS])}
   ${sel('st',[['all','Any status'],['submitted','Submitted'],['draft','Draft']])}
   ${adm?sel('rv',[['all','Any review'],['pending','Awaiting review'],['approved','Reviewed'],['flagged','Needs changes']]):''}
  </div>
  <div class="card tw"><table><thead><tr><th>Date</th><th>Class</th>${adm?'<th>Teacher</th>':''}<th>Lesson</th><th>Fields</th><th>Status</th><th>${adm?'Review':'Feedback'}</th><th></th></tr></thead>
   <tbody>${rows||`<tr><td colspan="8" class="mut">No plans match.</td></tr>`}</tbody></table></div>
  <div class="banner">Plans are saved in this browser. ${adm?'The admin sees every teacher\'s plans here.':'You only see your own plans.'} The 95 October plans were imported from the Drive lesson-plan docs.</div>`;
}

/* ---------- Plan form ---------- */
function fld(key,label,type,val,hint){
  const v=E(val);
  const input=type==='area'?`<textarea data-plf="${key}">${v}</textarea>`
    :`<input type="${type}" data-plf="${key}" value="${v}">`;
  return `<label class="fld">${label}${hint?` <span class="small">${E(hint)}</span>`:''}${input}</label>`;
}
function planForm(){
  const d=PS.form.data;const cls=myClasses();
  const stageHtml=STAGES.map(([k,l,h])=>{const s=d.stages[k]||emptyStage();
    return `<div class="stage"><h3>${l}</h3><div class="small mut">${h}</div>
     ${fld('stages.'+k+'.procedure','Procedure','area',s.procedure)}
     <div class="fgrid">${fld('stages.'+k+'.interaction','Interaction (for example T to Ss)','text',s.interaction)}${fld('stages.'+k+'.timing','Timing (min)','text',s.timing)}</div></div>`;}).join('');
  const submitted=d.status==='submitted';
  const dr=PS.form.mode==='new'&&PS.resume;
  return `<div class="row between"><h2>${PS.form.mode==='new'?'New lesson plan':'Edit lesson plan'}</h2><button data-pl-back="1">Cancel</button></div>
  ${PS.msg?`<div class="note small">${E(PS.msg)}</div>`:''}
  ${dr?'':''}
  <div class="card"><h3>Class details</h3><div class="fgrid">
   <label class="fld">Class name<select data-plf="classId"><option value="">Choose a class</option>${cls.map(c=>`<option value="${c.id}" ${d.classId===c.id?'selected':''}>${E(c.name)}</option>`).join('')}</select></label>
   ${fld('curriculum','Curriculum','text',d.curriculum)}
   ${fld('date','Date','date',d.date)}
   ${fld('time','Time','time',d.time)}
   <label class="fld">Teacher<input type="text" value="${E(TEACHERS[S0.tid].name)}" disabled></label>
   ${fld('students','Number of students','number',d.students)}</div></div>
  <div class="card"><h3>Lesson focus</h3><div class="fgrid" style="grid-template-columns:1fr">
   ${fld('lessonTitle','Lesson title (unit, page)','text',d.lessonTitle)}
   ${fld('mainAim','Main aim','area',d.mainAim,'By the end of the lesson, students will be able to...')}
   ${fld('languageSkills','Language and skills (grammar, vocabulary, speaking, listening, writing)','area',d.languageSkills)}
   ${fld('materials','Materials (class book, external activities, please link)','area',d.materials)}
   ${fld('difficulties','Anticipated difficulties','area',d.difficulties)}</div></div>
  <div class="card"><h3>Lesson procedure</h3><div style="display:flex;flex-direction:column;gap:12px">${stageHtml}</div></div>
  <div class="card"><h3>Post lesson reflection</h3><p class="small mut">Filled in after the lesson. The summary submission time starts when "What went well" is first saved.</p><div class="fgrid" style="grid-template-columns:1fr">
   <div class="fgrid">${fld('startedTime','Started time','time',d.startedTime)}</div>
   ${fld('homework','Homework assigned','area',d.homework)}
   ${fld('wentWell','What went well? What would you change?','area',d.wentWell)}
   ${fld('outstanding','Outstanding issues','area',d.outstanding)}</div></div>
  <div class="card"><div id="blankNote">${blankNoteHtml(d)}</div>
   <div class="row" style="margin-top:12px">${submitted?'<button class="pri" data-pl-save="submit">Save changes</button>':'<button class="pri" data-pl-save="submit">Submit plan</button><button data-pl-save="draft">Save as draft</button>'}
   ${PS.form.mode==='edit'?(PS.arm===d.id?`<button class="pri" data-pl-delyes="${d.id}">Confirm delete</button>`:`<button data-pl-del="${d.id}">Delete plan</button>`):''}</div></div>`;
}
function blankNoteHtml(d){
  const b=planBlanks(d);
  return b.length?`<span class="pill warn">${b.length} blank</span> <span class="small mut">${E(b.join(', '))}. An improperly filled plan is fined 5 TL.</span>`
    :'<span class="pill ok">All required fields filled</span>';
}
function setPath(o,path,v){const k=path.split('.');let t=o;for(let i=0;i<k.length-1;i++){t[k[i]]=t[k[i]]||{};t=t[k[i]];}t[k[k.length-1]]=v;}
function openForm(mode,p){
  PS.msg='';PS.arm=null;
  PS.form={mode,data:p?clone(p):blankPlan(myClasses()[0])};
  if(!p&&!PS.form.data.classId){}
  PS.view='form';
}
function planSave(mode){
  const d=PS.form.data;
  if(!d.classId||!d.date){PS.msg='Choose a class and a date before saving.';render();return;}
  const dup=PLANS.find(p=>p.classId===d.classId&&p.date===d.date&&p.id!==d.id);
  if(dup){PS.msg='A plan for this class and date already exists. Open it and edit it instead.';render();return;}
  const now=new Date().toISOString();
  const p=clone(d);p.updatedAt=now;p.tid=S0.tid;
  if(!p.id){p.id=newId();p.createdAt=now;}
  p.status=mode==='submit'?'submitted':'draft';
  if(p.status==='submitted'&&!p.submittedAt)p.submittedAt=now;
  if(p.status==='submitted'&&filled(p.wentWell)&&!p.summaryAt)p.summaryAt=now;
  if(p.review&&p.review.state==='flagged')p.review={state:'pending',note:p.review.note,by:'',at:null};
  const i=PLANS.findIndex(x=>x.id===p.id);
  if(i>=0)PLANS[i]=p;else PLANS.push(p);
  savePlans();writeDraft(null);
  PS.form=null;PS.view='detail';PS.id=p.id;PS.msg=p.status==='submitted'?'Plan saved and submitted.':'Draft saved.';
  render();
}
function planDelete(id){
  PLANS=PLANS.filter(p=>p.id!==id);savePlans();
  PS.arm=null;PS.form=null;PS.view='list';PS.id=null;PS.msg='Plan deleted.';render();
}

/* ---------- Plan detail ---------- */
function planDetail(){
  const p=PLANS.find(x=>x.id===PS.id);
  if(!p){PS.view='list';return planList();}
  const adm=S0.role==='admin';const bl=planBlanks(p);const c=clsOf(p.classId);
  const cell=v=>v&&String(v).trim()?'<span data-notr>'+EB(v)+'</span>':'<span style="color:#999">blank</span>';
  const stg=STAGES.map(([k,l])=>{const s=(p.stages&&p.stages[k])||{};
    return `<tr><td><b>${l}</b></td><td>${cell(s.procedure)}</td><td>${cell(s.interaction)}</td><td>${cell(s.timing)}</td></tr>`;}).join('');
  const rv=RV[p.review.state];
  const review=adm?`<div class="card noprint"><h3>Review</h3>
    <div class="row">${pill(rv[0],rv[1])}${p.review.at?`<span class="small mut">${E(p.review.by)} on ${E(dd(p.review.at.slice(0,10)))}</span>`:''}</div>
    <label class="fld" style="margin-top:8px">Note to the teacher<textarea id="rvNote">${E(p.review.note)}</textarea></label>
    <div class="row" style="margin-top:8px"><button class="pri" data-pl-rv="approved">Mark reviewed</button><button data-pl-rv="flagged">Needs changes</button><button data-pl-rv="pending">Reset</button></div></div>`
    :(p.review.state!=='pending'?`<div class="card"><h3>Admin feedback</h3><div class="row">${pill(rv[0],rv[1])}</div>${p.review.note?`<p data-notr>${EB(p.review.note)}</p>`:''}</div>`:'');
  const stamps=p.src==='app'?`Submitted ${p.submittedAt?E(p.submittedAt.slice(0,16).replace('T',' ')):'not yet'}, summary ${p.summaryAt?E(p.summaryAt.slice(0,16).replace('T',' ')):'not yet'}. Times are recorded when the plan is saved.`
    :`Imported from Drive. Doc created ${E((p.driveCreated||'').slice(0,16).replace('T',' '))}, last edited ${E((p.driveModified||'').slice(0,16).replace('T',' '))}.`;
  return `<div class="row between noprint"><button data-pl-back="1">Back to plans</button>
    ${adm?'':`<div class="row"><button data-pl-edit="${p.id}">Edit</button>${PS.arm===p.id?`<button class="pri" data-pl-delyes="${p.id}">Confirm delete</button>`:`<button data-pl-del="${p.id}">Delete</button>`}</div>`}</div>
  ${PS.msg?`<div class="note small noprint">${E(PS.msg)}</div>`:''}
  <div class="doc"><h2>English Class Lesson Plan</h2>
   <table><tr><td><b>Class Name</b></td><td>${E(c?c.name:p.classId)}</td><td><b>Curriculum</b></td><td>${E(p.curriculum)}</td></tr>
   <tr><td><b>Date</b></td><td>${E(p.date.slice(8)+'/'+p.date.slice(5,7)+'/'+p.date.slice(0,4))}</td><td><b>Time</b></td><td>${cell(p.time)}</td></tr>
   <tr><td><b>Teacher</b></td><td>${E(TEACHERS[p.tid].name)}</td><td><b>Number of Student</b></td><td>${cell(p.students)}</td></tr></table>
   <div class="ph"></div>
   <table><tr><th colspan="2">Lesson Focus</th></tr>
   <tr><td><b>Lesson Title (Unit, Page)</b></td><td>${cell(p.lessonTitle)}</td></tr>
   <tr><td><b>Main Aim</b></td><td>${cell(p.mainAim)}</td></tr>
   <tr><td><b>Language / Skills</b></td><td>${cell(p.languageSkills)}</td></tr>
   <tr><td><b>Materials</b></td><td>${cell(p.materials)}</td></tr>
   <tr><td><b>Anticipated Difficulties</b></td><td>${cell(p.difficulties)}</td></tr></table>
   <div class="ph"></div>
   <div class="tw"><table><tr><th colspan="4">Lesson Procedure</th></tr><tr><th>Stage / Activity</th><th>Procedure</th><th>Interaction</th><th>Timing (min)</th></tr>${stg}</table></div>
   <div class="ph"></div>
   <table><tr><th colspan="2">Post Lesson Reflection</th></tr>
   <tr><td><b>Started Time</b></td><td>${cell(p.startedTime)}</td></tr>
   <tr><td><b>Homework Assigned</b></td><td>${cell(p.homework)}</td></tr>
   <tr><td><b>What went well? What would you change?</b></td><td>${cell(p.wentWell)}</td></tr>
   <tr><td><b>Outstanding Issues</b></td><td>${cell(p.outstanding)}</td></tr></table>
   ${p.extra&&Object.keys(p.extra).length?`<div class="ph"></div><table><tr><th colspan="2">Additional sections (Plan and Summary template)</th></tr>${Object.entries(p.extra).map(([k,v])=>`<tr><td data-notr><b>${E(k)}</b></td><td>${cell(v)}</td></tr>`).join('')}</table>`:''}
   <p class="small" style="font-family:Inter,sans-serif;color:#555">${stamps}</p></div>
  <div class="card noprint">${p.status==='draft'?pill('Draft, not yet submitted','warn'):(bl.length?pill(bl.length+' blank','warn')+' <span class="small mut">'+E(bl.join(', '))+'</span>':pill('All required fields filled','ok'))}</div>
  ${review}`;
}

/* ---------- Registers and homework statistics ---------- */
function bars(items,max,unit){
  return `<div class="hbars">${items.map(i=>`<div class="b" title="${E(i.label)}: ${i.v==null?'no marks':i.v+unit}"><span class="small">${i.v==null?'':(Number.isInteger(i.v)?i.v:Math.round(i.v))}</span><i style="height:${i.v==null||!max?0:Math.max(2,100*i.v/max)}%"></i><span class="small mut">${E(i.label)}</span></div>`).join('')}</div>`;
}
function regCard(s){
  const c=s.c,d=s.d;
  const cell=(l,i)=>{const p=l.pres[i],v=l.hw[i];
    if(l.status!=='taught'&&l.status!=='noshow')return '<span class="mut">–</span>';
    const a=p===undefined?'':(l.status==='noshow'||p===0)?'A':(p==='L'?'L':'P');
    const h=l.status==='noshow'?'':(typeof v==='number'?v+'%':v===NS?'not submitted':v===NG?'not given':'');
    return `<b>${a}</b>${h?' '+h:''}`;};
  const stu=s.per.map(p=>{const dd_=desc(p.scores);const att=p.present+p.late+p.absent;
    return `<tr><td>${E(p.name)}</td><td class="n">${att?Math.round(100*(p.present+p.late)/att)+'%':'—'}</td><td class="n">${p.late}</td><td class="n">${p.scores.length}</td><td class="n">${p.ns}</td><td class="n">${dd_?fmt1(dd_.mean)+'%':'—'}</td><td class="n">${dd_?fmt1(dd_.median)+'%':'—'}</td><td class="n">${dd_?dd_.min+'–'+dd_.max:'—'}</td></tr>`;}).join('');
  const reg=s.ls.map(l=>`<tr><td>${dd(l.d)}${l.mv?' <span class="pill warn">moved</span>':''}</td><td>${({taught:'Taught',noshow:'No-show',cancel:'Cancelled by teacher',demo:'Demo',nocl:'No class (test)'})[l.status]}</td>${c.students.map((n,i)=>`<td>${cell(l,i)}</td>`).join('')}</tr>`).join('');
  const maxH=Math.max(1,...s.hist.map(h=>h.n));
  return `<div class="card"><div class="row between"><h3>${E(c.name)}</h3><span class="pill">${E(TEACHERS[c.teacher].name)}</span></div>
   <div class="grid" style="margin:12px 0;grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
    <div><div class="small mut">Lessons held</div><b>${s.held}</b>${s.noshow?` <span class="small mut">${s.noshow} no-show</span>`:''}</div>
    <div><div class="small mut">Attendance</div><b>${rate(s.attRate)}</b></div>
    <div><div class="small mut">Homework submitted</div><b>${rate(s.subRate)}</b> <span class="small mut">${s.submitted} of ${s.submitted+s.notSubmitted}</span></div>
    <div><div class="small mut">Mean mark</div><b>${d?fmt1(d.mean)+'%':'—'}</b></div>
    <div><div class="small mut">Median</div><b>${d?fmt1(d.median)+'%':'—'}</b></div>
    <div><div class="small mut">Std deviation</div><b>${d?fmt1(d.sd):'—'}</b></div>
    <div><div class="small mut">Lowest to highest</div><b>${d?d.min+' to '+d.max:'—'}</b></div></div>
   <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
    <div><div class="small mut">Mark distribution (number of marks)</div>${bars(s.hist.map(h=>({label:h.label,v:h.n})),maxH,'')}</div>
    <div><div class="small mut">Mean mark by lesson</div>${bars(s.byLesson.map(b=>({label:dd(b.d),v:b.mean})),100,'%')}</div></div>
   <div class="tw" style="margin-top:12px"><table><thead><tr><th>Student</th><th class="n">Attendance</th><th class="n">Late</th><th class="n">Marks</th><th class="n">Not submitted</th><th class="n">Mean</th><th class="n">Median</th><th class="n">Range</th></tr></thead><tbody>${stu}</tbody></table></div>
   <details style="margin-top:8px"><summary>Lesson register</summary><div class="tw"><table><thead><tr><th>Date</th><th>Status</th>${c.students.map(n=>`<th>${E(n)}</th>`).join('')}</tr></thead><tbody>${reg}</tbody></table></div>
   <p class="small mut">P present, L late, A absent, then the homework mark. Marks are the percentage scored.</p></details></div>`;
}
function regScreen(){
  const adm=S0.role==='admin';const tid=adm?RS.tid:S0.tid;
  let cs=CLASSES.filter(c=>(tid==='all'||c.teacher===tid)&&lessonsIn(c,S0.m).length);
  const opts=cs.slice();
  if(RS.cls!=='all'&&cs.some(c=>c.id===RS.cls))cs=cs.filter(c=>c.id===RS.cls);
  const st=cs.map(c=>classStats(c,S0.m));
  const t=aggregateStats(st);const d=t.d;
  const sel=(key,list)=>`<select data-rs="${key}">${list.map(o=>`<option value="${o[0]}" ${RS[key]===o[0]?'selected':''}>${E(o[1])}</option>`).join('')}</select>`;
  return `<h2>Registers and homework, ${mname(S0.m)}</h2>
  <div class="row">${adm?sel('tid',[['all','All teachers'],...allT().map(x=>[x,TEACHERS[x].name])]):''}${sel('cls',[['all','All classes'],...opts.map(c=>[c.id,c.name])])}</div>
  <div class="grid">
   <div class="card kpi"><div class="l">Lessons held</div><div class="v">${t.held}</div><div class="mut small">${t.noshow} no-show, ${t.cancelled} cancelled or no class</div></div>
   <div class="card kpi"><div class="l">Attendance</div><div class="v">${rate(t.attRate)}</div><div class="mut small">${t.late} late arrivals</div></div>
   <div class="card kpi"><div class="l">Homework submitted</div><div class="v">${rate(t.subRate)}</div><div class="mut small">${t.submitted} marks, ${t.notSubmitted} not submitted</div></div>
   <div class="card kpi"><div class="l">Mean mark</div><div class="v">${d?fmt1(d.mean)+'%':'—'}</div><div class="mut small">median ${d?fmt1(d.median)+'%':'—'}, SD ${d?fmt1(d.sd):'—'}</div></div></div>
  ${st.map(regCard).join('')||'<p class="mut">No lessons for this selection.</p>'}
  <div class="banner">Imported from the monthly register spreadsheets. ${adm?'':'Read-only. '}Attendance counts present and late as attending. Mark statistics use submitted marks only; "not submitted" and "not given" are counted separately.</div>`;
}

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;const d=t.dataset;let ch=true;
  if(d.plNew){writeDraftCheck();openForm('new');}
  else if(d.plView){PS.id=d.plView;PS.view='detail';PS.msg='';PS.arm=null;}
  else if(d.plEdit){const p=PLANS.find(x=>x.id===d.plEdit);if(p)openForm('edit',p);}
  else if(d.plBack!==undefined){PS.view=PS.view==='form'&&PS.form&&PS.form.mode==='edit'?'detail':'list';if(PS.view==='form')PS.view='list';PS.form=null;PS.msg='';PS.arm=null;writeDraft(null);}
  else if(d.plSave){planSave(d.plSave);ch=false;}
  else if(d.plDel){PS.arm=d.plDel;}
  else if(d.plDelyes){planDelete(d.plDelyes);ch=false;}
  else if(d.plRv){const p=PLANS.find(x=>x.id===PS.id);if(p){const n=$('#rvNote');p.review={state:d.plRv,note:n?n.value:'',by:d.plRv==='pending'?'':'Perzane',at:d.plRv==='pending'?null:new Date().toISOString()};savePlans();PS.msg='Review saved.';}}
  else if(d.plReset){if(!t.dataset.sure){t.textContent='Click again to confirm';t.dataset.sure=1;return;}resetPlans();PS.msg='Imported October plans restored. Plans created in the portal were removed.';PS.view='list';}
  else ch=false;
  if(ch)render();
});
function writeDraftCheck(){PS.resume=false;}
document.addEventListener('input',e=>{
  const t=e.target,k=t.dataset&&t.dataset.plf;
  if(!k||!PS.form||k==='classId')return;
  setPath(PS.form.data,k,t.value);
  const n=$('#blankNote');if(n)n.innerHTML=blankNoteHtml(PS.form.data);
  writeDraft({tid:S0.tid,data:PS.form.data});
});
document.addEventListener('change',e=>{
  const t=e.target,d=t.dataset;
  if(d.plf==='classId'&&PS.form){const c=clsOf(t.value);PS.form.data.classId=t.value;if(c){PS.form.data.students=String(c.students.length);}render();}
  else if(d.plfFilter){PS.f[d.plfFilter]=t.value;if(d.plfFilter==='tid')PS.f.cls='all';render();}
  else if(d.rs){RS[d.rs]=t.value;if(d.rs==='tid')RS.cls='all';render();}
});
function plansScreen(){
  if(PS.view==='form'&&PS.form)return planForm();
  if(PS.view==='detail')return planDetail();
  return planList();
}

const SCREENS={dash,pay,rep,plans:plansScreen,reg:regScreen,cls,perf:perfView,inp};
const TSCREENS={home:teacherView,plans:plansScreen,reg:regScreen};
render=function(){
  if(S0.role==='teacher'&&!TSCREENS[S0.tab])S0.tab='home';
  if(S0.role==='admin'&&!SCREENS[S0.tab])S0.tab='dash';
  chrome();const v=$('#view');
  if(doc){v.innerHTML=docView();return;}
  v.innerHTML=S0.role==='teacher'?TSCREENS[S0.tab]():SCREENS[S0.tab]();};
