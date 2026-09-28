/* ============ Votre année en revue ============ */
function openReview(){
  const y=P.y, Y=agg({lvl:'Y',y,m:1},'all');
  const months=Array.from({length:12},(_,i)=>({m:i+1,a:agg({lvl:'M',y,m:i+1},'all')})).filter(x=>x.a.any);
  const best=months.slice().sort((a,b)=>b.a.income-a.a.income)[0], worst=months.slice().sort((a,b)=>a.a.income-b.a.income)[0];
  const sober=months.slice().sort((a,b)=>a.a.net-b.a.net)[0];
  const topCat=Object.entries(Y.by).filter(([c])=>c!=='_pending').sort((a,b)=>b[1].net-a[1].net)[0];
  const ops=S.ops.filter(o=>o.date.startsWith(y+'-')&&o.amount<0&&o.src!=='rev'&&!INTERNAL[o.id]&&!['income','transfer','remu'].includes(typeOf(catOf(o)||'')));
  const cnt={}; ops.forEach(o=>cnt[o.merchant]=(cnt[o.merchant]||0)+1);
  const fav=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
  const big=ops.filter(o=>!catById(catOf(o))?.fixed).sort((a,b)=>a.amount-b.amount)[0];
  const saved=Y.income-Y.net; const nMed=medailles().filter(m=>m.tier>0).length;
  const pro=Array.from({length:12},(_,i)=>({m:i+1,a:agg({lvl:'M',y,m:i+1},'pro')})).filter(x=>x.a.any&&(x.a.ca>0||x.a.frais>0));
  const tMoy=pro.length?pro.reduce((s,x)=>s+x.a.revenuNet,0)/pro.length/heures():null;
  const nb=pro.slice().sort((a,b)=>b.a.revenuNet-a.a.revenuNet), bestN=nb[0], worstN=nb[nb.length-1];
  const reussis=(GAME.defis||[]).filter(x=>x.status==='réussi'&&x.to.startsWith(y+'-'));
  const eco=economiesSur(moisComplets().filter(k=>k.startsWith(y+'-'))), niv=experience();
  const sl=(lbl,v,c,txt)=>`<section class="slide"><div class="lbl">${lbl}</div><div class="v${txt?' txt':''}">${v}</div>${c?`<div class="c">${c}</div>`:''}</section>`;
  const html=`<div id="review" role="dialog" aria-label="Votre année en revue"><button class="close" data-act="closereview">Fermer</button>
    ${sl(`Votre année ${y}`,'En revue','Faites défiler vers le bas.',true)}
    ${sl('Vous avez encaissé',esc(eur0(Y.income)),`Soit ${esc(eur0(Y.income/Math.max(1,months.length)))} par mois en moyenne, sur ${months.length} mois suivis.`)}
    ${best?sl('Votre meilleur mois',esc(MOIS[best.m-1]),`${esc(eur0(best.a.income))} encaissés.${worst&&worst!==best?` Le plus creux : ${esc(MOIS[worst.m-1])}, avec ${esc(eur0(worst.a.income))}.`:''}`,true):''}
    ${tMoy!=null?sl('Votre heure de travail vous a rapporté',esc(eur(tMoy)),`En moyenne sur ${pro.length} mois, pour ${esc(eur(tauxCible()))} visés. ${tMoy>=tauxCible()?'Objectif tenu sur l’année.':'Il reste de la marge : vos tarifs sont peut-être à revoir.'}`):''}
    ${bestN&&pro.length>1?sl('Votre meilleur mois de revenu net',esc(MOIS[bestN.m-1]),`${esc(eur0(bestN.a.revenuNet))} nets. Le plus faible : ${esc(MOIS[worstN.m-1])}, avec ${esc(signed(worstN.a.revenuNet))}.`,true):''}
    ${sl('Vos dépenses, pro et perso',esc(eur0(Y.net)),topCat?`Premier poste : ${esc(catById(topCat[0])?.name||'')}, ${esc(eur0(topCat[1].net))}.`:'')}
    ${fav?sl('Votre adresse préférée',esc(fav[0]),`${fav[1]} passages dans l’année.`,true):''}
    ${big?sl('Votre plus grosse folie',esc(eur0(-big.amount)),`${esc(big.merchant)}, le ${esc(dfmt(big.date))}.`):''}
    ${sober?sl('Votre mois le plus sobre',esc(MOIS[sober.m-1]),`${esc(eur0(sober.a.net))} dépensés seulement.`,true):''}
    ${sl('Vos économies',esc(eur0(eco)),'Ce que vos postes ont coûté de moins que d’habitude, mois après mois.')}
    ${sl('Défis réussis',String(reussis.length),reussis.length?`Dont ${esc(reussis.slice(0,2).map(x=>x.name).join(' et '))}${reussis.length>2?', entre autres':''}.`:'L’année prochaine sera la bonne : il y en a pour tous les goûts.')}
    ${sl('Votre niveau',esc(niv.nom),`${new Intl.NumberFormat('fr-FR').format(niv.total)} points d’expérience et ${nMed} médaille${nMed>1?'s':''}.`,true)}
    ${sl(saved>=0?'Il vous est resté':'Vous avez puisé',esc(eur0(Math.abs(saved))),'Rendez-vous l’an prochain.')}
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html); document.body.style.overflow='hidden';
}

