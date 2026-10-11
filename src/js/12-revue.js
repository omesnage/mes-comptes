/* ============ Votre année en revue ============ */
function openReview(y){
  y=+y||P.y;
  const mois=Array.from({length:12},(_,i)=>({m:i+1,pro:agg({lvl:'M',y,m:i+1},'pro'),pe:agg({lvl:'M',y,m:i+1},'perso')}));
  const pro=mois.filter(x=>x.pro.any&&(x.pro.ca>0||x.pro.frais>0)), pe=mois.filter(x=>x.pe.any);
  const ca=pro.reduce((s,x)=>s+x.pro.ca,0), net=pro.reduce((s,x)=>s+x.pro.revenuNet,0);
  const tri=pro.slice().sort((a,b)=>b.pro.revenuNet-a.pro.revenuNet), best=tri[0], worst=tri[tri.length-1];
  const dep=pe.reduce((s,x)=>s+x.pe.net,0), rub={}; pe.forEach(x=>Object.entries(x.pe.by).forEach(([c,e])=>{if(c!=='_pending')rub[c]=(rub[c]||0)+e.net}));
  const top=Object.entries(rub).sort((a,b)=>b[1]-a[1])[0];
  const ops=S.ops.filter(o=>o.date.startsWith(y+'-')&&o.amount<0&&o.src!=='rev'&&!INTERNAL[o.id]&&opUniv(o)==='perso');
  const cnt={}; ops.forEach(o=>cnt[o.merchant]=(cnt[o.merchant]||0)+1); const fav=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
  const defis=S.challenges.filter(c=>c.id==='auto'&&c.month.startsWith(y+'-')).map(evalDefi).filter(x=>x&&x.status==='réussi');
  /* Tout sur une seule page : une ligne par chiffre important */
  const li=(couleur,icone,lbl,v,c)=>`<div class="rv-l ${couleur}"><i data-lucide="${icone}"></i><div><p class="rv-lbl">${lbl}</p><p class="rv-v">${v}</p>${c?`<p class="rv-c">${c}</p>`:''}</div></div>`;
  /* Salarié : ce qui est entré (salaire et autres rentrées), ce qui est parti, la balance */
  const sm=SAL?mois.map(x=>{const pm={lvl:'M',y,m:x.m},R=aggRaw(pm);return R.any?{m:x.m,rec:R.perso.income,dep:x.pe.net}:null}).filter(Boolean):[];
  const recT=sm.reduce((s,x)=>s+x.rec,0), depT=sm.reduce((s,x)=>s+x.dep,0), balT=recT-depT;
  const smt=sm.slice().sort((a,b)=>(b.rec-b.dep)-(a.rec-a.dep)), bestS=smt[0], worstS=smt[smt.length-1];
  const lignesSalarie=sm.length?
    li('menthe','banknote','Ce que vous avez reçu',esc(eur0(recT)),`Sur ${sm.length} mois, soit ${esc(eur0(recT/sm.length))} par mois en moyenne.`)+
    li('rose','shopping-cart','Ce que vous avez dépensé',esc(eur0(depT)),top?`La première rubrique : ${esc(catById(top[0])?.name||'')}, ${esc(eur0(top[1]))}.`:'')+
    li('ciel','piggy-bank','Balance de l’année',esc(signed(balT)),balT>=0?`Vous avez dépensé moins que ce qui est entré : ${esc(eur0(balT))} de côté.`:`Vous avez dépensé ${esc(eur0(-balT))} de plus que ce qui est entré.`)+
    (sm.length>1?li('peche','trophy','Votre meilleur mois',esc(MOIS[bestS.m-1]),`${esc(signed(bestS.rec-bestS.dep))} de balance. Le plus difficile : ${esc(MOIS[worstS.m-1])}, avec ${esc(signed(worstS.rec-worstS.dep))}.`):''):'';
  const lignesIndep=`
    ${pro.length?li('menthe','banknote','Vous avez encaissé',esc(eur0(ca)),`Sur ${pro.length} mois, soit ${esc(eur0(ca/pro.length))} par mois en moyenne.`):''}
    ${pro.length?li('ciel','piggy-bank','Ce que vous avez gagné',esc(signed(net)),`Une heure de travail vous a rapporté ${esc(eurH(net/pro.length/heures()))} en moyenne, pour ${esc(eurH(tauxCible()))} visés.`):''}
    ${best&&pro.length>1?li('peche','trophy','Votre meilleur mois',esc(MOIS[best.m-1]),`${esc(eur0(best.pro.revenuNet))} gagnés. Le plus difficile : ${esc(MOIS[worst.m-1])}, avec ${esc(signed(worst.pro.revenuNet))}.`):''}
    ${pe.length?li('rose','shopping-cart','Vos dépenses perso',esc(eur0(dep)),top?`La première rubrique : ${esc(catById(top[0])?.name||'')}, ${esc(eur0(top[1]))}.`:''):''}
  `;
  const lignesChiffres=SAL?lignesSalarie:lignesIndep;
  const html=`<div id="review" role="dialog" aria-label="Votre année en revue"><div class="rv-page">
    <div class="rv-tete"><h2>Votre année ${y}</h2><button class="close" data-act="closereview"><i data-lucide="x"></i>Fermer</button></div>
    <p class="aide">Les chiffres importants de l’année, sur une seule page.</p>
    ${lignesChiffres}
    ${fav?li('lavande','heart','Votre adresse préférée',esc(fav[0]),`${fav[1]} passages dans l’année.`):''}
    ${li('sable','target','Défis réussis',String(defis.length),defis.length?`Bravo : ${esc(eur0(defis.reduce((s,x)=>s+x.economie,0)))} économisés grâce à eux.`:'Relevez le défi du mois : il est sur votre page d’accueil.')}
    <p class="aide centre">Continuez d’ajouter vos relevés chaque mois.</p>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend',html); document.body.style.overflow='hidden'; icons();
}
