import {test,expect,openWith,importer,APP,APP_SAL} from './helpers.js';
import {bforbank} from './banques.js';
import os from 'os'; import path from 'path';

const ecran=page=>page.evaluate(()=>document.body.innerText);

test('salariés : démarrage en 2 étapes, sans compte pro ni objectif d’indépendant',async({page})=>{
  await openWith(page,'vierge',APP_SAL);
  await expect(page.locator('.etapes span')).toHaveCount(2);
  let t=await ecran(page);
  expect(t).toContain('Elle ne fonctionne que sur un seul appareil');
  await page.click('[data-onb="1"]');
  t=await ecran(page);
  expect(t).toContain('Ajoutez vos relevés');
  expect(t).not.toMatch(/compte pro|activité|client/i);
});

test('salariés : exemple sans activité, salaire reçu, dépensé et balance',async({page})=>{
  await openWith(page,{onboarded:true},APP_SAL);
  await page.click('[data-act="demo"]');
  const b=page.locator('.gagne #balance');
  await expect(b).toContainText('Ce que vous avez reçu');
  await expect(b).toContainText('Ce que vous avez dépensé');
  await expect(b).toContainText('Balance du mois');
  const t=await ecran(page);
  expect(t).not.toMatch(/Mon activité|Encaissé|Frais de l’activité|cotisations|objectif de|Gagné par votre activité/i);
  const r=await page.evaluate(()=>({acc:S.accounts.map(a=>a.type),pro:S.categories.filter(c=>c.univers==='pro').length,sal:S.ops.filter(o=>catOf(o)==='salaire').length}));
  expect(r.acc).toEqual(['perso']); expect(r.pro).toBe(0); expect(r.sal).toBeGreaterThan(5);
});

test('salariés : Bilan, Objectifs et Réglages sans rien d’indépendant',async({page})=>{
  await openWith(page,{onboarded:true},APP_SAL);
  await page.click('[data-act="demo"]');
  for(const tab of ['bilan','objectifs','reglages','importer']){
    await page.click(`[data-tab="${tab}"]`);
    const t=await ecran(page);
    expect(t,tab).not.toMatch(/Activité|activité|cotisations|Mon objectif|professionnel|temps de travail|tableau|client/);
  }
});

test('salariés : un relevé est lu sur un compte perso, le salaire est reconnu d’office, une ligne URSSAF n’est pas une cotisation',async({page})=>{
  await openWith(page,{onboarded:true},APP_SAL);
  const f=await bforbank(path.join(os.tmpdir(),'releve-bforbank-sal.pdf'));
  await importer(page,f);
  await expect(page.locator('.releve').first()).toContainText('Relevé vérifié ✓');
  const r=await page.evaluate(()=>({acc:S.accounts.map(a=>[a.type,a.confirmed]),auto:[autoCatOf('VIR SALAIRE MARS ENTREPRISE','perso',2100),autoCatOf('PRLV URSSAF PAYS DE LA LOIRE','perso',-300),autoCatOf('VIR CAF LOIRE','perso',150)],
    sug:[kwSuggest('CAF','VIR CAF LOIRE','perso',150),kwSuggest('X','PRLV HONORAIRES','perso',-50)]}));
  expect(r.acc).toEqual([['perso',true]]);
  expect(r.auto).toEqual(['salaire',null,null]);
  expect(r.sug).toEqual(['rentrees',null]);
});

test('salariés : les données ne se mélangent pas avec la version indépendants',async({page})=>{
  await openWith(page,{onboarded:true},APP_SAL);
  expect(await page.evaluate(()=>[LS,LSUI])).toEqual(['mes-comptes-salaries','mes-comptes-salaries-affichage']);
});

test('noms : « Mes comptes » pour les indépendants, « Mon compte » pour les salariés (titre, en-tête, sauvegarde)',async({page})=>{
  await openWith(page,{onboarded:true},APP_SAL);
  await expect(page).toHaveTitle('Mon compte');
  await expect(page.locator('.brand')).toHaveText('Mon compte');
  await openWith(page,{onboarded:true});
  await expect(page).toHaveTitle('Mes comptes');
  await expect(page.locator('.brand')).toHaveText('Mes comptes');
});

