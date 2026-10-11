import {test,expect,openWith,importer} from './helpers.js';
import {releveColonnes} from './releves.js';
import fs from 'fs';
/* Fiche d'une opération : « Voir ce qui est écrit sur le relevé » (relevé fictif, le libellé du prélèvement occupe deux lignes) */
test('fiche, lignes du releve sur demande',async({page},ti)=>{
  await openWith(page,null);
  await importer(page,await releveColonnes(ti.outputPath('ca.pdf')));
  await page.waitForFunction(()=>S.ops.length>=5);
  await page.click('nav.tabs [data-tab="operations"]');
  await page.evaluate(()=>{P={lvl:'M',y:2026,m:3};render()});
  await page.locator('[data-op]',{hasText:'EDF'}).click();
  await expect(page.locator('.fiche')).not.toContainText('CARREFOUR');   // rien tant qu'on ne demande pas
  await page.click('[data-act="releve"]');
  await expect(page.locator('.extrait')).toContainText('QONTO');
  await expect(page.locator('.extrait')).toContainText('CB CARREFOUR');
  await expect(page.locator('.ex-l.cible')).toContainText('EDF');
  await page.click('[data-act="releve"]');
  await expect(page.locator('.extrait')).toHaveCount(0);
  // sauvegarde et restauration : le détail suit
  const lg=await page.evaluate(()=>Object.values(S.imports).some(i=>i.lg&&Object.keys(i.lg).length>3));
  expect(lg).toBe(true);
});

test('reimport sans detail, complete sans doublon',async({page},ti)=>{
  await openWith(page,null);
  const f=await releveColonnes(ti.outputPath('ca.pdf'));
  await importer(page,f);
  await page.waitForFunction(()=>S.ops.length>=5);
  await page.evaluate(()=>{S.ops.forEach(o=>delete o.lg);Object.values(S.imports).forEach(i=>delete i.lg);save();render()});
  await importer(page,f);
  await page.waitForFunction(()=>S.ops.every(o=>o.lg!=null));
  expect(await page.evaluate(()=>S.ops.length)).toBe(5);
});

test('coller un fichier copie : accepte meme sans extension, et explique si rien de lisible',async({page},ti)=>{
  await openWith(page,null);
  const f=await releveColonnes(ti.outputPath('ca.pdf'));
  const b64=fs.readFileSync(f).toString('base64');
  await page.click('nav.tabs [data-tab="importer"]');
  // 2. un PDF collé, sans extension ni type : lu d'après son contenu
  await page.evaluate(b=>{const u=Uint8Array.from(atob(b),c=>c.charCodeAt(0));const dt=new DataTransfer();dt.items.add(new File([u],'Releve de compte',{type:''}));document.body.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))},b64);
  await page.waitForFunction(()=>S.ops.length>=5);
  expect(await page.evaluate(()=>S.ops.length)).toBe(5);
});
