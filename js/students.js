/* ===== STUDENTS + REGISTRATIONS ===== */
const SEED_STUDENTS=[];
const CFG=window.TEVFIK_CONFIG||{};
const FORMS=[
 {id:'ug',lang:'Uyghur',title:'ئىنگىلىز تىلى ئوقۇغۇچى تىزىملاش جەدۋىلى',fid:(CFG.forms&&CFG.forms.ug)||'1jX6QG6F_OD0ZgUPdvuMleXT99W6c0eaFRjckCUacwrI'},
 {id:'tr',lang:'Turkish',title:'Tevfik Online Okulu İngilizce Dersi Kabul Formu',fid:(CFG.forms&&CFG.forms.tr)||'1hmnkJUC-tph1oPLZCeGL4WaoM_LyXSgILdDFNw-UMec'}];
const formUrl=f=>'https://docs.google.com/forms/d/'+f.fid+'/viewform';
const COUNTRY={TR:'Türkiye',FR:'France',NO:'Norway',AT:'Austria',FI:'Finland',BE:'Belgium',SA:'Saudi Arabia',NL:'Netherlands',DE:'Germany',AE:'UAE (Dubai)'};
const ctry=c=>COUNTRY[c]||c||'—';
const ST_KEY='tevfik-students-v1';
let STU=[],REGS=[];
function loadStu(){
  try{const o=JSON.parse(localStorage.getItem(ST_KEY)||'null');if(o&&o.v===1){STU=o.students;REGS=o.regs||[];return;}}catch(e){}
  STU=clone(SEED_STUDENTS);REGS=[];
}
function saveStu(){try{localStorage.setItem(ST_KEY,JSON.stringify({v:1,students:STU,regs:REGS}));}catch(e){}}
loadStu();
const SS={q:'',teacher:'all',country:'all',status:'active',sel:null,edit:null,arm:null,msg:''};
const RG={id:null,form:null,msg:'',paste:'',pform:'ug',arm:null,since:new Date(Date.now()-30*864e5).toISOString().slice(0,10)};
const RS_KEY='tevfik-response-sheets',SL_KEY='tevfik-student-sheet';
let RS_LINKS=(()=>{try{return Object.assign({},CFG.responseSheets||{},JSON.parse(localStorage.getItem(RS_KEY)||'{}'));}catch(e){return Object.assign({},CFG.responseSheets||{});}})();
let SL_META=(()=>{try{return JSON.parse(localStorage.getItem(SL_KEY)||'null');}catch(e){return null;}})();
const SL={url:(SL_META&&SL_META.url)||(CFG.studentListSheet?'https://docs.google.com/spreadsheets/d/'+CFG.studentListSheet+'/edit':''),tabs:null,tab:null,msg:'',busy:false};
/* form timestamps: "05.11.2026 10:00:00" (day first) or "11/5/2026 10:00:00" (month first) */
function stampDate(s){let m=String(s||'').match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  m=String(s||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m)return m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0');
  m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[0]:null;}
/* which teacher in the synced data a student's teacher name belongs to */
function tidOf(s){const n=(typeof norm==='function'?norm:x=>String(x||'').toLowerCase())(s.teacher);if(!n)return null;
  for(const t of Object.values(TEACHERS)){const a=norm(t.name),b=norm(t.full);if(n===a||n===b||b.split(' ').includes(n)||a.split(' ').includes(n)||n.split(' + ').includes(a))return t.id;}return null;}
/* ---- student list sheet -> student records ---- */
const UG_COUNTRY={'تۇركىيە':'TR','تۈركىيە':'TR','فىرانسىيە':'FR','فرانسىيە':'FR','نورۋېگىيە':'NO','ئاۋىستىرىيە':'AT','فىنلاندىيە':'FI','بېلگىيە':'BE','بىلگىيە':'BE','سەئۇدى ئەرەبىستان':'SA','گوللاندىيە':'NL','گىرمانىيە':'DE','گېرمانىيە':'DE','Dubai':'AE'};
const p2=n=>String(n).padStart(2,'0');
function moneyOf(s){s=String(s||'').trim();if(!s)return null;const v=parseFloat(s.replace(/[^\d,]/g,'').replace(',','.'));return isNaN(v)?null:[s.includes('€')?'EUR':'USD',v];}
function listDate(s){s=String(s||'').trim();let m=s.match(/^2?(\d{4})[./](\d{1,2})[./]?(\d{0,2})$/);
  if(m){const d=+m[3]||0;return m[1]+'-'+p2(m[2])+(d?'-'+p2(d):'');}m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);return m?m[3]+'-'+p2(m[2])+'-'+p2(m[1]):'';}
