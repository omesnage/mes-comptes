import {test,expect,openWith} from './helpers.js';
async function demo(page){await openWith(page,null);await page.click('[data-act="demo"]');await page.click('nav.tabs [data-tab="operations"]')}

test('À vérifier : une question par marchand, gros boutons, la réponse devient une règle',async({page})=>{
  await demo(page);
  const v=page.locator('.verifier');
  await expect(v.locator('h3')).toContainText('À vérifier (1)');
  await expect(page.locator('nav.tabs .badge')).toHaveText('1');
  const q=v.locator('.question',{hasText:'ATELIER CERAMIQUE'});
  await expect(q.locator('.choix-btn').last()).toHaveText('Je ne sais pas');
  await q.locator('summary',{hasText:'Autre rubrique'}).click();
  await q.locator('select[data-qsel]').selectOption('loisirs');
  expect(await page.evaluate(()=>S.rules['ATELIER CERAMIQUE'])).toBe('loisirs');
  await expect(page.locator('.verifier')).toHaveCount(0);
});

test('liste du mois : deux lignes lisibles, mentions claires, recherche',async({page})=>{
  await demo(page);
  const z=page.locator('.op',{hasText:'ZALANDO'}).first();
  await expect(z).toContainText('Remboursement de votre achat du');
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



test('rubriques Charges sociales, Taxes et TVA, Mutuelle, Comptabilité, Communication ; « Dépense perso » fait passer une dépense côté perso',async({page})=>{
  await openWith(page,{schemaVersion:15,onboarded:true,accounts:[{id:'pr',name:'Qonto',type:'pro',confirmed:true}],
    ops:[{id:'1',date:'2026-01-10',label:'PRLV SEPA MALAKOFF MUTUELLE',amount:-60,merchant:'MALAKOFF MUTUELLE',acct:'pr'}]});
  const r=await page.evaluate(()=>({n:['cotisations','impots','mutuelle','mutuellepro','compta','communication'].map(i=>catById(i).name+'/'+catById(i).univers),
    s:[kwSuggest('X','PRLV MALAKOFF MUTUELLE','pro',-60),kwSuggest('X','PRLV MALAKOFF MUTUELLE','perso',-60),kwSuggest('X','PRLV PENNYLANE','pro',-20),kwSuggest('X','PAIEMENT TVA DGFIP','pro',-300)]}));
  expect(r.n).toEqual(['Charges sociales/pro','Taxes, TVA et impôts/pro','Mutuelle/perso','Mutuelle et prévoyance/pro','Comptabilité/pro','Communication/pro']);
  expect(r.s).toEqual(['mutuellepro','mutuelle','compta','impots']);
  await page.evaluate(()=>{view='operations';render()});
  const q=page.locator('.verifier .question').first();
  await q.locator('summary',{hasText:'Dépense perso'}).click();
  await q.locator('select[aria-label^="Rubrique perso"]').selectOption('mutuelle');
  expect(await page.evaluate(()=>[catOf(S.ops[0]),agg({lvl:'M',y:2026,m:1},'pro').fraisExpl,agg({lvl:'M',y:2026,m:1},'perso').net])).toEqual(['mutuelle',0,60]);
});

test('un seul appareil : la mention est visible, avec la marche à suivre pour Google Drive',async({page})=>{
  await openWith(page,{onboarded:true});
  await page.click('[data-tab="reglages"]');
  await expect(page.locator('#donnees')).toContainText('ne fonctionne que sur un seul appareil');
  await page.locator('#donnees summary').click();
  await expect(page.locator('#donnees')).toContainText('Google Drive');
  await expect(page.locator('#donnees')).toContainText('Restaurer une sauvegarde');
  await page.click('[data-tab="importer"]');
  await expect(page.locator('.note-box').first()).toContainText('autre appareil');
});

test('« À vérifier » : les lignes cumulées d’un marchand se voient une par une et vont chacune dans sa rubrique',async({page})=>{
  const op=(id,label,amount)=>({id,date:'2026-01-0'+id,label,amount,merchant:'CHEQUE',acct:'a'});
  await openWith(page,{schemaVersion:15,onboarded:true,accounts:[{id:'a',name:'Banque',type:'perso',confirmed:true}],
    ops:[op('1','CHEQUE 0000123',-40),op('2','CHEQUE 0000124',-120),op('3','CHEQUE 0000125',-25)]});
  await page.evaluate(()=>{view='operations';render()});
  const q=page.locator('.verifier .question').first();
  await expect(q.locator('summary',{hasText:'Voir les 3 lignes une par une'})).toBeVisible();
  await q.locator('summary',{hasText:'3 lignes'}).click();
  await expect(q.locator('.ligne-grp')).toHaveCount(3);
  await q.locator('select[data-opcat="2"]').selectOption('sante');
  await q.locator('select[data-opcat="1"]').selectOption('cadeaux');
  const r=await page.evaluate(()=>[S.ops.map(o=>catOf(o)),nbAVerifier()]);
  expect(r[0]).toEqual(['cadeaux','sante',null]);
  expect(r[1]).toBe(1);
});

test('copier-coller : le libellé continue sur les lignes sous l’opération, même après le montant',async({page})=>{
  await openWith(page,null);
  const r=await page.evaluate(()=>parseCollage(
`06/01/2026 06/01/2026 PRELEVEMENT -6,56 €
AMAZON PAYMENTS EUROPE S C A AMAZON
DE94ZZZ00000561653
15/01/2026 15/01/2026 VIREMENT +2 370,00 €
SARL ARCHITECTES
Réf : MRELPAR
20/01/2026 CB CARREFOUR -12,30 €
Solde au 20/01 1 234,56 €
21/01/2026
PRELEVEMENT SFR
-17,47 €`).ops.map(o=>[o.date,o.label,o.amount]));
  expect(r).toEqual([
    ['2026-01-06','06/01/2026 PRELEVEMENT AMAZON PAYMENTS EUROPE S C A AMAZON DE94ZZZ00000561653',-6.56],
    ['2026-01-15','15/01/2026 VIREMENT SARL ARCHITECTES Réf : MRELPAR',2370],
    ['2026-01-20','CB CARREFOUR',-12.3],
    ['2026-01-21','PRELEVEMENT SFR',-17.47]]);
});

test('« À vérifier » : la suggestion en premier, puis deux rubriques probables, « Autre rubrique… » (toutes les rubriques) et « Je ne sais pas »',async({page})=>{
  await openWith(page,{schemaVersion:16,onboarded:true,accounts:[{id:'a',name:'Banque',type:'perso',confirmed:true}],
    sugg:{INCONNU:{c:'sante',src:'kw'}},
    ops:[{id:'1',date:'2026-01-05',label:'CB INCONNU',amount:-90,merchant:'INCONNU',acct:'a'},{id:'2',date:'2026-01-06',label:'CB CARREFOUR',amount:-30,merchant:'CARREFOUR',acct:'a',cat:'courses'},{id:'3',date:'2026-01-07',label:'CB RESTO',amount:-30,merchant:'RESTO',acct:'a',cat:'resto'}]});
  await page.evaluate(()=>{view='operations';render()});
  const q=page.locator('.verifier .question').first();
  const b=await q.locator('.choix-btn').allTextContents();
  expect(b).toEqual(['Santé','Courses','Restaurants et cafés','Je ne sais pas']);
  await expect(q.locator('.choix-btn').first()).toHaveClass(/suggere/);
  const h=await q.locator('.choix-btn').first().evaluate(e=>e.getBoundingClientRect().height);
  expect(h).toBeGreaterThanOrEqual(56);
  await q.locator('summary',{hasText:'Autre rubrique'}).click();
  const opts=await q.locator('select[data-qsel] option').allTextContents();
  expect(opts).toEqual(expect.arrayContaining(['Vacances et séjours','Cadeaux','Maison et équipement','Espèces et divers','Dons et associations']));
});

test('recherche d’un fournisseur : la somme des dépenses, et ce qui a été remboursé',async({page})=>{
  const op=(id,date,label,amount)=>({id,date,label,amount,merchant:'AMAZON',acct:'a',cat:'shopping'});
  await openWith(page,{schemaVersion:16,onboarded:true,accounts:[{id:'a',name:'Banque',type:'perso',confirmed:true}],
    ops:[op('1','2026-01-05','CB AMAZON',-40),op('2','2026-02-05','CB AMAZON',-60.5),op('3','2026-03-05','CB AMAZON',-25),{...op('4','2026-03-09','REMB AMAZON',25),cat:'shopping'}]});
  await page.evaluate(()=>{view='operations';render()});
  await page.fill('#search','amazon');
  const t=page.locator('#total-recherche');
  await expect(t).toContainText('Dépensé');
  await expect(t).toContainText('125,50');
  await expect(t).toContainText('Au final');
  await expect(t).toContainText('100,50');
  await page.fill('#search','zzzz');
  await expect(page.locator('#total-recherche')).toHaveCount(0);
});

test('en-tête : état clair de l’enregistrement, dernière sauvegarde et bouton pour le dossier Cloud',async({page})=>{
  await openWith(page,{onboarded:true,accounts:[{id:'a',name:'Banque',type:'perso',confirmed:true}],ops:[{id:'1',date:'2026-01-05',label:'CB X',amount:-5,merchant:'X',acct:'a'}]});
  await page.evaluate(()=>{setStatus('local')});
  await expect(page.locator('#status')).toHaveText('Vos données sont gardées sur cet appareil uniquement');
  await expect(page.locator('#lastbk')).toHaveText('Jamais sauvegardé');
  await expect(page.locator('#cloudBtn')).toContainText('Sauvegarder dans mon dossier Cloud');
  await page.evaluate(()=>{window.__f=null;window.alert=()=>{};window.showSaveFilePicker=async o=>({createWritable:async()=>({write:async d=>{window.__f={name:o.suggestedName,d}},close:async()=>{}})})});
  await page.click('#cloudBtn');
  await page.waitForFunction(()=>window.__f);
  const r=await page.evaluate(()=>({n:window.__f.name,j:JSON.parse(window.__f.d),bk:S.lastBackup}));
  expect(r.n).toMatch(/^mes-comptes-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/);
  expect(r.j.app).toBe('mes-comptes'); expect(r.j.data.ops.length).toBe(1); expect(r.bk).toBeGreaterThan(0);
  await expect(page.locator('#lastbk')).toContainText('Dernière sauvegarde');
});
