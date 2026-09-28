/* ============ Vrai salaire et juste prix : affichage ============ */
let MODAL=null;
const nb=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(n);
const alerteTaux=()=>tauxRegle()?'':`<div class="alerte-taux"><p>Vous n’avez pas indiqué la part à mettre de côté pour vos cotisations et impôts : ce chiffre est trop optimiste.</p><button class="btn secondaire" data-tab="reglages" data-ancre="taux-champ">Régler maintenant</button></div>`;
function salaireBloc(p,src){
  const s=vraiSalaire(p); if(s.vide) return '';
  if(s.rien) return `<p class="salaire rouge">Votre activité ne vous a rien laissé en poche sur cette période : pas de salaire de l’heure à calculer.</p>${alerteTaux()}`;
  return `<p class="salaire ${s.ok?'or':'rouge'}">Votre vrai salaire : <b>${eur(s.vrai)} nets de l’heure</b></p>
    <p class="sal-sous">congés et retraite déjà déduits, sur une base de ${nb(hSemaine())} h par semaine</p>
    ${s.ok?'':`<p class="sal-manque">Il vous manque ${eur(s.manque)} de l’heure pour atteindre votre objectif</p>`}
    ${alerteTaux()}
    ${src==='bilan'?cascadeHtml(p):`<button class="lien" data-modal="cascade" data-src="${src}">D’où vient ce chiffre ?</button>`}`;
}
/* La même cascade dans la fenêtre et dans le Bilan */
function cascadeHtml(p){
  const c=cascade(p); if(!c) return '';
  if(c.rien) return '<p class="phrase">Votre activité ne vous a rien laissé en poche sur cette période.</p>';
  const per=p.lvl==='M'?'ce mois-ci':'par mois en moyenne', pc=x=>nb(x*100);
  const L=(lbl,sub,v,cls)=>`<div class="cas${cls?' '+cls:''}"><div class="cas-g"><span class="cas-l">${lbl}</span><span class="cas-s">${sub}</span></div><b class="cas-v">${eur(v)}</b></div>`;
  return `<div class="cascade">
    <p class="phrase">Sur vos ${nb(hSemaine())} h par semaine, environ ${nb(hSemaine()*(1-c.nf))} h sont facturées à vos clients. Le reste sert à trouver des clients et à faire tourner l’activité.</p>
    ${L('Ce que vos clients vous paient par heure facturée',`${eur0(c.enc)} encaissés ${per}, pour ${nb(c.hFact)} heures facturées`,c.a,'depart')}
    ${L(`Moins le temps non facturé (prospection, communication, devis, administratif… ${pc(c.nf)} %)`,`Les mêmes ${eur0(c.enc)}, répartis sur vos ${nb(c.H)} heures de travail`,c.b)}
    ${L('Moins les frais de fonctionnement (logiciels, téléphone, internet, assurance, matériel…), remboursements d’emprunt de l’activité compris',`−${eur0(c.frais)} ${per}`,c.c)}
    ${L(`Moins les cotisations sociales et impôts (la somme mise de côté, ${pc(reglage('taux',0,90)/100)} %)`,`−${eur0(c.prov)} ${per}`,c.d)}
    ${L(c.congesInclus?'Vos congés : déjà compris dans vos 12 mois de relevés':`Moins vos congés (${nb(reglage('semNonTrav',0,51))} semaines par an sans revenu)`,c.congesInclus?'Aucune correction : vos mois de vacances sont dans vos relevés':`Soit environ ${eur0(c.poche*c.corr)} par mois sur l’année`,c.e)}
    ${L(`Moins l’épargne et la retraite à constituer vous-même (${pc(c.ep)} %)`,`−${eur0(c.poche*c.corr*c.ep)} par mois`,c.f)}
    ${L('Votre vrai salaire net de l’heure',`soit environ ${eur0(c.poche*c.corr*(1-c.ep))} par mois`,c.f,'final')}
    <p class="phrase">Un salarié payé ${eur(c.f)} nets de l’heure a déjà ses congés et sa retraite compris. Vous, vous devez les financer vous-même.</p></div>`;
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
    const p=MODAL.src==='bilan'?PB:P;
    h=`<p class="f-m">D’où vient ce chiffre ?</p>${alerteTaux()}${cascadeHtml(p)||'<p class="phrase">Aucune activité sur cette période.</p>'}`;
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