/* ===== Améliorations de Mes comptes reprises dans Mon compte (données fictives) ===== */
import fs from 'fs';
const INDEP=/activité|cotisation|professionnel|\bclients?\b|compte pro|Frais pro|objectif de|temps de travail|prix à facturer|taux horaire|encaiss|côté perso|dépenses perso/i;
const SAL_COMPTE=[{id:'a',name:'Banque',type:'perso',confirmed:true}];
/* Neuf mois : salaire de 2 100 €, courses et restaurants qui varient */
const avecSalaire=async page=>{
  await openWith(page,{onboarded:true},APP_SAL);
  await page.evaluate(c=>{
    const L=[];let id=0;
    for(let m=1;m<=9;m++){L.push([`2026-0${m}-03`,'VIR SALAIRE ENTREPRISE',2100,'salaire']);L.push([`2026-0${m}-10`,'CB CARREFOUR',-(150+m*40),'courses']);L.push([`2026-0${m}-15`,'CB RESTO',-(40+m*5),'resto'])}
    S.accounts=c; S.ops=L.map(([date,l,a,cat])=>({id:'o'+(id++),date,label:l,amount:a,merchant:l,acct:'a',cat}));save();P={lvl:'M',y:2026,m:9};render();
  },SAL_COMPTE);
};
const sauvSal=n=>({app:'mon-compte',version:1,date:'2026-07-01T10:00:00.000Z',data:{schemaVersion:16,onboarded:true,accounts:SAL_COMPTE,rules:{},
  ops:Array.from({length:n},(_,i)=>({id:'o'+i,date:'2026-06-1'+(i%9),label:'MARCHAND '+i,amount:-10-i,merchant:'MARCHAND '+i,acct:'a'}))}});

test('Mon compte : aucun mot d’indépendant sur aucun écran, avec des données',async({page})=>{
  await avecSalaire(page);
  for(const tab of ['accueil','bilan','operations','importer','objectifs','reglages']){
    await page.click(`nav.tabs [data-tab="${tab}"]`);
    if(tab==='reglages') await page.locator('#avances summary').click();
    if(tab==='importer'){await page.locator('.mode-court summary').click();await page.locator('.comment-ajouter summary').click()}
    expect(await ecran(page),tab).not.toMatch(INDEP);
  }
  await page.click('header [data-tab="aide"]');
  expect(await ecran(page),'aide').not.toMatch(INDEP);
});

test('Mon compte : filtre de Mes opérations par rubrique, mois, trimestre, année et dates',async({page})=>{
  await avecSalaire(page);
  await page.click('nav.tabs [data-tab="operations"]');
  await page.click('summary:has-text("Filtrer")');
  const opts=await page.evaluate(()=>[...document.querySelectorAll('#filtreCat option')].map(o=>o.textContent).join('|'));
  expect(opts).toContain('Salaire'); expect(opts).not.toMatch(/activité|Frais|client/i);
  const ids=()=>page.evaluate(()=>document.querySelectorAll('#view [data-op]').length);
  expect(await ids()).toBe(3);                                  // septembre
  await page.selectOption('#filtreCat','salaire'); expect(await ids()).toBe(1);
  await page.click('[data-flvl="Q"]'); expect(await ids()).toBe(3);
  await page.click('[data-flvl="Y"]'); expect(await ids()).toBe(9);
  await page.selectOption('#filtreCat','');  expect(await ids()).toBe(27);
  await page.click('[data-flvl="D"]');
  await page.fill('#filtreDu','2026-02-01'); await page.fill('#filtreAu','2026-02-28'); expect(await ids()).toBe(3);
  await expect(page.locator('#view')).toContainText('Au final');
});

test('Mon compte : Année sur l’Accueil montre les meilleurs et les plus difficiles mois',async({page})=>{
  await avecSalaire(page);
  await page.click('[data-alvl="Y"]');
  const b=page.locator('.mois-extremes');
  await expect(b.locator('.mx-bon')).toContainText('Janvier');
  await expect(b.locator('.mx-dur')).toContainText('Septembre');
  expect(await b.innerText()).not.toMatch(INDEP);
});

test('Mon compte : l’année en revue tient sur une page, avec reçu, dépensé et balance',async({page})=>{
  await avecSalaire(page);
  await page.evaluate(()=>openReview(2026));
  const r=page.locator('#review');
  await expect(r).toContainText('Ce que vous avez reçu');
  await expect(r).toContainText('Ce que vous avez dépensé');
  await expect(r).toContainText('Balance de l’année');
  await expect(r).toContainText('Votre meilleur mois');
  expect(await r.innerText()).not.toMatch(INDEP);
  expect(await page.evaluate(()=>document.querySelectorAll('#review .slide').length)).toBe(0);
  await page.click('#review .close'); await expect(page.locator('#review')).toHaveCount(0);
});

