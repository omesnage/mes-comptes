/* ============ Persistance ============ */
let db=null, uid=null, mode='local', stateDirty=false, dirtyMonths=new Set(), timer=null, flushing=false, again=false, saveState='';
const LS=SAL?'mes-comptes-salaries':'mes-comptes-v1';
const base=()=>`data/users/${uid}/state`;
const LSUI=SAL?'mes-comptes-salaries-affichage':'mes-comptes-affichage';
function loadUI(){UNIV='all'}
function saveUI(){try{localStorage.setItem(LSUI,JSON.stringify({univ:UNIV}))}catch(e){}}
function loadLocal(){try{const t=localStorage.getItem(LS);return t?JSON.parse(t):null}catch(e){return null}}
function saveLocal(){try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}}
function mergeCats(saved){
  if(!saved||!saved.length) return CATS0.map(c=>({...c}));
  const out=saved.map(c=>{const d=CATS0.find(k=>k.id===c.id);return {...c,type:c.type||(d?d.type:'expense'),icon:c.icon||(d?d.icon:'tag'),fixed:c.fixed!=null?c.fixed:(d?d.fixed:false)}});
  CATS0.forEach((d,i)=>{if(!out.some(c=>c.id===d.id)){const after=i>0?out.findIndex(c=>c.id===CATS0[i-1].id):-1;out.splice(after+1,0,{...d})}});
  return out;
}
/* Les champs inconnus sont conservés tels quels, puis la migration de schéma s'applique */
let MIGRATED=false;
function merge(x){
  const st={...x,schemaVersion:x.schemaVersion||1,accounts:x.accounts||[],categories:mergeCats(x.categories),rules:x.rules||{},sugg:x.sugg||{},auto:x.auto||{},ops:x.ops||[],incomeSource:x.incomeSource||'bank',settings:{...SET0,...(x.settings||{})},challenges:x.challenges||[],readers:x.readers||[]};
  if(!st.since&&st.ops.length){st.since=Date.now();MIGRATED=true}
  if(!st.masked) st.masked={};
  if(!st.douteux) st.douteux=[];
  if(st.onboarded==null) st.onboarded=st.ops.length>0;
  st.challenges.forEach(c=>{if(!c.key)c.key=newId('d_')});
  if(migrateSchema(st)){MIGRATED=true;st.ops.forEach(o=>dirtyMonths.add(o.date.slice(0,7)))}
  return st;
}
/* Migrations de schéma, dans l'ordre. Chaque étape est rejouable sans risque. */
function migrateSchema(st){
  const v0=st.schemaVersion;
  if(st.schemaVersion<2){
    /* v1 → v2 : le nom de compte porté par chaque opération devient une fiche de compte avec un type */
    const byName={};
    for(const o of st.ops){ if(o.src==='rev') continue;
      const n=o.acct||'Compte principal';
      let a=byName[n];
      if(!a){const bank=(BANKS.find(([b])=>b===n)||[])[0]||detectBank(n)||'';
        a=byName[n]={id:newId('a_'),name:n,bank,no:'',type:guessType(bank,'',n),confirmed:false,solde:null,soldeDate:''};st.accounts.push(a)}
      o.acct=a.id; }
    /* L'ancien type « pro » devient une dépense de l'univers pro */
    st.categories.forEach(c=>{
      if(c.type==='pro'){c.type='expense';c.univers='pro'}
      if(c.id==='pro'&&c.name==='Frais professionnels') c.name='Autres frais professionnels';
      if(!c.univers){const d=CATS0.find(k=>k.id===c.id);c.univers=d?d.univers:(c.type==='income'?'auto':'perso')}
    });
    st.schemaVersion=2;
  }
  if(st.schemaVersion<3){
    /* v2 → v3 : 160 heures par mois par défaut au lieu de 140, sauf si la valeur avait été modifiée */
    if(+st.settings.heures===140) st.settings.heures=160;
    if(!st.settings.netVise) st.settings.netVise=2000;
    st.schemaVersion=3;
  }
  if(st.schemaVersion<4){
    /* v3 → v4 : nouvelles rubriques du foyer, noms plus simples (un nom personnalisé est gardé) */
    for(const c of st.categories){const d=CATS0.find(k=>k.id===c.id);if(d&&OLD_NAMES[c.id]===c.name){c.name=d.name;c.icon=d.icon}}
    st.schemaVersion=4;
  }
  if(st.schemaVersion<5){
    /* v4 → v5 : heures par semaine au lieu de par mois (160 h par mois par défaut devient 40 h par semaine) */
    const h=+st.settings.heures;
    st.settings.heuresSemaine=!h||h===160?40:Math.max(1,Math.round(h*12/52));
    delete st.settings.heures;
    /* Remboursement d'emprunt : rubrique du foyer ; un emprunt payé uniquement depuis un compte pro passe dans la rubrique de l'activité */
    const pret=st.categories.find(c=>c.id==='pret');
    if(pret){if(pret.name==='Remboursement de prêt'){pret.name='Remboursement d’emprunt';pret.icon='banknote'}if(pret.univers==='auto')pret.univers='perso';pret.fixed=true}
    const pro=new Set(st.accounts.filter(a=>a.type==='pro').map(a=>a.id));
    for(const [m,c] of Object.entries(st.rules)) if(c==='pret'){const ops=st.ops.filter(o=>o.merchant===m.replace(/\|[+-]$/,''));if(ops.length&&ops.every(o=>pro.has(o.acct)))st.rules[m]='empruntpro'}
    st.schemaVersion=5;
  }
  if(st.schemaVersion<6){
    /* v5 → v6 : une rubrique par défaut retirée est remplacée par « Conseils et services », sans perte */
    const ids=new Set(CATS0.map(c=>c.id)), retirees=new Set(st.categories.filter(c=>!c.custom&&!ids.has(c.id)&&c.id!=='fraisrembourses'&&!FUSIONS_V13[c.id]).map(c=>c.id));
    if(retirees.size){
      st.categories=st.categories.filter(c=>!retirees.has(c.id));
      for(const m in st.rules) if(retirees.has(st.rules[m])) st.rules[m]='conseils';
      for(const m in st.sugg) if(retirees.has(st.sugg[m].c)) st.sugg[m].c='conseils';
      st.ops.forEach(o=>{if(retirees.has(o.cat))o.cat='conseils'});
    }
    st.schemaVersion=6;
  }
  if(st.schemaVersion<7){
    /* v6 → v7 : plus de frais remboursés par l'activité ; leurs règles et opérations redeviennent ordinaires,
       et un virement du compte pro vers le perso redevient une rémunération. Rubriques renommées. */
    const F='fraisrembourses';
    st.categories=st.categories.filter(c=>c.id!==F);
    for(const m in st.rules) if(st.rules[m]===F) delete st.rules[m];
    for(const m in st.sugg) if(st.sugg[m].c===F) delete st.sugg[m];
    st.ops.forEach(o=>{if(o.cat===F)delete o.cat});
    delete st.virements;
    const ren={transport:['Voiture et transports','Transport & carburant','Transports'],loisirs:['Loisirs','Loisirs & culture','Sorties et loisirs'],voyages:['Voyages','Vacances']};
    for(const [id,noms] of Object.entries(ren)){const c=st.categories.find(k=>k.id===id);if(!c)continue;const nv=noms[noms.length-1];if(noms.includes(c.name))c.name=nv;if(id==='transport')c.univers='perso'}
    st.categories.forEach(c=>{if(c.budgetAn==null)c.budgetAn=0});
    st.schemaVersion=7;
  }
  if(st.schemaVersion<8){
    /* v7 → v8 : budget par mois et budget pour l'année deviennent une seule « limite » par rubrique (par mois, trimestre ou an).
       Les anciens champs sont gardés tels quels. */
    st.categories.forEach(c=>{if(c.limite==null){c.limite=c.budgetAn>0?{montant:+c.budgetAn,per:'Y'}:c.budget>0?{montant:+c.budget,per:'M'}:null}});
    st.schemaVersion=8;
  }
  if(st.schemaVersion<9){
    /* v8 → v9 : rubrique « Conseils et services » retirée ; ses opérations passent dans « Autres frais de l'activité » */
    const X='conseils';
    if(!st.categories.find(c=>c.id===X)?.custom){
      st.categories=st.categories.filter(c=>c.id!==X);
      for(const m in st.rules) if(st.rules[m]===X) st.rules[m]='pro';
      for(const m in st.sugg) if(st.sugg[m].c===X) st.sugg[m].c='pro';
      st.ops.forEach(o=>{if(o.cat===X)o.cat='pro'});
    }
    st.schemaVersion=9;
  }
  if(st.schemaVersion<10){
    /* v9 → v10 : nouvelles rubriques « Épargne et placements » et « Retraite et pensions » (ajoutées d'office).
       Un prélèvement de cotisations sociales rangé dans une rubrique du foyer devient une cotisation déjà payée. */
    const foyer=id=>{const c=st.categories.find(k=>k.id===id);return c&&c.type==='expense'&&c.univers==='perso'};
    const urs=m=>COTIS_RE.test(norm(m.replace(/\|[+-]$/,'')));
    for(const m in st.rules) if(urs(m)&&foyer(st.rules[m])) st.rules[m]='cotisations';
    st.ops.forEach(o=>{if(o.cat&&foyer(o.cat)&&COTIS_RE.test(norm(o.label||''))){o.cat='cotisations';dirtyMonths.add(o.date.slice(0,7))}});
    st.schemaVersion=10;
  }
  if(st.schemaVersion<11){
    /* v10 → v11 : « Vacances » devient « Vacances et séjours » (un nom personnalisé est gardé) */
    const c=st.categories.find(k=>k.id==='voyages'); if(c&&['Vacances','Voyages'].includes(c.name)) c.name='Vacances et séjours';
    st.schemaVersion=11;
  }
  if(st.schemaVersion<12){
    /* v11 → v12 : « Transports » devient « Voiture et déplacements » (un nom personnalisé est gardé) */
    const c=st.categories.find(k=>k.id==='transport'); if(c&&['Transports','Voiture et transports','Transport & carburant'].includes(c.name)) c.name='Voiture et déplacements';
    st.schemaVersion=12;
  }
  if(st.schemaVersion<13){
    /* v12 → v13 : rubriques resserrées. Énergie → Logement, Enfants → Cadeaux, Matériel → Logiciels, Impôts de l'activité → Versements.
       Règles, suggestions, opérations, défis et limites suivent ; « Autres » devient « Espèces et divers ». */
    for(const [de,vers] of Object.entries(FUSIONS_V13)){
      const a=st.categories.find(c=>c.id===de), b=st.categories.find(c=>c.id===vers);
      if(b&&a&&a.limite&&a.limite.montant>0){
        if(!b.limite||!(b.limite.montant>0)) b.limite=a.limite;
        else if(b.limite.per===a.limite.per) b.limite={...b.limite,montant:b.limite.montant+a.limite.montant};
      }
      st.categories=st.categories.filter(c=>c.id!==de);
      for(const m in st.rules) if(st.rules[m]===de) st.rules[m]=vers;
      for(const m in st.sugg) if(st.sugg[m].c===de) st.sugg[m].c=vers;
      st.ops.forEach(o=>{if(o.cat===de){o.cat=vers;dirtyMonths.add(o.date.slice(0,7))}});
      (st.challenges||[]).forEach(c=>{if(c.cat===de)c.cat=vers});
    }
    const ren={logement:['Logement','Logement et énergie'],cadeaux:['Cadeaux','Enfants et cadeaux'],logiciels:['Logiciels et outils','Logiciels et matériel'],divers:['Autres','Espèces et divers']};
    for(const [id,[ancien,nouveau]] of Object.entries(ren)){const c=st.categories.find(k=>k.id===id);if(c&&c.name===ancien)c.name=nouveau}
    st.schemaVersion=13;
  }
  if(st.schemaVersion<14){
    /* v13 → v14 : un prélèvement « CESU » avait été rangé d'office dans les versements de la caisse sociale ; il redevient à classer */
    const cesu=o=>CESU_RE.test(norm(o.label||''));
    const tous=new Map(); st.ops.forEach(o=>{const a=tous.get(o.merchant);tous.set(o.merchant,(a===undefined||a)&&cesu(o))});
    for(const m in st.rules){const mm=m.replace(/\|[+-]$/,'');if(st.rules[m]==='cotisations'&&tous.get(mm)===true)delete st.rules[m]}
    st.ops.forEach(o=>{if(o.cat==='cotisations'&&cesu(o)){delete o.cat;dirtyMonths.add(o.date.slice(0,7))}});
    st.schemaVersion=14;
  }
  if(st.schemaVersion<15){
    /* v14 → v15 : « Versements de ce qui est mis de côté » devient « Charges sociales » (un nom personnalisé est gardé) ; les rubriques nouvelles sont ajoutées à la lecture */
    const c=st.categories.find(k=>k.id==='cotisations'); if(c&&c.name==='Versements de ce qui est mis de côté') c.name='Charges sociales';
    st.schemaVersion=15;
  }
  if(st.schemaVersion<16){
    /* v15 → v16 : « Enfants et cadeaux » redevient « Cadeaux » (un nom personnalisé est gardé) */
    const c=st.categories.find(k=>k.id==='cadeaux'); if(c&&c.name==='Enfants et cadeaux') c.name='Cadeaux';
    st.schemaVersion=16;
  }
  return st.schemaVersion!==v0;
}
function save(){ if(demo) return; stateDirty=true; clearTimeout(timer); timer=setTimeout(flush,700); }
/* Enregistrement immédiat quand la page est quittée ou mise en arrière-plan, pour ne rien perdre */
function saveNow(){if(!demo&&timer){clearTimeout(timer);timer=null;saveLocal();if(mode==='db')flush()}}
addEventListener('pagehide',saveNow);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveNow()});
async function flush(){
  if(demo) return;
  saveLocal();
  if(mode!=='db'){setStatus('local');return}
  if(flushing){again=true;return}
  flushing=true; setStatus('saving');
  const months=[...dirtyMonths]; dirtyMonths.clear(); const st=stateDirty; stateDirty=false;
  try{
    if(st){const {ops,...etat}=S;await db.doc(base()).set({...JSON.parse(JSON.stringify(etat)),updated:Date.now()})}
    for(const mk of months){
      const ref=db.doc(base()).collection('months').doc(mk);
      const ops=S.ops.filter(o=>o.date.slice(0,7)===mk);
      if(ops.length) await ref.set({ops}); else await ref.delete();
    }
    setStatus('saved');
  }catch(e){ stateDirty=true; months.forEach(m=>dirtyMonths.add(m)); setStatus(e&&e.code==='quota_exceeded'?'quota':'error'); }
  flushing=false; if(again){again=false;flush()}
}
function setStatus(s){
  saveState=s||saveState;
  const t={saving:'Enregistrement…',saved:'Enregistré',local:'Vos données sont gardées sur cet appareil uniquement',error:'Échec de l’enregistrement, nouvel essai à la prochaine modification',quota:'Espace de stockage plein'}[saveState]||'';
  $('#status').textContent=demo?'Exemple, rien n’est enregistré':t;
  majSauvegardeEntete();
}
function migrate(){
  let ch=false; const old=new Set();
  for(const o of S.ops){ if(o.src==='rev') continue;
    const nm=merchantOf(o.label);
    if(nm!==o.merchant){ if(S.rules[o.merchant]&&!S.rules[nm]&&!brandOf(o.label)&&!autoCatOf(o.label,acctType(o),o.amount)) S.rules[nm]=S.rules[o.merchant];
      old.add(o.merchant); o.merchant=nm; dirtyMonths.add(o.date.slice(0,7)); ch=true }
    if(appliqueAuto(o,acctType(o))) ch=true;
  }
  const live=new Set(S.ops.map(o=>o.merchant));
  old.forEach(m=>{if(!live.has(m)){delete S.rules[m];delete S.sugg[m]}});
  if(ch) stateDirty=true;
  return ch;
}
async function initStore(){
  loadUI();
  const local=loadLocal(); let localMig=false; if(local){MIGRATED=false;S=merge(local);localMig=migrate()||MIGRATED}
  render();
  try{
    if(!HAS_CLAUDE){setStatus('local');if(localMig)save();return}
    const [d,u]=await Promise.all([claude.use('db'),claude.use('user')]);
    const id=u?await u.id():null;
    if(d&&id){
      db=d; uid=id; mode='db';
      const st=await db.doc(base()).get();
      if(st.exists){
        const data=JSON.parse(JSON.stringify(st.data()));
        const ms=await db.doc(base()).collection('months').get();
        const ops=[]; ms.docs.forEach(x=>ops.push(...JSON.parse(JSON.stringify(x.data().ops||[]))));
        MIGRATED=false; S=merge({...data,ops}); S.ops.sort((a,b)=>a.date<b.date?1:-1); if(migrate()||MIGRATED){stateDirty=true;save()}
        if(!demo){P=null;render()}
        saveLocal(); setStatus('saved');
      } else if(S.ops.length||Object.keys(S.rules).length){
        S.ops.forEach(o=>dirtyMonths.add(o.date.slice(0,7))); save();
      } else setStatus('saved');
      return;
    }
  }catch(e){}
  mode='local'; setStatus('local'); if(localMig) save();
}

