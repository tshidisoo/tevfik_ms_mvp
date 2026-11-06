/* ===== SYNC FROM DRIVE =====
   The admin pastes a Drive folder link and signs in with Google (read-only). The page reads
   teacher folder > class folder > month folder ("October 2026") > register sheet +
   lesson-plan docs "F4-05 (30/10/2026)" + MLR folder, at any depth up to 4. */
const GD='Google Drive',GS='Google Sheets';
const SYNC_KEY='tevfik-drive-v1';
const MONTH_RX=[/jan|ocak|يانۋار/i,/feb|şubat|subat|فېۋرال/i,/mar|mart|مارت/i,/apr|nisan|ئاپرېل/i,/may|mayıs|ماي/i,/jun|haziran|ئىيۇن/i,/jul|temmuz|ئىيۇل/i,/aug|ağustos|agustos|ئاۋغۇست/i,/sep|eylül|eylul|سېنتەبىر/i,/oct|ekim|ئۆكتەبىر/i,/nov|kasım|kasim|نويابىر/i,/dec|aralık|aralik|دېكابىر/i];
const MNAME=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DS={open:false,url:'',months:null,busy:false,log:[],warn:[],result:null,err:null,conn:null,abort:false};
function monthOfTitle(t){for(let i=0;i<12;i++)if(MONTH_RX[i].test(t)){const y=(t.match(/20\d\d/)||[])[0];return {m:i+1,y:y?+y:null};}return null;}
function folderIdOf(s){s=(s||'').trim();const m=s.match(/folders\/([A-Za-z0-9_-]{10,})/)||s.match(/[?&]id=([A-Za-z0-9_-]{10,})/)||s.match(/^([A-Za-z0-9_-]{20,})$/);return m?m[1]:null;}
const pad=n=>String(n).padStart(2,'0');
function syncMonthsChoice(){const now=new Date(),out=[];for(let k=3;k>=0;k--){const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-k,1));out.push(d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1));}return out;}
const mLabel=k=>MNAME[+k.slice(5)-1]+' '+k.slice(0,4);

/* ---------- register parser (pure: rows from Sheets -> class + lessons) ---------- */
function parseDate(s){const m=String(s||'').match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);return m?m[3]+'-'+pad(m[2])+'-'+pad(m[1]):null;}
function parsePres(v){v=String(v??'').trim();if(!v)return undefined;if(/^(true|1|✓|p|present|var|كەلدى)$/i.test(v))return 1;if(/^(l|late|geç|gec|كېچىك)/i.test(v))return 'L';if(/^(false|0|a|absent|yok)$/i.test(v))return 0;return undefined;}
function parseHw(v,present){v=String(v??'').trim();const m=v.match(/(\d+(?:[.,]\d+)?)\s*%?/);
  if(/not given|^ng$|verilmedi|بېرىلمى/i.test(v))return NG;if(/not sub|^ns$|teslim edilmedi|تاپشۇرۇلمى/i.test(v))return NS;
  if(m&&v!=='')return Math.round(parseFloat(m[1].replace(',','.'))*100)/100;return present?NS:null;}
function parseRegister(rows,today){
  const cell=(r,c)=>String((rows[r]||[])[c]??'').trim();
  const out={className:cell(0,2),teacher:cell(1,2),month:cell(0,8),students:[],lessons:[],warn:[]};
  const per={};// date -> {pres:{name:v},hw:{name:v},note}
  for(let r=0;r<rows.length;r++){
    if(!/^week/i.test(cell(r,2)))continue;
    const dr=r+1;const slots=[];
    for(let c=2;c<Math.max(12,(rows[dr]||[]).length);c+=2){const d=parseDate(cell(dr,c));if(d)slots.push({c,d});}
    for(let s=r+3;s<rows.length;s++){
      if(cell(s,0).toLowerCase()==='no'||/^week/i.test(cell(s,2)))break;
      const name=cell(s,1);if(!name)continue;
      if(!out.students.includes(name))out.students.push(name);
      const note=cell(s,8);
      slots.forEach(({c,d})=>{const p=parsePres((rows[s]||[])[c]);const h=(rows[s]||[])[c+1];
        const L=per[d]=per[d]||{pres:{},hw:{},note:''};if(note)L.note+=' '+note;
        if(p!==undefined){L.pres[name]=p;L.hw[name]=parseHw(h,p!==0);}});
    }
  }
  Object.keys(per).sort().forEach(d=>{
    if(today&&d>today)return;const L=per[d];const vals=Object.values(L.pres);if(!vals.length)return;
    const any=vals.some(v=>v===1||v==='L');
    const st=any?'taught':(/cancel|iptal|ئەمەلدىن/i.test(L.note)?'cancel':'noshow');
    out.lessons.push({d,status:st,pres:L.pres,hw:L.hw});
  });
  if(!out.students.length)out.warn.push('no student rows found');
  return out;
}

