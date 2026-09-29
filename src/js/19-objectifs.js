/* ============ Mes objectifs ============ */
const LIMITES_TETE=['shopping','loisirs','voyages','cadeaux'];
function champ(k,label,aide,opts){
  const s=S.settings;
  return `<label class="champ"${opts&&opts.id?` id="${opts.id}"`:''}>${label}<input type="number" inputmode="${opts&&opts.dec?'decimal':'numeric'}" min="0" max="${opts&&opts.max||100000}" step="${opts&&opts.step||1}" data-set="${k}" value="${s[k]??''}" placeholder="${SET0[k]||''}"></label>
    ${aide?`<p class="aide sous-champ">${aide}</p>`:''}`;
}
function ligneLimite(c){
  const L=c.limite||{};
  return `<div class="limite-reg"><span class="lr-nom"><i data-lucide="${c.icon}"></i>${esc(c.name)}</span>
    <span class="lr-champs"><input type="number" inputmode="numeric" min="0" step="10" placeholder="—" value="${L.montant||''}" data-limite="${c.id}" aria-label="Limite ${esc(c.name)} (€)">
    <select class="grand" data-limper="${c.id}" aria-label="Période de la limite ${esc(c.name)}">${[['M','par mois'],['Q','par trimestre'],['Y','par an']].map(([k,l])=>`<option value="${k}"${(L.per||'M')===k?' selected':''}>${l}</option>`).join('')}</select></span></div>`;
}
function vObjectifs(){
  const perso=S.categories.filter(c=>c.type==='expense'&&c.univers!=='pro');
  const tete=LIMITES_TETE.map(catById).filter(Boolean), autres=perso.filter(c=>!LIMITES_TETE.includes(c.id));
  return `<h2 class="titre-page">Mes objectifs</h2>
  <section class="carte" id="objectif"><h3>Mon objectif</h3>
    ${champ('netVise','Ce que je veux gagner par mois (€)','Ce que vous voulez vous verser chaque mois, une fois tout payé.',{step:50})}
    ${champ('heuresSemaine','Mes heures de travail par semaine','Tout compris : clients, prospection, devis, administratif, formation, déplacements.',{max:100})}
    ${champ('taux','Part à garder de côté pour mes cotisations et impôts (%)',CONSEIL_TAUX,{id:'taux-champ',max:80,dec:1})}
    <p class="phrase prix-live" id="prixLive" aria-live="polite">${phrasePrix()}</p>
    ${tauxRegle()?'':'<p class="aide">Sans la part à garder de côté, ce prix est trop bas : indiquez-la ci-dessus.</p>'}
    <details class="autre affiner"><summary>Affiner le calcul</summary>
      <h4>Mon temps de travail</h4>
      ${champ('semNonTrav','Semaines non travaillées par an',`Par exemple 5 semaines de congés et 2 pour les jours fériés et les imprévus : soit ${nb(semTrav())} semaines travaillées.`,{max:51})}
      ${champ('nonFacture','Part du temps non facturé (%)','Prospection, devis, administratif, formation, déplacements : du temps travaillé que personne ne vous paie.',{max:90})}
      ${champ('epRetraite','Épargne et retraite à constituer vous-même (%)','Un salarié les a déjà dans son salaire ; vous, vous devez les mettre de côté vous-même.',{max:90})}
      ${champ('hJour','Si vous facturez à la journée : combien d’heures compte une journée ?',(j=>`Sert seulement à calculer votre prix à la journée, à partir de votre prix à l’heure${j?` (par exemple ${eur0(j.heure)} × ${nb(hJour())} h = ${eur0(j.heure*hJour())} la journée)`:''}.`)(justePrix()),{max:24})}
    </details></section>
  <section class="carte" id="limites"><h3>Mes limites de dépenses</h3>
    <p class="aide">Indiquez un montant pour les rubriques que vous voulez surveiller, par mois, par trimestre ou par an. Laissez vide pour ne pas fixer de limite.</p>
    ${tete.map(ligneLimite).join('')}
    <details class="autre"><summary>Autres rubriques</summary>${autres.map(ligneLimite).join('')}</details></section>
  ${blocTrophees()}`;
}
