/* ============ Classement automatique après un import ============
   Objectif : quelques questions au plus (5), tout le reste classé sans rien demander.
   - « sûr »   : une règle de l'utilisateur, une reconnaissance d'office ou une entrée sûre du dictionnaire ;
   - « deviné » : meilleure hypothèse, rangée automatiquement et modifiable d'un geste (mention « classé automatiquement ») ;
   - question  : seulement les marchands qui pèsent le plus, sans réponse fiable, dans la limite de 5.
   Une règle apprise (S.rules) passe toujours avant le classement automatique (S.auto). */
const MAX_QUESTIONS=5, SEUIL_QUESTION=30;
const cleAuto=o=>o.merchant+(o.amount>0?'|+':'|-');
/* On ne classe en silence que ce qui est perso : dépenses d'un compte perso ou d'un compte qui sert à tout, et rentrées d'un compte perso */
const silenceOk=(atype,amount)=>atype==='perso'||(atype==='mixte'&&amount<0);
/* 's' (sûr), 'd' (deviné) ou null : d'où vient la rubrique d'une opération */
function sourceAuto(o){
  if(o.cat||!S.auto) return null;
  const dk=cleAuto(o); if(S.rules[dk]||S.rules[o.merchant]) return null;
  const a=S.auto[dk]||S.auto[o.merchant]; return a&&catOf(o)?a.q:null;
}
/* Meilleure proposition pour une opération : dictionnaire d'abord, puis les mots-clés déjà connus */
/* Virement vers un de ses propres comptes : « Avec BforBank », ou un IBAN sans aucun nom. Jamais une question : rangé en « Virements entre vos comptes ». */
const VIR_INTERNE=/\bAVEC\s+(?:[A-Z]+\s+)?(?:BANK|BANQUE|BFORBANK|BOURSO\w*|FORTUNEO|HELLO\s*BANK|REVOLUT|N26|QONTO|SHINE)\b|^(?:VIREMENT|VIR)(?:\s+(?:INSTANTANE|SEPA|EMIS|RECU))*\s+FR\d{2}[0-9A-Z ]{10,}\s*\w{0,12}$/;
function propositionPour(o,atype){
  /* Sur un compte pro, le dictionnaire ne range rien d'office, mais ses rubriques perso (loisirs, courses…) valent comme proposition */
  let dic=dicoSuggest(o.label,o.amount);
  if(atype==='pro'){ const c=dic&&catById(dic.c); dic=c&&c.univers==='perso'&&o.amount<0?{c:dic.c,sur:false,pro:true}:null }
  if(dic&&dic.sur) return dic;
  if(atype!=='pro'&&VIR_INTERNE.test(norm(o.label))) return {c:'interne',sur:false};
  const kw=kwSuggestX(o.merchant,o.label,atype,o.amount);
  if(kw&&kw.sur) return kw;
  return dic||kw||null;
}
/* Range les opérations qui viennent d'être ajoutées. Renvoie {questions, sures, devinees}. */
function classerNouvelles(ops){
  S.auto=S.auto||{};
  const g={};
  for(const o of ops){ if(catOf(o)) continue;
    const k=cleAuto(o), e=g[k]||(g[k]={k,m:o.merchant,ops:[],total:0,at:acctType(o),cred:o.amount>0});
    e.ops.push(o); e.total+=Math.abs(o.amount) }
  const candidats=[]; let sures=0;
  for(const e of Object.values(g)){
    const o=e.ops[0], p=propositionPour(o,e.at);
    if(!silenceOk(e.at,o.amount)){ if(p&&!S.sugg[e.m]) S.sugg[e.m]={c:p.c,src:'kw'}; continue }
    /* Une rentrée n'est rangée sans question que si c'est clairement du perso ou un remboursement */
    if(p&&p.c==='interne'){ S.auto[e.k]={c:'interne',q:'d'}; continue }
    const rentreeSure=!e.cred||['rentrees','retraite','salaire','sante'].includes(p&&p.c)||(p&&p.sur&&typeOf(p.c)!=='income');
    if(p&&p.sur&&rentreeSure){ S.auto[e.k]={c:p.c,q:'s'}; sures++; continue }
    candidats.push({e,p});
  }
  /* Les plus gros marchands sans réponse fiable sont demandés (5 au plus, en comptant ceux qui attendent déjà) */
  const enAttente=new Set(candidats.map(c=>c.e.m));
  const deja=pendingGroups().filter(x=>!enAttente.has(x.m.replace(/\|[+-]$/,''))).length;
  let reste=Math.max(0,MAX_QUESTIONS-deja), demandes=0, montantDemande=0, montantTotal=0;
  candidats.sort((a,b)=>b.e.total-a.e.total);
  for(const {e,p} of candidats){
    montantTotal+=e.total;
    if(reste>0&&(e.total>=SEUIL_QUESTION||e.ops.length>=3)){
      reste--; demandes++; montantDemande+=e.total;
      if(p&&!S.sugg[e.m]) S.sugg[e.m]={c:p.c,src:'kw'};
    } else S.auto[e.k]={c:p&&!(e.cred&&p.c==='revenus')?p.c:(e.cred?'rentrees':'divers'),q:'d'};
  }
  S.lastClassement={questions:demandes,part:montantTotal>0?Math.round(montantDemande/montantTotal*100):100,quand:Date.now()};
  stateDirty=true;
  return {questions:demandes,sures,devinees:candidats.length-demandes};
}
/* Marchands rangés par supposition, du plus gros montant au plus petit */
function devinees(){
  const g={};
  for(const o of S.ops){ if(o.src==='rev'||sourceAuto(o)!=='d') continue;
    const k=(S.auto[cleAuto(o)]?cleAuto(o):o.merchant), e=g[k]||(g[k]={k,label:o.label,n:0,total:0,c:S.auto[k].c});
    e.n++; e.total+=o.amount }
  return Object.values(g).sort((a,b)=>Math.abs(b.total)-Math.abs(a.total));
}
/* Reclassement des opérations déjà là avec le dictionnaire à jour : seules les suppositions (« classé automatiquement », y compris « Divers ») et les opérations encore « à vérifier »
   sont refaites ; une règle de l'utilisateur ou un classement sûr n'est jamais touché. Renvoie le nombre d'opérations changées. */
