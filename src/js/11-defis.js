/* ============ Défis, score, niveaux, médailles, cagnotte, série ============ */
const todayStr=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const addDays=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const daysBetween=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);
const monthEnd=ym=>{const [y,m]=ym.split('-').map(Number);return ym+'-'+pad(new Date(y,m,0).getDate())};
const mondayOf=s=>{const d=new Date(s+'T12:00:00');return addDays(s,-((d.getDay()+6)%7))};
const moisDe=ym=>MOIS[+ym.slice(5,7)-1];
const clamp=x=>Math.max(0,Math.min(1,x));
const ONLINE=new Set(['AMAZON','ZALANDO','VINTED','SHEIN','TEMU','CDISCOUNT','ETSY','ALIEXPRESS','ASOS','LA REDOUTE','VEEPEE','BACK MARKET']);
const DIFF={facile:{l:'Facile',pts:50},moyen:{l:'Moyen',pts:100},difficile:{l:'Difficile',pts:200}};
const KINDS=[['semaine','Cette semaine'],['mois','Ce mois-ci'],['pro','Côté pro'],['serie','Séries'],['saison','De saison']];
const DEFIS=[
  {id:'noresto',kind:'mois',diff:'difficile',type:'zero',sel:{cats:['resto']},name:'Un mois sans restaurant',desc:'Aucune dépense en Restaurants & cafés de tout le mois.'},
  {id:'noshop',kind:'mois',diff:'moyen',type:'zero',sel:{cats:['shopping']},name:'Zéro shopping',desc:'Aucun achat en Shopping de tout le mois.'},
  {id:'courses10',kind:'mois',diff:'facile',type:'pct',pct:.9,sel:{cats:['courses']},name:'Courses −10 %',desc:'Des courses 10 % sous votre moyenne des trois derniers mois.'},
  {id:'loisirs20',kind:'mois',diff:'moyen',type:'pct',pct:.8,sel:{cats:['loisirs']},name:'Loisirs −20 %',desc:'Des loisirs 20 % sous votre moyenne des trois derniers mois.'},
  {id:'variables15',kind:'mois',diff:'difficile',type:'pct',pct:.85,sel:{cats:'variables'},name:'Dépenses variables −15 %',desc:'Toutes vos dépenses personnelles hors charges fixes, 15 % sous votre moyenne.'},
  {id:'lisse',kind:'mois',diff:'moyen',type:'lisse',name:'Sous vos rentrées lissées',desc:'Dépenser moins que vos rentrées moyennes des douze derniers mois.'},
  {id:'epargne10',kind:'mois',diff:'moyen',type:'epargne',name:'Garder 10 % de côté',desc:'Finir le mois avec au moins 10 % de vos rentrées personnelles non dépensées.'},
  {id:'budgets',kind:'mois',diff:'difficile',pts:150,type:'budgets',name:'Tous les budgets tenus',desc:'Aucun des postes pour lesquels vous avez fixé un budget ne le dépasse.'},
  {id:'noabo',kind:'mois',diff:'facile',type:'noabo',name:'Aucun nouvel abonnement',desc:'Pas un seul nouveau prélèvement d’abonnement ou de logiciel ce mois-ci.'},
  {id:'h-enligne',kind:'semaine',diff:'facile',pts:30,type:'zero',sel:{online:true},name:'7 jours sans achat en ligne',desc:'Ni Amazon, ni Zalando, ni Vinted, ni aucune autre boutique en ligne pendant une semaine.'},
  {id:'h-resto',kind:'semaine',diff:'moyen',pts:40,type:'zero',sel:{cats:['resto']},name:'7 jours sans restaurant ni café',desc:'Une semaine de cuisine maison.'},
  {id:'h-courses',kind:'semaine',diff:'moyen',pts:40,type:'max',max:80,sel:{cats:['courses']},name:'Courses sous 80 € cette semaine',desc:'Faire ses courses de la semaine avec 80 € au plus.'},
  {id:'h-sobre',kind:'semaine',diff:'difficile',pts:60,type:'max',max:100,sel:{cats:'variables'},name:'Semaine sobre',desc:'Moins de 100 € de dépenses personnelles hors charges fixes en sept jours.'},
  {id:'p-taux',kind:'pro',diff:'moyen',pts:150,type:'taux',name:'Au-dessus de votre taux visé',desc:'Un revenu net qui atteint votre objectif ce mois-ci.'},
  {id:'p-frais10',kind:'pro',diff:'moyen',type:'pct',pct:.9,sel:{cats:'pro'},name:'Frais pro −10 %',desc:'Des frais professionnels 10 % sous votre moyenne, hors cotisations et impôts.'},
  {id:'p-encaisser',kind:'pro',diff:'difficile',pts:150,type:'encaisser',name:'Objectif d’encaissement',desc:'Encaisser le montant que vous choisissez ce mois-ci.'},
  {id:'p-provision',kind:'pro',diff:'difficile',type:'serie',n:3,test:'provision',name:'Provision préservée, 3 mois de suite',desc:'Ne pas vous verser plus que votre revenu net : la provision reste sur le compte pro.'},
  {id:'s-budget3',kind:'serie',diff:'moyen',pts:150,type:'serie',n:3,test:'solde',name:'3 mois dans le vert',desc:'Trois mois d’affilée où vos rentrées personnelles couvrent vos dépenses.'},
  {id:'s-budget6',kind:'serie',diff:'difficile',pts:300,type:'serie',n:6,test:'solde',name:'6 mois dans le vert',desc:'Six mois d’affilée où vos rentrées personnelles couvrent vos dépenses.'},
  {id:'s-budget12',kind:'serie',diff:'difficile',pts:600,type:'serie',n:12,test:'solde',name:'Une année dans le vert',desc:'Douze mois d’affilée où vos rentrées personnelles couvrent vos dépenses.'},
  {id:'s-seuil3',kind:'serie',diff:'moyen',pts:150,type:'serie',n:3,test:'seuil',name:'3 mois au-dessus du seuil',desc:'Trois mois d’affilée au-dessus de votre revenu net visé.'},
  {id:'s-seuil6',kind:'serie',diff:'difficile',pts:300,type:'serie',n:6,test:'seuil',name:'6 mois au-dessus du seuil',desc:'Six mois d’affilée au-dessus de votre revenu net visé.'},
  {id:'s-seuil12',kind:'serie',diff:'difficile',pts:600,type:'serie',n:12,test:'seuil',name:'Une année au-dessus du seuil',desc:'Douze mois d’affilée au-dessus de votre revenu net visé.'},
  {id:'sa-janvier',kind:'saison',mois:1,diff:'moyen',pts:150,type:'pct',pct:.8,sel:{cats:'variables'},name:'Janvier sobre',desc:'Après les fêtes, des dépenses variables 20 % sous votre moyenne.'},
  {id:'sa-rentree',kind:'saison',mois:9,diff:'moyen',pts:120,type:'pct',pct:1,sel:{cats:['shopping','loisirs']},name:'Une rentrée maîtrisée',desc:'Shopping et loisirs de septembre sans dépasser votre moyenne.'},
  {id:'sa-fetes',kind:'saison',mois:12,diff:'difficile',pts:150,type:'pct',pct:1.2,sel:{cats:['shopping']},name:'Des fêtes sans excès',desc:'Des achats de décembre qui restent sous 120 % de votre moyenne.'}
];
const ptsDe=D=>D.pts||DIFF[D.diff].pts;
function defiDef(c){
  if(c.id==='auto'){const k=catById(c.cat);const n=k?k.name:'Ce poste';
    return {id:'auto',kind:'mois',diff:'moyen',pts:120,type:'pct',pct:1-c.pct,sel:{cats:[c.cat]},name:`${n} −${Math.round(c.pct*100)} %`,desc:`Le défi du mois, choisi d’après votre poste variable le plus lourd.`}}
  return DEFIS.find(d=>d.id===c.id);
}
/* Dépenses nettes (remboursements déduits) d'une sélection, entre deux dates */
function depenses(sel,from,to){
  let s=0;
  for(const k of monthKeys(from.slice(0,7),to.slice(0,7))) for(const o of (BYMONTH[k]||[])){
    if(o.date<from||o.date>to||o.src==='rev') continue;
    if(sel.online){if(o.amount<0&&ONLINE.has(o.merchant))s+=-o.amount;continue}
    const c=catOf(o); if(!c||c==='interne') continue; const k2=catById(c); if(!k2||k2.type!=='expense') continue;
    if(sel.cats==='variables'){if(k2.fixed||PROV_CATS.has(c)||opUniv(o)!=='perso')continue}
    else if(sel.cats==='pro'){if(PROV_CATS.has(c)||opUniv(o)!=='pro')continue}
    else if(!sel.cats.includes(c)) continue;
    s+=-o.amount;
  }
  return s;
}
/* Moyenne mensuelle des trois mois précédents qui ont des données */
function baseMois(sel,ym){
  const [y,m]=ym.split('-').map(Number), v=[];
  for(let i=1;i<=3;i++){const p=shift({lvl:'M',y,m},-i);const k=p.y+'-'+pad(p.m);if(BYMONTH[k]&&BYMONTH[k].length)v.push(depenses(sel,k+'-01',monthEnd(k)))}
  return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;
}
const moisAgg=(ym,U)=>{const [y,m]=ym.split('-').map(Number);return agg({lvl:'M',y,m},U)};
const couvert=to=>lastOpDate()>=addDays(to,-3);
function nouveauxAbos(ym){
  const debut=ym+'-01', seen=new Set(); let n=0;
  for(const o of (BYMONTH[ym]||[])){ if(o.amount>=0||seen.has(o.merchant)) continue; const c=catOf(o); if(!SUBS.has(c)) continue; seen.add(o.merchant);
    if(!S.ops.some(x=>x.merchant===o.merchant&&x.amount<0&&x.date<debut)) n++ }
  return n;
}
function testMois(test,ym){
  if(test==='solde'){const a=moisAgg(ym,'perso');return a.any&&a.income-a.net>=0}
  if(test==='seuil'){const a=moisAgg(ym,'pro');return a.any&&a.revenuNet>=netVise()}
  if(test==='provision'){const a=moisAgg(ym,'pro');return a.any&&a.remu<=Math.max(0,a.revenuNet)+0.5}
  return false;
}
/* Évaluation d'un défi relevé. Le verdict attend le relevé qui couvre la fin de la période. */
function evalDefi(c){
  const D=defiDef(c); if(!D) return null;
  const today=todayStr();
  let from,to;
  if(D.kind==='semaine'){from=c.week;to=addDays(c.week,6)}
  else if(D.type==='serie'){from=c.month+'-01';const [y,m]=c.month.split('-').map(Number);const e=shift({lvl:'M',y,m},D.n-1);to=monthEnd(e.y+'-'+pad(e.m))}
  else {from=c.month+'-01';to=monthEnd(c.month)}
  const ym=from.slice(0,7), fini=today>to, cov=D.kind==='semaine'?lastOpDate()>=to:couvert(to);
  let v=0,target=0,ok=false,higher=false,failEarly=false,base=0,prog=0,txt='';
  const jours=fini?0:daysBetween(today<from?from:today,to)+1;
  switch(D.type){
    case 'zero':{v=depenses(D.sel,from,to);base=baseMois(D.sel,ym)*(D.kind==='semaine'?7/30:1);ok=v<=0.005;failEarly=!ok;
      const couv=lastOpDate()<from?0:clamp((daysBetween(from,lastOpDate()>to?to:lastOpDate())+1)/(daysBetween(from,to)+1));
      prog=ok?couv:1;txt=ok?(cov?'Aucune dépense sur toute la période.':lastOpDate()<from?'Pas encore de relevé pour cette période.':'Aucune dépense pour l’instant, continuez.'):`${eur0(v)} dépensés.`;break}
    case 'pct':{base=baseMois(D.sel,ym);target=base*D.pct;v=depenses(D.sel,from,to);ok=base>0&&v<=target;prog=target?v/target:0;
      txt=base?`${eur0(v)} sur ${eur0(target)} au plus${v<target?`, il reste ${eur0(target-v)}`:''}.`:'Pas assez d’historique pour ce poste : il faut quelques mois de relevés.';break}
    case 'max':{target=D.max;base=baseMois(D.sel,ym)*7/30;v=depenses(D.sel,from,to);ok=v<=target;prog=v/target;failEarly=!ok;
      txt=`${eur0(v)} sur ${eur0(target)} au plus${v<target?`, il reste ${eur0(target-v)}`:''}.`;break}
    case 'lisse':{target=stats({lvl:'M',y:+ym.slice(0,4),m:+ym.slice(5,7)},'all').lisse;v=moisAgg(ym,'all').net;ok=target>0&&v<=target;prog=target?v/target:0;
      txt=`${eur0(v)} dépensés, pour ${eur0(target)} de rentrées lissées.`;break}
    case 'epargne':{const a=moisAgg(ym,'perso');target=.1*a.income;v=a.income-a.net;higher=true;ok=a.income>0&&v>=target;prog=target>0?v/target:0;
      txt=`${signed(v)} gardés, pour ${eur0(target)} visés.`;break}
    case 'budgets':{const cs=S.categories.filter(k=>k.budget>0), a=moisAgg(ym,'all');
      v=cs.filter(k=>(a.by[k.id]?.net||0)>k.budget).length;target=cs.length;ok=cs.length>0&&v===0;failEarly=v>0;prog=cs.length?(cs.length-v)/cs.length:0;
      txt=cs.length?(v?`${v} budget${v>1?'s':''} dépassé${v>1?'s':''} sur ${cs.length}.`:`${cs.length} budget${cs.length>1?'s':''} tenu${cs.length>1?'s':''} pour l’instant.`):'Fixez d’abord au moins un budget dans Réglages.';break}
    case 'noabo':{v=nouveauxAbos(ym);ok=v===0;failEarly=!ok;prog=ok?1:0;txt=ok?'Aucun nouvel abonnement pour l’instant.':`${v} nouvel${v>1?'s':''} abonnement${v>1?'s':''}.`;break}
    case 'taux':{const a=moisAgg(ym,'pro');target=netVise();v=a.revenuNet;higher=true;ok=a.any&&v>=target;prog=target?v/target:0;
      txt=`${eur(v/heures())} de l’heure, pour ${eur(tauxCible())} visés.`;break}
    case 'encaisser':{target=+c.montant||0;v=moisAgg(ym,'pro').ca;higher=true;ok=target>0&&v>=target;prog=target?v/target:0;
      txt=`${eur0(v)} encaissés, pour ${eur0(target)} visés.`;break}
    case 'serie':{const [y,m]=c.month.split('-').map(Number);let bons=0;
      for(let i=0;i<D.n;i++){const p=shift({lvl:'M',y,m},i),k=p.y+'-'+pad(p.m);if(!couvert(monthEnd(k)))break;if(testMois(D.test,k))bons++;else{failEarly=true;break}}
      target=D.n;v=bons;ok=bons===D.n;prog=bons/D.n;txt=`${bons} mois sur ${D.n}.`;break}
  }
  let status;
  if(D.type==='serie') status=failEarly?'manqué':ok?'réussi':fini&&!cov?'en attente':'en cours';
  else if(failEarly&&!higher) status='manqué';
  else if(higher&&ok) status='réussi';
  else if(cov) status=ok?'réussi':'manqué';
  else status=fini?'en attente':'en cours';
  if(status==='en attente') txt+=` En attente de votre relevé de ${moisDe(to.slice(0,7))} pour conclure.`;
  const economie=status==='réussi'&&base>0?Math.max(0,base-v):0;
  return {...D,c,key:c.key,month:c.month||from.slice(0,7),from,to,status,ok,v,target,prog:clamp(prog),txt,progress:txt,economie,jours,pts:ptsDe(D)};
}
/* Défi du mois : −20 à −25 % sur le poste variable le plus lourd */
function defiPropose(){
  const tm=thisMonth(); if(S.challenges.some(c=>c.id==='auto'&&c.month===tm)) return null;
  const cs=S.categories.filter(k=>k.type==='expense'&&!k.fixed&&k.univers!=='pro'&&!PROV_CATS.has(k.id)&&!['remb','divers'].includes(k.id));
  const best=cs.map(k=>({k,avg:baseMois({cats:[k.id]},tm)})).sort((a,b)=>b.avg-a.avg)[0];
  if(!best||best.avg<80) return null;
  const pct=best.avg>=300?.25:.2;
  return {cat:best.k.id,pct,avg:best.avg,texte:`Vos dépenses en ${best.k.name.toLowerCase()} s’élèvent à ${eur0(best.avg)} par mois : défi −${Math.round(pct*100)} % ce mois-ci, soit ${eur0(best.avg*pct)} d’économie.`};
}

