import {test,expect,openWith} from './helpers.js';
import fs from 'fs';
/* Dans l'aperçu en ligne, les fenêtres du navigateur (confirm, alert) sont masquées : la restauration doit marcher sans elles. Données fictives. */
const sauv=n=>({app:'mes-comptes',version:1,date:'2026-07-01T10:00:00.000Z',data:{schemaVersion:16,onboarded:true,accounts:[{id:'a',name:'Banque',type:'perso',confirmed:true}],rules:{},
  ops:Array.from({length:n},(_,i)=>({id:'o'+i,date:'2026-06-1'+(i%9),label:'MARCHAND '+i,amount:-10-i,merchant:'MARCHAND '+i,acct:'a'}))}});
test('restaurer une sauvegarde sans fenêtre du navigateur : directe si vide, avec question dans la page sinon',async({page},ti)=>{
  await openWith(page,null);
  await page.evaluate(()=>{window.confirm=()=>false;window.alert=()=>{}});
  const f=ti.outputPath('sauv.json'); fs.writeFileSync(f,JSON.stringify(sauv(3)));
  await page.click('nav.tabs [data-tab="reglages"]');
  await page.setInputFiles('#restorefile',f);
  await expect(page.locator('#view')).toContainText('restaurée');
  expect(await page.evaluate(()=>S.ops.length)).toBe(3);
  const g=ti.outputPath('sauv2.json'); fs.writeFileSync(g,JSON.stringify(sauv(5)));
  await page.setInputFiles('#restorefile',g);
  await expect(page.locator('#view')).toContainText('Remplacer vos données actuelles');
  await page.click('[data-act="restno"]');
  expect(await page.evaluate(()=>S.ops.length)).toBe(3);
  await page.setInputFiles('#restorefile',g);
  await page.click('[data-act="restok"]');
  await expect(page.locator('#view')).toContainText('restaurée');
  expect(await page.evaluate(()=>S.ops.length)).toBe(5);
});