/* ---------- connector calls ---------- */
function errText(e){return gErrText(e);}
async function call(server,tool,input,tries){
  try{return await gCall(tool,input);}
  catch(e){if(e&&e.retryable&&!(tries>0)){await new Promise(r=>setTimeout(r,800+Math.random()*600));return call(server,tool,input,1);}throw e;}}
async function listFolder(id){
  const files=[];let token=null,guard=0;
  do{const p=await call(GD,'search_files',Object.assign({query:"parentId = '"+id+"' and trashed = false",pageSize:100,excludeContentSnippets:true},token?{pageToken:token}:{}));
    (p&&p.files||[]).forEach(f=>files.push(f));token=p&&p.nextPageToken;}while(token&&++guard<20);
  return files;}
async function pool(items,n,fn){let i=0;const run=async()=>{while(i<items.length&&!DS.abort){const k=i++;await fn(items[k],k);}};await Promise.all(Array.from({length:Math.min(n,items.length)},run));}

/* ---------- crawl ---------- */
const FOLDER='application/vnd.google-apps.folder',SHEET='application/vnd.google-apps.spreadsheet',DOC='application/vnd.google-apps.document';
async function runSync(){
  DS.busy=true;DS.err=null;DS.log=[];DS.warn=[];DS.result=null;DS.abort=false;renderSync();
  const id=folderIdOf(DS.url);if(!id){DS.err='Paste a Google Drive folder link, for example https://drive.google.com/drive/folders/…';DS.busy=false;renderSync();return;}
  try{await gToken();}catch(e){DS.err=gErrText(e);DS.busy=false;renderSync();return;}
  const want=new Set(DS.months);const today=new Date().toISOString().slice(0,10);
  const log=t=>{DS.log.push(t);renderSync();};
  let root;
  try{root=await call(GD,'get_file_metadata',{fileId:id,excludeContentSnippets:true});}
  catch(e){DS.err=e&&e.code==='tool_error'?'That folder could not be opened with your Google account. Check the link and that the folder is shared with you.':errText(e);DS.busy=false;renderSync();return;}
  if(root&&root.mimeType&&root.mimeType!==FOLDER){DS.err='That link is a file, not a folder. Paste the link of the folder that holds the teacher folders.';DS.busy=false;renderSync();return;}
  log('Reading folder: '+(root&&root.title||id));
  const regs=[],docs=[],mlrs=[];let folders=0;
  // queue item: {id,title,depth,cls:{id,title}|null,mon:'YYYY-MM'|null,teacherTitle}
  const rt=root&&root.title||'';let level=[{id,title:rt,depth:0,cls:{id,title:rt,teacher:''},mon:null,parentTitle:''}];
  try{
  while(level.length&&!DS.abort){
    const next=[];
    await pool(level,4,async(f)=>{
      const kids=await listFolder(f.id);folders++;
      kids.forEach(k=>{
        if(k.mimeType===FOLDER){
          if(/mlr/i.test(k.title)){if(f.mon)mlrs.push({cls:f.cls,mon:f.mon,at:k.modifiedTime});return;}
          const mo=monthOfTitle(k.title);
          if(mo&&f.cls){const y=mo.y||+(k.createdTime||'').slice(0,4)||new Date().getUTCFullYear();const key=y+'-'+pad(mo.m);
            if(want.has(key))next.push({id:k.id,title:k.title,depth:f.depth+1,cls:f.cls,mon:key,parentTitle:f.title});return;}
          if(f.depth<4&&!f.mon)next.push({id:k.id,title:k.title,depth:f.depth+1,cls:{id:k.id,title:k.title,teacher:f.title},mon:null,parentTitle:f.title});
        }else if(k.mimeType===SHEET&&/regist/i.test(k.title)&&f.cls){regs.push({file:k,cls:f.cls,mon:f.mon});}
        else if(k.mimeType===DOC&&f.cls){const d=parseDate((k.title.match(/\(([^)]*)\)/)||[])[1]);if(d)docs.push({file:k,cls:f.cls,d});}
      });
    });
    level=next;if(folders>700){DS.warn.push('Stopped after 700 folders. Paste a smaller folder to sync the rest.');break;}
    log(folders+' folders read, '+regs.length+' registers and '+docs.length+' lesson-plan docs found');
  }}catch(e){DS.err=errText(e);DS.busy=false;renderSync();return;}
  const inMonth=regs.filter(r=>r.mon?want.has(r.mon):true);
  if(!inMonth.length){DS.err='No registers were found for the chosen months. Check that the link is the folder above the teacher or class folders.';DS.busy=false;renderSync();return;}
  log('Reading '+inMonth.length+' registers…');
  const parsed=[];let done=0;
  try{
  await pool(inMonth,3,async(r)=>{
    try{const p=await call(GS,'get_values',{spreadsheetId:r.file.id,range:'A1:AD200'});
      const reg=parseRegister((p&&p.values)||[],today);reg.cls=r.cls;reg.fileTitle=r.file.title;reg.mon=r.mon;
      reg.lessons=reg.lessons.filter(l=>want.has(l.d.slice(0,7)));
      if(reg.warn.length)DS.warn.push(r.cls.title+': '+reg.warn.join(', '));else parsed.push(reg);}
    catch(e){if(e&&e.code==='tool_error')DS.warn.push(r.cls.title+': register could not be read');else throw e;}
    if(++done%5===0)log('Registers read: '+done+' of '+inMonth.length);
  });}catch(e){DS.err=errText(e);DS.busy=false;renderSync();return;}
  const data={at:new Date().toISOString(),folder:root&&root.title||id,folderId:id,months:[...want],regs:parsed,
    docs:docs.map(x=>({cls:x.cls.id,d:x.d,c:x.file.createdTime,m:x.file.modifiedTime})),mlrs:mlrs.map(x=>({cls:x.cls&&x.cls.id,mon:x.mon,at:x.at})),warn:DS.warn.slice(0,50)};
  try{localStorage.setItem(SYNC_KEY,JSON.stringify(data));}catch(e){}
  DS.result=applySync(data);DS.busy=false;S0.synced=fmtSyncedAt(data);save();renderSync();
}
const fmtSyncedAt=d=>new Date(d.at).toISOString().slice(0,16).replace('T',' ')+' UTC, '+d.regs.length+' registers from '+d.folder;

