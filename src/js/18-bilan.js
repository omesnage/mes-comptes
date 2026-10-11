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
/* L'essentiel de la période : quelques lignes colorées (vert, orange, rouge) avec un petit graphique chacune */
function essentiel(U,B,prev){
  const items=[], pc=(v,t)=>t>0?Math.round(v/t*100):0;
  const barre=parts=>{const t=parts.reduce((s,x)=>s+Math.max(0,x.v),0)||1;return `<span class="ess-pile">${parts.filter(x=>x.v>0.5).map(x=>`<span class="${x.c}" style="width:${x.v/t*100}%"></span>`).join('')}</span>
    <span class="ess-leg">${parts.filter(x=>x.v>0.5).map(x=>`<span><i class="${x.c}"></i>${esc(x.l)} ${eur0(x.v)} · ${pc(x.v,t)} %</span>`).join('')}</span>`};
  const duo=(a,la,b,lb,ok)=>{const m=Math.max(a,b,1);return `<span class="ess-duo"><span class="ess-d"><span class="ess-dl">${la}</span><span class="ess-db"><span class="entree" style="width:${a/m*100}%"></span></span><b>${eur0(a)}</b></span>
    <span class="ess-d"><span class="ess-dl">${lb}</span><span class="ess-db"><span class="${ok?'sortie':'sortie trop'}" style="width:${b/m*100}%"></span></span><b>${eur0(b)}</b></span></span>`};
  const [L0,L1]=motsPeriode(PB);
  if(U==='perso'){
    const A=B.A, reste=A.income-A.net;
    if(A.income>0||A.net>0) items.push({etat:reste>=0?'ok':'ko',icon:reste>=0?'circle-check':'circle-alert',
      t:reste>=0?`Il vous reste ${eur0(reste)} ${L0} : vos rentrées couvrent vos dépenses.`:`Vous avez dépensé ${eur0(-reste)} de plus que vos rentrées ${L0}.`,
      g:duo(A.income,'Rentrées',A.net,'Dépenses',reste>=0)});
    const fin={lvl:'M',...endOf(PB)}, lim=avecLimite().map(c=>({c,e:etatLimite(c,fin)})).filter(x=>x.e);
    if(lim.length){const r=lim.filter(x=>x.e.etat==='rouge'),o=lim.filter(x=>x.e.etat==='orange');
      items.push({etat:r.length?'ko':o.length?'attention':'ok',icon:r.length?'circle-alert':o.length?'triangle-alert':'circle-check',
        t:r.length?`${r.length>1?`${r.length} limites dépassées`:'Une limite dépassée'} : ${r.map(x=>`${esc(x.c.name)} (+${eur0(x.e.dep-x.e.lim)})`).join(', ')}.`
          :o.length?`${o.length>1?`${o.length} limites presque atteintes`:'Une limite presque atteinte'} : ${o.map(x=>esc(x.c.name)).join(', ')}.`:`Toutes vos limites sont respectées.`,
        g:`<span class="ess-lims">${lim.map(x=>`<span class="ess-lim ${x.e.etat}"><span class="ess-lim-n">${esc(x.c.name)}</span><span class="ess-lim-b"><span style="width:${Math.min(100,x.e.dep/x.e.lim*100)}%"></span></span><span class="ess-lim-v">${eur0(x.e.dep)} / ${eur0(x.e.lim)}</span></span>`).join('')}</span>`})}
    if(A.net>0){const oblig=A.fixed, varia=A.net-A.fixed;
      items.push({etat:'neutre',icon:'scale',t:`Vos dépenses obligatoires (logement, énergie, abonnements, emprunt…) pèsent ${pc(oblig,A.net)} % de vos dépenses.`,
        g:barre([{v:oblig,l:'Obligatoires',c:'fixe'},{v:varia,l:'Variables',c:'var'}])})}
  } else {
    const X=B.A, ca=X.ca, V=netVise()*X.months;
    if(ca>0){const ok=X.revenuNet>=V;
      items.push({etat:ok?'ok':'ko',icon:ok?'circle-check':'circle-alert',
        t:ok?`Il vous reste ${eur0(X.revenuNet)} de ${eur0(ca)} encaissés : ${eur0(X.revenuNet-V)} de plus que votre objectif.`:`Il vous reste ${signed(X.revenuNet)} de ${eur0(ca)} encaissés : il manque ${eur0(V-X.revenuNet)} pour votre objectif.`,
        g:barre([{v:X.fraisExpl,l:'Frais',c:'frais'},{v:X.provision,l:'Cotisations et impôts',c:'cot'},{v:Math.max(0,X.revenuNet),l:'Il vous reste',c:'reste'}])});
      const f=pc(X.fraisExpl,ca);
      items.push({etat:f<15?'ok':f<30?'attention':'ko',icon:f<15?'circle-check':'triangle-alert',t:`Vos frais représentent ${f} % de vos encaissements${f<15?' : c’est raisonnable.':f<30?' : à surveiller.':' : c’est beaucoup.'}`})}
  }
  const ids=[...new Set([...B.rows,...prev.rows].map(r=>r[0]))], ec=ids.map(cid=>({cid,d:(B.rows.find(r=>r[0]===cid)?.[1]||0)-(prev.rows.find(r=>r[0]===cid)?.[1]||0)}));
  const h=ec.filter(x=>x.d>30).sort((a,b)=>b.d-a.d)[0], bs=ec.filter(x=>x.d<-30).sort((a,b)=>a.d-b.d)[0];
  const ref=PB.lvl==='M'?'au mois précédent':PB.lvl==='Q'?'au trimestre précédent':'à l’année précédente';
  if(h) items.push({etat:'attention',icon:'trending-up',t:`Plus forte hausse : ${esc(nomRub(h.cid))}, +${eur0(h.d)} par rapport ${ref}.`});
  if(bs) items.push({etat:'ok',icon:'trending-down',t:`Plus forte baisse : ${esc(nomRub(bs.cid))}, ${eur0(-bs.d)} de moins qu’${ref==='au mois précédent'?'au mois précédent':ref==='au trimestre précédent'?'au trimestre précédent':'à l’année précédente'}.`.replace('qu’au','qu’au').replace('qu’à','qu’à')});
  if(!items.length) return '';
  return `<section class="carte essentiel"><h3>L’essentiel ${esc(deP(PB))}</h3>${items.map(x=>`<div class="ess ${x.etat}"><i data-lucide="${x.icon}"></i><div class="ess-c"><p class="ess-t">${x.t}</p>${x.g||''}</div></div>`).join('')}</section>`;
}
function vBilan(){
  if(!PB) PB={lvl:'M',y:P.y,m:P.m};
  const U=bilanU(), B=bilan(PB,U), prev=bilan(shift(PB,-1),U);
  const lignes=B.rows.filter(([c,v])=>v>0.005||B.A.by[c]?.surplus>0.005).sort((a,b)=>b[1]-a[1]), max=Math.max(1,...lignes.map(x=>x[1])), fin={lvl:'M',...endOf(PB)};
  const surp=cid=>motRemb(B.A.by[cid])?`<span class="leg-sous">${motRemb(B.A.by[cid])}</span>`:'';
  /* Écarts avec la période précédente : en euros seulement, au-delà de 30 € */
  const ids=[...new Set([...B.rows,...prev.rows].map(r=>r[0]))];
  const ecarts=ids.map(cid=>{const a=B.rows.find(r=>r[0]===cid)?.[1]||0, b=prev.rows.find(r=>r[0]===cid)?.[1]||0;return {cid,a,b,d:a-b}})
    .filter(x=>Math.abs(x.d)>30).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d));
  const vus=BTOUT?ecarts:ecarts.slice(0,5), [L0,L1]=motsPeriode(PB);
  const lvl=[['M','Mois'],['Q','Trimestre'],['Y','Année']];
  return `<div class="seg" role="group" aria-label="Période">${lvl.map(([k,l])=>`<button data-blvl="${k}" aria-pressed="${PB.lvl===k}">${l}</button>`).join('')}</div>
  <div class="mois"><button class="fleche" data-bshift="-1" aria-label="Période précédente"><i data-lucide="chevron-left"></i></button><h2>${nomPeriode(PB)}</h2><button class="fleche" data-bshift="1" aria-label="Période suivante"><i data-lucide="chevron-right"></i></button></div>
  ${hasFraisPro()?`<div class="seg" role="group" aria-label="Dépenses montrées"><button data-bu="perso" aria-pressed="${U==='perso'}">Perso</button><button data-bu="pro" aria-pressed="${U==='pro'}">Activité</button></div>`:''}
  ${essentiel(U,B,prev)}
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
  <section class="carte evolution"><h3>Évolution</h3><p class="aide">Vos dépenses${SAL?'':U==='pro'?' de l’activité':' perso'}, mois par mois : le mois sous chaque barre, le montant au-dessus. Touchez une barre pour voir ce mois.</p>
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
    <p class="f-m">${esc(nomRub(cid))}</p><p class="f-amt">${eur0(a)}</p><p class="aide">${esc(nomPeriode(PB))}${motRemb(B.A.by[cid])?`, ${motRemb(B.A.by[cid])}`:''}</p>
    <div class="ligne"><span>En moyenne par mois</span><b>${eur0(moy)}</b></div>
    <div class="ligne"><span>Par rapport ${quoi}</span><b class="${d>0?'m-hausse':d<0?'m-baisse':''}">${d>0?'↑ +':d<0?'↓ −':''}${eur0(Math.abs(d))}</b></div>
    <p class="f-lbl">Cette rubrique, mois par mois</p>
    ${barres(mois,q=>agg(q,U).by[cid]?.net||0,q=>PB.lvl==='M'&&q.y===PB.y&&q.m===PB.m,mois.length>6?'defile petit':'petit')}
    <p class="f-lbl">${ops.length} opération${ops.length>1?'s':''}</p>
    <div class="ops">${ops.map(o=>opLine(o,true)).join('')}</div></div>`;
}
