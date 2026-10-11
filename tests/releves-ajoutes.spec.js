import {test,expect,openWith,importer} from './helpers.js';
import {BANQUES} from './banques.js';
import os from 'os'; import path from 'path';

test('mots recherchés : type d’opération, numéros, forme de société et code pays retirés ; vrai vendeur après SumUp ou PayPal',async({page})=>{
  await openWith(page,null);
  const r=await page.evaluate(()=>['PAIEMENT PAR CARTE MC DONALDS FRGUERANDE 010126 000000 8195 198986','PAIEMENT PAR CARTE WEB SUPER.COM * T IEDUBLIN',
    'PRELEVEMENT AMAZON PAYMENTS EUROPE S C A AMAZON DE94ZZZ00000561653 K8DTU6QRD1K','CB SUMUP *BOULANGERIE DU PORT 12/01','PAYPAL *VINTED 4029357733',
    'CB DECATHLON 12/01','PAIEMENT PAR CARTE CARREFOUR FRANCE','PAIEMENT PAR CARTE WEB CROWDFARMING FR28002 MADRI 108,4 EUR 1EUR=0,000 EUR'].map(motsRecherche));
  expect(r).toEqual(['MC DONALDS GUERANDE','SUPER.COM DUBLIN','AMAZON PAYMENTS EUROPE AMAZON','BOULANGERIE PORT','VINTED','DECATHLON','CARREFOUR FRANCE','CROWDFARMING MADRI']);
});

test('« À quoi correspond ce libellé ? » : lien de recherche dans « À vérifier » et dans la fiche, ouvert dans un nouvel onglet',async({page})=>{
  await openWith(page,{onboarded:true,accounts:[{id:'p',name:'Perso',type:'perso',confirmed:true}],
    ops:[{id:'a',date:'2026-01-10',label:'PAIEMENT PAR CARTE WEB SUPER.COM * T IEDUBLIN',amount:-120,merchant:'SUPER.COM',acct:'p'}]});
  await page.click('nav.tabs [data-tab="operations"]');
  const l=page.locator('.verifier a.chercher');
  await expect(l).toHaveText('À quoi correspond ce libellé ?');
  expect(await l.getAttribute('href')).toBe('https://www.google.com/search?q=SUPER.COM%20DUBLIN');
  expect(await l.getAttribute('target')).toBe('_blank');
  await page.evaluate(()=>{P={lvl:'M',y:2026,m:1};FICHE='a';render()});
  await expect(page.locator('.fiche a.chercher')).toHaveCount(1);
});

test('supprimer un relevé ajouté par erreur : ses opérations et le compte créé pour lui disparaissent, les rubriques restent',async({page})=>{
  const f=await BANQUES['Crédit Agricole'](path.join(os.tmpdir(),'releve-erreur.pdf'));
  await openWith(page,null); await importer(page,f);
  await expect(page.locator('.releve')).toContainText('Relevé vérifié ✓');
  await page.evaluate(()=>{S.rules['CARREFOUR MARKET']='courses'});
  const n=await page.evaluate(()=>S.ops.length); expect(n).toBeGreaterThan(0);
  await page.locator('#mes-releves summary').click();
  await expect(page.locator('.releve-ajoute')).toContainText('releve-erreur.pdf');
  let msg=''; page.once('dialog',d=>{msg=d.message()});
  await page.click('[data-delimp]');
  await expect.poll(()=>msg).toContain(`${n} opérations`);
  const s=await page.evaluate(()=>({ops:S.ops.length,accts:S.accounts.length,regle:S.rules['CARREFOUR MARKET'],imports:Object.keys(S.imports||{}).length}));
  expect(s).toEqual({ops:0,accts:0,regle:'courses',imports:0});
  await expect(page.locator('#mes-releves')).toHaveCount(0);
});

test('un mois sauté entre deux relevés est signalé, pas un mois de bout',async({page})=>{
  const op=(id,date)=>({id,date,label:'CB CARREFOUR',amount:-10,merchant:'CARREFOUR',acct:'a'});
  await openWith(page,{schemaVersion:14,onboarded:true,accounts:[{id:'a',name:'BforBank',type:'perso',confirmed:true}],
    ops:[op('1','2025-11-10'),op('2','2026-01-10'),op('3','2026-01-20'),op('4','2026-04-02')]});
  const r=await page.evaluate(()=>[moisManquants('a'),phraseMoisManquants(moisManquants('a')),phraseMoisManquants(['2026-02']),phraseMoisManquants(['2025-12','2026-01'])]);
  expect(r[0]).toEqual(['2025-12','2026-02','2026-03']);
  expect(r[1]).toBe('Il manque des mois : décembre 2025, puis février et mars 2026.');
  expect(r[2]).toBe('Il manque un mois : février 2026.');
  expect(r[3]).toBe('Il manque des mois : décembre 2025 et janvier 2026.');
  await page.evaluate(()=>{view='importer';render()});
  await expect(page.locator('.etat-releves')).toContainText('BforBank');
  await expect(page.locator('.etat-releves')).toContainText('décembre 2025');
});

test('relevé rangé dans le mauvais compte : ses opérations passent dans le bon, le compte vide disparaît',async({page})=>{
  const op=(id,acct,imp)=>({id,date:'2026-01-1'+id,label:'CB CARREFOUR',amount:-10,merchant:'CARREFOUR',acct,imp,src:'pdf'});
  await openWith(page,{schemaVersion:15,onboarded:true,
    accounts:[{id:'a',name:'Crédit Agricole',type:'perso',confirmed:true},{id:'b',name:'Compte 2',type:'perso',confirmed:false}],
    imports:{i1:{nom:'releve-a.pdf',quand:1},i2:{nom:'releve-b.pdf',quand:2}},
    ops:[op('1','a','i1'),op('2','b','i2'),op('3','b','i2')]});
  await page.evaluate(()=>{view='importer';render()});
  await page.locator('#mes-releves summary').click();
  const bloc=page.locator('.releve-ajoute',{hasText:'releve-b.pdf'});
  await expect(bloc.locator('select[data-moveimp] option')).toHaveText(['Choisir le bon compte…','Crédit Agricole','Un nouveau compte…']);
  await bloc.locator('select[data-moveimp]').selectOption('a');
  const r=await page.evaluate(()=>({acc:S.accounts.map(a=>a.id),ops:S.ops.map(o=>o.acct)}));
  expect(r).toEqual({acc:['a'],ops:['a','a','a']});
});
