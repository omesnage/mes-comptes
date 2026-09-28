import {test,expect,openWith,importer} from './helpers.js';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import fs from 'fs';
/* Relevé dans un format que le lecteur générique ne connaît pas */
async function releveBizarre(f){
  const doc=await PDFDocument.create(), font=await doc.embedFont(StandardFonts.Helvetica), page=doc.addPage([595,842]);
  ['BANQUE EXOTIQUE','2026.03.05 | CARTE BOULANGERIE | 12.50 EUR D','2026.03.09 | VIREMENT CLIENT | 800.00 EUR C','2026.03.15 | PRELEVEMENT EDF | 64.20 EUR D']
    .forEach((t,i)=>page.drawText(t,{x:40,y:800-i*18,size:10,font}));
  fs.writeFileSync(f,await doc.save()); return f;
}
test('relevé non reconnu : aide de lecture dépliée, puis lecteur personnalisé qui le rend lisible',async({page},ti)=>{
  await openWith(page,null);
  const f=await releveBizarre(ti.outputPath('bizarre.pdf'));
  await importer(page,f);
  const r=page.locator('.releve.ko');
  await expect(r).toContainText('aucune opération n’a été reconnue');
  await expect(r.locator('details.detail')).toHaveAttribute('open','');
  await expect(r.locator('textarea.anon')).toContainText('CARTE BOULANGERIE');
  await expect(r.locator('[data-prompt]')).toHaveCount(1);
  // Lecteur personnalisé, collé dans Réglages avancés
  await page.click('#gear'); await page.locator('#avances summary').click();
  const lecteur={nom:'Banque exotique',detection:'BANQUE EXOTIQUE',ligne:'^(?<date>\\d{4}\\.\\d{2}\\.\\d{2}) \\| (?<libelle>.+?) \\| (?<montant>[\\d.]+) EUR (?<sens>[DC])$',signe:'moins'};
  await page.fill('#readerIn','Voici le lecteur : '+JSON.stringify(lecteur));
  await page.click('[data-act="addreader"]');
  await expect(page.locator('#avances')).toContainText('Lecteur « Banque exotique » ajouté');
  await importer(page,f);
  await expect(page.locator('.releve').first()).toContainText('3 opérations ajoutées ✓');
  expect(await page.evaluate(()=>S.ops.map(o=>o.amount).sort((a,b)=>a-b))).toEqual([-64.2,-12.5,800]);
});
test('tester un relevé : toujours disponible dans Importer',async({page})=>{
  await openWith(page,null); await page.click('nav.tabs [data-tab="importer"]');
  await expect(page.locator('label.btn',{hasText:'Tester un relevé'})).toBeVisible();
});
test('compte non confirmé : question en haut de l’Accueil jusqu’à la réponse, modifiable dans Réglages',async({page})=>{
  await openWith(page,{schemaVersion:4,onboarded:true,accounts:[{id:'a',name:'Qonto',type:'pro',confirmed:false}],ops:[{id:'1',date:'2026-06-03',label:'VIR CLIENT',amount:900,merchant:'CLIENT',acct:'a'}],rules:{CLIENT:'revenus'}});
  const q=page.locator('#view > .verifier .compte-q');
  await expect(q).toContainText('Ce compte est-il professionnel, personnel, ou les deux mélangés ?');
  await expect(q.locator('.choix-btn')).toHaveText(['Professionnel','Personnel','Les deux mélangés']);
  await expect(q.locator('.choix-btn.suggere')).toHaveText('Professionnel');
  await q.locator('.choix-btn',{hasText:'Les deux mélangés'}).click();
  await expect(page.locator('.compte-q')).toHaveCount(0);
  await page.click('#gear');
  await expect(page.locator('#comptes .choix-btn.suggere')).toHaveText('Les deux mélangés');
  await page.locator('#comptes .choix-btn',{hasText:'Personnel'}).click();
  expect(await page.evaluate(()=>[S.accounts[0].type,S.accounts[0].confirmed])).toEqual(['perso',true]);
});