function teacherClean(s){s=String(s||'').replace(/\t/g,'').replace(/\(\d+\)/g,'').trim();if(s.includes('+'))s=s.replace(/\s*\d+/g,'');
  return s.replace('Jama l','Jamal').replace('SİBA','Siba').replace(/\s*\+\s*/g,' + ').trim();}
function normStudentRows(rows){const out=[],seen={};let i=0;
  rows.forEach(r0=>{const r=(r0||[]).map(c=>c==null?'':String(c));while(r.length<19)r.push('');
    if(!/^\d+$/.test(r[0].trim()))return;const name=r[1].replace(/\t/g,'').replace(/\s+/g,' ').trim();if(!name)return;i++;
    const age=r[3].replace(/\D/g,''),phone=r[5].replace(/,00 TRY/,'').trim(),digits=phone.replace(/\D/g,''),fee=moneyOf(r[9]),per=moneyOf(r[10]),mm=r[16].match(/(\d+)\s*مىنۇت/),ct=r[4].trim();
    const s={id:'L'+i,no:r[0].trim(),name,g:/قىز|kız|kiz|girl/i.test(r[2])?'F':'M',age:age?+age:null,
      country:UG_COUNTRY[ct]||((CMAP.find(([re])=>re.test(ct))||[0,ct])[1]),phone,ph4:digits.slice(-4),start:listDate(r[6]),startRaw:r[6].trim(),
      cls:r[7].replace(/\s+/g,' ').trim(),n:/^\d+$/.test(r[8].trim())?+r[8]:null,fee,per:per?per[1]:null,teacher:teacherClean(r[11]),
      mins:mm?+mm[1]:null,one:r[16].includes('بىرگە'),link:null,status:'active',src:'list'};
    const k=name+'|'+digits;if(seen[k])s.dupOf=seen[k];else seen[k]=s.id;out.push(s);});
  return out;}
function slCard(){return `<details class="card" ${STU.some(s=>s.src==='list')?'':'open'}><summary><b>Load the student list from Google Sheets</b></summary>
   <div class="row" style="margin-top:8px"><input type="url" id="slUrl" value="${E(SL.url)}" placeholder="Student list sheet link" aria-label="Student list sheet link" style="flex:1;min-width:220px" ${SL.busy?'disabled':''}>
   ${SL.tabs?`<select id="slTab" data-notr aria-label="Tab">${SL.tabs.map(t=>`<option value="${E(t)}" ${t===SL.tab?'selected':''}>${E(t)}</option>`).join('')}</select>`:''}
   <button class="pri" data-sl-load="1" ${SL.busy?'disabled':''}>${SL.tabs?'Load this tab':'Find tabs'}</button></div>
   ${SL.msg?`<p class="small">${E(SL.msg)}</p>`:''}<p class="small mut">Students added from a registration form or by hand are kept when the list is loaded again.</p></details>`;}