/* ---------- Mois complets et série ---------- */
let GAME={};
function moisDonnees(){if(GAME.md)return GAME.md;return GAME.md=Object.keys(BYMONTH).filter(k=>BYMONTH[k].some(o=>o.src!=='rev')).sort()}
function moisComplets(){if(GAME.mc)return GAME.mc;const md=moisDonnees();return GAME.mc=md.filter(k=>couvert(monthEnd(k)))}
const moisClasse=k=>(BYMONTH[k]||[]).every(o=>o.src==='rev'||catOf(o));
function serie(){
  const md=moisDonnees(); if(!md.length) return {n:0,best:0};
  let n=0,best=0,run=0,prev=null;
  for(const k of md){const suit=prev&&(()=>{const [y,m]=prev.split('-').map(Number);const p=shift({lvl:'M',y,m},1);return p.y+'-'+pad(p.m)===k})();
    run=moisClasse(k)?(suit||!prev?run+1:1):0; if(!moisClasse(k)) run=0; best=Math.max(best,run); prev=k}
  const last=md[md.length-1], pc=shift({lvl:'M',y:+thisMonth().slice(0,4),m:+thisMonth().slice(5,7)},-2), limite=pc.y+'-'+pad(pc.m);
  n=last>=limite?run:0;
  const enAttente=!moisClasse(last)?(BYMONTH[last]||[]).filter(o=>o.src!=='rev'&&!catOf(o)).length:0;
  if(enAttente){let r=0,p=null;for(const k of md.slice(0,-1)){r=moisClasse(k)?r+1:0;p=k}n=last>=limite?r:0}
  return {n,best,last,enAttente};
}

