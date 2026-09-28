/* ============ Périodes ============ */
function defaultPeriod(){
  const d=S.ops.length?S.ops.reduce((a,o)=>o.date>a?o.date:a,'0'):new Date().toISOString().slice(0,10);
  return {lvl:'M',y:+d.slice(0,4),m:+d.slice(5,7)};
}
const pad=n=>String(n).padStart(2,'0');
function bounds(p){
  if(p.lvl==='Y') return [`${p.y}-01`,`${p.y}-12`,12];
  if(p.lvl==='Q'){const q=Math.ceil(p.m/3),s=(q-1)*3+1;return [`${p.y}-${pad(s)}`,`${p.y}-${pad(s+2)}`,3]}
  return [`${p.y}-${pad(p.m)}`,`${p.y}-${pad(p.m)}`,1];
}
function shift(p,d){
  const n={...p};
  if(p.lvl==='Y') n.y+=d;
  else{const step=p.lvl==='Q'?3:1;let t=p.y*12+(p.m-1)+d*step;n.y=Math.floor(t/12);n.m=t%12+1}
  return n;
}
function plabel(p){
  if(p.lvl==='Y') return String(p.y);
  if(p.lvl==='Q'){const q=Math.ceil(p.m/3);return `${q===1?'1er':q+'e'} trimestre ${p.y}`}
  return `${MOIS[p.m-1]} ${p.y}`;
}
function prevLabel(p){
  const r=shift(p,-1);
  if(p.lvl==='M') return 'à '+MOIS[r.m-1];
  if(p.lvl==='Q') return 'au trimestre précédent';
  return 'à '+r.y;
}
let AGG={}, RAW={};
function monthKeys(a,b){const out=[];let y=+a.slice(0,4),m=+a.slice(5,7);const by=+b.slice(0,4),bm=+b.slice(5,7);while(y<by||(y===by&&m<=bm)){out.push(y+'-'+pad(m));if(++m>12){m=1;y++}}return out}
/* Calcul de base d'un mois : un seau par univers (pro, perso) et la rémunération pro → perso.
   Un remboursement rattaché à un achat est compté dans le mois de l'achat. Une rubrique n'est jamais négative :
   le surplus de remboursements est gardé à part (surplus). Trimestres et années = somme des mois. */
