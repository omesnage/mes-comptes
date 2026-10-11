/* ============ Réglages ============ */
const CONSEIL_TAUX='Souvent entre 25 et 45 % selon votre statut. En cas de doute, renseignez-vous auprès de votre centre de formalités ou d’un conseiller.';
/* Mode d'emploi : un écran complet, dans l'application (rien d'autre à envoyer). Sans jargon. */
function vAide(){
  const nom=SAL?'Mon compte':'Mes comptes';
  return `<div class="aide-page"><button class="lien" data-tab="accueil"><i data-lucide="chevron-left"></i>Retour</button>
  <h2 class="titre-page">Mode d’emploi</h2>
  <section class="carte"><h3>Ouvrir ${nom}</h3>
    <p class="phrase">Ouvrez le lien qu’on vous a envoyé : rien à installer. Vos données restent <b>sur cet appareil</b> : personne d’autre ne peut les voir.</p></section>
  <section class="carte"><h3>1. Ajouter vos relevés</h3>
    <p class="phrase">Téléchargez vos relevés de compte en <b>PDF</b> sur le site de votre banque. Dans « Importer », ${SAL?'ajoutez-les':'choisissez de quel compte ils viennent, puis ajoutez-les'} (plusieurs à la fois si vous voulez).</p>
    <p class="phrase">Vous préférez copier ? « Coller mes opérations » lit ce que vous copiez sur le site de votre banque, sans doublon avec vos relevés.</p></section>
  <section class="carte"><h3>2. Le premier mois est un peu long</h3>
    <p class="phrase">La première fois, l’application vous pose <b>5 questions au plus</b>, une à la fois, pour apprendre à reconnaître vos marchands. Ensuite elle retient vos réponses : <b>environ 90 % du travail n’est plus à refaire</b>.</p></section>
  <section class="carte"><h3>3. Corriger une erreur</h3>
    <p class="phrase">Touchez une opération pour changer sa rubrique. Les lignes « classé automatiquement » sont des suppositions : corrigez seulement ce qui est faux, ou touchez « Tout valider » dans « Classé automatiquement ».</p>
    <p class="phrase">Un relevé rangé dans le mauvais compte ? « Importer », « Mes relevés ajoutés », puis « Mauvais compte ? ».</p></section>
  <section class="carte"><h3>4. Sauvegarder, et retrouver vos données ailleurs</h3>
    <p class="phrase">L’application ne fonctionne que sur <b>un seul appareil à la fois</b>.</p>
    <p class="phrase">Touchez <b>« Sauvegarder dans mon dossier Cloud »</b> en haut de l’écran et choisissez un dossier de votre Google Drive, d’iCloud ou de Dropbox. Sur un téléphone, le fichier est téléchargé : déposez-le ensuite dans votre dossier Cloud.</p>
    <p class="phrase">Pour ouvrir l’application sur un autre appareil, enregistrez la sauvegarde <b>de préférence dans un Cloud</b> : vous pourrez ainsi la rappeler de l’autre côté. Ouvrez le même lien, puis « Réglages », « Restaurer une sauvegarde », et choisissez le fichier.</p>
    <p class="phrase"><b>Refaites la même chose quand vous changez de nouveau d’appareil</b> : sauvegardez, puis restaurez. Ce n’est pas automatique.</p>
    <p class="phrase"><b>Le plus pratique reste donc de garder le même appareil.</b></p></section>
  <section class="carte"><h3>Le petit badge « Netlify »</h3>
    <p class="phrase">Si un petit badge « Netlify » apparaît en bas de la page, <b>touchez-le : il disparaît</b>. Cela ne change rien à vos données.</p></section>
  <section class="carte"><h3>Bon à savoir</h3>
    <p class="phrase">Vos données sont liées à <b>l’adresse du lien</b> et au navigateur : une autre adresse, ou une fenêtre de navigation privée, donne une application vide.</p>
    <p class="phrase">Un doute ? « Voir un exemple » essaie l’application avec des données fictives : rien n’est enregistré.</p>
    <div class="boutons"><button class="btn secondaire" data-act="demo">Voir un exemple</button></div></section></div>`;
}
function vReglages(){
  const s=S.settings, st=S.ops.length?stats({lvl:'M',...endOf(defaultPeriod())},'all'):null;
  const r=Object.entries(S.rules).sort((a,b)=>a[0].localeCompare(b[0]));
  const annees=[...new Set(S.ops.map(o=>o.date.slice(0,4)))].sort().reverse();
  const perso=S.categories.filter(c=>c.type==='expense'&&c.univers!=='pro'), act=S.categories.filter(c=>c.type==='expense'&&c.univers==='pro');
  const rub=c=>`<div class="rub-reg"><i data-lucide="${c.icon}"></i><span class="rr-nom">${esc(c.name)}</span>
    <button class="lien" data-rencat="${c.id}">Renommer</button>${c.custom?`<button class="lien danger" data-delcat="${c.id}">Supprimer</button>`:''}</div>`;
  return `<h2 class="titre-page">Réglages</h2>
  <button class="carte lien-objectifs" data-tab="objectifs"><span><span class="r-t">${SAL?'Vos limites de dépenses':'Votre objectif, votre temps de travail et vos limites'}</span><span class="aide">${SAL?'Elles se règlent':'Ils se règlent'} dans l’onglet Mes objectifs.</span></span><i data-lucide="chevron-right"></i></button>
  <section class="carte" id="reserve"><h3>Votre réserve</h3>
    <label class="champ">Épargne disponible (€)<input type="number" inputmode="numeric" min="0" step="100" data-set="epargne" value="${s.epargne||''}" placeholder="0"></label>
    ${st&&st.autonomie!=null?`<p class="phrase">Votre réserve couvre ${fmt1(st.autonomie)} mois de dépenses.</p>`:`<p class="aide">Elle indique combien de mois vous tiendriez ${SAL?'sans aucun salaire':'sans rien encaisser'}.</p>`}</section>
  ${S.accounts.length?`<section class="carte" id="comptes"><h3>Vos comptes</h3>
    ${S.accounts.map(a=>`<div class="compte-reg"><p class="cr-nom">${esc(a.name)} <button class="lien" data-renacct="${a.id}">Renommer</button></p>
      ${SAL?'':`      <p class="aide">Ce compte est-il professionnel, personnel, ou sert-il à tout ?</p>
      <div class="choix gros">${Object.entries(TYPES_LONG).map(([k,l])=>`<button class="choix-btn${a.type===k?' suggere':''}" data-settype="${a.id}:${k}" aria-pressed="${a.type===k}">${l}</button>`).join('')}</div>`}</div>`).join('')}
    ${SAL?'':'<p class="aide">Sans compte pro, l’application vous demandera simplement, pour chaque personne qui vous paie, s’il s’agit d’un client.</p>'}</section>`:''}
  <section class="carte" id="rubriques"><h3>Vos rubriques</h3>
    <p class="aide">Renommez ou supprimez vos rubriques. Les limites de dépenses se fixent dans Mes objectifs.</p>
    ${perso.map(rub).join('')}
    ${SAL?'':`<details class="autre"><summary>Rubriques de l’activité</summary>${act.map(rub).join('')}</details>`}
    <button class="btn secondaire ajout-btn" data-act="nouvrub" data-de="reglages"><i data-lucide="plus"></i>Ajouter une rubrique</button></section>
  <button class="carte lien-objectifs lien-aide-carte" data-tab="aide"><span><span class="r-t">Mode d’emploi</span><span class="aide">Ajouter vos relevés, sauvegarder, retrouver vos données.</span></span><i data-lucide="chevron-right"></i></button>
  <section class="carte" id="donnees"><h3>Vos données</h3>
    <p class="aide">${mode==='db'?'Vos données sont dans votre espace privé.':'Vos données sont enregistrées dans ce navigateur, sur cet appareil.'} Ils ne se retrouvent pas tout seuls sur un autre appareil : l’application ne fonctionne que sur un seul appareil à la fois.</p>
    <details class="autre"><summary>Retrouver mes données sur mon téléphone ou un autre ordinateur</summary>
      <ol class="aide liste-etapes"><li>Ici, touchez « Sauvegarder mes données » : un fichier est enregistré sur l’appareil.</li>
      <li>Placez ce fichier dans Google Drive, dans un dossier à vous (depuis l’application Drive, depuis drive.google.com, ou dans le dossier Drive de votre ordinateur).</li>
      <li>Sur l’autre appareil, ouvrez l’application, récupérez le fichier dans Drive, puis touchez « Restaurer une sauvegarde » et choisissez-le.</li></ol>
      <p class="aide">Ce n’est pas automatique : refaites-le après chaque ajout de relevés, et gardez toujours la sauvegarde la plus récente. Autre possibilité : ajouter vos opérations sur chaque appareil avec « Coller mes opérations » (celles déjà présentes ne sont pas comptées deux fois), chaque appareil gardant alors sa propre copie.</p></details>
    <div class="boutons"><button class="btn" data-act="backup">Sauvegarder mes données</button><label class="btn secondaire">Restaurer une sauvegarde<input type="file" id="restorefile" accept=".json,application/json" hidden></label></div>
    ${RESTAURER?`<div class="question"><p class="q-t">Remplacer vos données actuelles par cette sauvegarde ?</p><p class="q-s">Ce qui est enregistré ici sera remplacé.</p><div class="choix gros"><button class="choix-btn" data-act="restok">Oui, restaurer</button><button class="choix-btn" data-act="restno">Non, garder mes données</button></div></div>`:''}
    ${backupMsg?`<p class="ok-txt">${esc(backupMsg)}</p>`:''}
    <h4>Classement automatique</h4>
    <p class="aide">Quand l’application ne connaît pas un commerçant, elle devine sa rubrique : c’est écrit « classé automatiquement ». Elle apprend de nouveaux commerçants avec le temps. Ce bouton refait ces devinettes avec ses connaissances les plus récentes. Vos propres choix ne changent jamais.</p>
    <div class="boutons"><button class="btn secondaire" data-act="reclasser">Refaire le classement automatique</button></div>
    <h4>Repartir de zéro</h4>
    <p class="aide">Supprime de cet appareil toutes vos opérations, vos choix et vos réglages. C’est définitif : faites d’abord une sauvegarde.</p>
    ${WIPE?`<div class="question"><p class="q-t">Tout supprimer de cet appareil ?</p><p class="q-s">Opérations, choix et réglages seront effacés, sans retour possible.</p><div class="choix gros"><button class="choix-btn" data-act="wipeok">Oui, tout effacer</button><button class="choix-btn" data-act="wipeno">Non, tout garder</button></div></div>`:`<button class="lien danger" data-act="wipe">Effacer toutes mes données</button>`}</section>
  ${annees.length?`<section class="carte"><h3>Votre année en revue</h3><div class="boutons">${annees.slice(0,3).map(y=>`<button class="btn secondaire" data-act="review" data-year="${y}">Année ${y}</button>`).join('')}</div></section>`:''}
  <section class="carte"><h3>Présentation</h3><button class="btn secondaire" data-act="relancer">Revoir la présentation</button></section>
  <details class="carte repli" id="avances"><summary>Réglages avancés</summary>
    ${SAL?'':`<label class="champ">La part à garder de côté se calcule sur<select class="grand" data-assiette="1"><option value="ca"${s.assiette!=='resultat'?' selected':''}>ce que vous encaissez</option><option value="resultat"${s.assiette==='resultat'?' selected':''}>ce qui reste après les frais</option></select></label>`}
    ${S.accounts.filter(a=>a.type==='pro').map(a=>`<label class="champ">Solde du compte ${esc(a.name)} (€)<input type="number" inputmode="decimal" step="0.01" data-solde="${a.id}" value="${a.solde!=null?a.solde:''}"></label>
      <label class="champ">À la date du<input type="date" data-soldedate="${a.id}" value="${esc(a.soldeDate||'')}"></label>`).join('')}
    <h4>Vos choix mémorisés</h4>
    <p class="aide">Quand vous rangez un commerçant dans une rubrique, l’application s’en souvient : ses prochaines opérations iront toutes seules dans cette rubrique. Ici, vous pouvez changer la rubrique retenue pour un commerçant. « Oublier ce choix » efface ce souvenir : l’application ne rangera plus ce commerçant d’office. Ses opérations seront rangées de nouveau par l’application, ou vous seront redemandées dans « À vérifier ».</p>
    ${r.length?r.map(([m,c])=>`<div class="regle"><span>${esc(ruleName(m))}</span><select class="grand" data-rule="${esc(m)}" aria-label="Rubrique pour ${esc(m)}">${catOptions(c)}</select><button class="lien" data-delrule="${esc(m)}" aria-label="Oublier le choix pour ${esc(ruleName(m))}">Oublier ce choix</button></div>`).join(''):'<p class="aide">Aucun pour l’instant.</p>'}
    <h4 id="lecteurs">Un relevé est mal lu ?</h4>
    <p class="aide">Si des montants ou des noms sont faux ou manquants après l’ajout d’un relevé, on peut apprendre à l’application à lire les relevés de votre banque. On appelle cela une « méthode de lecture ».</p>
    <ol class="aide liste-etapes"><li>Ajoutez le relevé dans « Importer », puis touchez « Copier la demande pour Claude » dans l’aide qui s’affiche.</li>
      <li>Collez cette demande dans Claude (l’assistant). Il répond par un texte qui commence par { et finit par }.</li>
      <li>Collez ce texte dans la case ci-dessous, puis touchez « Ajouter cette méthode de lecture ».</li></ol>
    <textarea id="readerIn" class="anon" placeholder="Collez ici la réponse de Claude (elle commence par { et finit par })"></textarea>
    <button class="btn secondaire" data-act="addreader">Ajouter cette méthode de lecture</button>
    ${readerMsg?`<p class="${readerErr?'ko-txt':'ok-txt'}">${esc(readerMsg)}</p>`:''}
    ${(S.readers||[]).map((x,i)=>`<div class="regle"><span>${esc(x.nom)}</span><button class="lien" data-lexport="${i}">Enregistrer dans un fichier pour un proche</button><button class="lien" data-delreader="${i}">Supprimer</button></div>`).join('')}
    <label class="btn secondaire">Ajouter une méthode de lecture reçue (fichier)<input type="file" id="lecteurfile" accept=".json,application/json" hidden></label>
    <p class="aide">Une personne qui a la même banque que vous peut vous envoyer sa méthode de lecture sous forme de fichier : ajoutez-la ici, elle s’appliquera toute seule à vos relevés. Dans l’autre sens, « Enregistrer dans un fichier pour un proche » crée ce fichier à lui envoyer.</p>
  </details>`;
}

