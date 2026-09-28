/* ============ Bilan : synthèse graphique des dépenses ============ */
let PB=null, BU='perso', BCAT=null, BTOUT=false;
const hasFraisPro=()=>S.ops.some(o=>o.amount<0&&opUniv(o)==='pro'&&!PROV_CATS.has(catOf(o)));
const bilanU=()=>BU==='pro'&&hasFraisPro()?'pro':'perso';
const nomPeriode=p=>{const s=plabel(p);return s[0].toUpperCase()+s.slice(1)};
const nomRub=cid=>cid==='_pending'?'À vérifier':catById(cid)?.name||cid;
/* Dépenses d'une période par rubrique : mêmes chiffres que l'Accueil (remboursements déduits, virements internes exclus).
   Côté activité, les sommes mises de côté déjà versées ne sont pas des frais. */
function bilan(p,U){
  const A=agg(p,U), rows=Object.entries(A.by).filter(([c])=>!(U==='pro'&&(PROV_CATS.has(c)||catById(c)?.prov))).map(([c,e])=>[c,e.net]);
  return {total:U==='pro'?A.fraisExpl:A.net,rows,A};
}
/* Mois montrés dans « Évolution » : 6 derniers (Mois), ceux du trimestre, ou les 12 de l'année */
function moisBilan(p){
  if(p.lvl==='M') return monthsTo(p.y,p.m,6);
  const [a,,n]=bounds(p); const y=+a.slice(0,4), m0=+a.slice(5,7);
  return Array.from({length:n},(_,i)=>({lvl:'M',y,m:m0+i}));
}
const PALETTE=7;
function anneau(parts,total){
  const sum=parts.reduce((s,x)=>s+x.v,0); if(sum<=0) return '';
  const R=80,C=2*Math.PI*R,GAP=parts.length>1?1.6:0; let off=0;
  const arcs=parts.map((x,i)=>{const len=x.v/sum*C;const s=`<circle ${x.cid?`data-bcat="${x.cid}" role="button" tabindex="0" aria-label="${esc(x.nom)}"`:''} class="part" cx="100" cy="100" r="${R}" fill="none" stroke="var(--c${i+1})" stroke-width="26" stroke-dasharray="${Math.max(.5,len-GAP)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 100 100)"><title>${esc(x.nom)} : ${esc(eur0(x.v))}</title></circle>`;off+=len;return s}).join('');
  return `<svg viewBox="0 0 200 200" class="anneau-bilan" role="img" aria-label="Répartition des dépenses">${arcs}
    <text x="100" y="104" text-anchor="middle" font-family="Bodoni Moda, Didot, serif" font-size="27" fill="var(--ink)">${esc(eur0(total))}</text>
    <text x="100" y="126" text-anchor="middle" font-family="Jost, sans-serif" font-size="12.5" fill="var(--muted)">au total</text></svg>`;
}
function barres(mois,val,actif,cls){
  const v=mois.map(q=>({q,v:Math.max(0,val(q)),any:(BYMONTH[ymOf(q)]||[]).length>0}));
  const avec=v.filter(x=>x.any), moy=avec.length?avec.reduce((s,x)=>s+x.v,0)/avec.length:0, max=Math.max(1,moy,...v.map(x=>x.v));
  const H=/petit/.test(cls||'')?110:160;
  return `<div class="barres ${cls||''}" style="--n:${v.length}"><div class="barres-in" style="height:${H+62}px">
    ${moy>0?`<div class="moyenne" style="bottom:${32+moy/max*H}px" aria-hidden="true"></div>`:''}
    ${v.map(x=>`<button class="col${actif&&actif(x.q)?' actif':''}" data-bmois="${x.q.y}-${x.q.m}" aria-label="${esc(MOIS[x.q.m-1]+' '+x.q.y+' : '+eur0(x.v))}">
      <span class="val">${x.any?esc(eur0(x.v)):''}</span><span class="b" style="height:${Math.round(x.v/max*H)}px"></span><span class="lbl">${MOIS[x.q.m-1].slice(0,3)}${v.length>6&&x.q.m===1?' '+String(x.q.y).slice(2):''}</span></button>`).join('')}
  </div></div><p class="aide legende-moy"><span class="tiret"></span>En moyenne : ${eur0(moy)} par mois</p>`;
}
function vBilan(){
  if(!PB) PB={lvl:'M',y:P.y,m:P.m};
  const U=bilanU(), B=bilan(PB,U), prev=bilan(shift(PB,-1),U);
  const pos=B.rows.filter(([,v])=>v>0.005).sort((a,b)=>b[1]-a[1]), neg=B.rows.filter(([,v])=>v<-0.005);
  let parts=pos.map(([cid,v])=>({cid,v,nom:nomRub(cid)}));
  if(parts.length>PALETTE){const rest=parts.slice(PALETTE-1);parts=parts.slice(0,PALETTE-1);parts.push({cid:null,v:rest.reduce((s,x)=>s+x.v,0),nom:`Autres (${rest.length} rubriques)`,autres:rest})}
  const sumPos=parts.reduce((s,x)=>s+x.v,0);
  /* Écarts avec la période précédente */
  const ids=[...new Set([...B.rows,...prev.rows].map(r=>r[0]))];
  const ecarts=ids.map(cid=>{const a=B.rows.find(r=>r[0]===cid)?.[1]||0, b=prev.rows.find(r=>r[0]===cid)?.[1]||0, d=a-b, c=catById(cid);
    const bud=c&&c.budget>0?c.budget*B.A.months:0;
    const derape=bud?a>bud&&d>0:d>30&&b>0&&a>b*1.25, baisse=d<-30&&b>0&&a<b*.75;
    return {cid,a,b,d,pct:b>0?Math.round(d/b*100):null,derape,baisse}}).filter(x=>Math.abs(x.d)>=1).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d));
  const vus=BTOUT?ecarts:ecarts.slice(0,5);
  const lvl=[['M','Mois'],['Q','Trimestre'],['Y','Année']];
  return `<div class="seg" role="group" aria-label="Période">${lvl.map(([k,l])=>`<button data-blvl="${k}" aria-pressed="${PB.lvl===k}">${l}</button>`).join('')}</div>
  <div class="mois"><button class="fleche" data-bshift="-1" aria-label="Période précédente"><i data-lucide="chevron-left"></i></button><h2>${nomPeriode(PB)}</h2><button class="fleche" data-bshift="1" aria-label="Période suivante"><i data-lucide="chevron-right"></i></button></div>
  ${hasFraisPro()?`<div class="seg" role="group" aria-label="Dépenses montrées"><button data-bu="perso" aria-pressed="${U==='perso'}">Perso</button><button data-bu="pro" aria-pressed="${U==='pro'}">Activité</button></div>`:''}
  <section class="carte"><h3>Répartition</h3>
    ${pos.length?`${anneau(parts,B.total)}
    <div class="legende">${parts.map((x,i)=>`<button class="leg"${x.cid?` data-bcat="${x.cid}"`:' data-autres="1"'}><span class="pastille" style="background:var(--c${i+1})"></span><span class="leg-nom">${esc(x.nom)}</span><span class="leg-amt">${eur0(x.v)}</span><span class="leg-pc">${Math.round(x.v/sumPos*100)} %</span></button>
      ${x.autres&&BTOUT?x.autres.map(y=>`<button class="leg sous" data-bcat="${y.cid}"><span class="pastille" style="background:var(--c${i+1})"></span><span class="leg-nom">${esc(y.nom)}</span><span class="leg-amt">${eur0(y.v)}</span><span class="leg-pc">${Math.round(y.v/sumPos*100)} %</span></button>`).join(''):''}`).join('')}
    ${neg.map(([cid,v])=>`<button class="leg" data-bcat="${cid}"><span class="pastille vide"></span><span class="leg-nom">${esc(nomRub(cid))}<span class="leg-sous">plus de remboursements que de dépenses</span></span><span class="leg-amt">${signed(v)}</span><span class="leg-pc"></span></button>`).join('')}</div>`
    :'<p class="aide">Aucune dépense sur cette période.</p>'}</section>
  <section class="carte"><h3>Évolution</h3>${barres(moisBilan(PB),q=>bilan(q,U).total,q=>PB.lvl==='M'&&q.y===PB.y&&q.m===PB.m,moisBilan(PB).length>6?'defile':'')}
    <p class="aide">Touchez une barre pour voir ce mois.</p></section>
  <section class="carte ecarts"><h3>Par rapport ${PB.lvl==='M'?'au mois':PB.lvl==='Q'?'au trimestre':'à l’année'} précédent${PB.lvl==='Y'?'e':''}</h3>
    ${vus.length?vus.map(x=>`<button class="ecart${x.derape?' derape':x.baisse?' baisse':''}" data-bcat="${x.cid}"><span class="e-nom">${esc(nomRub(x.cid))}</span><span class="e-val">${x.d>0?'+':'−'}${eur0(Math.abs(x.d))}, ${x.pct==null?'nouveau':`${x.pct>0?'+':'−'}${Math.abs(x.pct)} %`}</span></button>`).join('')
      +(ecarts.length>5?`<button class="lien" data-btout="1">${BTOUT?'Voir moins':`Voir tout (${ecarts.length})`}</button>`:'')
      :'<p class="aide">Rien à comparer.</p>'}</section>`;
}
/* Fiche d'une rubrique sur la période */
function ficheRub(cid){
  const U=bilanU(), B=bilan(PB,U), prev=bilan(shift(PB,-1),U), mois=moisBilan(PB);
  const a=B.rows.find(r=>r[0]===cid)?.[1]||0, b=prev.rows.find(r=>r[0]===cid)?.[1]||0, d=a-b;
  const vals=mois.filter(q=>(BYMONTH[ymOf(q)]||[]).length).map(q=>agg(q,U).by[cid]?.net||0), moy=vals.length?vals.reduce((s,x)=>s+x,0)/vals.length:0;
  const ops=(B.A.by[cid]?.ops||[]).slice().sort((x,y)=>x.date<y.date?1:-1);
  const quoi=PB.lvl==='M'?'au mois précédent':PB.lvl==='Q'?'au trimestre précédent':'à l’année précédente';
  return `<div class="fiche-fond" data-act="closefiche"></div><div class="fiche" role="dialog" aria-modal="true" aria-label="${esc(nomRub(cid))}">
    <button class="fermer" data-act="closefiche" aria-label="Fermer"><i data-lucide="x"></i></button>
    <p class="f-m">${esc(nomRub(cid))}</p><p class="f-amt">${signed(a)}</p><p class="aide">${esc(nomPeriode(PB))}</p>
    <div class="ligne"><span>En moyenne par mois</span><b>${eur0(moy)}</b></div>
    <div class="ligne"><span>Par rapport ${quoi}</span><b class="${d>0?'m-hausse':d<0?'m-baisse':''}">${d>0?'+':d<0?'−':''}${eur0(Math.abs(d))}${b>0?`, ${d>=0?'+':'−'}${Math.abs(Math.round(d/b*100))} %`:''}</b></div>
    ${barres(mois,q=>agg(q,U).by[cid]?.net||0,q=>PB.lvl==='M'&&q.y===PB.y&&q.m===PB.m,mois.length>6?'defile petit':'petit')}
    <p class="f-lbl">${ops.length} opération${ops.length>1?'s':''}</p>
    <div class="ops">${ops.map(o=>opLine(o).replace(/^<button class="op" data-op="[^"]*">/,'<div class="op">').replace(/<\/button>$/,'</div>')).join('')}</div></div>`;
}
