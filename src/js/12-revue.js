/* ============ Votre année en revue ============ */
function openReview(){
  const y=P.y, Y=agg({lvl:'Y',y,m:1},'all');
  const months=Array.from({length:12},(_,i)=>({m:i+1,a:agg({lvl:'M',y,m:i+1},'all')})).filter(x=>x.a.any);
  const best=months.slice().sort((a,b)=>b.a.income-a.a.income)[0], worst=months.slice().sort((a,b)=>a.a.income-b.a.income)[0];
  const sober=months.slice().sort((a,b)=>a.a.net-b.a.net)[0];
  const topCat=Object.entries(Y.by).filter(([c])=>c!=='_pending').sort((a,b)=>b[1].net-a[1].net)[0];
  const ops=S.ops.filter(o=>o.date.startsWith(y+'-')&&o.amount<0&&o.src!=='rev'&&!['income','transfer'].includes(typeOf(catOf(o)||'')));
  const cnt={}; ops.forEach(o=>cnt[o.merchant]=(cnt[o.merchant]||0)+1);
  const fav=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
  const big=ops.filter(o=>!catById(catOf(o))?.fixed).sort((a,b)=>a.amount-b.amount)[0];
  const saved=Y.income-Y.net; const nMed=medals(stats({lvl:'Y',y,m:12},'all')).filter(m=>m[3]).length;
  const sl=(lbl,v,c,txt)=>`<section class="slide"><div class="lbl">${lbl}</div><div class="v${txt?' txt':''}">${v}</div>${c?`<div class="c">${c}</div>`:''}</section>`;
  const html=`<div id="review" role="dialog" aria-label="Votre année en revue"><button class="close" data-act="closereview">Fermer</button>
    ${sl(`Votre année ${y}`,'En revue','Faites défiler vers le bas.',true)}
    ${sl('Vous avez encaissé',esc(eur0(Y.income)),`Soit ${esc(eur0(Y.income/Math.max(1,months.length)))} par mois en moyenne, sur ${months.length} mois suivis.`)}
    ${best?sl('Votre meilleur mois',esc(MOIS[best.m-1]),`${esc(eur0(best.a.income))} encaissés.${worst&&worst!==best?` Le plus creux : ${esc(MOIS[worst.m-1])}, avec ${esc(eur0(worst.a.income))}.`:''}`,true):''}
    ${sl('Vos dépenses personnelles',esc(eur0(Y.net)),topCat?`Premier poste : ${esc(catById(topCat[0])?.name||'')}, ${esc(eur0(topCat[1].net))}.`:'')}
    ${fav?sl('Votre adresse préférée',esc(fav[0]),`${fav[1]} passages dans l’année.`,true):''}
    ${big?sl('Votre plus grosse folie',esc(eur0(-big.amount)),`${esc(big.merchant)}, le ${esc(dfmt(big.date))}.`):''}
    ${sober?sl('Votre mois le plus sobre',esc(MOIS[sober.m-1]),`${esc(eur0(sober.a.net))} dépensés seulement.`,true):''}
    ${sl(saved>=0?'Il vous est resté':'Vous avez puisé',esc(eur0(Math.abs(saved))),`${nMed} médaille${nMed>1?'s':''} gagnée${nMed>1?'s':''}. Rendez-vous l’an prochain.`)}
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html); document.body.style.overflow='hidden';
}

