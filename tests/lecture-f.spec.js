import {test,expect,openWith,importer} from './helpers.js';
import {BANQUES,ATTENDU,releveInconnu} from './banques.js';
import fs from 'fs';
const montants=page=>page.evaluate(()=>S.ops.map(o=>o.amount).sort((a,b)=>a-b));

test('assistant en trois gestes, sans quitter l’application : lecteur appris, vérifié, puis réutilisé tout seul',async({page},ti)=>{
  await openWith(page,null);
  const f=await releveInconnu(ti.outputPath('inconnu.pdf'));
  await importer(page,f);
  // Les méthodes automatiques se trompent (les dépenses entre parenthèses échappent) : la vérification des soldes le dit
  await expect(page.locator('.releve .r-alerte')).toContainText('écart');
  await page.click('[data-assist]');
  await expect(page.locator('.etape-assist')).toContainText('1. Touchez la date');
  await page.locator('.tok',{hasText:/^03\.03\.2026$/}).first().click();
  await expect(page.locator('.etape-assist')).toContainText('2. Touchez le libellé');
  await page.locator('.tok',{hasText:'CB CARREFOUR MARKET'}).first().click();
  await expect(page.locator('.etape-assist')).toContainText('3. Touchez le montant d’une dépense');
  await page.locator('.tok',{hasText:'(45,20)'}).first().click();
  await expect(page.locator('.assistant')).toContainText('6 opérations lues');
  await expect(page.locator('.assistant .verif.ok')).toContainText('Relevé vérifié ✓');
  await page.click('[data-act="assistok"]');
  await expect(page.locator('.releve').first()).toContainText('6 opérations ajoutées ✓ Relevé vérifié ✓');
  await expect(page.locator('.assistant')).toHaveCount(0);
  expect(await montants(page)).toEqual(ATTENDU);
  expect(await page.evaluate(()=>S.readers[0].type)).toBe('colonnes');
  // Le relevé suivant de cette banque est lu tout seul
  await page.evaluate(()=>{S.ops=[];render()});
  await importer(page,f);
  await expect(page.locator('.releve').first()).toContainText('6 opérations ajoutées ✓ Relevé vérifié ✓');
  expect(await page.evaluate(()=>reports[0].reader===S.readers[0].nom)).toBe(true);
});

test('un lecteur se partage : exporter puis importer sur un autre appareil',async({page},ti)=>{
  await openWith(page,{schemaVersion:9,onboarded:true,readers:[{nom:'Banque du Littoral',detection:'LITTORAL',type:'colonnes',cols:{date:40,lib:110,deb:460,cre:540},nonSigne:-1,tol:40}]});
  await page.click('#gear'); await page.locator('#avances summary').click();
  const [dl]=await Promise.all([page.waitForEvent('download'),page.click('[data-lexport="0"]')]);
  const fichier=ti.outputPath('lecteur.json'); await dl.saveAs(fichier);
  expect(JSON.parse(fs.readFileSync(fichier,'utf8'))).toMatchObject({app:'mes-comptes-lecteur',lecteur:{nom:'Banque du Littoral'}});
  await page.evaluate(()=>{S.readers=[];render()});
  await page.locator('#avances summary').click().catch(()=>{});
  await page.setInputFiles('#lecteurfile',fichier);
  await expect(page.locator('#avances')).toContainText('Lecteur « Banque du Littoral » ajouté : les relevés de cette banque seront lus automatiquement.');
  const f=await releveInconnu(ti.outputPath('inconnu.pdf'));
  await page.click('nav.tabs [data-tab="importer"]'); await page.setInputFiles('#file',f);
  await expect(page.locator('.releve').first()).toContainText('Relevé vérifié ✓');
});

