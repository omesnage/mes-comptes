import {test,expect,openWith} from './helpers.js';
test('réglages : une page simple, tout l’avancé replié',async({page})=>{
  await openWith(page,null); await page.click('[data-act="demo"]'); await page.click('nav.tabs [data-tab="reglages"]');
  await expect(page.locator('#view .carte h3')).toHaveText(['Votre réserve','Vos comptes','Vos rubriques','Vos données','Votre année en revue','Présentation']);
  await expect(page.locator('#avances')).not.toHaveAttribute('open','');
  await expect(page.locator('.lien-objectifs')).toContainText('Mes objectifs');
  await page.click('nav.tabs [data-tab="objectifs"]');
  await expect(page.locator('[data-set="heuresSemaine"]')).toHaveValue('40');
  await expect(page.locator('#prixLive')).toContainText('vous devez vous faire payer au minimum');
  await page.click('nav.tabs [data-tab="reglages"]');
  await expect(page.locator('#reserve')).toContainText('Votre réserve couvre');
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
  expect(noms).toEqual(expect.arrayContaining(['Logement','Énergie','Courses','Restaurants et cafés','Transports','Abonnements et téléphone','Santé','Sorties et loisirs','Vêtements et shopping','Maison et équipement','Enfants','Animaux','Cadeaux','Vacances et séjours','Banque','Impôts et taxes du foyer','Remboursement d’emprunt','Autres']));
});
