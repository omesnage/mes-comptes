import {test,expect,openWith} from './helpers.js';
const nb=s=>s.replace(/\s/g,' ');
async function demo(page){await openWith(page,null);await page.click('[data-act="demo"]');await page.click('nav.tabs [data-tab="bilan"]')}
test('Bilan : « L’essentiel » en tête, lignes colorées avec graphique',async({page})=>{
  await demo(page);
  const e=page.locator('.essentiel');
  await expect(e).toBeVisible();
  // Le bloc est le premier après les choix de période
  const ordre=await page.locator('#view > section.carte').evaluateAll(l=>l.map(x=>x.className));
  expect(ordre[0]).toContain('essentiel');
  await expect(e.locator('h3')).toHaveText(/^L’essentiel (de|d’) /);
  await expect(e.locator('.ess').first()).toContainText('Il vous reste');
  await expect(e.locator('.ess-duo')).toHaveCount(1);
  await expect(e.locator('.ess-pile')).toHaveCount(1);
  await expect(e).toContainText('Vos dépenses obligatoires');
  await expect(e.locator('.ess.attention',{hasText:'Plus forte hausse'})).toContainText('par rapport au mois précédent');
  // Mois précédent : la location d'été fait dépasser la limite vacances
  await page.click('[data-bshift="-1"]');
  await expect(page.locator('.essentiel .ess.ko',{hasText:'limite dépassée'})).toContainText('Vacances et séjours');
  await expect(page.locator('.essentiel .ess-lim.rouge')).toContainText('Vacances et séjours');
  // Activité
  await page.click('[data-bu="pro"]');
  await expect(page.locator('.essentiel')).toContainText('encaissés');
  await expect(page.locator('.essentiel')).toContainText('Vos frais représentent');
  await expect(page.locator('.essentiel .ess-leg')).toContainText('Cotisations et impôts');
});
test('L’essentiel : dépenses supérieures aux rentrées en rouge',async({page})=>{
  await openWith(page,{schemaVersion:9,onboarded:true,accounts:[{id:'pe',name:'Perso',type:'perso',confirmed:true}],
    ops:[{id:'1',date:'2026-06-02',label:'CAF',amount:500,merchant:'CAF',acct:'pe'},{id:'2',date:'2026-06-10',label:'CARREFOUR',amount:-800,merchant:'CARREFOUR',acct:'pe'}],rules:{CAF:'rentrees',CARREFOUR:'courses'}});
  await page.click('nav.tabs [data-tab="bilan"]');
  await expect(page.locator('.essentiel .ess.ko').first()).toContainText('Vous avez dépensé 300');
  expect(nb(await page.locator('.essentiel .ess.ko').first().locator('.ess-t').textContent())).toContain('de plus que vos rentrées');
});