test('en dernier recours, la réponse de Claude se colle dans l’aide du relevé, qui est relu aussitôt',async({page},ti)=>{
  await openWith(page,null);
  const {PDFDocument,StandardFonts}=await import('pdf-lib'); const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),p=doc.addPage([595,842]);
  ['BANQUE EXOTIQUE','2026.03.05 | CARTE BOULANGERIE | 12.50 EUR D','2026.03.09 | VIREMENT CLIENT | 800.00 EUR C'].forEach((t,i)=>p.drawText(t,{x:40,y:800-i*18,size:10,font}));
  const f=ti.outputPath('b.pdf'); fs.writeFileSync(f,await doc.save());
  await importer(page,f);
  const r=page.locator('.releve.ko');
  await r.locator('summary',{hasText:'Autre solution'}).click();
  await expect(r.locator('.etapes-txt li')).toHaveCount(6);
  const lecteur={nom:'Banque exotique',detection:'BANQUE EXOTIQUE',ligne:'^(?<date>\\d{4}\\.\\d{2}\\.\\d{2}) \\| (?<libelle>.+?) \\| (?<montant>[\\d.]+) EUR (?<sens>[DC])$',signe:'moins'};
  await r.locator('textarea[id^="claude-"]').fill(JSON.stringify(lecteur));
  await r.locator('[data-lclaude]').click();
  await expect(page.locator('.releve').first()).toContainText('2 opérations ajoutées ✓');
});

const COLLE_TAB=['Date\tLibellé\tDébit\tCrédit','03/03/2026\tCARREFOUR MARKET\t45,20\t','05/03/2026\tEDF\t94,00\t','08/03/2026\tVIREMENT CLIENT ALPHA\t\t1 500,00',
  '11/03/2026\tPHARMACIE DUNES\t12,30\t','15/03/2026\tCPAM LOIRE\t\t23,00','21/03/2026\tPAIEMENT WEB 4471\t1 234,56\t'].join('\n');
test('copier-coller : tableau copié sur le site, aperçu avec totaux, compte, ajout',async({page})=>{
  await openWith(page,{schemaVersion:9,onboarded:true,accounts:[{id:'ca',name:'Crédit Agricole',bank:'Crédit Agricole',type:'perso',confirmed:true}]});
  await page.click('nav.tabs [data-tab="importer"]'); await page.click('[data-act="coller"]');
  await page.fill('#colleTxt',COLLE_TAB); await page.click('[data-act="collelire"]');
  const res=page.locator('.colle-res');
  await expect(res).toContainText('6 opérations lues');
  await expect(res.locator('.phrase').first()).toContainText('1 386,06');
  await expect(res.locator('.phrase').first()).toContainText('1 523,00');
  await expect(page.locator('#colleAcct')).toHaveValue('ca');
  await page.click('[data-act="colleok"]');
  await expect(page.locator('.releve').first()).toContainText('Copier-coller, Crédit Agricole : 6 opérations ajoutées ✓');
  // Recoller la même chose n'ajoute rien
  await page.click('[data-act="coller"]'); await page.fill('#colleTxt',COLLE_TAB); await page.click('[data-act="collelire"]');
  await expect(page.locator('.colle-res')).toContainText('0 nouvelle, 6 déjà présentes');
});

test('copier-coller depuis un téléphone : texte libre sur plusieurs lignes, « Aujourd’hui », « Hier », signe moins typographique',async({page})=>{
  await openWith(page,{schemaVersion:9,onboarded:true,accounts:[{id:'a',name:'Ma banque',type:'perso',confirmed:true}]});
  const r=await page.evaluate(()=>parseCollage("Aujourd'hui\nCARTE BOULANGERIE\n−3,20 €\nHier\nVIREMENT DE MAMIE\n+50,00 €\nLun. 2 mars\nPRLV SEPA\nFREE MOBILE\n-19,99 €",'dep').ops);
  const d=new Date(), iso=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'), h=new Date(); h.setDate(h.getDate()-1);
  expect(r.map(o=>[o.label,o.amount])).toEqual([['CARTE BOULANGERIE',-3.2],['VIREMENT DE MAMIE',50],['PRLV SEPA FREE MOBILE',-19.99]]);
  expect(r[0].date).toBe(iso(d)); expect(r[1].date).toBe(iso(h)); expect(r[2].date.slice(5)).toBe('03-02');
});

