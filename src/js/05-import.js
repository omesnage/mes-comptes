/* ============ Import ============ */
/* Retrouve le compte d'un relevé (par numéro, sinon par banque) ou en crée un nouveau, avec un type supposé.
   En mode essai (dry), rien n'est créé ni modifié : on renvoie seulement ce qui se passerait. */
function resolveAccount(res,fileName,dry){
  const text=res.full||res.raw||'';
  const bank=detectBank(text)||'', no=detectAccountNo(text);
  let a=no&&S.accounts.find(x=>x.no===no);
  if(!a&&bank){const same=S.accounts.filter(x=>x.bank===bank);
    const free=same.filter(x=>!x.no);
    if(no&&free.length===1){a=free[0];if(!dry){a.no=no;stateDirty=true}}
    else if(!no&&same.length===1) a=same[0];}
  if(!a&&!bank&&!no&&S.accounts.length===1) a=S.accounts[0];
  if(a) return {a,isNew:false,bank,no};
  let name=bank||fileName.replace(/\.[a-z]+$/i,'').replace(/[_-]+/g,' ').trim().slice(0,30)||'Compte principal';
  if(S.accounts.some(x=>x.name===name)) name+=no?' ····'+no.slice(-4):' ('+(S.accounts.filter(x=>x.name.startsWith(name)).length+1)+')';
  const x={name,bank,no,type:IMPTYPE&&!SAL?IMPTYPE:guessType(bank,res.header||text.slice(0,1500),name),confirmed:!!IMPTYPE&&!SAL};
  return {a:dry?x:addAccount(x),isNew:true,bank,no};
}
/* Type choisi avant l'import pour un nouveau compte : 'perso', 'pro', 'mixte' ou null (l'application devine, puis pose la question) */
let IMPTYPE=null;
/* ---------- Rapprochement : une même opération venue du copier-coller et du relevé ---------- */
function similaire(a,b){a=norm(a||'').trim();b=norm(b||'').trim();if(!a||!b)return false;if(a===b||a.includes(b)||b.includes(a))return true;
  const wa=a.split(/\s+/).filter(w=>w.length>=4&&!/^\d+$/.test(w)),wb=new Set(b.split(/\s+/).filter(w=>w.length>=4));return wa.some(w=>wb.has(w))}
/* Même compte, même montant, à 2 jours près : sûr si le marchand se ressemble, douteux sinon. Chaque opération ne sert qu'une fois. */
function jumeau(op,acct,pris,filtre){
  const t=new Date(op.date); let doute=null;
  for(const o of S.ops){ if(pris.has(o.id)||o.src==='rev'||o.acct!==acct||Math.abs(o.amount-op.amount)>0.005||!filtre(o)) continue;
    if(Math.abs(new Date(o.date)-t)>2.5*864e5) continue;
    if(similaire(merchantOf(op.label),o.merchant)||similaire(op.label,o.label)) return {o,sur:true};
    if(!doute) doute=o }
  return doute?{o:doute,sur:false}:null;
}
/* Pour chaque opération lue, retrouve la ligne du relevé d'où elle vient (méthode commune à toutes les lectures) :
   la ligne qui contient le montant, avec le début du libellé sur cette ligne ou juste à côté. */