/* ---------- apply synced data onto the model ---------- */
const BASE_CLASSES=CLASSES.map(c=>({c,L:c.L.slice(),students:c.students.slice()}));
const BASE_MONTHS=MONTHS.slice();
const BASE_MLR=JSON.parse(JSON.stringify(MLR));const BASE_T=Object.keys(TEACHERS);
const norm=s=>String(s||'').toLowerCase().replace(/^(mr|mrs|ms|miss)\.?\s+/,'').replace(/[^a-zçğıöşüəäëï؀-ۿ]+/g,' ').trim();
function teacherIdFor(name,folderTitle){
  const n=norm(name),f=norm(folderTitle);
  for(const t of Object.values(TEACHERS)){const a=norm(t.name),b=norm(t.full);if(n&&(n===a||n===b||b.includes(n)||n.includes(a)))return t.id;if(f&&(f===a||f===b||b.includes(f)))return t.id;}
  const id='T'+Math.abs([...(n||f)].reduce((h,c)=>(h*31+c.charCodeAt(0))|0,7)).toString(36);
  if(!TEACHERS[id]){const nm=(name||folderTitle||'Teacher').replace(/\b\w/g,c=>c.toUpperCase());TEACHERS[id]={id,name:nm,full:nm,note:'Added by Drive sync.'};}
  return id;}
