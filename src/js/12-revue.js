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
  const sl=(lbl,v,c,txt)=>`<section class="slide"><div class="lbl">${lbl}</div><div class="v${txt?' txt':''}">${v}</div>${c?`<div class="c">${c}</div>`:''}</section>`;
  const html=`<div id="review" role="dialog" aria-label="Votre année en revue"><button class="close" data-act="closereview">Fermer</button>
    ${sl(`Votre année ${y}`,'En revue','Faites défiler vers le bas.',true)}
    ${pro.length?sl('Vous avez encaissé',esc(eur0(ca)),`Sur ${pro.length} mois, soit ${esc(eur0(ca/pro.length))} par mois en moyenne.`):''}
    ${pro.length?sl('Ce que vous avez gagné',esc(signed(net)),`Une heure de travail vous a rapporté ${esc(eurH(net/pro.length/heures()))} en moyenne, pour ${esc(eurH(tauxCible()))} visés.`):''}
    ${best&&pro.length>1?sl('Votre meilleur mois',esc(MOIS[best.m-1]),`${esc(eur0(best.pro.revenuNet))} gagnés. Le plus difficile : ${esc(MOIS[worst.m-1])}, avec ${esc(signed(worst.pro.revenuNet))}.`,true):''}
    ${pe.length?sl('Vos dépenses perso',esc(eur0(dep)),top?`La première rubrique : ${esc(catById(top[0])?.name||'')}, ${esc(eur0(top[1]))}.`:''):''}
    ${fav?sl('Votre adresse préférée',esc(fav[0]),`${fav[1]} passages dans l’année.`,true):''}
    ${sl('Défis réussis',String(defis.length),defis.length?`Bravo : ${esc(eur0(defis.reduce((s,x)=>s+x.economie,0)))} économisés grâce à eux.`:'Relevez le défi du mois : il est sur votre page d’accueil.')}
    ${sl('À l’année prochaine','Merci','Continuez d’ajouter vos relevés chaque mois.',true)}
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html); document.body.style.overflow='hidden';
}
