import {test,expect,openWith} from './helpers.js';
test('première ouverture : trois écrans, objectif enregistré, puis Importer',async({page})=>{
  await openWith(page,'vierge');
  await expect(page.locator('.demarrage h2')).toHaveText('Bienvenue');
  await expect(page.locator('nav.tabs button')).toHaveCount(0);
  await expect(page.locator('.demarrage')).toContainText('personne d’autre ne peut les voir');
  await page.click('[data-onb="1"]');
  await expect(page.locator('.demarrage h2')).toHaveText('Votre objectif');
  await expect(page.locator('.demarrage')).toContainText('Souvent entre 25 et 45 % selon votre statut.');
  await page.fill('[data-set="netVise"]','2500'); await page.fill('[data-set="taux"]','22'); await page.locator('[data-set="taux"]').blur();
  await page.click('[data-onb="2"]');
  await expect(page.locator('.demarrage h2')).toHaveText('Ajoutez vos relevés');
  await page.click('.demarrage [data-tab="importer"]');
  await expect(page.locator('.gros-bouton')).toContainText('Ajouter mes relevés');
  await expect(page.locator('nav.tabs button')).toHaveCount(5);
  expect(await page.evaluate(()=>[S.settings.netVise,S.settings.taux,S.onboarded])).toEqual([2500,22,true]);
  await page.waitForTimeout(800); await page.reload(); await page.waitForSelector('#view');
  await expect(page.locator('.demarrage')).toHaveCount(0);
});
test('passer la présentation, puis la relancer depuis les réglages ; voir un exemple dès le début',async({page})=>{
  await openWith(page,'vierge');
  await page.click('.demarrage [data-act="onbfin"]');
  await expect(page.locator('.vide h2')).toHaveText('Ajoutez vos relevés pour commencer');
  await page.click('#gear'); await page.click('[data-act="relancer"]');
  await expect(page.locator('.demarrage h2')).toHaveText('Bienvenue');
  await page.click('.demarrage [data-act="demo"]');
  await expect(page.locator('.gagne')).toBeVisible();
});