const stampOfIso=iso=>iso?iso.slice(0,16):null;
function applySync(data){
  // reset to the embedded snapshot, then lay the synced months over it
  CLASSES.length=0;BASE_CLASSES.forEach(b=>{b.c.L=b.L.slice();b.c.students=b.students.slice();CLASSES.push(b.c);});
  MONTHS.length=0;BASE_MONTHS.forEach(m=>MONTHS.push(m));
  Object.keys(MLR).forEach(k=>delete MLR[k]);Object.assign(MLR,JSON.parse(JSON.stringify(BASE_MLR)));
  Object.keys(TEACHERS).forEach(k=>{if(!BASE_T.includes(k))delete TEACHERS[k];});if(!TEACHERS[S0.tid])S0.tid=BASE_T[0]||'';
  const summary={teachers:new Set(),classes:0,newClasses:0,lessons:0,stamps:0,mlr:0};
  const byFolder={};
  data.regs.forEach(reg=>{
    const tid=teacherIdFor(reg.teacher,reg.cls.teacher);summary.teachers.add(tid);
    const names=reg.students.map(s=>s.toLowerCase());
    let c=byFolder[reg.cls.id]||CLASSES.find(x=>x.teacher===tid&&x.students.some(s=>names.includes(s.toLowerCase())));
    if(!c){c={id:'D'+reg.cls.id.slice(-6),name:reg.className||reg.cls.title,teacher:tid,subject:'English',students:reg.students.slice(),L:[]};CLASSES.push(c);summary.newClasses++;}
    byFolder[reg.cls.id]=c;
    reg.students.forEach(s=>{if(!c.students.some(x=>x.toLowerCase()===s.toLowerCase()))c.students.push(s);});
    const idx=c.students.map(s=>reg.students.find(x=>x.toLowerCase()===s.toLowerCase()));
    const months=new Set(reg.lessons.map(l=>l.d.slice(0,7)));if(reg.mon)months.add(reg.mon);
    c.L=c.L.filter(l=>!months.has(l.d.slice(0,7)));
    reg.lessons.forEach(l=>{
      const pres=idx.map(n=>n&&l.pres[n]!==undefined?l.pres[n]:undefined),hw=idx.map(n=>n&&l.hw[n]!==undefined?l.hw[n]:null);
      c.L.push({d:l.d,pres,hw,pc:null,sm:null,mv:null,status:l.status});summary.lessons++;});
    c.L.sort((a,b)=>a.d<b.d?-1:1);
    months.forEach(m=>{if(!MONTHS.some(x=>x[0]===m))MONTHS.push([m,mLabel(m)]);});
  });
  summary.classes=Object.keys(byFolder).length;
  data.docs.forEach(x=>{const c=byFolder[x.cls];if(!c)return;const l=c.L.find(l=>l.d===x.d);if(l){l.pc=stampOfIso(x.c);l.sm=stampOfIso(x.m);summary.stamps++;}});
  data.mlrs.forEach(x=>{const c=byFolder[x.cls];if(!c||!x.mon)return;const [y,m]=x.mon.split('-').map(Number);
    const due=new Date(Date.UTC(y,m,7)).toISOString();const k=c.teacher+'|'+x.mon;
    const st=x.at&&x.at<due?'On time':'Late';if(!MLR[k]||MLR[k].state!=='Late')MLR[k]={state:st,note:'From the MLR folder date in Drive'};summary.mlr++;});
  MONTHS.sort((a,b)=>a[0]<b[0]?-1:1);
  if(!MONTHS.some(m=>m[0]===S0.m))S0.m=MONTHS[MONTHS.length-1][0];
  summary.teachers=summary.teachers.size;if(!TEACHERS[S0.tid])S0.tid=Object.keys(TEACHERS)[0]||'';
  return summary;
}
function clearSync(){try{localStorage.removeItem(SYNC_KEY);}catch(e){}applySync({regs:[],docs:[],mlrs:[]});S0.synced=null;save();DS.result=null;}

