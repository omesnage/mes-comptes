import {test,expect,openWith} from './helpers.js';
test('réglages : une page simple, tout l’avancé replié',async({page})=>{
  await openWith(page,null); await page.click('[data-act="demo"]'); await page.click('#gear');
  await expect(page.locator('#view .carte h3')).toHaveText(['Votre objectif','Votre réserve','Vos comptes','Vos rubriques','Vos données','Votre année en revue','Présentation']);
  await expect(page.locator('#avances')).not.toHaveAttribute('open','');
  await expect(page.locator('[data-set="heuresSemaine"]')).toHaveValue('40');
  await expect(page.locator('#cibleLive')).toHaveText('Pour atteindre 2 000 € par mois à 40 h par semaine, une heure doit vous rapporter 11,54 €.'.replace(/ €/g,'\u00a0€').replace('2 000','2\u202f000'));
  await page.fill('[data-set="heuresSemaine"]','35'); await expect(page.locator('#cibleLive')).toContainText('à 35 h par semaine');
  await expect(page.locator('#cibleLive b')).toHaveText('13,19\u00a0€');
  await expect(page.locator('#reserve')).toContainText('Votre réserve couvre');
  // Rubriques : budget, renommer, ajouter
  await page.fill('[data-budget="resto"]','150'); await page.locator('[data-budget="resto"]').blur();
  expect(await page.evaluate(()=>catById('resto').budget)).toBe(150);
  await page.click('[data-rencat="cadeaux"]'); expect(await page.evaluate(()=>catById('cadeaux').name)).toBe('Compte test');
  await page.click('[data-act="nouvrub"]'); await page.fill('#nrNom','Sport'); await page.click('[data-act="nrcree"]');
  expect(await page.evaluate(()=>S.categories.some(c=>c.name==='Sport'&&c.univers==='perso'))).toBe(true);
  // Comptes : Pro, Perso ou Mélangé
  await page.locator('#comptes [data-settype$=":mixte"]').first().click();
  expect(await page.evaluate(()=>S.accounts[0].type)).toBe('mixte');
  await page.click('[data-act="review"]'); await expect(page.locator('#review')).toBeVisible();
});
test('toutes les rubriques du foyer demandées existent',async({page})=>{
  await openWith(page,null);
  const noms=await page.evaluate(()=>S.categories.filter(c=>c.type==='expense'&&c.univers!=='pro').map(c=>c.name));
  expect(noms).toEqual(expect.arrayContaining(['Logement','Énergie','Courses','Restaurants et cafés','Voiture et transports','Abonnements et téléphone','Santé','Loisirs','Vêtements et shopping','Maison et équipement','Enfants','Animaux','Cadeaux','Voyages','Banque','Impôts et taxes du foyer','Remboursement d’emprunt','Autres']));
});
