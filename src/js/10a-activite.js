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
/* Pistes chiffrées pour combler l'écart */
function pistes(X){
  const t=(+S.settings.taux||0)/100, ca=X.A.ca/X.A.months, frais=X.A.fraisExpl/X.A.months, out=[];
  if(ca>0&&X.manque>0){const d=X.manque/(1-t);out.push(`Augmenter vos tarifs d’environ ${Math.ceil(d/ca*100)} %, soit ${eur0(d)} de chiffre d’affaires en plus par mois.`)}
  if(X.net>0&&X.net/X.cible<X.H) out.push(`Ou travailler ${Math.round(X.net/X.cible)} h par mois au lieu de ${X.H} h : pour le même revenu, votre heure vaudrait ${eur(X.cible)}.`);
  if(frais>0){const d=S.settings.assiette==='resultat'?X.manque/(1-t):X.manque;
    out.push(d<=frais?`Ou réduire vos frais pro de ${eur0(d)} par mois, sur ${eur0(frais)} aujourd’hui.`:`Ou réduire vos frais pro, qui s’élèvent à ${eur0(frais)} par mois.`)}
  return out;
}
/* Taux horaire réel sur 12 mois, avec la ligne du taux visé */
function courbeTaux(){
  const e=endOf(P), ms=monthsTo(e.y,e.m,12).map(q=>{const a=agg(q,'pro');return {q,any:a.any,v:a.revenuNet/heures()}});
  if(ms.filter(x=>x.any).length<2) return '';
  const c=tauxCible(), vals=ms.filter(x=>x.any).map(x=>x.v);
  const max=Math.max(c*1.25,...vals), min=Math.min(0,...vals);
  const W=600,H=190,top=16,bh=150,gap=W/12,bw=gap*.5, y=v=>top+(max-v)/(max-min)*(bh-top), y0=y(0), yc=y(c);
  return `<section class="block"><h3 class="sec">Votre taux horaire réel</h3>
  <p class="lead">Chaque mois, votre revenu net divisé par ${heures()} heures. Les mois sous la ligne pointillée, votre taux visé de ${esc(eur(c))}, sont en rouge.</p>
  <div class="chart" style="margin-bottom:0"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Taux horaire réel sur douze mois">
  <line x1="0" x2="${W}" y1="${y0}" y2="${y0}" stroke="var(--line)"/>
  ${ms.map((x,i)=>{const cx=i*gap+gap/2;if(!x.any)return `<text x="${cx}" y="${H-6}" text-anchor="middle" font-size="16" fill="var(--muted)" font-family="Jost, sans-serif">${MOIS[x.q.m-1][0]}</text>`;
    const yy=y(x.v), low=x.v<c;return `<rect class="${low?'bas':'haut'}" x="${cx-bw/2}" y="${Math.min(yy,y0)}" width="${bw}" height="${Math.max(2,Math.abs(y0-yy))}" fill="${low?'var(--alert)':'var(--ink)'}" opacity="${low?.55:.85}"><title>${esc(MOIS[x.q.m-1]+' '+x.q.y+' : '+eur(x.v)+' de l’heure')}</title></rect>
    <text x="${cx}" y="${H-6}" text-anchor="middle" font-size="16" fill="var(--muted)" font-family="Jost, sans-serif">${MOIS[x.q.m-1][0]}</text>`}).join('')}
  <line x1="0" x2="${W}" y1="${yc}" y2="${yc}" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="6 5"/>
  <text x="${W}" y="${yc-6}" text-anchor="end" font-size="15" fill="var(--gold)" font-family="Jost, sans-serif">${esc(eur(c))}</text>
  </svg></div></section>`;
}