/* ---------- Score de santé financière ---------- */
function scoreSante(p){
  const k=p.y+'-'+pad(p.m); if(GAME['s'+k]) return GAME['s'+k];
  const X=agg(p,'pro'), A=agg(p,'all'), st=stats(p,'all'), parts=[];
  if(X.any&&X.ca>0){const r=X.revenuNet/netVise(), t=X.revenuNet/heures();
    parts.push({id:'taux',label:'Taux horaire réel',max:25,pts:25*clamp(r),txt:r>=1?`Votre heure rapporte ${eur(t)}, au-dessus des ${eur(tauxCible())} visés.`:`Votre heure rapporte ${eur(t)}, pour ${eur(tauxCible())} visés.`})}
  if(st.autonomie!=null){const o=+S.settings.objectif||6;
    parts.push({id:'matelas',label:'Matelas de sécurité',max:20,pts:20*clamp(st.autonomie/o),txt:`${fmt1(st.autonomie)} mois d’autonomie, pour ${o} visés.`})}
  if(+S.settings.taux>0&&X.any){let cumul=0,paye=0;for(let i=1;i<=p.m;i++){const R=aggRaw({lvl:'M',y:p.y,m:i});cumul+=R.pro.provision;paye+=R.pro.provPaid}
    if(cumul>0){const r=paye/cumul;parts.push({id:'provision',label:'Provision mise de côté',max:15,pts:15*clamp(r/.8),txt:`${eur0(paye)} de cotisations et impôts payés, pour ${eur0(cumul)} provisionnés depuis janvier.`})}}
  if(A.any){const s=A.income-A.net;parts.push({id:'solde',label:'Solde du mois',max:15,pts:15*(s>=0?1:clamp(1+s/Math.max(1,A.income))),txt:s>=0?`Il vous reste ${eur0(s)}.`:`Il est sorti ${eur0(-s)} de plus que ce qui est entré.`})}
  const n3=[0,1,2].filter(i=>{const q=shift(p,-i);return (BYMONTH[q.y+'-'+pad(q.m)]||[]).length}).length;
  parts.push({id:'imports',label:'Régularité des imports',max:10,pts:10*n3/3,txt:`${n3} mois importé${n3>1?'s':''} sur les 3 derniers.`});
  const ops=(BYMONTH[k]||[]).filter(o=>o.src!=='rev');
  if(ops.length){const c=ops.filter(o=>catOf(o)).length;parts.push({id:'classees',label:'Dépenses classées',max:15,pts:15*c/ops.length,txt:c===ops.length?'Tout est classé.':`${ops.length-c} opération${ops.length-c>1?'s':''} à classer sur ${ops.length}.`})}
  const max=parts.reduce((s,x)=>s+x.max,0), pts=parts.reduce((s,x)=>s+x.pts,0);
  return GAME['s'+k]={score:max?Math.round(pts/max*100):0,parts,any:!!ops.length};
}

