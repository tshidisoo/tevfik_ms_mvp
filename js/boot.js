/* ===== START-UP: welcome screen until data has been synced ===== */
function welcomeView(){
  return `<div class="card" style="max-width:720px"><h2>Welcome</h2>
  <p>No school data is loaded in this browser yet. Everything comes from Google Drive, read with your own Google account.</p>
  <ol class="clean" style="display:flex;flex-direction:column;gap:6px;margin:10px 0">
   <li>Click Sync from Drive, paste the link of the folder that holds the teacher folders, and sign in with Google.</li>
   <li>Open Students and load the student list sheet.</li>
   <li>Open Registrations to send the form links and load new form responses.</li></ol>
  <div class="row"><button class="pri" data-open-sync="1">Sync from Drive</button><a class="btnl" href="#" data-go="stu">Students</a><a class="btnl" href="#" data-go="regq">Registrations</a></div></div>`;}
const _renderApp=render;
render=function(){
  if(!CLASSES.length&&!DS.open&&!doc){
    if(S0.role==='teacher'){S0.role='admin';S0.tab='dash';}
    if(S0.role==='admin'&&!['regq','stu'].includes(S0.tab)){chrome();$('#view').innerHTML=welcomeView();return;}}
  _renderApp();};
render();
