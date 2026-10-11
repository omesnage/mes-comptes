import {test,expect,openWith,APP,APP_SAL} from './helpers.js';
/* Relevé manquant signalé, et dépenses en camembert : les deux versions (données fictives) */
const ARGENT=[['SAL',2000,'rentrees','06'],['LIDL',-420,'courses','03'],['RESTO',-180,'resto','05'],['ESSENCE',-90,'transport','07'],['PHARMA',-45,'sante','09'],['LOYER',-800,'logement','02']];
const donnees=async(page,mois)=>page.evaluate(([L,mois])=>{
  S.accounts=[{id:'a',name:'Banque',type:'perso',confirmed:true}];
  let id=0;const ops=[];for(const m of mois) for(const [l,a,cat,d] of L) ops.push({id:'o'+(id++),date:m+'-'+d,label:l,amount:a,merchant:l,acct:'a',cat});
  S.ops=ops;save();P={lvl:'M',y:2026,m:9};render();
},[ARGENT,mois]);
for(const [nom,url] of [['Mes comptes',APP],['Mon compte',APP_SAL]]){
  test(`${nom} un mois sauté est signalé en haut, avec un bouton vers Importer`,async({page})=>{
    await openWith(page,{onboarded:true},url);
    await donnees(page,['2026-09','2026-07','2026-06']);                  // août manque
    for(const tab of ['accueil','bilan','operations']){
      await page.click(`nav.tabs [data-tab="${tab}"]`);
      await expect(page.locator('.manque'),tab).toContainText('Il manque un relevé : août 2026');
    }
    await page.click('.manque [data-tab="importer"]');
    await expect(page.locator('.manque')).toContainText('août 2026');           // aussi dans Importer, sans bouton
    await expect(page.locator('.manque .btn')).toHaveCount(0);
    await donnees(page,['2026-09','2026-08','2026-07']);                  // plus rien ne manque
    await page.click('nav.tabs [data-tab="accueil"]');
    await expect(page.locator('.manque')).toHaveCount(0);
  });
  test(`${nom} le relevé du mois dernier pas encore ajouté est signalé`,async({page})=>{
    await openWith(page,{onboarded:true},url);
    const d=new Date(), cle=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0');
    const avantDernier=cle(new Date(d.getFullYear(),d.getMonth()-2,1)), dernier=new Date(d.getFullYear(),d.getMonth()-1,1);
    await page.evaluate(([L,m])=>{S.accounts=[{id:'a',name:'Banque',type:'perso',confirmed:true}];S.ops=L.map(([l,a,cat,j],i)=>({id:'r'+i,date:m+'-'+j,label:l,amount:a,merchant:l,acct:'a',cat}));save();P=null;render()},[ARGENT,avantDernier]);
    await page.click('nav.tabs [data-tab="accueil"]');
    await expect(page.locator('.manque')).toContainText('n’est pas encore ajouté');
    await expect(page.locator('.manque')).toContainText(String(dernier.getFullYear()));
  });
  test(`${nom} icône camembert : les sommes se lisent sur le graphique et dans la légende`,async({page})=>{
    await openWith(page,{onboarded:true},url);
    await donnees(page,['2026-09','2026-08']);
    await page.click('nav.tabs [data-tab="accueil"]');
    await expect(page.locator('.camembert')).toHaveCount(0);
    await page.click('[data-vue="camembert"]');
    await expect(page.locator('.camembert svg path.part')).toHaveCount(5);
    await expect(page.locator('.camembert .part-t').first()).toContainText('800 €');   // le loyer, la plus grosse part
    await expect(page.locator('.cam-leg')).toContainText('Courses');
    await expect(page.locator('.cam-leg')).toContainText('420 €');
    const taille=await page.evaluate(()=>[...document.querySelectorAll('.cam-val b,.part-t')].map(e=>parseFloat(getComputedStyle(e).fontSize)));
    expect(Math.min(...taille)).toBeGreaterThanOrEqual(17);
    await page.click('nav.tabs [data-tab="bilan"]');
    await expect(page.locator('.repartition .camembert')).toBeVisible();                 // le choix suit dans le Bilan
    await page.click('.repartition .cam-l[data-bcat="courses"]');
    await expect(page.locator('.fiche')).toBeVisible();
    await page.click('.fiche .fermer');
    await page.click('.repartition [data-vue="liste"]');
    await expect(page.locator('.repartition .camembert')).toHaveCount(0);
    await expect(page.locator('.repartition .rep-l').first()).toBeVisible();
  });
}
