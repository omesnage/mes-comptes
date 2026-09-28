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
/* « de septembre 2026 », « du 3e trimestre 2026 », « de 2026 » */
const deP=p=>p.lvl==='Q'?'du '+plabel(p):'de '+plabel(p);
/* Heures de travail que représentent les encaissements de la période, au prix minimum, et taux réel quand le temps a été noté */
function heuresPeriode(p){
  const px=heuresPrix(); if(!px) return '';
  const [a,b]=bounds(p), ops=S.ops.filter(o=>{const k=o.date.slice(0,7);return k>=a&&k<=b&&estEncaissementPro(o)});
  if(!ops.length) return '';
  const tot=ops.reduce((s,o)=>s+o.amount,0), notes=ops.filter(o=>o.heures>0);
  const L0=motsPeriode(p)[0];
  return `<section class="carte heures-bilan"><h3>Votre temps de travail</h3>
    <p class="phrase">${L0[0].toUpperCase()+L0.slice(1)}, vos encaissements représentent environ <b>${nb(tot/px)} h de travail</b> à votre prix.</p>
    ${notes.length?(t=>`<p class="phrase ${t<px?'rouge':'or'}">Sur les travaux où vous avez noté votre temps, vous avez gagné en moyenne ${eur0(t)} de l’heure.</p>`)(notes.reduce((s,o)=>s+o.amount,0)/notes.reduce((s,o)=>s+o.heures,0)):'<p class="aide">Notez le temps réellement passé sous chaque encaissement, dans Mes opérations, pour savoir ce que chaque travail vous rapporte vraiment.</p>'}</section>`;
}
function barres(mois,val,actif,cls){
  const v=mois.map(q=>({q,v:Math.max(0,val(q)),any:(BYMONTH[ymOf(q)]||[]).length>0}));
  const avec=v.filter(x=>x.any), moy=avec.length?avec.reduce((s,x)=>s+x.v,0)/avec.length:0, max=Math.max(1,moy,...v.map(x=>x.v));
  const H=/petit/.test(cls||'')?110:160;
  return `<div class="barres ${cls||''}" style="--n:${v.length}"><div class="barres-in" style="height:${H+62}px">
    ${moy>0?`<div class="moyenne" style="bottom:${32+moy/max*H}px" aria-hidden="true"></div>`:''}
    ${v.map(x=>`<button class="col${actif&&actif(x.q)?' actif':''}" data-bmois="${x.q.y}-${x.q.m}" aria-label="${esc(MOIS[x.q.m-1]+' '+x.q.y+' : '+eur0(x.v))}">
      <span class="val">${x.any?esc(eur0(x.v)):''}</span><span class="b" style="height:${Math.round(x.v/max*H)}px"></span><span class="lbl">${MOIS[x.q.m-1].slice(0,3)}${v.length>6&&x.q.m===1?' '+String(x.q.y).slice(2):''}</span></button>`).join('')}
  </div></div><p class="aide legende-moy"><span class="tiret"></span>Ligne pointillée : votre moyenne, ${eur0(moy)} par mois</p>`;
}
function vBilan(){
  if(!PB) PB={lvl:'M',y:P.y,m:P.m};
  const U=bilanU(), B=bilan(PB,U), prev=bilan(shift(PB,-1),U);
  const lignes=B.rows.filter(([c,v])=>v>0.005||B.A.by[c]?.surplus>0.005).sort((a,b)=>b[1]-a[1]), max=Math.max(1,...lignes.map(x=>x[1])), fin={lvl:'M',...endOf(PB)};
  const surp=cid=>B.A.by[cid]?.surplus>0.005?`<span class="leg-sous">dont ${eur0(B.A.by[cid].ref)} de remboursements</span>`:'';
  /* Écarts avec la période précédente : en euros seulement, au-delà de 30 € */
  const ids=[...new Set([...B.rows,...prev.rows].map(r=>r[0]))];
  const ecarts=ids.map(cid=>{const a=B.rows.find(r=>r[0]===cid)?.[1]||0, b=prev.rows.find(r=>r[0]===cid)?.[1]||0;return {cid,a,b,d:a-b}})
    .filter(x=>Math.abs(x.d)>30).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d));
  const vus=BTOUT?ecarts:ecarts.slice(0,5), [L0,L1]=motsPeriode(PB);
  const lvl=[['M','Mois'],['Q','Trimestre'],['Y','Année']];
  return `<div class="seg" role="group" aria-label="Période">${lvl.map(([k,l])=>`<button data-blvl="${k}" aria-pressed="${PB.lvl===k}">${l}</button>`).join('')}</div>
  <div class="mois"><button class="fleche" data-bshift="-1" aria-label="Période précédente"><i data-lucide="chevron-left"></i></button><h2>${nomPeriode(PB)}</h2><button class="fleche" data-bshift="1" aria-label="Période suivante"><i data-lucide="chevron-right"></i></button></div>
  ${hasFraisPro()?`<div class="seg" role="group" aria-label="Dépenses montrées"><button data-bu="perso" aria-pressed="${U==='perso'}">Perso</button><button data-bu="pro" aria-pressed="${U==='pro'}">Activité</button></div>`:''}
  ${U==='pro'?`<section class="carte salaire-bilan">${salaireBloc(PB,'bilan')||'<p class="aide">Aucune activité sur cette période.</p>'}</section>${justePrixBloc()}`:''}
  ${U==='pro'?heuresPeriode(PB):''}
  <section class="carte repartition"><h3>Répartition de vos dépenses ${esc(deP(PB))}</h3>
    ${lignes.length?`<p class="rep-total">${eur0(B.total)} <span>au total</span></p>
    <p class="aide">Chaque barre montre le poids d’une rubrique dans vos dépenses ${esc(deP(PB))}. Touchez-en une pour voir le détail.</p>
    <div class="rep">${lignes.map(([cid,v])=>{const c=catById(cid), e=etatLimite(c,fin);
      return `<button class="rep-l" data-bcat="${cid}"><span class="rep-h"><span class="rep-nom">${esc(nomRub(cid))}${surp(cid)}</span><span class="rep-val"><b>${eur0(v)}</b> · ${B.total>0?Math.round(v/B.total*100):0} %</span></span>
        <span class="rep-barre"><span style="width:${Math.max(1,v/max*100)}%"></span></span>
        ${e?`<span class="rep-lim ${e.etat}">Limite : ${eur0(e.dep)} sur ${eur0(e.lim)} ${e.mot}${e.msg?`. ${esc(e.msg)}`:''}</span>${barreLimite(e)}`:''}</button>`}).join('')}</div>`
    :'<p class="aide">Aucune dépense sur cette période.</p>'}</section>
  <section class="carte evolution"><h3>Évolution</h3><p class="aide">Vos dépenses ${U==='pro'?'de l’activité':'perso'}, mois par mois : le mois sous chaque barre, le montant au-dessus. Touchez une barre pour voir ce mois.</p>
    ${barres(moisBilan(PB),q=>bilan(q,U).total,q=>PB.lvl==='M'&&q.y===PB.y&&q.m===PB.m,moisBilan(PB).length>6?'defile':'')}</section>
  <section class="carte ecarts"><h3>Par rapport ${PB.lvl==='M'?'au mois':PB.lvl==='Q'?'au trimestre':'à l’année'} précédent${PB.lvl==='Y'?'e':''}</h3>
    ${vus.length?vus.map(x=>`<button class="ecart ${x.d>0?'hausse':'baisse'}" data-bcat="${x.cid}"><span class="e-nom">${esc(nomRub(x.cid))} : ${x.a>0.005?`${eur0(x.a)} ${L0}`:`rien ${L0}`}${x.b>0.005?`, contre ${eur0(x.b)} ${L1}`:`, rien ${L1}`}</span><span class="e-fleche" aria-label="${x.d>0?'en hausse':'en baisse'}">${x.d>0?'↑':'↓'}</span></button>`).join('')
      +(ecarts.length>5?`<button class="lien" data-btout="1">${BTOUT?'Voir moins':`Voir tout (${ecarts.length})`}</button>`:'')
      :'<p class="aide">Aucun écart de plus de 30 €.</p>'}</section>`;
}
/* Mots de la période affichée et de la précédente : « ce mois-ci / le mois dernier », ou les noms si ce n'est pas la période en cours */
function motsPeriode(p){
  const d=new Date(), y=d.getFullYear(), m=d.getMonth()+1, pr=shift(p,-1);
  if(p.lvl==='M') return p.y===y&&p.m===m?['ce mois-ci','le mois dernier']:[`en ${MOIS[p.m-1]}`,`en ${MOIS[pr.m-1]}${pr.y!==p.y?' '+pr.y:''}`];
  if(p.lvl==='Q') return p.y===y&&Math.ceil(p.m/3)===Math.ceil(m/3)?['ce trimestre','le trimestre dernier']:[`au ${plabel(p)}`,`au ${plabel(pr)}`];
  return p.y===y?['cette année','l’an dernier']:[`en ${p.y}`,`en ${p.y-1}`];
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
    <p class="f-m">${esc(nomRub(cid))}</p><p class="f-amt">${eur0(a)}</p><p class="aide">${esc(nomPeriode(PB))}${B.A.by[cid]?.surplus>0.005?`, dont ${eur0(B.A.by[cid].ref)} de remboursements`:''}</p>
    <div class="ligne"><span>En moyenne par mois</span><b>${eur0(moy)}</b></div>
    <div class="ligne"><span>Par rapport ${quoi}</span><b class="${d>0?'m-hausse':d<0?'m-baisse':''}">${d>0?'↑ +':d<0?'↓ −':''}${eur0(Math.abs(d))}</b></div>
    <p class="f-lbl">Cette rubrique, mois par mois</p>
    ${barres(mois,q=>agg(q,U).by[cid]?.net||0,q=>PB.lvl==='M'&&q.y===PB.y&&q.m===PB.m,mois.length>6?'defile petit':'petit')}
    <p class="f-lbl">${ops.length} opération${ops.length>1?'s':''}</p>
    <div class="ops">${ops.map(o=>opLine(o,true)).join('')}</div></div>`;
}