/* ---------- Cagnotte des économies ---------- */
function cagnotte(){
  if(GAME.cag) return GAME.cag;
  const defis=(GAME.defis||[]).filter(x=>x.status==='réussi').reduce((s,x)=>s+x.economie,0);
  const tot=economiesSur(moisComplets().slice(-12));
  return GAME.cag={tot:Math.max(tot,defis),defis};
}
function economiesSur(mois){
  const cs=S.categories.filter(k=>k.type==='expense'&&!k.fixed&&k.univers!=='pro'&&!PROV_CATS.has(k.id)&&k.id!=='remb');
  let tot=0;
  for(const k of mois) for(const c of cs){const base=baseMois({cats:[c.id]},k);if(base<50)continue;const v=depenses({cats:[c.id]},k+'-01',monthEnd(k));if(v<base)tot+=base-v}
  return tot;
}

/* ---------- Médailles à paliers ---------- */
const FAM=[['epargne','Épargne'],['revenus','Revenus'],['postes','Maîtrise des postes'],['regularite','Régularité'],['defis','Défis'],['pro','Pro']];
const unit_=(n,s,p)=>`${fmt1(n)} ${n>1?p:s}`;
function metriques(){
  if(GAME.met) return GAME.met;
  const mc=moisComplets(), mois=mc.map(k=>({k,all:moisAgg(k,'all'),pro:moisAgg(k,'pro'),pe:moisAgg(k,'perso')}));
  const longest=f=>{let r=0,b=0;for(const x of mois){r=f(x)?r+1:0;b=Math.max(b,r)}return b};
  const d=(GAME.defis||[]).filter(x=>x.status==='réussi');
  const st=stats(defaultPeriod(),'all'), tr=tresoPro(), du=resteAProvisionner();
  const moyCA=mois.length?mois.reduce((s,x)=>s+x.pro.ca,0)/mois.length:0;
  let budgets=0,baisses=0;
  for(const x of mois){for(const c of S.categories)if(c.budget>0&&x.all.by[c.id]&&x.all.by[c.id].net<=c.budget)budgets++;
    for(const [cid,e] of Object.entries(x.pe.by)){if(cid==='_pending')continue;const b=baseMois({cats:[cid]},x.k);if(b>=50&&e.net<b*.75)baisses++}}
  const d12=mois.slice(-12);
  return GAME.met={
    matelas:st.autonomie||0, cagnotte:cagnotte().tot,
    positifs:mois.filter(x=>x.all.any&&x.all.income-x.all.net>=0).length,
    dix:mois.filter(x=>x.pe.income>0&&x.pe.income-x.pe.net>=.1*x.pe.income).length,
    seriePos:longest(x=>x.all.income-x.all.net>=0),
    seuil:mois.filter(x=>x.pro.any&&x.pro.revenuNet>=netVise()).length,
    serieSeuil:longest(x=>x.pro.any&&x.pro.revenuNet>=netVise()),
    tauxMax:Math.max(0,...mois.filter(x=>x.pro.any).map(x=>x.pro.revenuNet/netVise()*100)),
    ca12:d12.reduce((s,x)=>s+x.pro.ca,0),
    stable:mois.filter(x=>x.pro.any&&moyCA>0&&x.pro.ca>=.7*moyCA).length,
    budgets,baisses,
    sansFrais:mois.filter(x=>!(x.all.by.frais?.net>0)).length,
    retours:Object.keys(LINK).length,
    sansShopping:mois.filter(x=>!(x.pe.by.shopping?.net>0)).length,
    suivis:moisDonnees().length, serieMax:serie().best,
    classes:moisDonnees().filter(moisClasse).length, regles:Object.keys(S.rules).length, sauvegardes:(S.game&&S.game.backups)||0,
    reussis:d.length, difficiles:d.filter(x=>x.diff==='difficile').length, hebdo:d.filter(x=>x.kind==='semaine').length,
    series:d.filter(x=>x.type==='serie').length, saison:d.filter(x=>x.kind==='saison').length,
    urssaf:mois.filter(x=>x.pro.provPaid>0).length, remu:mois.filter(x=>x.pro.remu>0).length,
    fraisPro:mois.filter(x=>x.pro.ca>0&&x.pro.fraisExpl<.1*x.pro.ca).length,
    treso:tr&&tr.t!=null?tr.t-du.du:0, net12:d12.reduce((s,x)=>s+x.pro.revenuNet,0)
  };
}
const MEDAILLES=[
  ['epargne','matelas','Matelas','shield',[1,3,6],v=>unit_(v,'mois','mois')+' d’autonomie'],
  ['epargne','cagnotte','Cagnotte','piggy-bank',[100,500,1500],v=>eur0(v)+' économisés'],
  ['epargne','positifs','Mois dans le vert','sprout',[3,6,12],v=>unit_(v,'mois','mois')+' avec un solde positif'],
  ['epargne','dix','Fourmi','coins',[1,3,6],v=>unit_(v,'mois','mois')+' avec 10 % gardés'],
  ['epargne','seriePos','Constance','infinity',[2,4,8],v=>unit_(v,'mois','mois')+' positifs d’affilée'],
  ['revenus','seuil','Objectif atteint','badge-check',[1,4,9],v=>unit_(v,'mois','mois')+' au-dessus du seuil'],
  ['revenus','serieSeuil','Belle lancée','trending-up',[2,4,8],v=>unit_(v,'mois','mois')+' d’affilée au-dessus du seuil'],
  ['revenus','tauxMax','Juste prix','gem',[100,125,150],v=>`${Math.round(v)} % du taux visé, au mieux`],
  ['revenus','ca12','Carnet de commandes','briefcase',[20000,40000,60000],v=>eur0(v)+' encaissés sur 12 mois'],
  ['revenus','stable','Sans creux','activity',[3,6,12],v=>unit_(v,'mois','mois')+' sans creux'],
  ['postes','budgets','Budget tenu','gauge',[3,12,30],v=>unit_(v,'budget tenu','budgets tenus')],
  ['postes','baisses','Coup de rabot','scissors',[1,5,12],v=>unit_(v,'poste en forte baisse','postes en forte baisse')],
  ['postes','sansFrais','Zéro frais','landmark',[1,3,6],v=>unit_(v,'mois','mois')+' sans frais bancaires'],
  ['postes','retours','Rien de perdu','rotate-ccw',[1,3,6],v=>unit_(v,'remboursement récupéré','remboursements récupérés')],
  ['postes','sansShopping','Garde-robe sage','shirt',[1,2,4],v=>unit_(v,'mois','mois')+' sans shopping'],
  ['regularite','suivis','Assiduité','calendar-check',[3,6,12],v=>unit_(v,'mois suivi','mois suivis')],
  ['regularite','serieMax','Métronome','flame',[3,6,12],v=>unit_(v,'mois','mois')+' classés d’affilée'],
  ['regularite','classes','Tout est rangé','check-check',[1,6,12],v=>unit_(v,'mois entièrement classé','mois entièrement classés')],
  ['regularite','regles','Mémoire','book-open',[10,30,60],v=>unit_(v,'règle apprise','règles apprises')],
  ['regularite','sauvegardes','Prudence','hard-drive-download',[1,3,6],v=>unit_(v,'sauvegarde','sauvegardes')],
  ['defis','reussis','Défis relevés','target',[1,5,15],v=>unit_(v,'défi réussi','défis réussis')],
  ['defis','difficiles','Haute voltige','mountain',[1,3,6],v=>unit_(v,'défi difficile','défis difficiles')],
  ['defis','hebdo','Sprint','timer',[1,4,10],v=>unit_(v,'défi de la semaine','défis de la semaine')],
  ['defis','series','Endurance','medal',[1,2,4],v=>unit_(v,'série réussie','séries réussies')],
  ['defis','saison','Quatre saisons','leaf',[1,2,3],v=>unit_(v,'défi de saison','défis de saison')],
  ['pro','urssaf','En règle','shield-check',[3,6,12],v=>unit_(v,'mois','mois')+' de cotisations payées'],
  ['pro','remu','Salaire régulier','hand-coins',[3,6,12],v=>unit_(v,'mois','mois')+' de rémunération versée'],
  ['pro','fraisPro','Frais légers','feather',[3,6,12],v=>unit_(v,'mois','mois')+' avec des frais sous 10 % du chiffre d’affaires'],
  ['pro','treso','Trésorerie saine','vault',[1000,3000,6000],v=>signed(v)+' disponibles après provision'],
  ['pro','net','Revenu net','crown',[10000,25000,50000],v=>eur0(v)+' nets sur 12 mois']
];
const PALIERS=['bronze','argent','or'];
function medailles(){
  if(GAME.med) return GAME.med;
  const M=metriques();
  return GAME.med=MEDAILLES.map(([fam,id,name,icon,seuils,fmtv])=>{const v=M[id==='net'?'net12':id]||0;const tier=seuils.filter(s=>v>=s).length;
    return {fam,id,name,icon,tier,v,seuils,txt:fmtv(v),next:tier<3?seuils[tier]:null,prog:tier<3?clamp(v/seuils[tier]):1,nextTxt:tier<3?fmtv(seuils[tier]):''}});
}