/* ---------- view ---------- */
function syncView(){
  if(!DS.months){const ch=syncMonthsChoice();DS.months=[ch.includes(S0.m)?S0.m:ch[ch.length-1]];}
  const last=(()=>{try{return JSON.parse(localStorage.getItem(SYNC_KEY)||'null');}catch(e){return null;}})();
  const R=DS.result;
  return `<div class="row between"><h2>Sync from Drive</h2><button data-sync-close="1">Back</button></div>
  <p class="mut">Paste the link of the Google Drive folder that holds the teacher folders, or one teacher's or one class's folder. The page reads it with your own Google account and rebuilds registers, payroll, reports and performance from it.</p>
  <div class="card"><div class="fgrid" style="grid-template-columns:1fr">
   <label class="fld">Drive folder link<input type="url" id="syncUrl" value="${E(DS.url)}" placeholder="https://drive.google.com/drive/folders/…" ${DS.busy?'disabled':''}></label></div>
   <div class="small mut" style="margin-top:10px">Months to read</div>
   <div class="row" style="margin-top:4px">${syncMonthsChoice().map(k=>`<label class="row" style="gap:6px"><input type="checkbox" id="sm-${k}" data-sm="${k}" ${DS.months.includes(k)?'checked':''} ${DS.busy?'disabled':''}> ${mLabel(k)}</label>`).join('')}</div>
   <div class="row" style="margin-top:12px">${DS.busy?'<button data-sync-stop="1">Stop</button>':'<button class="pri" data-sync-go="1">Start sync</button>'}
   ${last&&!DS.busy?'<button data-sync-clear="1">'+(DS.armClear?'Click again to confirm':'Remove synced data')+'</button>':''}</div></div>
  ${DS.err?`<div class="note">${E(DS.err)}</div>`:''}
  ${DS.log.length?`<div class="card"><h3>${DS.busy?'Syncing…':'Sync log'}</h3><ul class="clean small">${DS.log.slice(-6).map(t=>`<li>${E(t)}</li>`).join('')}</ul></div>`:''}
  ${R?`<div class="grid">
   <div class="card kpi"><div class="l">Teachers</div><div class="v">${R.teachers}</div></div>
   <div class="card kpi"><div class="l">Classes</div><div class="v">${R.classes}</div><div class="mut small">${R.newClasses} new to the system</div></div>
   <div class="card kpi"><div class="l">Lessons read</div><div class="v">${R.lessons}</div></div>
   <div class="card kpi"><div class="l">Plan timestamps</div><div class="v">${R.stamps}</div><div class="mut small">${R.mlr} MLR folders</div></div></div>
   <div class="row"><button class="pri" data-sync-done="1">See the dashboard</button></div>`:''}
  ${DS.warn.length?`<details class="card"><summary><b>${DS.warn.length} files need a look</b></summary><ul class="clean small">${DS.warn.map(w=>`<li data-notr dir="auto">${E(w)}</li>`).join('')}</ul></details>`:''}
  ${last&&!DS.busy&&!R?`<div class="banner">Last sync: ${E(fmtSyncedAt(last))}. Months: ${last.months.map(mLabel).join(', ')}.</div>`:''}
  ${gCard()}
  <div class="banner">Start sync asks you to sign in with Google and allow read-only access to Drive and Sheets. Nothing is changed in Drive. Synced data is saved in this browser only.</div>`;
}
function gCard(){const fixed=!!(window.TEVFIK_CONFIG&&TEVFIK_CONFIG.googleClientId);const id=gClientId();
  return `<div class="card"><h3>Google connection</h3>
   ${id?`<p class="small mut">${gSignedIn()?'Signed in to Google in this tab. The sign-in lasts about an hour.':'Not signed in yet. Start sync opens the Google sign-in window.'}</p>
     <div class="row">${gSignedIn()?'<button data-g-out="1">Sign out of Google</button>':''}${fixed?'':'<button data-g-clear="1">Change client ID</button>'}</div>`
   :`<p class="small">Google sign-in needs this site's OAuth client ID from Google Cloud. Paste it here, or put it in js/config.js for everyone.</p>
     <div class="row"><input type="text" id="gcid" placeholder="1234567890-abc.apps.googleusercontent.com" aria-label="Google client ID" style="flex:1;min-width:220px"><button class="pri" data-g-save="1">Save client ID</button></div>`}</div>`;}
function renderSync(){if(DS.open){chrome();$('#view').innerHTML=syncView();}}
const _renderBase=render;
render=function(){if(DS.open){renderSync();return;}_renderBase();};
document.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;const d=t.dataset;
  if(d.t||d.r){DS.open=false;DS.abort=true;}
  if(d.gSave){gSetClientId(($('#gcid')||{}).value||'');renderSync();return;}
  if(d.gClear){gSetClientId('');renderSync();return;}
  if(d.gOut){gSignOut();renderSync();return;}
  if(t.id==='syncBtn'||d.openSync){e.stopImmediatePropagation();DS.open=true;DS.err=null;DS.result=null;DS.log=[];DS.warn=[];renderSync();return;}
  if(d.syncClose||d.syncDone){DS.open=false;DS.abort=true;render();}
  else if(d.syncGo){DS.url=$('#syncUrl').value;runSync();}
  else if(d.syncStop){DS.abort=true;DS.log.push('Stopping…');renderSync();}
  else if(d.syncClear){if(!DS.armClear){DS.armClear=true;renderSync();return;}DS.armClear=false;clearSync();renderSync();}
},true);
document.addEventListener('change',e=>{const k=e.target.dataset&&e.target.dataset.sm;if(!k)return;
  DS.months=DS.months.filter(x=>x!==k);if(e.target.checked)DS.months.push(k);DS.months.sort();});
document.addEventListener('input',e=>{if(e.target.id==='syncUrl')DS.url=e.target.value;});
/* re-apply the last sync on load */
(function(){try{const d=JSON.parse(localStorage.getItem(SYNC_KEY)||'null');if(d&&d.regs){applySync(d);render();}}catch(e){}})();
