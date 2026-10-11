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

test('bouton du haut : alerte sans sauvegarde, puis Importer la sauvegarde du (date)',async({page},ti)=>{
  await openWith(page,null);
  const f=ti.outputPath('haut.json'); fs.writeFileSync(f,JSON.stringify(sauv(2)));
  await expect(page.locator('#importBtn')).toContainText('Importer une sauvegarde');   // appareil vide : on propose de retrouver ses comptes
  await expect(page.locator('#warnBtn')).toBeHidden();
  await page.evaluate(()=>{S.ops=[{id:'z',date:'2026-06-10',label:'TEST',amount:-5,merchant:'TEST',acct:'a'}];majSauvegardeEntete()});
  await expect(page.locator('#warnBtn')).toContainText('Aucune sauvegarde');           // des comptes mais jamais sauvegardés : alerte
  await expect(page.locator('#importBtn')).toBeHidden();
  await page.evaluate(()=>{S.lastBackup=new Date('2026-09-29T10:00:00').getTime();majSauvegardeEntete()});
  await expect(page.locator('#importBtn')).toContainText('Importer la sauvegarde du 29/09/2026');
  await expect(page.locator('#warnBtn')).toBeHidden();
  await page.setInputFiles('#restorefile2',f);
  await page.click('[data-act="restok"]');
  await expect(page.locator('#donnees')).toContainText('restaurée');
  expect(await page.evaluate(()=>S.ops.length)).toBe(2);
});

test('onglets sur une meme ligne et lien colle explique',async({page})=>{
  await openWith(page,null);
  const r=await page.evaluate(()=>{const n=document.querySelector('nav.tabs').getBoundingClientRect();return [...document.querySelectorAll('nav.tabs button')].map(b=>{const x=b.getBoundingClientRect();return [Math.round(x.top),x.right<=n.right+1]})});
  expect(new Set(r.map(x=>x[0])).size).toBe(1);
  expect(r.every(x=>x[1])).toBe(true);
  await page.click('nav.tabs [data-tab="importer"]');
  await page.evaluate(()=>{const dt=new DataTransfer();dt.setData('text','https://exemple.fr/releve.pdf');document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true}))});
  await expect(page.locator('.releve')).toContainText('Ce fichier n’est pas un relevé PDF ou CSV');
});

test('ecrans vides : chaque onglet a son propre message, et on peut retrouver ses comptes',async({page},ti)=>{
  await openWith(page,null);
  const titre=async t=>{await page.click(`nav.tabs [data-tab="${t}"]`);return page.locator('.vide h2').textContent()};
  const a=await titre('accueil'), b=await titre('bilan'), o=await titre('operations');
  expect(new Set([a,b,o]).size).toBe(3);
  const f=ti.outputPath('vide.json'); fs.writeFileSync(f,JSON.stringify(sauv(2)));
  await page.setInputFiles('#restorefile2',f);
  await expect(page.locator('#donnees')).toContainText('restaurée');
  await expect(page.locator('.vide')).toHaveCount(0);
});