test('Mon compte : en-tête en icônes avec explications, alerte sans sauvegarde, date de la sauvegarde',async({page})=>{
  await openWith(page,{onboarded:true},APP_SAL);
  await expect(page.locator('#importBtn')).toContainText('Importer une sauvegarde');      // appareil vide
  await expect(page.locator('#warnBtn')).toBeHidden();
  await avecSalaire(page);
  await expect(page.locator('#warnBtn')).toContainText('Aucune sauvegarde');              // des comptes jamais sauvegardés
  await expect(page.locator('header [data-tab="aide"]')).toBeVisible();
  await page.evaluate(()=>{S.lastBackup=new Date('2026-09-29T10:00:00').getTime();majSauvegardeEntete()});
  await expect(page.locator('#importBtn')).toContainText('Importer la sauvegarde du 29/09/2026');
  await page.hover('#cloudBtn');
  await expect(page.locator('#bulle')).toHaveClass(/on/);
  await expect(page.locator('#bulle')).toContainText('Sauvegarder');
  expect(await page.locator('header').innerText()).not.toMatch(INDEP);
});

test('Mon compte : restaurer sans fenetre du navigateur, et refuser une sauvegarde de Mes comptes',async({page})=>{
  await openWith(page,{onboarded:true},APP_SAL);
  await page.evaluate(()=>{window.confirm=()=>false;window.alert=()=>{}});
  const f=path.join(os.tmpdir(),'sauv-sal.json'); fs.writeFileSync(f,JSON.stringify(sauvSal(3)));
  const g=path.join(os.tmpdir(),'sauv-indep.json'); fs.writeFileSync(g,JSON.stringify({...sauvSal(3),app:'mes-comptes'}));
  await page.click('nav.tabs [data-tab="reglages"]');
  await page.setInputFiles('#restorefile',g);
  await expect(page.locator('#donnees')).toContainText('n’est pas une sauvegarde de Mon compte');
  await page.setInputFiles('#restorefile',f);
  await expect(page.locator('#donnees')).toContainText('restaurée');
  await page.setInputFiles('#restorefile',f);
  await expect(page.locator('#donnees')).toContainText('Remplacer vos données actuelles');
  await page.click('[data-act="restno"]');
  expect(await page.evaluate(()=>S.ops.length)).toBe(3);
});

test('Mon compte : écrans vides distincts, avec un bouton pour retrouver ses comptes',async({page})=>{
  await openWith(page,{onboarded:true},APP_SAL);
  const titre=async t=>{await page.click(`nav.tabs [data-tab="${t}"]`);return page.locator('.vide h2').textContent()};
  const t=[await titre('accueil'),await titre('bilan'),await titre('operations')];
  expect(new Set(t).size).toBe(3);
  await expect(page.locator('.vide')).toContainText('Retrouver mes comptes');
  expect(await ecran(page)).not.toMatch(INDEP);
});

test('Mon compte : Importer, mode d’emploi replié et explication sous le gros bouton, sans collage',async({page})=>{
  await openWith(page,{onboarded:true},APP_SAL);
  await page.click('nav.tabs [data-tab="importer"]');
  await expect(page.locator('.mode-court')).not.toHaveAttribute('open','');
  await expect(page.locator('.comment-ajouter')).not.toHaveAttribute('open','');
  await expect(page.locator('[data-act="collerreleve"]')).toHaveCount(0);
  await expect(page.locator('.type-import')).toHaveCount(0);        // pas de question compte pro / perso
  await page.locator('.comment-ajouter summary').click();
  await expect(page.locator('.comment-ajouter')).toContainText('Relevés');
  await page.locator('.mode-court summary').click();
  await page.click('.mode-court [data-tab="aide"]');
  await expect(page.locator('.aide-page')).toContainText('Ouvrir Mon compte');
});