function lierLignes(res){
  const L=(res.lignes||[]).map(l=>l.text||''); if(!L.length) return;
  const net=t=>norm(t).replace(/\s/g,''), lib=t=>norm(t).replace(/[^A-Z0-9]/g,'');
  const c1=L.map(net), c2=L.map(lib); let ptr=0;
  for(const o of res.ops){
    const frag=lib(o.label).slice(0,8), a=Math.abs(o.amount).toFixed(2).replace('.',',');
    if(frag.length<3) continue;
    const re=new RegExp('(?<![0-9])'+a.replace(',','[,.]')+'(?![0-9])');
    for(let k=0;k<L.length;k++){
      const i=(ptr+k)%L.length;
      if(re.test(c1[i])&&(c2[Math.max(0,i-1)]+c2[i]+(c2[i+1]||'')).includes(frag)){o.lg=i;ptr=i;break}
    }
  }
}
/* Les 3 lignes avant et après chaque opération, gardées avec le relevé pour pouvoir vérifier la lecture */
function extraitsReleve(res){
  const L=(res.lignes||[]).map(l=>l.text||''), m={};
  for(const o of res.ops) if(o.lg!=null) for(let j=o.lg-3;j<=o.lg+3;j++) if(L[j]&&!m[j]) m[j]=L[j].slice(0,110);
  return m;
}
/* Relevé déjà importé avant que le détail soit gardé : on le complète sans rien ajouter ni supprimer */
function ajouterDetail(o,res,f,rep){
  if(o.lg==null) return;
  const k=cleOp(o), x=S.ops.find(y=>y.src==='pdf'&&y.lg==null&&cleOp(y)===k); if(!x) return;
  x.lg=o.lg; S.imports=S.imports||{};
  const im=S.imports[x.imp]||(S.imports[x.imp]={nom:f.name,quand:Date.now()});
  im.lg=Object.assign(im.lg||{},extraitsReleve({lignes:res.lignes,ops:[o]}));
  dirtyMonths.add(x.date.slice(0,7)); stateDirty=true; rep.detail=(rep.detail||0)+1;
}
const MSG_PAS_RELEVE='Ce fichier n’est pas un relevé PDF ou CSV. Si vous avez copié un lien, ouvrez-le d’abord et enregistrez le PDF sur votre appareil (sur iPhone : Partager, puis « Enregistrer dans Fichiers »), puis choisissez ce fichier.';
async function lireFichier(f){
  if(/\.csv$/i.test(f.name)||f.type==='text/csv') return parseCSV(await f.text());
  const tete=new TextDecoder('latin1').decode(new Uint8Array(await f.slice(0,1024).arrayBuffer()));
  /* Un fichier qui se dit PDF garde le message habituel ; un autre type (lien, page web, image…) est expliqué */
  if(!tete.includes('%PDF')&&!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf') throw new Error(MSG_PAS_RELEVE);
  return await parsePDF(f);
}
/* Fichier collé dans la page (iPhone : « Copier » dans le partage, puis « Coller » dans la zone prévue).
   Le nom ou le type peuvent manquer : c'est le contenu (%PDF) qui décide, dans lireFichier. */
let COLLE_T=0;
const nommer=f=>/\.(pdf|csv)$/i.test(f.name||'')?f:new File([f],(f.name||'Relevé collé')+(/csv/.test(f.type)?'.csv':'.pdf'),{type:f.type||'application/pdf'});
function fichiersCollage(dt){
  if(!dt) return [];
  const l=[...(dt.files||[]),...[...(dt.items||[])].filter(i=>i.kind==='file').map(i=>i.getAsFile())].filter(Boolean), vus=new Set();
  return l.filter(f=>{const k=f.name+'|'+f.size;if(vus.has(k))return false;vus.add(k);return true}).map(nommer);
}
function messageCollage(txt){const r=newReport({name:'Relevé collé'},false);r.error=txt;reports.unshift(r);render();toast(txt,false)}
function traiterCollage(e,dt){
  const fs=fichiersCollage(dt);
  if(fs.length){e.preventDefault();COLLE_T=Date.now();importFiles(fs,'collage');return true}
  return false;
}
document.addEventListener('paste',e=>{
  if(view!=='importer'||/^(INPUT|TEXTAREA)$/.test((e.target||{}).tagName)) return;
  const cd=e.clipboardData;
  if(!cd||traiterCollage(e,cd)) return;
  const txt=cd.getData('text')||'';
  if(/^\s*https?:\/\//i.test(txt)){e.preventDefault();messageCollage(MSG_PAS_RELEVE);return}
});
const cleOp=o=>o.date+'|'+o.label+'|'+o.amount;
/* Doublons exacts : comptés un par un face aux opérations déjà enregistrées (deux cafés identiques le même jour restent deux) */
function compteur(){const m=new Map();for(const o of S.ops){const k=cleOp(o);m.set(k,(m.get(k)||0)+1)}return {pris:k=>{const n=m.get(k)||0;if(n>0){m.set(k,n-1);return true}return false}}}
/* Lecture complète d'un relevé, commune à l'essai et à l'import */
function analyse(res,f,dry,rep){
  rep.raw=res.raw; rep.found=res.ops.length; rep.reader=res.reader||''; rep.lignes=res.lignes||null; rep.full=res.full||''; rep.Y=res.Y; rep.verifie=!!res.verifie;
  rep.controle=res.ops.length?controleSoldes(res):null;
  const deja=compteur();
  rep.lus=res.ops.map(o=>({...o,dup:deja.pris(cleOp(o))}));
  if(res.ops.length){const r=resolveAccount(res,f.name,dry);rep.bank=r.bank;rep.acctInfo={name:r.a.name,type:r.a.type,isNew:r.isNew};if(!dry){rep.acct=r.a.id;rep.isNew=r.isNew&&!r.a.confirmed}return r.a}
  return null;
}
function newReport(f,test){return {name:f.name,found:0,added:0,dups:0,completees:0,douteux:0,sample:[],lus:[],raw:'',error:null,imp:Math.random().toString(36).slice(2,9),acct:'',isNew:false,test:!!test,file:f}}
async function testerFichier(f){
  const rep=newReport(f,true);
  try{analyse(await lireFichier(f),f,true,rep)}catch(e){rep.error=e&&e.message||'Ce fichier n’a pas pu être lu. Réessayez, ou choisissez un autre relevé.'}
  reports.unshift(rep); render();
}
/* Dit clairement ce qui vient de se passer, et montre où : un message en haut de l'écran, puis le compte rendu du relevé */
function annoncerImport(rs,via){
  const n=rs.reduce((s,r)=>s+(r.added||0)+(r.completees||0),0), ko=rs.filter(r=>r.error||!r.found).length;
  const quoi={collage:'Collage réussi'}[via]||'Import réussi';
  if(n) toast(`${quoi} ✓ : ${n} opération${n>1?'s':''} ajoutée${n>1?'s':''}.`,true);
  else if(ko) toast('Le relevé n’a pas pu être lu : voir le message juste en dessous.',false);
  else toast(`${quoi.replace('réussi','fait')} : ces opérations étaient déjà présentes, rien n’a été ajouté.`,true);
  setTimeout(()=>{const el=document.querySelector('.releves');if(el)el.scrollIntoView({block:'start',behavior:'smooth'})},60);
}
async function importFiles(files,via){
  if(demo) exitDemo();
  const traites=[];
  for(const f of files){
    const rep=newReport(f,false);
    try{
      const res=await lireFichier(f); lierLignes(res);
      const a=analyse(res,f,false,rep);
      if(a){
        const last=res.ops.reduce((m,o)=>o.date>m?o.date:m,'');
        const so=detectSolde(res.full||'',last);
        if(so&&(!a.soldeDate||so.date>=a.soldeDate)){a.solde=so.solde;a.soldeDate=so.date;a.soldeSrc='releve';stateDirty=true}
      }
      const deja=compteur(), pris=new Set(), nouvelles=[], src=/\.csv$/i.test(f.name)?'csv':'pdf';
      const atype=(acctById(rep.acct)||{}).type||'perso';
      S.douteux=S.douteux||[];
      for(const o of res.ops){
        if(deja.pris(cleOp(o))){rep.dups++;ajouterDetail(o,res,f,rep);continue}
        /* Déjà là grâce au copier-coller : la version du relevé remplace, la rubrique et le reste sont gardés */
        const j=jumeau(o,rep.acct,pris,x=>x.src==='paste');
        if(j&&j.sur){const x=j.o,c0=catOf(x);pris.add(x.id);dirtyMonths.add(x.date.slice(0,7));x.date=o.date;x.label=o.label;x.merchant=merchantOf(o.label);x.src=src;x.imp=rep.imp;if(o.lg!=null)x.lg=o.lg;dirtyMonths.add(o.date.slice(0,7));
          if(c0&&c0!=='interne'&&!x.cat&&!S.rules[x.merchant]&&!S.rules[x.merchant+(x.amount>0?'|+':'|-')]){S.rules[x.merchant+(x.amount>0?'|+':'|-')]=c0;delete S.sugg[x.merchant]}
          rep.completees++;continue}
        const op={id:Math.random().toString(36).slice(2,10),date:o.date,label:o.label,amount:o.amount,merchant:merchantOf(o.label),acct:rep.acct,imp:rep.imp,src};
        if(o.lg!=null) op.lg=o.lg;
        if(j){pris.add(j.o.id);S.douteux.push({a:j.o.id,b:op.id});rep.douteux++}
        S.ops.push(op); rep.added++; rep.sample.push(op); dirtyMonths.add(o.date.slice(0,7));
        if(appliqueAuto(op,atype)) stateDirty=true;
        nouvelles.push(op);
      }
      classerNouvelles(nouvelles);
    }catch(e){rep.error=e&&e.message||'Ce fichier n’a pas pu être lu. Réessayez, ou choisissez un autre relevé.'}
    if(rep.added||rep.completees){S.imports=S.imports||{};S.imports[rep.imp]={nom:f.name,quand:Date.now()};if(rep.lus&&rep.lus.some(o=>o.lg!=null)){const ex=extraitsReleve({lignes:rep.lignes,ops:rep.lus});if(Object.keys(ex).length)S.imports[rep.imp].lg=ex}stateDirty=true}
    reports.unshift(rep); traites.push(rep);
  }
  if(!S.since&&S.ops.length) S.since=Date.now();
  S.ops.sort((a,b)=>a.date<b.date?1:-1);
  P=null; save(); render(); annoncerImport(traites,via);
}
