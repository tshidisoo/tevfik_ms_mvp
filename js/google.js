/* ===== GOOGLE SIGN-IN + DRIVE/SHEETS (read-only) =====
   Uses Google Identity Services in the browser. The access token lives in memory only,
   for about an hour, and is never stored or sent anywhere except Google's own APIs. */
const G_SCOPES='https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly';
const GCID_KEY='tevfik-google-client-id';
const G={token:null,exp:0,client:null,pending:null};
function gClientId(){const c=(window.TEVFIK_CONFIG&&window.TEVFIK_CONFIG.googleClientId)||'';if(c)return c;try{return localStorage.getItem(GCID_KEY)||'';}catch(e){return '';}}
function gSetClientId(v){try{v?localStorage.setItem(GCID_KEY,v.trim()):localStorage.removeItem(GCID_KEY);}catch(e){}G.client=null;G.token=null;}
const gReady=()=>!!(window.google&&google.accounts&&google.accounts.oauth2);
const gSignedIn=()=>!!(G.token&&Date.now()<G.exp-60000);
function gToken(){
  if(gSignedIn())return Promise.resolve(G.token);
  if(G.pending)return G.pending;
  const id=gClientId();
  if(!id)return Promise.reject({code:'no_client'});
  if(!gReady())return Promise.reject({code:'gis_not_loaded'});
  G.pending=new Promise((res,rej)=>{
    try{
      G.client=G.client||google.accounts.oauth2.initTokenClient({client_id:id,scope:G_SCOPES,callback:()=>{}});
      G.client.callback=r=>{G.pending=null;if(r&&r.error)return rej({code:'denied',message:r.error});
        G.token=r.access_token;G.exp=Date.now()+(+r.expires_in||3600)*1000;res(G.token);if(typeof chrome==='function')chrome();};
      G.client.error_callback=e=>{G.pending=null;rej({code:e&&e.type==='popup_closed'?'popup_closed':e&&e.type==='popup_failed_to_open'?'popup_blocked':'denied',message:e&&e.type});};
      G.client.requestAccessToken({prompt:''});
    }catch(e){G.pending=null;rej({code:'denied',message:String(e&&e.message||e)});}
  });
  return G.pending;
}
function gSignOut(){try{if(G.token&&gReady())google.accounts.oauth2.revoke(G.token,()=>{});}catch(e){}G.token=null;G.exp=0;}
async function gFetch(url,again){
  const t=await gToken();
  let r;try{r=await fetch(url,{headers:{Authorization:'Bearer '+t}});}catch(e){throw {code:'server_unavailable',retryable:true,message:'network'};}
  if(r.status===401&&!again){G.token=null;return gFetch(url,true);}
  if(!r.ok){let m='';try{m=(await r.json()).error.message;}catch(e){}
    const code=r.status===403&&/not been used|disabled/i.test(m)?'api_disabled':(r.status===403||r.status===404)?'tool_error':(r.status===429||r.status>=500)?'server_unavailable':'upstream_error';
    throw {code,status:r.status,message:m,retryable:code==='server_unavailable'};}
  return r.json();
}
/* Same shapes the sync code was written against (search_files / get_file_metadata / get_values). */
async function gCall(tool,i){
  if(tool==='search_files'){
    const id=(i.query.match(/'([^']+)'/)||[])[1];
    const q=encodeURIComponent("'"+id+"' in parents and trashed = false");
    const u='https://www.googleapis.com/drive/v3/files?q='+q+'&pageSize=1000&fields=nextPageToken,files(id,name,mimeType,createdTime,modifiedTime)&supportsAllDrives=true&includeItemsFromAllDrives=true'+(i.pageToken?'&pageToken='+encodeURIComponent(i.pageToken):'');
    const r=await gFetch(u);return {files:(r.files||[]).map(f=>Object.assign({title:f.name},f)),nextPageToken:r.nextPageToken};
  }
  if(tool==='get_file_metadata'){const r=await gFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(i.fileId)+'?fields=id,name,mimeType&supportsAllDrives=true');return Object.assign({title:r.name},r);}
  if(tool==='get_values'){const r=await gFetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(i.spreadsheetId)+'/values/'+encodeURIComponent(i.range)+'?valueRenderOption=FORMATTED_VALUE');return {values:r.values||[]};}
  if(tool==='sheet_tabs'){const r=await gFetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(i.spreadsheetId)+'?fields=properties.title,sheets.properties.title');return {title:r.properties&&r.properties.title,tabs:(r.sheets||[]).map(s=>s.properties.title)};}
  throw {code:'bad_request'};
}
const sheetIdOf=s=>{s=(s||'').trim();const m=s.match(/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/)||s.match(/^([A-Za-z0-9_-]{20,})$/);return m?m[1]:null;};
function gErrText(e){const c=e&&e.code;
  if(c==='no_client')return 'Google sign-in is not set up yet. Add the Google client ID in the Google connection box on the Sync from Drive page.';
  if(c==='gis_not_loaded')return 'Google sign-in did not load. Check the internet connection and reload the page.';
  if(c==='popup_closed')return 'The Google sign-in window was closed before finishing. Try again and complete the sign-in.';
  if(c==='popup_blocked')return 'The browser blocked the Google sign-in window. Allow pop-ups for this site and try again.';
  if(c==='denied')return 'Google sign-in was not completed. Try again and allow read-only access to Drive and Sheets.';
  if(c==='api_disabled')return 'The Google Drive API or Google Sheets API is not turned on in the Google Cloud project. Turn on both, then try again.';
  if(c==='tool_error')return 'Google refused access to that file or folder. Check the link and that it is shared with the signed-in account.';
  if(c==='server_unavailable')return 'Google did not answer. Wait a moment and try again.';
  return 'Google returned an error'+(e&&e.message?': '+String(e.message).slice(0,160):'.');}
