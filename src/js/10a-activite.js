/* ============ Taux horaire et revenu net visé ============ */
const heures=()=>+S.settings.heures||SET0.heures;
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
