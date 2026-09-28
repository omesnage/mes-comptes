/* ============ Vrai salaire et juste prix : affichage ============ */
let MODAL=null;
const nb=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(n);
function salaireBloc(p,src){
  const s=vraiSalaire(p); if(s.vide) return '';
  if(s.rien) return `<p class="salaire rouge">Votre activité ne vous a rien laissé en poche sur cette période : pas de salaire de l’heure à calculer.</p>`;
  return `<p class="salaire ${s.ok?'or':'rouge'}">Votre vrai salaire : <b>${eur(s.vrai)} nets de l’heure</b></p>
    <p class="sal-sous">congés et retraite déjà déduits, sur une base de ${nb(hSemaine())} h par semaine</p>
    ${s.ok?'':`<p class="sal-manque">Il vous manque ${eur(s.manque)} de l’heure pour atteindre votre objectif</p>`}
    <button class="lien" data-modal="cascade" data-src="${src}">D’où vient ce chiffre ?</button>`;
}
function justePrixBloc(){
  const j=justePrix();
  if(!j) return `<section class="carte juste-prix"><h3>Votre juste prix</h3><p class="aide">Vos réglages ne permettent pas de le calculer : vérifiez les pourcentages dans les réglages.</p></section>`;
  return `<section class="carte juste-prix"><h3>Votre juste prix</h3>
    <p class="phrase">Pour gagner vraiment ${eur0(netVise())} nets par mois, vous devez facturer au minimum <b>${eur0(j.heure)} de l’heure</b>, soit <b>${eur0(j.jour)} par jour</b>.</p>
    ${j.moyen!=null?`<p class="phrase ${j.moyen<j.heure?'rouge':'or'}">Aujourd’hui, vous facturez en moyenne l’équivalent de ${eur0(j.moyen)} de l’heure.</p>`:''}
    <button class="lien" data-modal="prix">Comment c’est calculé ?</button></section>`;
}
const mini=(k,max,step)=>`<input class="mini" type="number" inputmode="decimal" min="0" max="${max}" step="${step||1}" data-set="${k}" value="${esc(String(S.settings[k]??SET0[k]))}" aria-label="${k}">`;
function fenetreModal(){
  let h='';
  if(MODAL.type==='cascade'){
    const p=MODAL.src==='bilan'?PB:P, s=vraiSalaire(p);
    h=s.vide||s.rien?`<p class="f-m">D’où vient ce chiffre ?</p><p class="phrase">Votre activité ne vous a rien laissé en poche sur cette période.</p>`:`<p class="f-m">D’où vient ce chiffre ?</p>
      <div class="ligne"><span>Ce qui vous reste en poche, par heure travaillée</span><b>${eur(s.brut)}</b></div>
      <div class="ligne"><span>${s.congesInclus?'Vos congés : déjà compris dans vos 12 mois de relevés':`Moins vos congés (${nb(reglage('semNonTrav',0,51))} semaines par an sans revenu)`}</span><b>${eur(s.conges)}</b></div>
      <div class="ligne total"><span>Moins l’épargne et la retraite à constituer vous-même (${nb(epRet()*100)} %)</span><b>${eur(s.vrai)}</b></div>
      <p class="phrase">Un salarié payé ${eur(s.vrai)} nets de l’heure a déjà ses congés et sa retraite compris. Vous, vous devez les financer vous-même.</p>
      <p class="aide">Calculé sur ${eur0(s.poche)} en poche par mois (ce que vous avez encaissé, moins les frais de l’activité et la somme mise de côté), pour ${nb(heures())} heures de travail par mois.</p>`;
  } else {
    const j=justePrix(), ms=douzeMois();
    h=`<p class="f-m">Comment c’est calculé ?</p>
      <p class="phrase">Vous visez ${mini('netVise',100000,50)} € nets par mois.</p>
      <p class="phrase">Vous travaillez ${mini('heuresSemaine',100)} h par semaine, et ${mini('semNonTrav',51)} semaines par an sans revenu (congés, jours fériés, imprévus) : soit ${nb(semTrav())} semaines travaillées.</p>
      <p class="phrase">${mini('nonFacture',90)} % de votre temps n’est pas facturé (prospection, devis, administratif, formation, déplacements).${j?` Il vous reste ${nb(j.hFact)} heures à facturer par an.`:''}</p>
      <p class="phrase">Vous devez constituer vous-même ${mini('epRetraite',90)} % pour votre épargne et votre retraite.${j?` Il vous faut donc ${eur0(j.poche)} en poche sur l’année.`:''}</p>
      <p class="phrase">${ms.length?`Vos frais de l’activité : ${eur0(j?j.fraisAn:0)} par an, d’après vos ${ms.length} derniers mois.`:'Vos frais de l’activité : pas encore de relevés, ils sont comptés à zéro.'}</p>
      <p class="phrase">La somme mise de côté représente ${mini('taux',90)} % de <select class="grand inline" data-assiette="1"><option value="ca"${S.settings.assiette!=='resultat'?' selected':''}>ce que vous encaissez</option><option value="resultat"${S.settings.assiette==='resultat'?' selected':''}>ce qui reste après les frais</option></select>.</p>
      ${j?`<p class="phrase total-prix">Il faut donc encaisser ${eur0(j.enc)} par an, soit <b>${eur0(j.heure)} par heure facturée</b>. À ${mini('hJour',24)} h par jour facturé, cela fait <b>${eur0(j.jour)} par jour</b>.</p>`:'<p class="ko-txt">Avec ces pourcentages, le calcul n’est pas possible : aucun ne peut atteindre 100 %.</p>'}`;
  }
  return `<div class="fiche-fond haut" data-act="mclose"></div><div class="fiche fenetre haut" role="dialog" aria-modal="true" aria-label="${MODAL.type==='cascade'?'D’où vient ce chiffre ?':'Comment c’est calculé ?'}">
    <button class="fermer" data-act="mclose" aria-label="Fermer"><i data-lucide="x"></i></button>${h}
    <div class="boutons"><button class="btn" data-act="mclose">Fermer</button></div></div>`;
}
