import {test,expect,openWith,importer,APP_SAL} from './helpers.js';
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