/* ---------- Expérience et niveaux ---------- */
const NIVEAUX=[[0,'Apprenti','Vous apprenez les gestes : importer, classer, regarder.'],[300,'Compagnon','Vos comptes sont tenus avec régularité. Le métier rentre.'],
  [800,'Artisan','Vous savez où va votre argent, et pourquoi.'],[1600,'Artisan confirmé','Vos postes sont sous contrôle, vos défis tenus.'],
  [2800,'Maître artisan','Votre activité et votre budget avancent au même pas.'],[4500,'Maître d’œuvre','Vous pilotez vos finances comme un chantier bien mené.'],
  [7000,'Maître','Une gestion sereine, qui ne doit rien au hasard.'],[10000,'Grand maître','Le chef-d’œuvre : des comptes exemplaires, mois après mois.']];
function experience(){
  if(GAME.xp) return GAME.xp;
  const md=moisDonnees(), d=(GAME.defis||[]).filter(x=>x.status==='réussi'), med=medailles(), M=metriques();
  const lignes=[
    ['Mois de relevés importés',md.length,50],
    ['Mois entièrement classés',md.filter(moisClasse).length,20],
    ['Règles apprises',Math.min(100,Object.keys(S.rules).length),2],
    ['Budgets tenus',M.budgets,30],
    ['Défis réussis',d.length,null,d.reduce((s,x)=>s+x.pts,0)],
    ['Médailles de bronze',med.filter(x=>x.tier>=1).length,20],['Médailles d’argent',med.filter(x=>x.tier>=2).length,40],['Médailles d’or',med.filter(x=>x.tier>=3).length,80]
  ].map(([l,n,p,xp])=>({l,n,xp:xp!=null?xp:n*p}));
  const total=lignes.reduce((s,x)=>s+x.xp,0);
  let i=0; while(i+1<NIVEAUX.length&&total>=NIVEAUX[i+1][0]) i++;
  return GAME.xp={total,lignes,i,nom:NIVEAUX[i][1],desc:NIVEAUX[i][2],min:NIVEAUX[i][0],max:i+1<NIVEAUX.length?NIVEAUX[i+1][0]:null,suivant:i+1<NIVEAUX.length?NIVEAUX[i+1][1]:null};
}
function prepareJeu(){GAME={};GAME.defis=S.challenges.map(evalDefi).filter(Boolean)}