function aggRaw(p){
  const ck=p.lvl+p.y+'-'+p.m+(p.lvl==='Q'?Math.ceil(p.m/3):''); if(RAW[ck]) return RAW[ck];
  if(p.lvl!=='M') return RAW[ck]=sommeMois(p);
  const [a,b,months]=bounds(p); const fileInc=S.incomeSource==='file';
  const mk=()=>({by:{},inc:{},income:0,net:0,fixed:0,any:false});
  const R={pro:mk(),perso:mk(),remu:0,remuOps:[],months,any:false};
  const proAcct=hasPro();
  const liste=(BYMONTH[a]||[]).filter(o=>!(o.amount>0&&LINK[o.id]&&BYID[LINK[o.id]].date.slice(0,7)!==a)).concat(REFMOIS[a]||[]);
  for(const o of liste){
    R.any=true;
    if(o.src==='rev'){R.pro.any=true;if(fileInc){R.pro.income+=o.amount;R.pro.inc.revenus=(R.pro.inc.revenus||0)+o.amount}continue}
    const x=!o.cat&&INTERNAL[o.id]?BYID[INTERNAL[o.id]]:null;
    if(x){ if(o.amount<0){const r=remuDir(o,x);if(r){R.remu+=r*-o.amount;R.remuOps.push(o)}} continue }
    const c=catOf(o)||'_pending';
    if(c==='_pending'&&o.amount>0) continue;
    const ty=c==='_pending'?'expense':typeOf(c);
    if(ty==='transfer') continue;
    if(ty==='remu'){
      if(o.amount<0&&acctType(o)!=='perso'){R.remu+=-o.amount;R.remuOps.push(o)}
      else if(o.amount>0&&!proAcct){R.remu+=o.amount;R.remuOps.push(o)}
      continue;
    }
    const B=R[univOf(o,c)]; B.any=true;
    if(ty==='income'){if(c==='revenus'&&fileInc&&B===R.pro)continue;B.income+=o.amount;B.inc[c]=(B.inc[c]||0)+o.amount;continue}
    const e=B.by[c]||(B.by[c]={spent:0,ref:0,ops:[]});
    if(o.amount<0) e.spent+=-o.amount; else e.ref+=o.amount;
    e.ops.push(o);
  }
  for(const B of [R.pro,R.perso]){for(const c in B.by){const e=B.by[c],n=e.spent-e.ref;e.net=Math.max(0,n);e.surplus=Math.max(0,-n);B.net+=e.net;if(catById(c)?.fixed)B.fixed+=e.net}}
  /* Pro : les cotisations et impôts payés sont la provision elle-même, on ne les compte pas deux fois */
  const X=R.pro; X.provPaid=0; for(const c in X.by) if(PROV_CATS.has(c)||catById(c)?.prov) X.provPaid+=X.by[c].net;
  X.fraisExpl=X.net-X.provPaid; X.resultat=X.income-X.fraisExpl;
  const base=S.settings.assiette==='resultat'?Math.max(0,X.resultat):Math.max(0,X.income);
  X.provision=base*(+S.settings.taux||0)/100; X.revenuNet=X.income-X.fraisExpl-X.provision;
  return RAW[ck]=R;
}
/* Trimestre ou année : somme exacte des mois qui la composent */
function sommeMois(p){
  const [a,b,months]=bounds(p), mk=()=>({by:{},inc:{},income:0,net:0,fixed:0,any:false});
  const R={pro:mk(),perso:mk(),remu:0,remuOps:[],months,any:false};
  for(const k of monthKeys(a,b)){const M=aggRaw({lvl:'M',y:+k.slice(0,4),m:+k.slice(5,7)});
    R.any=R.any||M.any; R.remu+=M.remu; R.remuOps=R.remuOps.concat(M.remuOps);
    for(const u of ['pro','perso']){const S1=M[u],T=R[u];T.any=T.any||S1.any;T.income+=S1.income;T.net+=S1.net;T.fixed+=S1.fixed;
      for(const c in S1.inc)T.inc[c]=(T.inc[c]||0)+S1.inc[c];
      for(const c in S1.by){const e=T.by[c]||(T.by[c]={spent:0,ref:0,net:0,surplus:0,ops:[]});const f=S1.by[c];e.spent+=f.spent;e.ref+=f.ref;e.net+=f.net;e.surplus+=f.surplus;e.ops=e.ops.concat(f.ops)}}
    for(const k2 of ['provPaid','fraisExpl','resultat','provision','revenuNet']) R.pro[k2]=(R.pro[k2]||0)+M.pro[k2];
  }
  return R;
}
/* Vue d'une période pour un univers : 'pro', 'perso' ou 'all' (vue d'ensemble) */
function agg(p,U){
  U=U||UNIV;
  const ck=p.lvl+p.y+'-'+p.m+(p.lvl==='Q'?Math.ceil(p.m/3):'')+'|'+U; if(AGG[ck]) return AGG[ck];
  const R=aggRaw(p), X=R.pro, pro={ca:X.income,frais:X.net,provPaid:X.provPaid,fraisExpl:X.fraisExpl,resultat:X.resultat,provision:X.provision,revenuNet:X.revenuNet,remu:R.remu,remuOps:R.remuOps};
  let v;
  if(U==='pro') v={...X,...pro,months:R.months,any:X.any||R.remu!==0};
  else if(U==='perso'){const inc={...R.perso.inc};if(R.remu)inc.remu=R.remu;
    v={...R.perso,inc,income:R.perso.income+R.remu,...pro,months:R.months,any:R.perso.any||R.remu!==0}}
  else{
    const by={}; for(const B of [R.perso,R.pro]) for(const c in B.by){const e=by[c]||(by[c]={spent:0,ref:0,net:0,surplus:0,ops:[]});e.spent+=B.by[c].spent;e.ref+=B.by[c].ref;e.net+=B.by[c].net;e.surplus+=B.by[c].surplus||0;e.ops=e.ops.concat(B.by[c].ops)}
    const inc={}; for(const B of [R.perso,R.pro]) for(const c in B.inc) inc[c]=(inc[c]||0)+B.inc[c];
    v={by,inc,income:R.perso.income+X.income,net:R.perso.net+X.net,fixed:R.perso.fixed,...pro,months:R.months,any:R.any};
  }
  return AGG[ck]=v;
}
/* Trésorerie des comptes pro : dernier solde connu + opérations postérieures. null si aucun solde n'est connu. */
function tresoPro(){
  const pros=S.accounts.filter(a=>a.type==='pro'); if(!pros.length) return null;
  let t=0,known=0,missing=[],date='';
  for(const a of pros){
    const ops=S.ops.filter(o=>o.acct===a.id);
    const last=ops.reduce((m,o)=>o.date>m?o.date:m,''); if(last>date) date=last;
    if(a.solde==null||!a.soldeDate){missing.push(a.name);continue}
    known++; t+=a.solde+ops.filter(o=>o.date>a.soldeDate).reduce((s,o)=>s+o.amount,0);
  }
  return known?{t,missing,date}:{t:null,missing,date};
}
/* Provision de l'année civile jusqu'au dernier relevé, moins les cotisations et impôts déjà payés */
function resteAProvisionner(){
  const last=S.ops.reduce((m,o)=>o.date>m?o.date:m,''); if(!last) return {du:0,cumul:0,paye:0};
  const y=+last.slice(0,4), m=+last.slice(5,7); let cumul=0,paye=0;
  for(let i=1;i<=m;i++){const R=aggRaw({lvl:'M',y,m:i});cumul+=R.pro.provision;paye+=R.pro.provPaid}
  return {du:Math.max(0,cumul-paye),cumul,paye,y};
}
