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
async function lireFichier(f){return /\.csv$/i.test(f.name)?parseCSV(await f.text()):await parsePDF(f)}
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
async function importFiles(files){
  if(demo) exitDemo();
  for(const f of files){
    const rep=newReport(f,false);
    try{
      const res=await lireFichier(f);
      const a=analyse(res,f,false,rep);
      if(a){
        const last=res.ops.reduce((m,o)=>o.date>m?o.date:m,'');
        const so=detectSolde(res.full||'',last);
        if(so&&(!a.soldeDate||so.date>=a.soldeDate)){a.solde=so.solde;a.soldeDate=so.date;a.soldeSrc='releve';stateDirty=true}
      }
      const deja=compteur(), pris=new Set(), src=/\.csv$/i.test(f.name)?'csv':'pdf';
      const atype=(acctById(rep.acct)||{}).type||'perso';
      S.douteux=S.douteux||[];
      for(const o of res.ops){
        if(deja.pris(cleOp(o))){rep.dups++;continue}
        /* Déjà là grâce au copier-coller : la version du relevé remplace, la rubrique et le reste sont gardés */
        const j=jumeau(o,rep.acct,pris,x=>x.src==='paste');
        if(j&&j.sur){const x=j.o,c0=catOf(x);pris.add(x.id);dirtyMonths.add(x.date.slice(0,7));x.date=o.date;x.label=o.label;x.merchant=merchantOf(o.label);x.src=src;x.imp=rep.imp;dirtyMonths.add(o.date.slice(0,7));
          if(c0&&c0!=='interne'&&!x.cat&&!S.rules[x.merchant]&&!S.rules[x.merchant+(x.amount>0?'|+':'|-')]){S.rules[x.merchant+(x.amount>0?'|+':'|-')]=c0;delete S.sugg[x.merchant]}
          rep.completees++;continue}
        const op={id:Math.random().toString(36).slice(2,10),date:o.date,label:o.label,amount:o.amount,merchant:merchantOf(o.label),acct:rep.acct,imp:rep.imp,src};
        if(j){pris.add(j.o.id);S.douteux.push({a:j.o.id,b:op.id});rep.douteux++}
        S.ops.push(op); rep.added++; rep.sample.push(op); dirtyMonths.add(o.date.slice(0,7));
        if(appliqueAuto(op,atype)) stateDirty=true;
        if(!S.rules[op.merchant]&&!S.sugg[op.merchant]){const c=kwSuggest(op.merchant,op.label,atype,op.amount); if(c){S.sugg[op.merchant]={c,src:'kw'};stateDirty=true}}
      }
    }catch(e){rep.error=e&&e.message||'Ce fichier n’a pas pu être lu. Réessayez, ou choisissez un autre relevé.'}
    if(rep.added||rep.completees){S.imports=S.imports||{};S.imports[rep.imp]={nom:f.name,quand:Date.now()};stateDirty=true}
    reports.unshift(rep);
  }
  if(!S.since&&S.ops.length) S.since=Date.now();
  S.ops.sort((a,b)=>a.date<b.date?1:-1);
  P=null; save(); render();
}
