/* ============ Sauvegarde ============ */
let backupMsg='';
/* Sous l'état de l'enregistrement : quand la dernière sauvegarde a eu lieu, et le bouton pour la mettre dans un dossier Cloud */
function majSauvegardeEntete(){
  const b=$('#cloudBtn'), l=$('#lastbk'); if(!b||!l) return;
  b.hidden=!!demo; l.hidden=!!demo;
  const t=typeof S!=='undefined'&&S&&S.lastBackup;
  l.textContent=t?'Dernière sauvegarde : '+new Date(t).toLocaleDateString('fr-FR'):'Jamais sauvegardé';
}
/* Chrome et Edge sur ordinateur : on choisit directement le dossier (Google Drive, iCloud, Dropbox…). Ailleurs, le fichier est téléchargé. */
async function sauvegardeCloud(){
  const data=JSON.stringify({app:SAL?'mon-compte':'mes-comptes',version:1,date:new Date().toISOString(),data:S});
  const name=`${SAL?'mon-compte':'mes-comptes'}-sauvegarde-${new Date().toISOString().slice(0,10)}.json`;
  if(window.showSaveFilePicker){
    try{
      const h=await showSaveFilePicker({suggestedName:name,types:[{description:'Sauvegarde',accept:{'application/json':['.json']}}]});
      const w=await h.createWritable(); await w.write(data); await w.close();
      S.lastBackup=Date.now(); save(); backupMsg='Sauvegarde enregistrée dans le dossier choisi ✓'; majSauvegardeEntete(); alert(backupMsg); if(view==='reglages') render(); return;
    }catch(e){ if(e&&e.name==='AbortError') return; }
  }
  await backup_();
  alert('Sauvegarde téléchargée. Déposez maintenant ce fichier dans votre dossier Cloud (Google Drive, iCloud, Dropbox…).');
}
async function backup_(){
  const data=JSON.stringify({app:SAL?'mon-compte':'mes-comptes',version:1,date:new Date().toISOString(),data:S});
  const name=`${SAL?'mon-compte':'mes-comptes'}-sauvegarde-${new Date().toISOString().slice(0,10)}.json`;
  try{
    const dl=window.claude&&claude.use?await claude.use('downloads'):null;
    if(dl){await dl.save({filename:name,data});S.lastBackup=Date.now();save();backupMsg='Sauvegarde enregistrée.';render();return}
  }catch(e){backupMsg='Sauvegarde annulée.';render();return}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove();
  S.lastBackup=Date.now();save();backupMsg='Sauvegarde téléchargée. Gardez ce fichier en lieu sûr.';majSauvegardeEntete();render();
}
async function restore_(file){
  try{
    const j=JSON.parse(await file.text());
    if(j.app!==(SAL?'mon-compte':'mes-comptes')||!j.data) throw 0;
    if(!confirm('Remplacer toutes vos données actuelles par cette sauvegarde ?')) return;
    if(demo) exitDemo();
    S.ops.forEach(o=>dirtyMonths.add(o.date.slice(0,7)));
    S=merge(j.data); S.ops.forEach(o=>dirtyMonths.add(o.date.slice(0,7)));
    backupMsg=`Sauvegarde du ${new Date(j.date).toLocaleDateString('fr-FR')} restaurée.`; P=null; save(); render();
  }catch(e){backupMsg='Ce fichier n’est pas une sauvegarde de '+(SAL?'Mon compte':'Mes comptes')+'.';render()}
}

let readerMsg='', readerErr=false;
function copyText(txt,btn,okMsg){
  const done=ok=>{btn.textContent=ok?okMsg:'Copie impossible ici : sélectionnez le texte à la main'};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>done(true),()=>fallback());}else fallback();
  function fallback(){const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}ta.remove();done(ok)}
}
function addReader(){
  const raw=($('#readerIn').value||'').trim();
  readerErr=true;
  try{
    const js=raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1);
    const r=JSON.parse(js); const c=compileReader(r);
    const test=reports.find(x=>x.raw&&(!c.det||c.det.test(x.raw)));
    const n=test?readWith(c,test.raw.split('\n'),new Date().getFullYear()).length:null;
    S.readers=(S.readers||[]).filter(x=>x.nom!==r.nom); S.readers.unshift({nom:r.nom,detection:r.detection||'',ligne:r.ligne,signe:r.signe||'moins'});
    stateDirty=true; save();
    readerErr=false; readerMsg=`Lecteur « ${r.nom} » ajouté.`+(n!=null?` Il reconnaît ${n} opération${n>1?'s':''} dans « ${test.name} ». Réimportez ce relevé pour les ajouter.`:' Réimportez votre relevé.');
  }catch(e){readerMsg='Ce texte n’est pas un lecteur valide. '+(e&&e.message&&!/JSON/.test(e.message)?e.message:'Copiez bien toute la réponse de Claude, de { à }.')}
  render(); const el=$('#lecteurs'); if(el) el.scrollIntoView({block:'start'});
}

