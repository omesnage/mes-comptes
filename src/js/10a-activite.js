/* ============ Taux horaire et revenu net visé ============ */
const hSemaine=()=>+S.settings.heuresSemaine||SET0.heuresSemaine;
/* Heures par mois : heures par semaine × 52 ÷ 12 */
const heures=()=>hSemaine()*52/12;
const netVise=()=>+S.settings.netVise||SET0.netVise;
const tauxCible=()=>netVise()/heures();
/* Revenu net et taux horaire réel : sur la période affichée (moyenne par mois) et lissés sur 12 mois */
function activite(p){
  const H=heures(), V=netVise(), A=agg(p,'pro');
  const net=A.revenuNet/A.months;
  const e=endOf(p); const ms=monthsTo(e.y,e.m,12).map(q=>({q,a:agg(q,'pro')})).filter(x=>x.a.any);
  const lisse=ms.length?ms.reduce((s,x)=>s+x.a.revenuNet,0)/ms.length:null;
  return {H,V,cible:V/H,net,taux:net/H,manque:Math.max(0,V-net),ok:net>=V,any:A.any&&(A.ca>0||A.frais>0),
    lisse,tauxLisse:lisse!=null?lisse/H:null,nLisse:ms.length,A};
}
/* Mois affiché encore incomplet : le dernier relevé s'arrête avant la fin du mois */
function moisPartiel(p){
  if(p.lvl!=='M') return null;
  const k=p.y+'-'+pad(p.m), last=(BYMONTH[k]||[]).reduce((m,o)=>o.date>m?o.date:m,'');
  const dim=new Date(p.y,p.m,0).getDate();
  return last&&+last.slice(8,10)<dim-3&&lastOpDate().slice(0,7)===k?+last.slice(8,10):null;
}

/* ============ Vrai salaire net de l'heure et juste prix ============ */
const reglage=(k,min,max)=>{const v=S.settings[k];const n=v===''||v==null||isNaN(+v)?SET0[k]:+v;return Math.min(max,Math.max(min,n))};
const semTrav=()=>52-reglage('semNonTrav',0,51);
const epRet=()=>reglage('epRetraite',0,90)/100;
const nonFact=()=>reglage('nonFacture',0,90)/100;
const hJour=()=>reglage('hJour',1,24);
/* Cascade : ce qui reste en poche par heure → moins les congés → moins l'épargne et la retraite */
function calcSalaire(pocheMois,heuresMois,corrConges,epargne){
  const brut=pocheMois/heuresMois, conges=brut*corrConges, vrai=conges*(1-epargne);
  return {brut,conges,vrai};
}
/* Correction des congés : les mois et trimestres ne contiennent pas les congés de l'année ;
   une année dont les 12 mois ont des relevés les contient déjà. */
function correctionConges(p){
  if(p.lvl==='Y'){let n=0;for(let m=1;m<=12;m++)if((BYMONTH[p.y+'-'+pad(m)]||[]).some(o=>o.src!=='rev'))n++;if(n===12)return 1}
  return semTrav()/52;
}
/* Vrai salaire sur une période : null si l'activité n'a rien laissé en poche */
function vraiSalaire(p){
  const A=agg(p,'pro'); if(!A.any) return {vide:true};
  const poche=A.revenuNet/A.months;
  if(!(A.ca>0)||poche<=0) return {rien:true,poche};
  const corr=correctionConges(p), c=calcSalaire(poche,heures(),corr,epRet());
  return {...c,poche,corr,cible:tauxCible(),ok:c.vrai>=tauxCible()-1e-9,manque:Math.max(0,tauxCible()-c.vrai),congesInclus:corr===1};
}
/* Prix minimum à facturer, selon le mode de calcul de la somme mise de côté */
function calcPrix({vise,epargne,fraisAn,taux,assiette,semaines,hSem,nonFacture,hParJour}){
  if(epargne>=1||taux>=1||nonFacture>=1) return null;
  const poche=vise*12/(1-epargne);
  const enc=assiette==='resultat'?poche/(1-taux)+fraisAn:(poche+fraisAn)/(1-taux);
  const hFact=semaines*hSem*(1-nonFacture); if(hFact<=0) return null;
  const heure=enc/hFact;
  return {poche,enc,hFact,heure,jour:heure*hParJour};
}
/* Moyennes réelles des 12 derniers mois qui ont des données d'activité */
function douzeMois(){
  const last=lastOpDate(); if(!last) return [];
  return monthsTo(+last.slice(0,4),+last.slice(5,7),12).map(q=>agg(q,'pro')).filter(a=>a.any);
}
function justePrix(){
  const ms=douzeMois(), fraisAn=ms.length?ms.reduce((s,a)=>s+a.fraisExpl,0)/ms.length*12:0;
  const r=calcPrix({vise:netVise(),epargne:epRet(),fraisAn,taux:reglage('taux',0,90)/100,assiette:S.settings.assiette,semaines:semTrav(),hSem:hSemaine(),nonFacture:nonFact(),hParJour:hJour()});
  if(!r) return null;
  const caAn=ms.length>=3?ms.reduce((s,a)=>s+a.ca,0)/ms.length*12:null;
  return {...r,fraisAn,moyen:caAn!=null&&caAn>0?caAn/r.hFact:null,nMois:ms.length};
}

/* Cascade complète, par heure : de ce que paient les clients jusqu'au vrai salaire net */
function cascade(p){
  const A=agg(p,'pro'); if(!A.any) return null;
  const mo=A.months, enc=A.ca/mo, frais=A.fraisExpl/mo, prov=A.provision/mo, H=heures(), nf=nonFact();
  if(!(enc>0)||enc-frais-prov<=0) return {rien:true};
  const hFact=H*(1-nf), corr=correctionConges(p), ep=epRet(), poche=enc-frais-prov;
  const a=enc/hFact, b=enc/H, c=(enc-frais)/H, d=poche/H, e=d*corr, f=e*(1-ep);
  return {a,b,c,d,e,f,enc,frais,prov,poche,H,hFact,corr,ep,nf,congesInclus:corr===1};
}
const tauxRegle=()=>+S.settings.taux>0;

/* Prix minimum de l'heure avec des réglages en cours de saisie (les valeurs non saisies prennent leur valeur par défaut) */
function justePrixAvec(sur){const avant=S.settings;S.settings={...avant,...(sur||{})};try{return justePrix()}finally{S.settings=avant}}
function phrasePrix(sur){
  const st={...S.settings,...(sur||{})}, v=+st.netVise||SET0.netVise, j=justePrixAvec(sur);
  return j?`Pour avoir ${eur0(v)} par mois, vous devez vous faire payer au minimum <b>${eur0(j.heure)} de l’heure</b>.`:'Avec ces pourcentages, le calcul n’est pas possible : aucun ne peut atteindre 100 %.';
}
/* Encaissements de l'activité : conversion en heures de travail au prix minimum */
const estEncaissementPro=o=>o.amount>0&&!INTERNAL[o.id]&&o.src!=='rev'&&(c=>c&&typeOf(c)==='income')(catOf(o))&&opUniv(o)==='pro'||o.src==='rev'&&o.amount>0;
function heuresPrix(){const j=justePrix();return j&&j.heure>0?j.heure:null}