test('Mon compte : un relevé ajouté, message de réussite, lignes du relevé sur demande, réimport sans doublon',async({page})=>{
  await openWith(page,{onboarded:true},APP_SAL);
  const f=await bforbank(path.join(os.tmpdir(),'releve-bforbank-sal2.pdf'));
  await importer(page,f);
  await expect(page.locator('#toast')).toContainText('Import réussi');
  await expect(page.locator('#toast')).toContainText('ajoutée');
  await page.waitForFunction(()=>S.ops.length>0);
  const n=await page.evaluate(()=>S.ops.length);
  await page.click('nav.tabs [data-tab="operations"]');
  await page.evaluate(()=>{const d=S.ops[0].date;P={lvl:'M',y:+d.slice(0,4),m:+d.slice(5,7)};render()});
  await page.locator('[data-op]').first().click();
  await expect(page.locator('.fiche .extrait')).toHaveCount(0);
  await page.click('.fiche [data-act="releve"]');
  await expect(page.locator('.fiche .ex-l.cible')).toHaveCount(1);
  await page.click('.fiche .fermer');
  // ancien relevé sans détail : on le réimporte, rien n'est ajouté
  await page.evaluate(()=>{S.ops.forEach(o=>delete o.lg);Object.values(S.imports).forEach(i=>delete i.lg);save();render()});
  await importer(page,f);
  await page.waitForFunction(()=>S.ops.every(o=>o.lg!=null));
  expect(await page.evaluate(()=>S.ops.length)).toBe(n);
});

test('Mon compte : onglets colorés sur une seule ligne, Réglages avec les autres',async({page})=>{
  await avecSalaire(page);
  const r=await page.evaluate(()=>{const n=document.querySelector('nav.tabs').getBoundingClientRect();
    return [...document.querySelectorAll('nav.tabs button')].map(b=>{const x=b.getBoundingClientRect();return {t:b.dataset.tab,top:Math.round(x.top),dedans:x.right<=n.right+1&&x.left>=n.left-1,c:getComputedStyle(b.querySelector('svg')).color}})});
  expect(new Set(r.map(x=>x.top)).size).toBe(1);
  expect(r.every(x=>x.dedans)).toBe(true);
  expect(new Set(r.map(x=>x.c)).size).toBe(6);
});

test('Mon compte : Réglages expliqués simplement, effacement avec confirmation dans la page',async({page})=>{
  await avecSalaire(page);
  await page.evaluate(()=>{window.confirm=()=>false;S.rules={'CB CARREFOUR':'courses'};save();render()});
  await page.click('nav.tabs [data-tab="reglages"]');
  await page.locator('#avances summary').click();
  const t=await ecran(page);
  for(const mot of ['Vos choix mémorisés','Oublier ce choix','Un relevé est mal lu ?','méthode de lecture','Refaire le classement automatique','Effacer toutes mes données','sans aucun salaire']) expect(t).toContain(mot);
  expect(t).not.toMatch(/Règles apprises|Tout effacer|Exporter ce lecteur|Reclasser mes suppositions|sans rien encaisser/);
  await page.click('[data-act="wipe"]');
  await expect(page.locator('#donnees')).toContainText('Tout supprimer de cet appareil');
  await page.click('[data-act="wipeno"]');
  expect(await page.evaluate(()=>S.ops.length)).toBeGreaterThan(0);
  await page.click('[data-act="wipe"]'); await page.click('[data-act="wipeok"]');
  expect(await page.evaluate(()=>S.ops.length)).toBe(0);
});

test('Mon compte : bulle sur le nombre à vérifier, et résumé de l’accueil sans « côté perso »',async({page})=>{
  await avecSalaire(page);
  await page.evaluate(()=>{S.ops.push({id:'x1',date:'2026-09-20',label:'MARCHAND INCONNU',amount:-20,merchant:'MARCHAND INCONNU',acct:'a'});save();render()});
  await expect(page.locator('nav.tabs [data-tab="operations"]')).toHaveAttribute('data-tip',/à vérifier/);
  await page.click('nav.tabs [data-tab="accueil"]');
  const t=await ecran(page);
  expect(t).toMatch(/dépensés\b/); expect(t).not.toContain('côté perso');
  await page.click('nav.tabs [data-tab="bilan"]');
  expect(await ecran(page)).not.toMatch(/dépenses perso/);
});

for(const [nom,url] of [['Mon compte',APP_SAL],['Mes comptes',APP]])
test(`${nom} affiche la date de sa construction dans Reglages`,async({page})=>{
  await openWith(page,{onboarded:true},url);
  await page.click('nav.tabs [data-tab="reglages"]');
  await expect(page.locator('#version')).toContainText(/Version du \d{1,2}(er)? \w+ 20\d\d/);
});