test('copier-coller puis relevé PDF : pas de doublon, opérations complétées, rubrique gardée, cas douteux demandé',async({page},ti)=>{
  await openWith(page,{schemaVersion:9,onboarded:true,accounts:[{id:'ca',name:'Crédit Agricole',bank:'Crédit Agricole',type:'perso',confirmed:true}],rules:{'PHARMACIE DUNES':'sante'}});
  await page.click('nav.tabs [data-tab="importer"]'); await page.click('[data-act="coller"]');
  await page.fill('#colleTxt',COLLE_TAB); await page.click('[data-act="collelire"]'); await page.click('[data-act="colleok"]');
  await page.setInputFiles('#file',await BANQUES['Crédit Agricole'](ti.outputPath('ca.pdf')));
  const l=page.locator('.releve').first();
  await expect(l).toContainText('6 opérations. 5 étaient déjà là grâce à votre copier-coller et ont été complétées, 1 ajoutée ✓ (1 à confirmer dans Mes opérations)');
  await expect(l).toContainText('Relevé vérifié ✓');
  const r=await page.evaluate(()=>({n:S.ops.length,accts:S.accounts.length,ph:S.ops.find(o=>/PHARMACIE/.test(o.label)),c:catOf(S.ops.find(o=>/PHARMACIE/.test(o.label)))}));
  expect(r.n).toBe(7); expect(r.accts).toBe(1);
  expect(r.ph.label).toBe('CB PHARMACIE DES DUNES'); expect(r.ph.src).toBe('pdf'); expect(r.c).toBe('sante');
  // Le cas douteux : même montant, marchand trop différent
  await page.click('nav.tabs [data-tab="operations"]');
  const q=page.locator('.question',{hasText:'Ces 2 opérations sont-elles les mêmes ?'});
  await expect(q).toContainText('PAIEMENT WEB'); await expect(q).toContainText('CB AMAZON EU');
  await q.locator('[data-dout$=":1"]').click();
  expect(await page.evaluate(()=>[S.ops.length,S.ops.some(o=>o.label==='CB AMAZON EU'),S.ops.some(o=>/PAIEMENT WEB/.test(o.label))])).toEqual([6,true,false]);
  expect(await montants(page)).toEqual(ATTENDU);
});

test('relevé PDF puis copier-coller des derniers jours : seules les nouvelles opérations sont ajoutées',async({page},ti)=>{
  await openWith(page,null);
  await importer(page,await BANQUES['Crédit Agricole'](ti.outputPath('ca.pdf')));
  await page.click('[data-act="coller"]');
  await page.fill('#colleTxt',COLLE_TAB.replace('21/03/2026\tPAIEMENT WEB 4471\t1 234,56\t','20/03/2026\tAMAZON EU\t1 234,56\t')+'\n29/03/2026\tBOULANGERIE DU PORT\t4,10\t');
  await page.click('[data-act="collelire"]');
  await expect(page.locator('.colle-res')).toContainText('1 nouvelle, 6 déjà présentes');
  await page.click('[data-act="colleok"]');
  expect(await page.evaluate(()=>S.ops.length)).toBe(7);
});

test('deux opérations identiques le même jour restent deux (PDF, CSV et copier-coller)',async({page},ti)=>{
  await openWith(page,null);
  const f=ti.outputPath('cafes.csv'); fs.writeFileSync(f,'Date;Libellé;Montant\n05/05/2026;CB CAFE DU PORT;-2,50\n05/05/2026;CB CAFE DU PORT;-2,50\n06/05/2026;CB CARREFOUR;-30,00\n');
  await importer(page,f);
  await expect(page.locator('.releve')).toContainText('3 opérations ajoutées');
  await page.click('[data-act="coller"]'); await page.fill('#colleTxt','05/05/2026 CAFE DU PORT -2,50 €\n05/05/2026 CAFE DU PORT -2,50 €\n07/05/2026 CAFE DU PORT -2,50 €');
  await page.selectOption('#colleAcct',{index:0}); await page.click('[data-act="collelire"]');
  await expect(page.locator('.colle-res')).toContainText('1 nouvelle, 2 déjà présentes');
});