/* ---------- Célébration d'un nouveau niveau ---------- */
function verifierNiveau(){
  S.game=S.game||{};
  if(!S.ops.length){if(S.game.seenLevel==null&&!demo)S.game.seenLevel=0;return}
  const x=experience();
  if(demo){if(S.game.seenLevel==='demo'&&view==='defis'){S.game.seenLevel=x.i;celebrer(x)}return}
  if(S.game.seenLevel==null||S.game.seenLevel==='demo'){S.game.seenLevel=x.i;stateDirty=true;save();return}
  if(x.i>S.game.seenLevel){S.game.seenLevel=x.i;stateDirty=true;save();celebrer(x)}
}
function celebrer(x){
  if($('#celebre')) return;
  document.body.insertAdjacentHTML('beforeend',`<div id="celebre" role="dialog" aria-modal="true" aria-label="Nouveau niveau"><div class="celebre-in">
    <svg viewBox="0 0 120 120" class="anneau" aria-hidden="true"><circle cx="60" cy="60" r="52" class="fond"/><circle cx="60" cy="60" r="52" class="trace"/></svg>
    <p class="kick">Nouveau niveau</p><h2>${esc(x.nom)}</h2><p class="desc">${esc(x.desc)}</p>
    <p class="note">${new Intl.NumberFormat('fr-FR').format(x.total)} points d’expérience${x.suivant?`. Prochaine étape : ${esc(x.suivant)}, à ${new Intl.NumberFormat('fr-FR').format(x.max)} points.`:'.'}</p>
    <button class="btn" data-act="closecelebre">Continuer</button></div></div>`);
  setTimeout(()=>$('#celebre [data-act="closecelebre"]')?.focus(),50);
}

/* ---------- Écrans ---------- */
function anneau(p,size,cls){const r=size/2-4,C=2*Math.PI*r;return `<svg class="ring ${cls||''}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="3"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="${C*clamp(p)} ${C}" transform="rotate(-90 ${size/2} ${size/2})"/></svg>`}
function jaugeScore(s){const R=70,C=2*Math.PI*R,arc=C*.75;
  return `<svg viewBox="0 0 180 160" class="jauge" role="img" aria-label="Score de santé financière : ${s} sur 100">
    <circle cx="90" cy="90" r="${R}" fill="none" stroke="var(--line)" stroke-width="6" stroke-dasharray="${arc} ${C}" transform="rotate(135 90 90)" stroke-linecap="round"/>
    <circle cx="90" cy="90" r="${R}" fill="none" stroke="${s<40?'var(--alert)':s<65?'var(--amber)':'var(--gold)'}" stroke-width="6" stroke-dasharray="${arc*s/100} ${C}" transform="rotate(135 90 90)" stroke-linecap="round" class="jauge-v"/>
    <text x="90" y="98" text-anchor="middle" font-family="Bodoni Moda, Didot, serif" font-size="46" fill="var(--ink)">${s}</text>
    <text x="90" y="122" text-anchor="middle" font-family="Jost, sans-serif" font-size="11" fill="var(--muted)" letter-spacing="1.5">SUR 100</text></svg>`}
