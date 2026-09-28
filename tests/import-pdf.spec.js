import {test,expect,openWith,importer} from './helpers.js';
import {releveColonnes,releveMoinsFin,releveLettres} from './releves.js';

const ops=page=>page.evaluate(()=>S.ops.map(o=>({date:o.date,label:o.label,amount:o.amount,acct:acctName(o.acct)})).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.amount-b.amount));

test('relevé à colonnes Débit et Crédit : signes, dates, libellé sur deux lignes, banque et solde',async({page},ti)=>{
  await openWith(page,null);
  await importer(page,await releveColonnes(ti.outputPath('ca.pdf')));
  await expect(page.locator('.releve')).toContainText('5 opérations ajoutées ✓');
  expect(await ops(page)).toEqual([
    {date:'2026-03-02',label:'CB CARREFOUR MARKET GUERANDE',amount:-45.2,acct:'Crédit Agricole'},
    {date:'2026-03-05',label:'PRLV SEPA EDF CLIENTS PARTICULIERS FACTURE 2026-03',amount:-94,acct:'Crédit Agricole'},
    {date:'2026-03-08',label:'VIR SEPA RECU DE QONTO SAS',amount:1500,acct:'Crédit Agricole'},
    {date:'2026-03-12',label:'CB PHARMACIE DES DUNES',amount:-12.3,acct:'Crédit Agricole'},
    {date:'2026-03-15',label:'VIR CPAM LOIRE ATLANTIQUE',amount:23,acct:'Crédit Agricole'}]);
  const a=await page.evaluate(()=>S.accounts[0]);
  expect(a).toMatchObject({bank:'Crédit Agricole',type:'perso',confirmed:false,no:'34567890123',solde:2606.06,soldeDate:'2026-03-31'});
  // La question du type de compte est posée, avec la supposition
  await expect(page.locator('.releve .question')).toContainText('Ce compte est-il professionnel, personnel, ou sert-il à tout ?');
  await expect(page.locator('.releve .question')).toContainText('Crédit Agricole');
  await expect(page.locator('.releve .question .choix-btn')).toHaveText(['Professionnel','Personnel','Je n’ai pas de compte pro : ce compte sert à tout']);
  await expect(page.locator('.releve [data-settype$=":perso"]')).toHaveClass(/suggere/);
  await page.click('.releve [data-settype$=":pro"]');
  expect(await page.evaluate(()=>[S.accounts[0].type,S.accounts[0].confirmed])).toEqual(['pro',true]);
});

test('relevé avec signe moins en fin de montant : les montants sans signe sont des crédits, compte supposé pro',async({page},ti)=>{
  await openWith(page,null);
  await importer(page,await releveMoinsFin(ti.outputPath('qonto.pdf')));
  await expect(page.locator('.releve')).toContainText('6 opérations ajoutées ✓');
  const o=await ops(page);
  expect(o.map(x=>x.amount)).toEqual([2400,-612,-1500,-23.99,-349.9,1250]);
  expect(await page.evaluate(()=>S.accounts.map(a=>[a.name,a.type,a.solde,a.soldeDate]))).toEqual([['Qonto','pro',5000,'2026-03-31']]);
  // Suggestions adaptées à un compte pro
  const sg=await page.evaluate(()=>Object.fromEntries(Object.entries(S.sugg).map(([m,s])=>[m,s.c])));
  expect(sg).toMatchObject({URSSAF:'cotisations','ADOBE SYSTEMS':'logiciels',LDLC:'materiel'});
  expect(Object.entries(sg).filter(([m])=>/CLIENT/.test(m)).every(([,c])=>c==='revenus')).toBe(true);
});

test('relevé avec dates en toutes lettres',async({page},ti)=>{
  await openWith(page,null);
  await importer(page,await releveLettres(ti.outputPath('bourso.pdf')));
  await expect(page.locator('.releve')).toContainText('4 opérations ajoutées ✓');
  expect((await ops(page)).map(x=>[x.date,x.amount])).toEqual([['2026-02-28',-18.2],['2026-03-05',-23.4],['2026-03-09',2100],['2026-03-12',-13.49]]);
  expect(await page.evaluate(()=>S.accounts[0].bank)).toBe('BoursoBank');
});

test('un fichier illisible affiche un message rassurant',async({page},ti)=>{
  await openWith(page,null);
  const f=ti.outputPath('faux.pdf'); (await import('fs')).writeFileSync(f,'ceci n’est pas un PDF');
  await importer(page,f);
  await expect(page.locator('.releve.ko')).toContainText('Ce fichier n’a pas pu être lu');
});

test('réimporter le même relevé n’ajoute rien et retrouve le même compte',async({page},ti)=>{
  await openWith(page,null);
  const f=await releveColonnes(ti.outputPath('ca.pdf'));
  await importer(page,f);
  await expect(page.locator('.releve')).toHaveCount(1);
  await importer(page,f);
  await expect(page.locator('.releve').first()).toContainText('Crédit Agricole, mars : déjà importé, rien n’a été ajouté.');
  await expect(page.locator('.releve').first().locator('.pv.dup')).toHaveCount(5);
  expect(await page.evaluate(()=>S.accounts.length)).toBe(1);
});

test('contrôle par les soldes : relevé vérifié, ou écart signalé',async({page},ti)=>{
  await openWith(page,null);
  await importer(page,await releveColonnes(ti.outputPath('ok.pdf')));
  await expect(page.locator('.verif.ok')).toContainText('Relevé vérifié ✓');
  await expect(page.locator('.releve .r-alerte')).toHaveCount(0);
  await importer(page,await releveColonnes(ti.outputPath('ko.pdf'),'1 334,56'));
  await expect(page.locator('.releve').first().locator('.r-alerte')).toContainText('écart de 100,00 €');
});

test('tester un relevé : lecture complète sans rien enregistrer, puis import pour de bon',async({page},ti)=>{
  await openWith(page,null);
  await page.click('nav.tabs [data-tab="importer"]');
  await page.setInputFiles('#testfile',await releveColonnes(ti.outputPath('ca.pdf')));
  const r=page.locator('.releve.essai');
  await expect(r).toContainText('Crédit Agricole, mars : 5 opérations lues. C’est un essai, rien n’a été enregistré.');
  await expect(r).toContainText('Compte : Crédit Agricole (nouveau)');
  await expect(r.locator('.verif.ok')).toBeVisible();
  await expect(r.locator('.pv')).toHaveCount(5);
  await page.waitForTimeout(800);
  expect(await page.evaluate(()=>[S.ops.length,S.accounts.length,(JSON.parse(localStorage.getItem('mes-comptes-v1')||'{}').ops||[]).length])).toEqual([0,0,0]);
  await r.locator('[data-realimp]').click();
  await expect(page.locator('.releve.essai')).toHaveCount(0);
  await expect(page.locator('.releve')).toContainText('5 opérations ajoutées ✓');
  expect(await page.evaluate(()=>S.ops.length)).toBe(5);
  // Un nouvel essai du même relevé montre que tout est déjà importé
  await page.setInputFiles('#testfile',await releveColonnes(ti.outputPath('ca.pdf')));
  await expect(page.locator('.releve.essai')).toContainText('5 opérations déjà importées');
});
