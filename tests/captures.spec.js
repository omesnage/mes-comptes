// Captures d'écran de validation : mobile (400 px) et bureau (1280 px), clair et sombre, sur les données de démonstration.
import {test,openWith} from './helpers.js';
import path from 'path';
const ETAPE=process.env.ETAPE||'A';
const ECRANS=[['synthese-ensemble','synthese','all'],['synthese-pro','synthese','pro'],['synthese-perso','synthese','perso'],['operations','operations','all'],['reglages','regles','all'],['importer','importer','all']];
for(const [w,label] of [[400,'mobile'],[1280,'bureau']]) for(const scheme of ['light','dark'])
test(`captures ${label} ${scheme==='light'?'clair':'sombre'}`,async({page})=>{
  await page.setViewportSize({width:w,height:900}); await page.emulateMedia({colorScheme:scheme,reducedMotion:'reduce'});
  await openWith(page,null);
  await page.click('[data-act="demo"]');
  await page.evaluate(()=>{S.accounts[1].confirmed=false;render()});
  for(const [nom,tab,U] of ECRANS){
    await page.evaluate(([t,U])=>{view=t;UNIV=U;openCat=null;render();window.scrollTo(0,0)},[tab,U]);
    await page.evaluate(()=>document.fonts&&document.fonts.ready);
    await page.screenshot({path:path.join('captures','etape-'+ETAPE,`${nom}-${label}-${scheme==='light'?'clair':'sombre'}.png`),fullPage:true});
  }
});
