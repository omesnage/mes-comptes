import {test,expect,openWith,importer} from './helpers.js';
import fs from 'fs';
const n=s=>s.replace(/\s/g,' ');

test('emprunts reconnus sans question, côté perso ; charge obligatoire',async({page},ti)=>{
  await openWith(page,null);
  const f=ti.outputPath('r.csv');
  fs.writeFileSync(f,['Date;Libellé;Montant','05/06/2026;PRLV SEPA ECHEANCE PRET 00012345;-642,18','06/06/2026;ECH PRET 99887766;-120,00','07/06/2026;PRLV COFIDIS;-45,00',
    '08/06/2026;PRLV CETELEM;-30,00','09/06/2026;REMBOURSEMENT PRET AUTO;-80,00','10/06/2026;PRLV CREDIT IMMO BANQUE;-500,00','11/06/2026;PRLV ONEY BANK;-20,00','12/06/2026;PRLV FLOA;-10,00','13/06/2026;PRLV SOFINCO;-15,00','14/06/2026;PRLV FRANFINANCE;-25,00','15/06/2026;PRLV PRET IMMO CA;-300,00'].join('\n'));
  await importer(page,f);
  await expect(page.locator('.releve')).toContainText('11 opérations ajoutées');
  const r=await page.evaluate(()=>({pend:pendingGroups().length,cats:[...new Set(S.ops.map(catOf))],c:catById('pret')}));
  expect(r.pend).toBe(0); expect(r.cats).toEqual(['pret']);
  expect(r.c).toMatchObject({name:'Remboursement d’emprunt',univers:'perso',fixed:true,icon:'banknote'});
});

test('emprunt payé depuis le compte pro : frais de l’activité, rubrique dédiée',async({page})=>{
  await openWith(page,{schemaVersion:5,onboarded:true,accounts:[{id:'pr',name:'Qonto',type:'pro',confirmed:true}],
    ops:[{id:'1',date:'2026-06-03',label:'VIR CLIENT',amount:3000,merchant:'CLIENT',acct:'pr'},{id:'2',date:'2026-06-10',label:'PRLV ECHEANCE PRET PRO 4455',amount:-400,merchant:'ECHEANCE PRET PRO',acct:'pr'}],rules:{CLIENT:'revenus'}});
  const r=await page.evaluate(()=>({c:catOf(S.ops.find(o=>o.id==='2')),frais:agg({lvl:'M',y:2026,m:6},'pro').fraisExpl,cat:catById('empruntpro')}));
  expect(r.c).toBe('empruntpro'); expect(r.frais).toBe(400);
  expect(r.cat).toMatchObject({name:'Remboursement d’emprunt de l’activité',univers:'pro',fixed:true});
});

test('migration : une règle « prêt » dont toutes les opérations sont sur le compte pro passe côté activité',async({page})=>{
  await openWith(page,{schemaVersion:4,accounts:[{id:'pr',name:'Pro',type:'pro',confirmed:true},{id:'pe',name:'Perso',type:'perso',confirmed:true}],
    ops:[{id:'1',date:'2026-06-10',label:'PRLV CREDIT MARITIME',amount:-400,merchant:'CREDIT MARITIME',acct:'pr'},{id:'2',date:'2026-06-11',label:'PRLV CAISSE LOCALE',amount:-600,merchant:'CAISSE LOCALE',acct:'pe'}],
    rules:{'CREDIT MARITIME':'pret','CAISSE LOCALE':'pret'},categories:[{id:'pret',name:'Remboursement de prêt',icon:'key-round',type:'expense',univers:'auto',fixed:true}],settings:{heures:180}});
  expect(await page.evaluate(()=>[S.rules['CREDIT MARITIME'],S.rules['CAISSE LOCALE'],catById('pret').name,catById('pret').univers,S.settings.heuresSemaine])).toEqual(['empruntpro','pret','Remboursement d’emprunt','perso',42]);
});

