// Outils communs : l'application est ouverte en file://, les bibliothèques des CDN sont servies depuis node_modules.
import {test as base,expect} from '@playwright/test';
import path from 'path';
export const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
export const APP='file://'+path.join(ROOT,'dist/mes-comptes.html');
export const APP_SAL='file://'+path.join(ROOT,'dist/mon-compte.html');
export const APP_V1='file://'+path.join(ROOT,'reference/mes-comptes-v1.html');
const LIBS={'pdf.min.js':'node_modules/pdfjs-dist/build/pdf.min.js','pdf.worker.min.js':'node_modules/pdfjs-dist/build/pdf.worker.min.js','xlsx.full.min.js':'node_modules/xlsx/dist/xlsx.full.min.js','lucide.min.js':'node_modules/lucide/dist/umd/lucide.min.js'};
export async function routeLibs(page){
  await page.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/,r=>{const f=Object.keys(LIBS).find(k=>r.request().url().endsWith('/'+k));return f?r.fulfill({path:path.join(ROOT,LIBS[f]),contentType:'application/javascript'}):r.abort()});
  await page.route(/fonts\.(googleapis|gstatic)\.com/,r=>process.env.FONTS?r.continue():r.fulfill({status:200,body:'',contentType:'text/css'}));
}
export const test=base.extend({
  errors:async({},use)=>{await use([])},
  page:async({page,errors},use)=>{
    page.on('pageerror',e=>errors.push('pageerror: '+e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
    page.on('dialog',d=>d.accept(d.type()==='prompt'?'Compte test':undefined));
    await routeLibs(page);
    await use(page);
    expect(errors,'aucune erreur dans la console').toEqual([]);
  }
});
export {expect};
/* Ouvre l'application avec un état déjà enregistré (format libre, ancien ou nouveau) */
export async function openWith(page,state,url=APP){
  if(state===null&&url===APP) state={onboarded:true};
  if(state==='vierge') state=null;
  await page.addInitScript(([s,k])=>{if(!sessionStorage.getItem('seeded')){localStorage.clear();if(s)localStorage.setItem(k,JSON.stringify(s));sessionStorage.setItem('seeded','1')}},[state||null,url.includes('mon-compte')?'mes-comptes-salaries':'mes-comptes-v1']);
  await page.goto(url);
  await page.waitForFunction(()=>typeof render==='function'&&document.querySelector('#view').innerHTML.length>0);
}
export const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('mes-comptes-v1')||'null'));
export const flush=page=>page.evaluate(async()=>{clearTimeout(timer);await flush()});
export async function importer(page,...files){
  await page.click('nav.tabs [data-tab="importer"]');
  await page.setInputFiles('#file',files);
}
