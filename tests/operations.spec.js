import {test,expect,openWith} from './helpers.js';
async function demo(page){await openWith(page,null);await page.click('[data-act="demo"]');await page.click('nav.tabs [data-tab="operations"]')}

test('À vérifier : une question par marchand, gros boutons, la réponse devient une règle',async({page})=>{
  await demo(page);
  const v=page.locator('.verifier');
  await expect(v.locator('h3')).toContainText('À vérifier (2)');
  await expect(page.locator('nav.tabs .badge')).toHaveText('2');
  const q=v.locator('.question',{hasText:'ATELIER CERAMIQUE'});
  await q.locator('.choix-btn',{hasText:'Loisirs'}).click();
  expect(await page.evaluate(()=>S.rules['ATELIER CERAMIQUE'])).toBe('loisirs');
  await expect(v.locator('h3')).toContainText('À vérifier (1)');
  // Virement du compte pro inconnu
  await expect(v).toContainText('Ce virement de votre compte pro, c’est votre rémunération ou un remboursement de frais ?');
  await v.locator('[data-k="ndf"]').click();
  await expect(page.locator('.verifier')).toHaveCount(0);
  expect(await page.evaluate(()=>S.virements['COMPTE JOINT'])).toBe('ndf');
});

test('liste du mois : deux lignes lisibles, mentions claires, recherche',async({page})=>{
  await demo(page);
  const z=page.locator('.op',{hasText:'ZALANDO'}).first();
  await expect(z).toContainText('Remboursement de votre achat du');
  await expect(page.locator('.op',{hasText:'INDEMNITES KM'}).first()).toContainText('Remboursement de frais versé');
  await expect(page.locator('.op .op-x',{hasText:'Votre rémunération'}).first()).toBeVisible();
  await page.fill('#search','netflix');
  await expect(page.locator('.op')).toHaveCount(12);
  await expect(page.locator('#view > .aide')).toContainText('12 opérations trouvées');
});

test('fiche : changer la rubrique pour une opération ou pour tout le marchand, retour d’achat, suppression',async({page})=>{
  await demo(page);
  const n=await page.evaluate(()=>S.ops.filter(o=>o.merchant==='LECLERC').length);
  await page.locator('.op',{hasText:'LECLERC'}).first().click();
  await page.selectOption('#ficheCat','resto');
  await page.check('input[name="portee"][value="une"]');
  await page.click('[data-act="savefiche"]');
  expect(await page.evaluate(()=>[S.ops.filter(o=>o.merchant==='LECLERC'&&o.cat==='resto').length,S.rules.LECLERC])).toEqual([1,'courses']);
  await page.locator('.op',{hasText:'LECLERC'}).first().click();
  await page.selectOption('#ficheCat','maison');
  await page.click('[data-act="savefiche"]');
  expect(await page.evaluate(()=>[S.ops.filter(o=>o.merchant==='LECLERC'&&o.cat).length,S.rules.LECLERC])).toEqual([0,'maison']);
  await page.locator('.op',{hasText:'LECLERC'}).first().click();
  await page.click('.fiche [data-await]');
  expect(await page.evaluate(()=>S.ops.filter(o=>o.merchant==='LECLERC'&&o.awaiting).length)).toBe(1);
  await expect(page.locator('.fiche')).toContainText('Retour signalé');
  await page.click('.fiche [data-delop]');
  expect(await page.evaluate(()=>S.ops.filter(o=>o.merchant==='LECLERC').length)).toBe(n-1);
  await expect(page.locator('.fiche')).toHaveCount(0);
});

test('fiche d’un virement du compte pro : rémunération ou remboursement de frais',async({page})=>{
  await demo(page);
  await page.locator('.op',{hasText:'MARTIN PERSO'}).first().click();
  await expect(page.locator('.fiche')).toContainText('Ce virement de votre compte pro, c’est :');
  await page.click('.fiche [data-k="ndf"]');
  expect(await page.evaluate(()=>S.virements['MARTIN PERSO'])).toBe('ndf');
});
