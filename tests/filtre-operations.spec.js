import {test,expect,openWith} from './helpers.js';
/* Mes opérations : filtre par rubrique et par mois, trimestre, année ou dates (opérations fictives) */
test('Mes opérations : filtre par rubrique, mois, trimestre, année et plage de dates',async({page})=>{
  await openWith(page,{schemaVersion:16,onboarded:true,accounts:[{id:'a',name:'Banque',type:'perso',confirmed:true}],rules:{}});
  await page.evaluate(()=>{
    const L=[['1','2026-01-10','SUPERMARCHE A',-30,'courses'],['2','2026-02-05','SUPERMARCHE A',-40,'courses'],['3','2026-04-12','SUPERMARCHE A',-50,'courses'],
      ['4','2026-04-20','CINEMA B',-12,'loisirs'],['5','2026-05-02','CINEMA B',-14,'loisirs'],['6','2025-12-30','SUPERMARCHE A',-20,'courses']];
    S.ops=L.map(([id,date,l,a,cat])=>({id,date,label:l,amount:a,merchant:l,acct:'a',cat}));save();P={lvl:'M',y:2026,m:4};render();aller('operations');
  });
  const ids=()=>page.evaluate(()=>[...document.querySelectorAll('#view [data-op]')].map(b=>b.dataset.op).join(''));
  expect(await ids()).toBe('43');                                  // mois d'avril
  await page.click('summary:has-text("Filtrer")');
  await page.selectOption('#filtreCat','courses');
  expect(await ids()).toBe('3');                                   // avril + courses
  await page.click('[data-flvl="Q"]');
  expect(await ids()).toBe('3');                                   // 2e trimestre + courses
  await page.click('[data-oshift="-1"]');
  expect(await ids()).toBe('21');                                  // 1er trimestre + courses
  await page.click('[data-flvl="Y"]');
  await page.selectOption('#filtreCat','');
  expect(await ids()).toBe('54321');                               // toute l'année 2026
  await page.click('[data-oshift="-1"]');
  expect(await ids()).toBe('6');                                   // 2025
  await page.click('[data-flvl="D"]');
  await page.fill('#filtreDu','2026-02-01');await page.fill('#filtreAu','2026-04-15');
  expect(await ids()).toBe('32');                                  // plage de dates
  await page.selectOption('#filtreCat','courses');
  expect(await ids()).toBe('32');
  await page.click('[data-act="filreset"]');
  expect(await ids()).toBe('');                                    // retour au mois (janvier 2025 : rien)
  await expect(page.locator('.mois h2')).toHaveText('Janvier 2025');
});