const etatH=ca=>({schemaVersion:5,onboarded:true,accounts:[{id:'pr',name:'Pro',type:'pro',confirmed:true}],ops:[{id:'1',date:'2026-06-03',label:'VIR CLIENT',amount:ca,merchant:'CLIENT',acct:'pr'},{id:'z',date:'2026-06-29',label:'X',amount:-1,merchant:'X',acct:'pr'}],rules:{CLIENT:'revenus',X:'pro'}});
test('heures par semaine : 40 h ≈ 173 h par mois ; phrase de l’Accueil dorée au-dessus du taux visé',async({page})=>{
  const etat=ca=>({schemaVersion:5,onboarded:true,accounts:[{id:'pr',name:'Pro',type:'pro',confirmed:true}],ops:[{id:'1',date:'2026-06-03',label:'VIR CLIENT',amount:ca,merchant:'CLIENT',acct:'pr'},{id:'z',date:'2026-06-29',label:'X',amount:-1,merchant:'X',acct:'pr'}],rules:{CLIENT:'revenus',X:'pro'}});
  await openWith(page,etat(2601));
  expect(await page.evaluate(()=>[+heures().toFixed(2),+tauxCible().toFixed(4)])).toEqual([173.33,11.5385]);
  // 2 600 € nets / 173,33 h = 15 €
  await expect(page.locator('.gagne .phrase')).toHaveText(n('Sur une base de 40 h par semaine, une heure de travail vous a rapporté 15 €.').replace(' €',' €'));
  await expect(page.locator('.gagne .phrase')).toHaveClass(/or/);
});
test('phrase de l’Accueil en rouge, avec le montant manquant, sous le taux visé',async({page})=>{
  await openWith(page,etatH(1734.33));
  const t=n(await page.locator('.gagne .phrase').textContent());
  expect(t).toBe('Sur une base de 40 h par semaine, une heure de travail vous a rapporté 10 €. Il manque 1,54 € par heure pour atteindre les 11,54 € visés.');
  await expect(page.locator('.gagne .phrase')).toHaveClass(/rouge/);
});

test('ajouter une rubrique depuis l’Accueil : nom, Perso ou Activité, icône ; renommable et supprimable dans Réglages',async({page})=>{
  await openWith(page,null); await page.click('[data-act="demo"]');
  await page.click('.argent [data-act="nouvrub"]');
  await expect(page.locator('.fenetre')).toContainText('Nouvelle rubrique');
  await expect(page.locator('.fenetre .icone')).toHaveCount(12);
  await page.click('[data-act="nrcree"]'); await expect(page.locator('.fenetre')).toContainText('Donnez un nom à la rubrique.');
  await page.fill('#nrNom','Sport'); await page.click('[data-nru="pro"]'); await page.click('[data-nri="dumbbell"]');
  await expect(page.locator('#nrNom')).toHaveValue('Sport');
  await page.click('[data-act="nrcree"]');
  await expect(page.locator('.fenetre')).toHaveCount(0);
  const c=await page.evaluate(()=>S.categories.find(c=>c.name==='Sport'));
  expect(c).toMatchObject({univers:'pro',icon:'dumbbell',custom:true,type:'expense'});
  await page.click('#gear'); await page.locator('#rubriques details summary').click();
  await expect(page.locator(`[data-rencat="${c.id}"]`)).toBeVisible();
  await page.click(`[data-delcat="${c.id}"]`);
  expect(await page.evaluate(()=>S.categories.some(c=>c.name==='Sport'))).toBe(false);
});

test('« + Nouvelle rubrique… » dans la fiche d’une opération et dans « À vérifier »',async({page})=>{
  await openWith(page,null); await page.click('[data-act="demo"]'); await page.click('nav.tabs [data-tab="operations"]');
  // Question « À vérifier » : la rubrique créée devient la règle du marchand
  const q=page.locator('.verifier .question',{hasText:'ATELIER CERAMIQUE'});
  await q.locator('summary').click();
  await q.locator('select').selectOption('__new');
  await page.fill('#nrNom','Poterie'); await page.click('[data-nri="palette"]'); await page.click('[data-act="nrcree"]');
  expect(await page.evaluate(()=>catById(S.rules['ATELIER CERAMIQUE'])?.name)).toBe('Poterie');
  // Fiche d'une opération : la rubrique créée est choisie, il reste à enregistrer
  await page.locator('.op',{hasText:'NETFLIX'}).first().click();
  await expect(page.locator('#ficheCat option').last()).toHaveText('+ Nouvelle rubrique…');
  await page.selectOption('#ficheCat','__new');
  await page.fill('#nrNom','Streaming'); await page.click('[data-act="nrcree"]');
  const id=await page.evaluate(()=>S.categories.find(c=>c.name==='Streaming').id);
  await expect(page.locator('#ficheCat')).toHaveValue(id);
  await page.click('[data-act="savefiche"]');
  expect(await page.evaluate(()=>catById(S.rules['NETFLIX.COM'])?.name)).toBe('Streaming');
});
