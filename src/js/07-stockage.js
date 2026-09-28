/* ============ Persistance ============ */
let db=null, uid=null, mode='local', stateDirty=false, dirtyMonths=new Set(), timer=null, flushing=false, again=false, saveState='';
const LS='mes-comptes-v1';
const base=()=>`data/users/${uid}/state`;
function loadLocal(){try{const t=localStorage.getItem(LS);return t?JSON.parse(t):null}catch(e){return null}}
function saveLocal(){try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}}
function mergeCats(saved){
  if(!saved||!saved.length) return CATS0.map(c=>({...c}));
  const out=saved.map(c=>{const d=CATS0.find(k=>k.id===c.id);return {...c,type:c.type||(d?d.type:'expense'),icon:c.icon||(d?d.icon:'tag'),fixed:c.fixed!=null?c.fixed:(d?d.fixed:false)}});
  CATS0.forEach((d,i)=>{if(!out.some(c=>c.id===d.id)){const after=i>0?out.findIndex(c=>c.id===CATS0[i-1].id):-1;out.splice(after+1,0,{...d})}});
  return out;
}
function merge(x){const b=blank();return{categories:mergeCats(x.categories),rules:x.rules||{},sugg:x.sugg||{},ops:x.ops||[],incomeSource:x.incomeSource||'bank',settings:{...SET0,...(x.settings||{})},challenges:x.challenges||[],readers:x.readers||[]}}
function save(){ if(demo) return; stateDirty=true; clearTimeout(timer); timer=setTimeout(flush,700); }
async function flush(){
  if(demo) return;
  saveLocal();
  if(mode!=='db'){setStatus('local');return}
  if(flushing){again=true;return}
  flushing=true; setStatus('saving');
  const months=[...dirtyMonths]; dirtyMonths.clear(); const st=stateDirty; stateDirty=false;
  try{
    if(st) await db.doc(base()).set({categories:S.categories,rules:S.rules,sugg:S.sugg,incomeSource:S.incomeSource,settings:S.settings,challenges:S.challenges,readers:S.readers,updated:Date.now()});
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
  const t={saving:'Enregistrement…',saved:'Enregistré',local:'Enregistré sur cet appareil',error:'Échec de l’enregistrement, nouvel essai à la prochaine modification',quota:'Espace de stockage plein'}[saveState]||'';
  $('#status').textContent=demo?'Exemple, rien n’est enregistré':t;
}
function migrate(){
  let ch=false; const old=new Set();
  for(const o of S.ops){ if(o.src==='rev') continue;
    const nm=merchantOf(o.label);
    if(nm!==o.merchant){ if(S.rules[o.merchant]&&!S.rules[nm]&&!brandOf(o.label)) S.rules[nm]=S.rules[o.merchant];
      old.add(o.merchant); o.merchant=nm; dirtyMonths.add(o.date.slice(0,7)); ch=true }
    const ac=autoCatOf(o.label); if(ac&&!S.rules[o.merchant]){S.rules[o.merchant]=ac;delete S.sugg[o.merchant];ch=true}
  }
  const live=new Set(S.ops.map(o=>o.merchant));
  old.forEach(m=>{if(!live.has(m)){delete S.rules[m];delete S.sugg[m]}});
  if(ch) stateDirty=true;
  return ch;
}
async function initStore(){
  const local=loadLocal(); let localMig=false; if(local){S=merge(local);localMig=migrate()}
  render();
  try{
    if(!window.claude||!claude.use){setStatus('local');if(localMig)save();return}
    const [d,u]=await Promise.all([claude.use('db'),claude.use('user')]);
    const id=u?await u.id():null;
    if(d&&id){
      db=d; uid=id; mode='db';
      const st=await db.doc(base()).get();
      if(st.exists){
        const data=JSON.parse(JSON.stringify(st.data()));
        const ms=await db.doc(base()).collection('months').get();
        const ops=[]; ms.docs.forEach(x=>ops.push(...JSON.parse(JSON.stringify(x.data().ops||[]))));
        S=merge({...data,ops}); S.ops.sort((a,b)=>a.date<b.date?1:-1); if(migrate()) save();
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