async function slLoad(){
  const id=sheetIdOf(SL.url);if(!id){SL.msg='Paste the link of the student list Google Sheet.';render();return;}
  SL.busy=true;SL.msg=SL.tabs?'Loading…':'Reading the sheet…';render();
  try{
    if(!SL.tabs){const r=await gCall('sheet_tabs',{spreadsheetId:id});SL.tabs=r.tabs;SL.tab=r.tabs[r.tabs.length-1];SL.msg='Choose the month tab, then click Load this tab.';}
    else{const tab=SL.tab;const r=await gCall('get_values',{spreadsheetId:id,range:"'"+tab.replace(/'/g,"''")+"'!A1:T600"});
      const list=normStudentRows(r.values||[]);
      if(!list.length){SL.msg='No student rows were found on that tab. Rows need a number in the first column and a name in the second.';}
      else{STU=STU.filter(s=>s.src!=='list').concat(list);saveStu();SL_META={url:SL.url,tab,at:new Date().toISOString()};
        try{localStorage.setItem(SL_KEY,JSON.stringify(SL_META));}catch(e){}SL.msg=list.length+' students loaded from tab '+tab+'.';}}
  }catch(e){SL.msg=gErrText(e);}
  SL.busy=false;render();}
async function rsLoad(form){
  const url=RS_LINKS[form]||'';const id=sheetIdOf(url);
  if(!id){RG.msg='Paste the link of the form\'s response sheet first. In the form, open Responses and choose Show in Sheets to find it.';render();return;}
  RG.msg='Reading responses…';render();
  try{const r=await gCall('get_values',{spreadsheetId:id,range:'A1:Z5000'});RG.msg=importRows(r.values||[],form,RG.since);}
  catch(e){RG.msg=gErrText(e);}
  render();}
const money=f=>f?(f[0]==='EUR'?'€':'$')+f[1].toFixed(2):'—';
const sdate=d=>!d?'—':d.length===10?d.slice(8)+'-'+d.slice(5,7)+'-'+d.slice(0,4):d.slice(5,7)+'-'+d.slice(0,4);
const nm=s=>`<span data-notr dir="auto">${E(s)}</span>`;
const teachersInList=()=>[...new Set(STU.map(s=>s.teacher).filter(Boolean))].sort();
const phoneShow=s=>s.phone?E(s.phone):(s.ph4?'••• '+E(s.ph4):'—');

/* ---------- Students ---------- */
function stuFiltered(){
  const q=SS.q.trim().toLowerCase();
  const tch=S0.role==='teacher';
  return STU.filter(s=>(tch?tidOf(s)===S0.tid:true)
    &&(SS.status==='all'||s.status===SS.status)
    &&(tch||SS.teacher==='all'||s.teacher===SS.teacher)
    &&(SS.country==='all'||s.country===SS.country)
    &&(!q||[s.name,s.cls,s.teacher,s.ph4,s.phone,s.no].some(v=>v&&String(v).toLowerCase().includes(q))));
}
function lenLabel(s){return [s.mins?s.mins+' min':'',s.one?'one-to-one':''].filter(Boolean).join(', ');}
function stuScreen(){
  if(SS.edit)return stuForm();
  const tch=S0.role==='teacher';
  const scope=tch?STU.filter(s=>tidOf(s)===S0.tid):STU;
  const act=scope.filter(s=>s.status==='active');
  const uniq=act.filter(s=>!s.dupOf);
  const sum=c=>act.filter(s=>s.fee&&s.fee[0]===c).reduce((a,s)=>a+s.fee[1],0);
  const newM=act.filter(s=>s.start&&s.start.startsWith(S0.m)).length;
  const L=stuFiltered();
  const sel=(key,opts)=>`<select data-ss="${key}" aria-label="${key}">${opts.map(o=>`<option value="${E(o[0])}" ${SS[key]===o[0]?'selected':''}>${E(o[1])}</option>`).join('')}</select>`;
  const rows=L.map(s=>{const c=s.link?clsOf(s.link):null;
    return `<tr class="${SS.sel===s.id?'selrow':''}"><td class="n">${E(s.no||'')}</td><td>${nm(s.name)}${s.src==='form'?' '+pill('New','ok'):''}${s.status==='left'?' '+pill('Left'):''}</td>
    <td>${s.g==='F'?'Girl':'Boy'}</td><td class="n">${s.age??'—'}</td><td>${ctry(s.country)}</td>
    <td>${c?`<span title="${E(c.name)}">${nm(s.cls)}</span> ${pill('In this system','ok')}`:nm(s.cls||'—')}</td>
    ${tch?'':`<td>${nm(s.teacher||'—')}</td>`}<td class="n">${s.n??'—'}</td><td class="n">${money(s.fee)}</td><td dir="ltr" style="white-space:nowrap">${sdate(s.start)}</td>
    <td class="n"><button data-st-open="${s.id}">${SS.sel===s.id?'Close':'Details'}</button></td></tr>
    ${SS.sel===s.id?`<tr class="selrow"><td colspan="${tch?10:11}">${stuDetail(s)}</td></tr>`:''}`;}).join('');
  return `<div class="row between"><h2>${tch?'My students':'Students'}</h2>${tch?'':'<button class="pri" data-st-new="1">Add student</button>'}</div>
  ${SS.msg?`<div class="note small">${E(SS.msg)}</div>`:''}
  <div class="grid">
   <div class="card kpi"><div class="l">Active students</div><div class="v">${uniq.length}</div><div class="mut small">${act.length} enrolments</div></div>
   <div class="card kpi"><div class="l">Teachers</div><div class="v">${new Set(act.map(s=>s.teacher)).size}</div></div>
   <div class="card kpi"><div class="l">Monthly fees</div><div class="v" style="font-size:22px">$${sum('USD').toFixed(0)} <span class="mut">+</span> €${sum('EUR').toFixed(0)}</div><div class="mut small">as listed per student</div></div>
   <div class="card kpi"><div class="l">Started this month</div><div class="v">${newM}</div><div class="mut small">${mname(S0.m)}</div></div></div>
  ${tch?'':slCard()}
  <div class="row">
   <input type="search" id="stuQ" placeholder="Search name, class, teacher or phone" value="${E(SS.q)}" style="flex:1;min-width:200px">
   ${tch?'':sel('teacher',[['all','All teachers'],...teachersInList().map(t=>[t,t])])}
   ${sel('country',[['all','All countries'],...[...new Set(scope.map(s=>s.country))].sort().map(c=>[c,ctry(c)])])}
   ${sel('status',[['active','Active'],['left','Left'],['all','All students']])}
   <span class="small mut">${L.length} shown</span></div>
  <div class="card tw"><table><thead><tr><th class="n">No.</th><th>Name</th><th>Gender</th><th class="n">Age</th><th>Country</th><th>Class</th>${tch?'':'<th>Teacher</th>'}<th class="n">Lessons a month</th><th class="n">Monthly fee</th><th>Start date</th><th></th></tr></thead>
   <tbody>${rows||`<tr><td colspan="11" class="mut">No students match.</td></tr>`}</tbody></table></div>
  <div class="banner">${tch?'<span>Read-only.</span> ':''}<span>${SL_META?'Loaded from the student list sheet, tab '+E(SL_META.tab)+', on '+E(SL_META.at.slice(0,10))+'.':'No student list loaded yet.'}</span> <span>Changes are saved in this browser only.</span></div>${tch?'':'<div class="row"><button data-st-reset="1">Restore the imported student list</button></div>'}`;
}
function stuDetail(s){
  const c=s.link?clsOf(s.link):null;const adm=S0.role==='admin';
  const dupe=s.dupOf?STU.find(x=>x.id===s.dupOf):STU.find(x=>x.dupOf===s.id);
  const f=(l,v)=>`<div><div class="small mut">${l}</div><div>${v}</div></div>`;
  return `<div class="fgrid" style="padding:4px 0">
    ${f('Contact number',phoneShow(s))}${f('Lesson length',lenLabel(s)||'—')}${f('Fee per lesson',s.per!=null?(s.fee&&s.fee[0]==='EUR'?'€':'$')+s.per.toFixed(2):'—')}
    ${f('Start date',sdate(s.start)+(s.start&&s.start.length<10?' <span class="small mut">(day missing)</span>':'')+(!s.start&&s.startRaw?' <span class="small mut">'+E(s.startRaw)+'</span>':''))}
    ${f('Class in this system',c?nm(c.name):'—')}${f('Added from',s.src==='form'?'Registration form':'Student list sheet')}</div>
   ${dupe?`<div class="note small">Listed twice in the sheet: also row ${E(dupe.no)}, teacher ${nm(dupe.teacher)}. Check whether this is a second class or a duplicate.</div>`:''}
   ${s.reg&&s.reg.extra&&Object.keys(s.reg.extra).length?`<details><summary class="small">Form answers</summary><table>${Object.entries(s.reg.extra).map(([k,v])=>`<tr><td>${nm(k)}</td><td>${nm(v)}</td></tr>`).join('')}</table></details>`:''}
   ${adm?`<div class="row" style="margin-top:8px"><button data-st-edit="${s.id}">Edit</button>${s.status==='active'?`<button data-st-left="${s.id}">Mark as left</button>`:`<button data-st-back="${s.id}">Mark as active</button>`}
     ${SS.arm===s.id?`<button class="pri" data-st-delyes="${s.id}">Confirm delete</button>`:`<button data-st-del="${s.id}">Delete</button>`}</div>`:''}`;
}
/* shared student / approval form */
function fieldsHtml(d,pre){
  const t=teachersInList();
  const opt=(v,list,lab)=>list.map(o=>`<option value="${E(o)}" ${String(d[v]??'')===String(o)?'selected':''}>${E(lab?lab(o):o)}</option>`).join('');
  const inp=(k,l,type,extra)=>`<label class="fld">${l}<input id="${pre}-${k}" type="${type}" data-sf="${k}" value="${E(d[k]??'')}" ${extra||''}></label>`;
  return `<div class="fgrid">
   ${inp('name','Full name','text','dir="auto"')}
   <label class="fld">Gender<select id="${pre}-g" data-sf="g"><option value="">—</option>${opt('g',['M','F'],x=>x==='F'?'Girl':'Boy')}</select></label>
   ${inp('age','Age','number','min="3" max="80"')}
   <label class="fld">Country<select id="${pre}-country" data-sf="country"><option value="">—</option>${opt('country',Object.keys(COUNTRY),ctry)}</select></label>
   ${inp('phone','Contact number','tel')}
   ${inp('start','Start date','date')}</div>
  <h3 style="margin-top:8px">Class and fees</h3><div class="fgrid">
   ${inp('cls','Class','text','placeholder="for example F4-09"')}
   <label class="fld">Teacher<input id="${pre}-teacher" data-sf="teacher" list="tlist" value="${E(d.teacher||'')}"><datalist id="tlist">${t.map(x=>`<option value="${E(x)}">`).join('')}</datalist></label>
   <label class="fld">Lessons a month<select id="${pre}-n" data-sf="n">${opt('n',[4,8,12,16])}</select></label>
   <label class="fld">Lesson length<select id="${pre}-mins" data-sf="mins">${opt('mins',[30,40,60],x=>x+' min')}</select></label>
   <label class="fld">Monthly fee<input id="${pre}-fee" type="number" step="0.01" data-sf="fee" value="${E(d.fee??'')}"></label>
   <label class="fld">Currency<select id="${pre}-cur" data-sf="cur">${opt('cur',['USD','EUR'])}</select></label>
   <label class="fld" style="flex-direction:row;align-items:center;gap:6px"><input id="${pre}-one" type="checkbox" data-sf="one" ${d.one?'checked':''}> One-to-one</label></div>`;
}
const toForm=s=>({name:s.name,g:s.g,age:s.age,country:s.country,phone:s.phone||'',start:s.start&&s.start.length===10?s.start:'',cls:s.cls,teacher:s.teacher,n:s.n||8,mins:s.mins||40,fee:s.fee?s.fee[1]:'',cur:s.fee?s.fee[0]:'USD',one:!!s.one});
function readForm(pre){const o={};document.querySelectorAll(`[id^="${pre}-"]`).forEach(el=>{const k=el.dataset.sf;o[k]=el.type==='checkbox'?el.checked:el.value.trim();});return o;}
function applyForm(s,o){
  s.name=o.name;s.g=o.g||s.g;s.age=o.age?+o.age:null;s.country=o.country;if(o.phone){s.phone=o.phone;s.ph4=o.phone.replace(/\D/g,'').slice(-4);}
  if(o.start)s.start=o.start;s.cls=o.cls;s.teacher=o.teacher;s.tid=o.teacher==='Tshidiso'?'t':o.teacher==='Dube'?'d':s.tid||null;
  s.n=+o.n||null;s.mins=+o.mins||null;s.fee=o.fee!==''?[o.cur,+o.fee]:null;s.per=s.fee&&s.n?+(s.fee[1]/s.n).toFixed(2):s.per;s.one=!!o.one;return s;}
function stuForm(){
  const isNew=SS.edit==='new';const s=isNew?{n:8,mins:40,cur:'USD'}:toForm(STU.find(x=>x.id===SS.edit));
  return `<div class="row between"><h2>${isNew?'Add student':'Edit student'}</h2><button data-st-cancel="1">Cancel</button></div>
  ${SS.msg?`<div class="note small">${E(SS.msg)}</div>`:''}
  <div class="card">${fieldsHtml(s,'sf')}<div class="row" style="margin-top:12px"><button class="pri" data-st-save="1">Save student</button></div></div>`;
}

/* ---------- Registrations ---------- */
function regScreenNew(){
  if(RG.id)return regReview();
  const pend=REGS.filter(r=>r.state==='pending'),done=REGS.filter(r=>r.state!=='pending').sort((a,b)=>(b.decidedAt||'').localeCompare(a.decidedAt||''));
  const card=f=>{const u=formUrl(f);const wa='https://wa.me/?text='+encodeURIComponent(u);
    return `<div class="card"><div class="row between"><h3>${f.lang==='Uyghur'?'Uyghur registration form':'Turkish registration form'}</h3><span class="pill">${pend.filter(r=>r.form===f.id).length} waiting</span></div>
    <p class="small" data-notr dir="auto" style="margin:6px 0">${E(f.title)}</p>
    <input type="text" readonly id="link-${f.id}" value="${E(u)}" style="width:100%;font-size:12px" aria-label="Form link">
    <div class="row" style="margin-top:8px"><button class="pri" data-copy="${f.id}">Copy link</button><a class="btnl" href="${wa}" target="_blank" rel="noopener">Share on WhatsApp</a><a class="btnl" href="${u}" target="_blank" rel="noopener">Open form</a></div>
    <div class="row" style="margin-top:10px"><input type="url" id="rs-${f.id}" data-rsheet="${f.id}" value="${E(RS_LINKS[f.id]||'')}" placeholder="Response sheet link" style="flex:1;min-width:200px" aria-label="Response sheet link"><button data-rg-sheet="${f.id}">Load new responses</button></div></div>`;};
  const prow=r=>`<tr><td>${E(r.at?r.at.slice(0,16).replace('T',' '):'—')}</td><td>${r.form==='ug'?'Uyghur':r.form==='tr'?'Turkish':'By hand'}</td><td>${nm(r.d.name||'—')}</td><td class="n">${r.d.age||'—'}</td><td>${ctry(r.d.country)}</td><td>${E(r.d.phone||'—')}</td><td class="n"><button class="pri" data-rg-open="${r.id}">Review</button></td></tr>`;
  return `<h2>Registrations</h2>
  <p class="mut">Send a form link to the family. Each answer comes in here as a pending registration. Once the admin approves it, the student is added to the student list.</p>
  ${RG.msg?`<div class="note small">${E(RG.msg)}</div>`:''}
  <div class="row"><label class="f">Load responses submitted on or after<input type="date" id="rsSince" value="${E(RG.since)}"></label></div>
  <div class="grid">${FORMS.map(card).join('')}</div>
  <div class="card tw"><div class="row between"><h3>Waiting for approval</h3><button data-rg-hand="1">Add a registration by hand</button></div>
   <table><thead><tr><th>Submitted</th><th>Form</th><th>Name</th><th class="n">Age</th><th>Country</th><th>Contact number</th><th></th></tr></thead>
   <tbody>${pend.map(prow).join('')||'<tr><td colspan="7" class="mut">No registrations are waiting. Responses appear here once they are added below.</td></tr>'}</tbody></table></div>
  <div class="card"><h3>Add form responses</h3>
   <p class="small mut">In the form, open Responses and choose Show in Sheets. Select the rows including the header row, copy, and paste them here. Rows already added are skipped.</p>
   <div class="row"><label class="f">Form<select id="pform">${FORMS.map(f=>`<option value="${f.id}" ${RG.pform===f.id?'selected':''}>${f.lang==='Uyghur'?'Uyghur registration form':'Turkish registration form'}</option>`).join('')}</select></label></div>
   <textarea id="ppaste" placeholder="Paste copied rows here" style="margin-top:8px">${E(RG.paste)}</textarea>
   <div class="row" style="margin-top:8px"><button class="pri" data-rg-import="1">Add responses</button></div></div>
  ${done.length?`<div class="card tw"><h3>Decided</h3><table><thead><tr><th>Name</th><th>Decision</th><th>Date</th><th>Note</th></tr></thead><tbody>${done.map(r=>`<tr><td>${nm(r.d.name)}</td><td>${r.state==='approved'?pill('Approved','ok'):pill('Rejected','bad')}</td><td>${E((r.decidedAt||'').slice(0,10))}</td><td>${nm(r.note||'')}</td></tr>`).join('')}</tbody></table></div>`:''}
  <div class="banner">Paste each form's response sheet link once; it is remembered in this browser. Only responses on or after the chosen date are added, and rows already added are skipped. Registrations are saved in this browser only.</div>`;
}
function regReview(){
  const r=REGS.find(x=>x.id===RG.id);if(!r){RG.id=null;return regScreenNew();}
  const d=Object.assign({n:8,mins:40,cur:'USD'},r.d);
  const ex=Object.entries(r.extra||{});
  return `<div class="row between"><h2>${r.state==='new'?'Add a registration by hand':'Review registration'}</h2><button data-rg-back="1">Back to registrations</button></div>
  ${RG.msg?`<div class="note small">${E(RG.msg)}</div>`:''}
  ${(r.d.avail||r.d.level||r.d.ug||r.d.stay||r.d.countryText)?`<div class="card"><h3>What the family asked for</h3><div class="fgrid">
   ${[['Country as written',r.d.countryText],['Available times',r.d.avail],['Current English level',r.d.level],['Uyghur language level',r.d.ug],['Plans to study for',r.d.stay]].filter(x=>x[1]).map(([l,v])=>`<div><div class="small mut">${l}</div><div>${nm(v)}</div></div>`).join('')}</div></div>`:''}
  ${ex.length?`<details class="card"><summary><b>Other form answers</b></summary><table>${ex.map(([k,v])=>`<tr><td style="width:40%">${nm(k)}</td><td>${nm(v)}</td></tr>`).join('')}</table></details>`:''}
  ${''&&ex.length?`<div class="card tw"><h3>Form answers</h3><table>${ex.map(([k,v])=>`<tr><td style="width:40%">${nm(k)}</td><td>${nm(v)}</td></tr>`).join('')}</table></div>`:''}
  <div class="card"><h3>Student details</h3>${fieldsHtml(d,'rf')}
   <label class="fld" style="margin-top:12px">Note (shown with the decision)<input type="text" id="rgNote" value="${E(r.note||'')}"></label>
   <div class="row" style="margin-top:12px"><button class="pri" data-rg-approve="1">Approve and add to student list</button>
   ${RG.arm==='rej'?'<button class="pri" data-rg-rejyes="1">Confirm reject</button>':'<button data-rg-rej="1">Reject</button>'}</div></div>`;
}
/* paste parsing: tab-separated (copied from Sheets) or CSV */
function parseRows(t){
  t=t.replace(/\r/g,'');const tab=t.includes('\t');const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<t.length;i++){const ch=t[i];
    if(q){if(ch==='"'){if(t[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=ch;continue;}
    if(ch==='"'&&cell==='')q=true;else if(ch===(tab?'\t':',')){row.push(cell);cell='';}
    else if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell='';}else cell+=ch;}
  if(cell||row.length){row.push(cell);rows.push(row);}
  return rows.filter(r=>r.some(c=>c.trim()));
}
/* column headings of the two real forms (Turkish and Uyghur), plus English fallbacks */
const HDR={at:/zaman damgası|timestamp|ۋاقىت تامغىسى/i,name:/adı ve soyadı|ad soyad|full name|\bname\b|ئىسىم - فامىلى|ئىسىم/i,
 age:/çocuğunuzun yaşı|\bage\b|قانچە ياشتا|يېشى/i,g:/cinsiyet|gender|ئوغۇلمۇ قىزمۇ|جىنس/i,country:/yaşadığınız ülke|ülke|country|دۆلىتىڭىز|دۆلەت/i,
 phone:/whatsapp|telefon|phone|ۋوتساپ|نومۇر/i,avail:/müsait|available|ماس كېلىدىغان ۋاقىت/i,level:/ngilizce seviye|english level|ئىنگىلىز تىلى سەۋىيە/i,
 ug:/ئۇيغۇر تىلى سەۋىيە|uyghur level/i,stay:/ne kadar süreyle|how long|قانچە ئۇزۇن/i};
const CMAP=[[/türk|turk|تۈرك|تۇرك/i,'TR'],[/fran|فىرانس|فرانس/i,'FR'],[/norw|norveç|نورۋېگ/i,'NO'],[/austr|avust|ئاۋىستىر/i,'AT'],[/fin|فىنلان/i,'FI'],[/belg|بېلگ|بىلگ/i,'BE'],[/saudi|suudi|سەئۇدى/i,'SA'],[/neth|holl|گوللان/i,'NL'],[/germ|alman|deutsch|گېرمان|گىرمان/i,'DE'],[/dubai|emir|ئەرەب بىرلەشمە|دۇبەي/i,'AE']];
function importPaste(txt,form){return importRows(parseRows(txt),form);}
function importRows(rows,form,since){
  rows=(rows||[]).map(r=>(r||[]).map(c=>c==null?'':String(c))).filter(r=>r.some(c=>c.trim()));if(rows.length<2)return 'Paste the header row and at least one response row.';
  const h=rows[0].map(x=>x.trim());const col={};
  ['at','ug','level','avail','stay','phone','g','age','name','country'].forEach(k=>{const re=HDR[k];const i=h.findIndex((x,j)=>re.test(x)&&!Object.values(col).includes(j));if(i>=0)col[k]=i;});
  let added=0,skipped=0;
  rows.slice(1).forEach(r=>{
    const used=Object.values(col);const extra={};h.forEach((k,i)=>{if(k&&!used.includes(i)&&r[i]&&r[i].trim())extra[k]=r[i].trim();});
    const gv=k=>col[k]!=null?(r[col[k]]||'').trim():'';
    const g=col.g!=null?(r[col.g]||''):'';const cs=col.country!=null?(r[col.country]||''):'';
    const d={name:col.name!=null?(r[col.name]||'').trim():'',age:col.age!=null?((r[col.age]||'').match(/\d+/)||[''])[0]:'',
      g:/qız|kız|kiz|girl|female|قىز/i.test(g)?'F':/erkek|oğlan|boy|male|ئوغۇل/i.test(g)?'M':'',
      country:(CMAP.find(([re])=>re.test(cs))||[0,''])[1],phone:gv('phone'),avail:gv('avail'),level:gv('level'),ug:gv('ug'),stay:gv('stay'),countryText:cs.trim()};
    const at=col.at!=null?(r[col.at]||'').trim():'';
    if(since){const t=stampDate(at);if(t&&t<since){skipped++;return;}}
    const key=form+'|'+at+'|'+d.name;
    if(REGS.some(x=>x.key===key)){skipped++;return;}
    REGS.push({id:'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),key,form,at,d,extra,state:'pending'});added++;});
  saveStu();
  return added+' added, '+skipped+' skipped.';
}
/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;const d=t.dataset;let ch=true;
  if(d.stOpen){SS.sel=SS.sel===d.stOpen?null:d.stOpen;SS.arm=null;}
  else if(d.stNew){SS.edit='new';SS.msg='';}
  else if(d.stEdit){SS.edit=d.stEdit;SS.msg='';}
  else if(d.stCancel){SS.edit=null;SS.msg='';}
  else if(d.stSave){const o=readForm('sf');if(!o.name){SS.msg='Enter the student\'s name before saving.';render();return;}
    if(SS.edit==='new'){const s=applyForm({id:'s'+Date.now().toString(36),no:'',status:'active',src:'manual'},o);STU.push(s);SS.sel=s.id;}
    else{applyForm(STU.find(x=>x.id===SS.edit),o);SS.sel=SS.edit;}
    saveStu();SS.edit=null;SS.msg='Student saved.';}
  else if(d.stLeft){STU.find(x=>x.id===d.stLeft).status='left';saveStu();}
  else if(d.stBack){STU.find(x=>x.id===d.stBack).status='active';saveStu();}
  else if(d.stDel){SS.arm=d.stDel;}
  else if(d.stDelyes){STU=STU.filter(x=>x.id!==d.stDelyes);saveStu();SS.sel=null;SS.arm=null;SS.msg='Student deleted.';}
  else if(d.stReset){if(!t.dataset.sure){t.textContent='Click again to confirm';t.dataset.sure=1;return;}STU=clone(SEED_STUDENTS);REGS=[];saveStu();SS.msg='';}
  else if(d.copy){const inp=$('#link-'+d.copy);const v=inp.value;
    const ok=()=>{t.textContent='Copied';};const fb=()=>{inp.focus();inp.select();t.textContent='Link selected, press copy';};
    try{navigator.clipboard.writeText(v).then(ok,fb);}catch(err){fb();}return;}
  else if(d.slLoad){slLoad();return;}
  else if(d.rgSheet){rsLoad(d.rgSheet);return;}
  else if(d.rgImport){RG.pform=$('#pform').value;const txt=$('#ppaste').value;RG.msg=importPaste(txt,RG.pform);RG.paste='';}
  else if(d.rgHand){const r={id:'r'+Date.now().toString(36),key:'hand|'+Date.now(),form:'hand',at:new Date().toISOString(),d:{},extra:{},state:'new'};REGS.push(r);RG.id=r.id;RG.msg='';RG.arm=null;}
  else if(d.rgOpen){RG.id=d.rgOpen;RG.msg='';RG.arm=null;}
  else if(d.rgBack){const r=REGS.find(x=>x.id===RG.id);if(r&&r.state==='new')REGS=REGS.filter(x=>x!==r);RG.id=null;RG.msg='';RG.arm=null;saveStu();}
  else if(d.rgApprove){const r=REGS.find(x=>x.id===RG.id);const o=readForm('rf');
    if(!o.name){RG.msg='Enter the student\'s name before approving.';render();return;}
    const s=applyForm({id:'s'+Date.now().toString(36),no:'',status:'active',src:'form',start:new Date().toISOString().slice(0,10),reg:{form:r.form,at:r.at,extra:Object.assign({},r.extra,r.d.avail?{'Available times':r.d.avail}:{},r.d.level?{'Current English level':r.d.level}:{},r.d.ug?{'Uyghur language level':r.d.ug}:{},r.d.stay?{'Plans to study for':r.d.stay}:{})}},o);
    STU.push(s);r.d=Object.assign(r.d,o);r.state='approved';r.decidedAt=new Date().toISOString();r.note=($('#rgNote')||{}).value||'';r.sid=s.id;
    saveStu();RG.id=null;RG.msg=(o.name)+' was approved and added to the student list.';}
  else if(d.rgRej){RG.arm='rej';}
  else if(d.rgRejyes){const r=REGS.find(x=>x.id===RG.id);r.d=Object.assign(r.d,readForm('rf'));r.state='rejected';r.decidedAt=new Date().toISOString();r.note=($('#rgNote')||{}).value||'';saveStu();RG.id=null;RG.arm=null;RG.msg='Registration rejected.';}
  else ch=false;
  if(ch)render();
});
document.addEventListener('input',e=>{if(e.target.id==='stuQ'){SS.q=e.target.value;const p=e.target.selectionStart;render();const n=$('#stuQ');if(n){n.focus();try{n.setSelectionRange(p,p);}catch(x){}}}
  else if(e.target.id==='ppaste')RG.paste=e.target.value;
  else if(e.target.id==='slUrl'){SL.url=e.target.value;SL.tabs=null;}
  else if(e.target.dataset&&e.target.dataset.rsheet){RS_LINKS[e.target.dataset.rsheet]=e.target.value.trim();try{localStorage.setItem(RS_KEY,JSON.stringify(RS_LINKS));}catch(x){}}});
document.addEventListener('change',e=>{const d=e.target.dataset;if(d.ss){SS[d.ss]=e.target.value;SS.sel=null;render();}else if(e.target.id==='pform')RG.pform=e.target.value;else if(e.target.id==='slTab')SL.tab=e.target.value;else if(e.target.id==='rsSince')RG.since=e.target.value;});

/* hook into navigation */
TABS.splice(1,0,['regq','Registrations'],['stu','Students']);
TTABS.splice(1,0,['stu','My students']);
SCREENS.stu=stuScreen;SCREENS.regq=regScreenNew;TSCREENS.stu=stuScreen;
const _dash=SCREENS.dash;
SCREENS.dash=function(){const h=_dash();const n=REGS.filter(r=>r.state==='pending').length;
  return h.replace('<ul class="clean">',`<ul class="clean"><li>${n} registration${n===1?' is':'s are'} waiting for approval. <a href="#" data-go="regq">Open registrations</a></li>`);};