function motScore(s){return s>=85?'Excellente santé financière.':s>=65?'Bonne santé financière.':s>=40?'Quelques points à surveiller.':'Votre situation demande de l’attention.'}
function vGoals(){
  const st=stats(P,'all'), obj=+S.settings.objectif||6, pm=P.lvl==='M'?P:{lvl:'M',...endOf(P)};
  const sc=scoreSante(pm), e=endOf(P);
  const hist=monthsTo(e.y,e.m,12).map(q=>({q,s:(BYMONTH[q.y+'-'+pad(q.m)]||[]).length?scoreSante(q).score:null}));
  const W=600,H=110,gap=W/12,bw=gap*.42;
  const pts=st.ms.map(x=>({l:MOIS[x.q.m-1].slice(0,1),v:x.a.income}));
  const max=Math.max(1,st.lisse,...pts.map(p=>p.v)), CH=170,bh=130, ly=bh-st.lisse/max*(bh-14);
  const cg=cagnotte(), G=(S.game&&S.game.cagnotte)||{};
  const up=sc.parts.filter(x=>x.pts>=x.max*.7), down=sc.parts.filter(x=>x.pts<x.max*.7);
  return periodBar()+`
  <section class="block score-block"><h3 class="sec">Score de santé financière</h3>
    ${sc.any?`<div class="score-top">${jaugeScore(sc.score)}<div><p class="score-mot">${motScore(sc.score)}</p><p class="note">Calculé sur ${MOIS[pm.m-1]} ${pm.y}, à partir de six critères. Chacun compte selon son importance.</p></div></div>
    ${down.length?`<h4 class="sous">Ce qui fait baisser votre score</h4>${down.map(x=>`<div class="row"><span>${x.label}</span><b class="m-${x.pts<x.max*.4?'crit':'warn'}">${Math.round(x.pts)} / ${x.max}</b><span class="sub">${esc(x.txt)}</span></div>`).join('')}`:''}
    ${up.length?`<h4 class="sous">Ce qui fait monter votre score</h4>${up.map(x=>`<div class="row"><span>${x.label}</span><b class="m-good">${Math.round(x.pts)} / ${x.max}</b><span class="sub">${esc(x.txt)}</span></div>`).join('')}`:''}
    <h4 class="sous">Sur douze mois</h4>
    <div class="chart" style="margin-bottom:0"><svg viewBox="0 0 ${W} ${H+24}" role="img" aria-label="Évolution du score sur douze mois">
      ${hist.map((x,i)=>{const cx=i*gap+gap/2;const h=x.s==null?0:Math.max(2,x.s/100*H);return `${x.s==null?'':`<rect x="${cx-bw/2}" y="${H-h}" width="${bw}" height="${h}" fill="${x.s<40?'var(--alert)':x.s<65?'var(--amber)':'var(--gold)'}" opacity="${x.q.m===pm.m&&x.q.y===pm.y?1:.55}"><title>${esc(MOIS[x.q.m-1]+' : '+x.s+' sur 100')}</title></rect><text x="${cx}" y="${H-h-6}" text-anchor="middle" font-size="14" fill="var(--muted)" font-family="Jost, sans-serif">${x.s}</text>`}<text x="${cx}" y="${H+20}" text-anchor="middle" font-size="16" fill="var(--muted)" font-family="Jost, sans-serif">${MOIS[x.q.m-1][0]}</text>`}).join('')}
    </svg></div>`:'<p class="note">Aucune opération ce mois-ci : importez le relevé pour calculer votre score.</p>'}
  </section>
  <section class="block"><h3 class="sec">Cagnotte des économies</h3>
    <div class="kpi">${eur0(cg.tot)}<small>économisés sur 12 mois</small></div>
    <p class="lead">Chaque mois où un poste de dépenses passe sous sa moyenne, la différence rejoint la cagnotte${cg.defis?`, dont ${eur0(cg.defis)} pendant vos défis réussis`:''}. Donnez-lui un but.</p>
    ${G.montant>0?`<div class="gauge"><span style="width:${Math.min(100,cg.tot/G.montant*100)}%"></span></div><p class="note">${esc(G.nom||'Votre projet')} : ${eur0(cg.tot)} sur ${eur0(G.montant)}${cg.tot>=G.montant?' — objectif atteint, faites-vous plaisir.':`, encore ${eur0(G.montant-cg.tot)}.`}</p>`:''}
    <div class="fields" style="margin-top:14px"><label>Votre projet<input type="text" maxlength="40" data-cag="nom" value="${esc(G.nom||'')}" placeholder="Voyage au Japon"></label>
    <label>Montant (€)<input type="number" inputmode="numeric" min="0" step="100" data-cag="montant" value="${G.montant||''}" placeholder="3000"></label></div>
  </section>
  <section class="block"><h3 class="sec">Matelas de sécurité</h3>
    ${st.autonomie!=null?`<div class="kpi">${fmt1(st.autonomie)}<small>mois d’autonomie</small></div>
    <div class="gauge"><span style="width:${Math.min(100,st.autonomie/obj*100)}%"></span></div>
    <p class="note">${st.autonomie>=obj?`Objectif de ${obj} mois atteint.`:`Objectif : ${obj} mois. Il manque environ ${eur0((obj-st.autonomie)*st.depMoy)}.`} Calculé sur vos dépenses moyennes de ${eur0(st.depMoy)} par mois${st.autoEss?`. En ne gardant que les charges fixes, vous tiendriez ${fmt1(st.autoEss)} mois`:''}.</p>`
    :'<p class="lead">Indiquez votre épargne disponible pour savoir combien de mois vous tenez sans rien encaisser.</p>'}
    <div class="fields" style="margin-top:18px"><label>Épargne disponible (€)<input type="number" inputmode="numeric" min="0" step="100" data-set="epargne" value="${S.settings.epargne||''}" placeholder="0"></label>
    <label>Matelas visé (mois)<input type="number" inputmode="numeric" min="1" max="36" data-set="objectif" value="${S.settings.objectif||''}" placeholder="6"></label></div>
  </section>
  <section class="block"><h3 class="sec">Vos encaissements</h3>
    ${st.lisse>0?`<p class="lead">Les douze derniers mois. La ligne dorée est votre moyenne, ${esc(eur0(st.lisse))} par mois. Les mois en gris clair sont les mois creux.</p><div class="chart" style="margin-bottom:0"><svg viewBox="0 0 ${W} ${CH}" role="img" aria-label="Encaissements des douze derniers mois"><line x1="0" x2="${W}" y1="${bh}" y2="${bh}" stroke="var(--line)"/>
    ${pts.map((p,i)=>{const hh=p.v>0?Math.max(2,p.v/max*(bh-14)):0;const x=i*gap+gap/2;return `<rect x="${x-gap*.25}" y="${bh-hh}" width="${gap*.5}" height="${hh}" fill="var(--ink)" opacity="${p.v<st.lisse*.7?.35:.85}"/><text x="${x}" y="${bh+24}" text-anchor="middle" font-size="17" fill="var(--muted)" font-family="Jost, sans-serif">${p.l}</text>`}).join('')}
    <line x1="0" x2="${W}" y1="${ly}" y2="${ly}" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="6 5"/></svg></div>`:'<p class="note">Importez vos revenus ou vos relevés pour voir vos encaissements.</p>'}
  </section>`;
}
const STATUT={'en cours':'En cours','en attente':'En attente du relevé','réussi':'Réussi','manqué':'Manqué'};
function carteDefi(x){
  const cls=x.status==='réussi'?'good':x.status==='manqué'?'crit':x.status==='en attente'?'wait':'';
  return `<div class="defi-card ${cls}" data-defikey="${esc(x.key)}">${anneau(x.status==='réussi'?1:x.prog,60,cls)}
    <div><div class="n">${esc(x.name)} <span class="chip">${DIFF[x.diff].l}, ${x.pts} points</span></div>
    <div class="d">${esc(x.txt)}</div>
    <div class="meta">${STATUT[x.status]}${x.status==='en cours'&&x.jours?`, ${x.jours} jour${x.jours>1?'s':''} restant${x.jours>1?'s':''}`:''}${x.economie?`, ${eur0(x.economie)} économisés`:''}${x.kind==='semaine'?` · semaine du ${dfmt(x.from)}`:x.type==='serie'?` · depuis ${moisDe(x.from.slice(0,7))}`:` · ${moisDe(x.month)} ${x.month.slice(0,4)}`}</div></div>
    ${x.status==='en cours'?`<button class="link" data-undefi="${esc(x.key)}">Abandonner</button>`:'<span></span>'}</div>`;
}
function vDefis(){
  const x=experience(), sr=serie(), prop=defiPropose(), tm=thisMonth(), wk=mondayOf(todayStr());
  const tous=(GAME.defis||[]).slice().sort((a,b)=>a.to<b.to?1:-1);
  const actifs=tous.filter(d=>d.status==='en cours'||d.status==='en attente'), passes=tous.filter(d=>d.status==='réussi'||d.status==='manqué');
  const pris=new Set(S.challenges.filter(c=>c.month===tm||c.week===wk).map(c=>c.id));
  const proOk=S.ops.some(o=>opUniv(o)==='pro');
  const dispo=DEFIS.filter(D=>!pris.has(D.id)&&(D.kind!=='saison'||D.mois===+tm.slice(5,7))&&(D.kind!=='pro'||proOk)&&!(D.type==='serie'&&S.challenges.some(c=>c.id===D.id&&evalDefi(c)?.status==='en cours')));
  const med=medailles(), nMed=med.filter(m=>m.tier>0).length;
  const suiv=(()=>{const [y,m]=(sr.last||tm).split('-').map(Number);const p=shift({lvl:'M',y,m},1);return MOIS[p.m-1]})();
  return `
  <section class="block niveau"><div class="niv-top"><div><p class="kick">Niveau ${x.i+1}</p><h3 class="niv-nom">${esc(x.nom)}</h3><p class="note">${esc(x.desc)}</p></div>
    <div class="niv-xp"><b>${new Intl.NumberFormat('fr-FR').format(x.total)}</b><span>points</span></div></div>
    ${x.max?`<div class="gauge"><span style="width:${(x.total-x.min)/(x.max-x.min)*100}%"></span></div><p class="note">Encore ${new Intl.NumberFormat('fr-FR').format(x.max-x.total)} points pour devenir ${esc(x.suivant)}.</p>`:'<p class="note">Vous avez atteint le plus haut niveau.</p>'}
    <details class="xp-detail"><summary>D’où viennent vos points</summary>${x.lignes.filter(l=>l.n).map(l=>`<div class="row"><span>${l.l}</span><b>${new Intl.NumberFormat('fr-FR').format(l.xp)}</b><span class="sub">${l.n}</span></div>`).join('')}</details>
  </section>
  <section class="block serie-card"><div class="serie-n">${sr.n}</div><div><p class="t">${sr.n?`mois d’affilée importés et classés`:'Pas encore de série en cours'}</p>
    <p class="note">${sr.enAttente?`Classez les ${sr.enAttente} opération${sr.enAttente>1?'s':''} de ${moisDe(sr.last)} pour prolonger votre série.`:sr.n?`Importez votre relevé de ${suiv} et classez-le pour la prolonger. ${sr.n>=sr.best&&sr.n>1?'C’est votre record.':`Votre record : ${sr.best} mois.`}`:'Importez et classez vos relevés chaque mois : la série démarre dès le premier.'}</p></div></section>
  ${prop?`<section class="block propose"><p class="kick">Le défi du mois</p><p class="t">${esc(prop.texte)}</p><button class="btn gold" data-defi="auto" data-cat="${prop.cat}" data-pct="${prop.pct}">Relever ce défi</button></section>`:''}
  <section class="block"><h3 class="sec">Vos défis en cours</h3>
    ${actifs.length?actifs.map(carteDefi).join(''):'<p class="note">Aucun défi en cours. Choisissez-en un ci-dessous : l’application vérifie toute seule s’il est tenu, à chaque import de relevé.</p>'}
  </section>
  <section class="block"><h3 class="sec">Relever un défi</h3>
    <p class="lead">Les relevés arrivent souvent avec un mois de décalage : le verdict tombe quand le relevé qui couvre la fin du défi est importé.</p>
    ${KINDS.map(([k,l])=>{const ds=dispo.filter(D=>D.kind===k);return ds.length?`<h4 class="sous">${l}</h4>${ds.map(D=>`<div class="defi"><div><div class="n">${esc(D.name)} <span class="chip">${DIFF[D.diff].l}, ${ptsDe(D)} points</span></div><div class="d">${esc(D.desc)}</div></div><button class="link" data-defi="${D.id}" style="color:var(--ink)">Relever</button></div>`).join('')}`:''}).join('')}
  </section>
  ${passes.length?`<section class="block"><h3 class="sec">Défis terminés</h3>${passes.map(carteDefi).join('')}</section>`:''}
  <section class="block"><h3 class="sec">Médailles</h3>
    <p class="lead">${nMed} sur ${med.length} obtenues. Chacune a trois paliers : bronze, argent et or.</p>
    ${FAM.map(([f,l])=>`<h4 class="sous">${l}</h4><div class="medals">${med.filter(m=>m.fam===f).map(m=>`<div class="medal ${m.tier?'on t'+m.tier:''}" title="${esc(m.txt)}"><div class="disc">${m.tier&&m.tier<3?anneau(m.prog,62,'medal-ring'):''}<i data-lucide="${m.icon}"></i></div>${esc(m.name)}<em>${m.tier?PALIERS[m.tier-1][0].toUpperCase()+PALIERS[m.tier-1].slice(1):'À gagner'}</em><em class="prog">${m.next!=null?`${esc(m.txt)} ; ${m.tier?'palier suivant':'bronze'} : ${esc(m.nextTxt)}`:esc(m.txt)}</em></div>`).join('')}</div>`).join('')}
  </section>`;
}
