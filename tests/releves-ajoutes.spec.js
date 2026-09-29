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
