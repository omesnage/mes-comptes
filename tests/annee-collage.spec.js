import {test,expect,openWith} from './helpers.js';
import {releveColonnes} from './releves.js';
import fs from 'fs';
/* Donnees fictives */
test('annee : meilleurs et plus difficiles mois',async({page})=>{
  await openWith(page,{schemaVersion:16,onboarded:true,accounts:[{id:'a',name:'Banque',type:'perso',confirmed:true}],rules:{}});
  await page.evaluate(()=>{
    const L=[['1','2026-01-05','SALAIRE X',2000,'rentrees'],['2','2026-01-10','LIDL',-300,'courses'],['3','2026-02-05','SALAIRE X',2000,'rentrees'],['4','2026-02-10','LIDL',-1900,'courses'],['5','2026-03-05','SALAIRE X',2000,'rentrees'],['6','2026-03-10','LIDL',-100,'courses'],['7','2026-04-10','LIDL',-700,'courses']];
    S.ops=L.map(([id,date,l,a,cat])=>({id,date,label:l,amount:a,merchant:l,acct:'a',cat}));save();P={lvl:'M',y:2026,m:4};render();
  });
  await page.click('[data-alvl="Y"]');
  const b=page.locator('.mois-extremes');
  await expect(b.locator('.mx-bon')).toContainText('Mars');
  await expect(b.locator('.mx-bon')).toContainText('1 900');
  await expect(b.locator('.mx-dur')).toContainText('Avril');
  await page.click('[data-alvl="M"]');
  await expect(page.locator('.mois-extremes')).toHaveCount(0);
});
test('collage reussi : message clair en haut, et releve visible',async({page},ti)=>{
  await openWith(page,null);
  const b64=fs.readFileSync(await releveColonnes(ti.outputPath('ca.pdf'))).toString('base64');
  await page.click('nav.tabs [data-tab="importer"]');
  await page.evaluate(b=>{const u=Uint8Array.from(atob(b),c=>c.charCodeAt(0));const dt=new DataTransfer();dt.items.add(new File([u],'Releve de compte',{type:''}));document.body.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))},b64);
  await expect(page.locator('#toast')).toContainText('Collage réussi');
  await expect(page.locator('#toast')).toContainText('5 opérations ajoutées');
  expect(await page.evaluate(()=>S.ops.length)).toBe(5);
  await page.evaluate(()=>{const dt=new DataTransfer();dt.setData('text/plain','https://exemple.fr/releve.pdf');document.body.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))});
  await expect(page.locator('.releve').first()).toContainText('Ce fichier n’est pas un relevé PDF ou CSV');
});