function reclasserDevinees(){
  S.auto=S.auto||{};
  const ops=S.ops.filter(o=>o.src!=='rev'&&(sourceAuto(o)==='d'||!catOf(o))); if(!ops.length) return 0;
  const avant=new Map(ops.map(o=>[o.id,catOf(o)]));
  for(const o of ops){ delete S.auto[cleAuto(o)]; delete S.auto[o.merchant]; if(!catOf(o)) delete S.sugg[o.merchant] }
  classerNouvelles(ops);
  const n=ops.filter(o=>catOf(o)!==avant.get(o.id)).length;
  ops.forEach(o=>dirtyMonths.add(o.date.slice(0,7))); stateDirty=true; save(); render();
  return n;
}
/* « Tout valider » : chaque supposition devient une règle, donnée une seule fois */
function validerDevinees(){
  for(const d of devinees()){ S.rules[d.k]=d.c; delete S.auto[d.k] }
  S.ops.forEach(o=>dirtyMonths.add(o.date.slice(0,7))); stateDirty=true; save(); render();
}
function validerSuggestions(){
  for(const x of pendingGroups()){ const s=S.sugg[x.m.replace(/\|[+-]$/,'')]; if(s&&catById(s.c)) setRule(x.m,s.c) }
  render();
}
/* « Je ne sais pas » : rangé automatiquement, sans rien apprendre de définitif */
function jeNeSaisPas(m){
  const cred=/\|\+$/.test(m)||pendingGroups().some(x=>x.m===m&&x.credit);
  S.auto=S.auto||{}; S.auto[m]={c:cred?'rentrees':'divers',q:'d'}; stateDirty=true; save(); render();
}
/* Deux autres rubriques probables : les plus utilisées par l'utilisateur pour ce sens, sinon des valeurs courantes */
function rubriquesProbables(x,exclure){
  const cnt={}; for(const o of S.ops){ if((o.amount>0)!==x.credit) continue; const c=catOf(o); if(!c||c==='_pending'||typeOf(c)==='transfer'||typeOf(c)==='remu') continue; const k=catById(c); if(!k||k.univers==='pro') continue; cnt[c]=(cnt[c]||0)+1 }
  const defaut=x.credit?['rentrees','remb','retraite']:['courses','resto','shopping','transport'];
  return [...Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]),...defaut].filter((c,i,t)=>t.indexOf(c)===i&&!exclure.includes(c)&&catById(c)&&(!x.credit||typeOf(c)==='income'||c==='remb')).slice(0,2);
}
/* Part des dépenses classées, sur une période : {ok, devine, attente} en % des montants */
function partClassee(p){
  const [a,z]=bounds(p); let ok=0,dv=0,att=0;
  for(const k of monthKeys(a,z)) for(const o of (BYMONTH[k]||[])){
    if(o.amount>=0||o.src==='rev'||(INTERNAL[o.id]&&!o.cat)) continue;
    const c=catOf(o), v=-o.amount;
    if(!c) att+=v; else if(typeOf(c)==='transfer') continue; else if(sourceAuto(o)==='d') dv+=v; else ok+=v }
  const t=ok+dv+att; if(t<=0) return null;
  return {classe:Math.round((ok+dv)/t*100),devine:Math.round(dv/t*100),attente:Math.round(att/t*100)};
}