/* ============ Démarrage ============ */
function vDemarrage(){
  if(SAL){
    const pas=`<p class="etapes" aria-label="Étape ${ONB+1} sur 2">${[0,1].map(i=>`<span class="${i===ONB?'on':''}"></span>`).join('')}</p>`;
    if(ONB===0) return `<section class="demarrage">${pas}<h2>Bienvenue</h2>
      <p class="phrase">Cette application vous montre où part votre argent, mois après mois.</p>
      <p class="phrase">Vos comptes restent sur cet appareil : personne d’autre ne peut les voir. Elle ne fonctionne que sur un seul appareil : pour les retrouver ailleurs, voir Réglages, « Vos données ».</p>
      <div class="boutons"><button class="btn" data-onb="1">Commencer</button><button class="btn secondaire" data-act="demo">Voir un exemple</button></div>
      <button class="lien" data-act="onbfin">Passer</button></section>`;
    return `<section class="demarrage">${pas}<h2>Ajoutez vos relevés</h2>
      <p class="phrase">Téléchargez vos relevés de compte en PDF sur le site de votre banque, puis ajoutez-les ici.</p>
      <div class="boutons"><button class="btn" data-act="onbfin" data-tab="importer">Ajouter mes relevés</button><button class="btn secondaire" data-act="demo">Voir un exemple</button></div>
      <button class="lien" data-act="onbfin">Plus tard</button></section>`;
  }
  const s=S.settings, pas=`<p class="etapes" aria-label="Étape ${ONB+1} sur 3">${[0,1,2].map(i=>`<span class="${i===ONB?'on':''}"></span>`).join('')}</p>`;
  if(ONB===0) return `<section class="demarrage">${pas}<h2>Bienvenue</h2>
    <p class="phrase">Cette application vous montre ce que vous gagnez vraiment, et où part votre argent.</p>
    <p class="phrase">Vos comptes restent sur cet appareil : personne d’autre ne peut les voir. Elle ne fonctionne que sur un seul appareil : pour les retrouver ailleurs, voir Réglages, « Vos données ».</p>
    <div class="boutons"><button class="btn" data-onb="1">Commencer</button><button class="btn secondaire" data-act="demo">Voir un exemple</button></div>
    <button class="lien" data-act="onbfin">Passer</button></section>`;
  if(ONB===1) return `<section class="demarrage">${pas}<h2>Votre objectif</h2>
    <label class="champ">Ce que vous voulez gagner par mois (€)<input type="number" inputmode="numeric" min="0" step="50" data-set="netVise" value="${s.netVise||''}" placeholder="2500"></label>
    <label class="champ">Heures travaillées par semaine<input type="number" inputmode="numeric" min="1" max="100" step="1" data-set="heuresSemaine" value="${s.heuresSemaine||''}" placeholder="40"></label>
    <label class="champ">Part à garder de côté pour vos cotisations et impôts (%)<input type="number" inputmode="decimal" min="0" max="80" step="1" data-set="taux" value="${s.taux||''}" placeholder="par exemple 22"></label>
    <p class="aide">${CONSEIL_TAUX}</p>
    <p class="phrase prix-live" id="prixLive" aria-live="polite">${phrasePrix()}</p>
    <p class="aide"><button class="lien" data-act="onbfin" data-tab="objectifs">Vous pourrez tout changer plus tard</button>, dans l’onglet Mes objectifs.</p>
    <div class="boutons"><button class="btn" data-onb="2">Continuer</button></div><button class="lien" data-act="onbfin">Passer</button></section>`;
  const cu=S.settings.compteUnique;
  return `<section class="demarrage">${pas}<h2>Ajoutez vos relevés</h2>
    <p class="phrase">Avez-vous un compte bancaire réservé à votre activité ?</p>
    <div class="choix gros"><button class="choix-btn${cu===false?' suggere':''}" data-cu="0" aria-pressed="${cu===false}">Oui, j’ai un compte pro</button><button class="choix-btn${cu===true?' suggere':''}" data-cu="1" aria-pressed="${cu===true}">Non, un seul compte pour tout</button></div>
    ${cu===true?`<p class="aide">Pas de souci : vous aurez simplement à nous dire, pour chaque personne qui vous paie, s’il s’agit d’un client.</p>`:''}
    <p class="phrase">Téléchargez ensuite vos relevés de compte en PDF sur le site de votre banque${cu===true?'':', pro et perso'}, puis ajoutez-les ici.</p>
    <div class="boutons"><button class="btn" data-act="onbfin" data-tab="importer">Ajouter mes relevés</button><button class="btn secondaire" data-act="demo">Voir un exemple</button></div>
    <button class="lien" data-act="onbfin">Plus tard</button></section>`;
}
